import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { getAllUsers, getUser, upsertUser } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config();

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// === Middleware ===
app.use(cors());
app.use(express.json());

// === Google OAuth2 setup ===
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// === Auth flow ===
app.get('/auth', (req, res) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
      'profile',
      'https://www.googleapis.com/auth/calendar.readonly'
    ],
    prompt: 'consent'
  });
  res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    if (profile && profile.email) {
      const existing = getUser(profile.email);
      const oldTokens = existing?.tokens ? JSON.parse(existing.tokens) : {};
      const mergedTokens = { ...oldTokens, ...tokens };

      upsertUser(profile.email, mergedTokens, profile);

      // 🔄 Auto-refresh listener
      oAuth2Client.on('tokens', (newTokens) => {
        if (newTokens.refresh_token) {
          const updated = { ...mergedTokens, ...newTokens };
          upsertUser(profile.email, updated, profile);
        }
      });

      const redirectBase = process.env.FRONTEND_BASE_URL || `http://localhost:${PORT}`;
      res.redirect(`${redirectBase}?auth=success`);
    } else {
      res.status(400).send('Could not get user email.');
    }
  } catch (err) {
    res.status(500).send('Authentication failed: ' + err.message);
  }
});

// === Helper functions ===
function getWeekString(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

function isOutboundEmail(headers, bodySnippet) {
  const toHeader = headers.find(h => h.name.toLowerCase() === 'to');
  const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
  if (!toHeader || !subjectHeader) return false;
  const recipients = toHeader.value.split(/[;,]/).map(e => e.trim().toLowerCase());
  if (recipients.some(addr => addr.endsWith('@metaprop.com'))) return false;

  // Heuristic: subject contains 'metaprop' or 'reconnect' or 'intro' or 'x metaprop' (case-insensitive)
  const subject = subjectHeader.value.toLowerCase();
  const subjectMatch = /metaprop|reconnect|intro|x metaprop/.test(subject);

  // Heuristic: body contains key phrases from templates (case-insensitive)
  const body = (bodySnippet || '').toLowerCase();
  const bodyMatch = [
    "just wanted to follow up in case my earlier note got buried",
    "i'd love to find time for a quick intro",
    "meta prop has been tracking innovation",
    "my name is",
    "i'm a growth investor at metaprop",
    "we'd love to reconnect",
    "even if fundraising isn't on the near-term agenda",
    "would you be open to a quick conversation",
    "looking forward to connecting",
    "hear what you're building",
    "find ways to be helpful ahead of time"
  ].some(phrase => body.includes(phrase));

  // Outbound if either subject or body matches
  return subjectMatch || bodyMatch;
}

// === API ===
app.get('/api/emails/stacked-summary', async (req, res) => {
  try {
    const dbUsers = getAllUsers();
    const weekSet = new Set();
    const userData = [];

    for (const user of dbUsers) {
      const tokens = JSON.parse(user.tokens);
      const email = user.email;

      const userAuth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      userAuth.setCredentials(tokens);

      const gmail = google.gmail({ version: 'v1', auth: userAuth });
      const sentList = await gmail.users.messages.list({ userId: 'me', labelIds: ['SENT'], maxResults: 200 });
      const messages = sentList.data.messages || [];

      const weekCounts = {};
      for (const msg of messages) {
        const msgData = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
        const headers = msgData.data.payload.headers;
        const bodySnippet = msgData.data.snippet || '';
        if (isOutboundEmail(headers, bodySnippet)) {
          const dateHeader = headers.find(h => h.name.toLowerCase() === 'date');
          const date = dateHeader ? new Date(dateHeader.value) : new Date(Number(msgData.data.internalDate));
          const week = getWeekString(date);
          weekSet.add(week);
          weekCounts[week] = (weekCounts[week] || 0) + 1;
        }
      }

      userData.push({ email, weekCounts });
    }

    const weeks = Array.from(weekSet).sort();
    const usersArr = userData.map(u => ({
      email: u.email,
      data: weeks.map(w => u.weekCounts[w] || 0)
    }));
    res.json({ weeks, users: usersArr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', (req, res) => {
  const dbUsers = getAllUsers();
  res.json(dbUsers.map(u => u.email));
});

app.get('/api/calendar/events', async (req, res) => {
  try {
    const dbUsers = getAllUsers();
    if (!dbUsers.length) return res.status(401).json({ error: 'No authenticated users' });
    // For demo, just use the first user
    const user = dbUsers[0];
    const tokens = JSON.parse(user.tokens);
    const userAuth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    userAuth.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: userAuth });
    const now = new Date().toISOString();
    const eventsRes = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now,
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    res.json({ events: eventsRes.data.items || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Serve frontend ===
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// === Start server ===
app.listen(PORT, () => {
  console.log(`✅ Backend + Frontend running at http://localhost:${PORT}`);
});

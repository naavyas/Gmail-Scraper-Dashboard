# Metaprop Dashboard Backend

## Setup

```
cd backend
npm install
npm start
```

## Google OAuth2 Setup
- Visit http://localhost:3000/auth to authenticate with Google.
- After authenticating, the backend will have access to your Gmail data.

## API Endpoints
- `GET /api/emails/summary` — Outbound emails per user
- `GET /api/companies/weekly` — Companies sourced per week
- `GET /api/companies/stages` — Companies by stage

## Environment Variables
Set these in `.env`:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `SERVICE_ACCOUNT_KEY_PATH` (optional, for domain-wide delegation) 
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Dashboard.css';

const CalendarTab = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/calendar/events');
      setEvents(res.data.events || []);
    } catch (err) {
      setError('Failed to fetch calendar events.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Upcoming Google Calendar Events</h2>
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <div>Loading events...</div>
        </div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : events.length === 0 ? (
        <div>No upcoming events found.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {events.map(event => (
            <li key={event.id} style={{ marginBottom: 18 }}>
              <strong>{event.summary || '(No Title)'}</strong><br />
              <span style={{ color: '#4a4e69' }}>
                {event.start?.dateTime ? new Date(event.start.dateTime).toLocaleString() : event.start?.date}
              </span>
              {event.location && <div style={{ color: '#888' }}>📍 {event.location}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CalendarTab; 
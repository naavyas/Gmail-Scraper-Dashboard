import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import CalendarTab from './components/CalendarTab';
import './components/Dashboard.css';

function App() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div>
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        zIndex: 100,
        background: 'transparent',
        padding: '24px 0 0 32px',
        pointerEvents: 'none',
      }}>
        <span style={{
          color: '#2563eb',
          fontWeight: 900,
          fontSize: '2rem',
          letterSpacing: '0.02em',
          fontFamily: 'Inter, sans-serif',
          pointerEvents: 'auto',
        }}>
          MetaProp
        </span>
      </header>
      <nav style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 24,
        margin: '80px 0 0 0',
        fontWeight: 600,
        fontSize: '1.1rem',
      }}>
        <button
          className={tab === 'dashboard' ? 'tab-active' : 'tab-btn'}
          onClick={() => setTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={tab === 'calendar' ? 'tab-active' : 'tab-btn'}
          onClick={() => setTab('calendar')}
        >
          📅 Calendar
        </button>
      </nav>
      <div style={{ marginTop: 0 }}>
        {tab === 'dashboard' ? <Dashboard /> : <CalendarTab />}
      </div>
    </div>
  );
}

export default App;

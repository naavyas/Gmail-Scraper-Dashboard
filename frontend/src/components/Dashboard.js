import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const getInitials = (email) => {
  const [name] = email.split('@');
  return name
    .split(/[._-]/)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2);
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Always try to fetch the stacked summary
  useEffect(() => {
    fetchData();
  }, []);

  // If redirected with ?auth=success, reload data
  useEffect(() => {
    if (window.location.search.includes('auth=success')) {
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/emails/stacked-summary');
      setData(res.data);
      setNeedsAuth(false);
    } catch (err) {
      setNeedsAuth(true);
      setData(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = () => {
    window.location.href = '/auth';
  };

  // Prepare stacked bar chart data
  const getChartData = () => {
    if (!data) return null;
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#C9CBCF', '#4BC0C0', '#FF6384', '#FFCE56'
    ];
    return {
      labels: data.weeks,
      datasets: data.users.map((user, idx) => ({
        label: user.email,
        data: user.data,
        backgroundColor: colors[idx % colors.length],
        stack: 'Stack 0',
      }))
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          generateLabels: (chart) => {
            const datasets = chart.data.datasets || [];
            return datasets.map((ds, i) => ({
              text: ds.label,
              fillStyle: ds.backgroundColor,
              strokeStyle: ds.backgroundColor,
              hidden: !chart.isDatasetVisible(i),
              datasetIndex: i,
              fontColor: '#22223b',
              pointStyle: 'circle',
              initials: getInitials(ds.label),
            }));
          },
        }
      },
      title: { display: true, text: 'Outbound Emails per User (Stacked by Week)' }
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true }
    }
  };

  return (
    <div className="dashboard">
      <div className="card">
        <h1>Gmail Analytics Dashboard</h1>
        <p>Track your team's outbound email activity by week.</p>
        {needsAuth ? (
          <div className="auth-section">
            <h2>🔑 Authentication Required</h2>
            <p>Please authenticate with Google to access your Gmail analytics.</p>
            <button className="auth-button" onClick={handleAuth}>
              Connect Gmail
            </button>
          </div>
        ) : loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <div>Loading chart data...</div>
          </div>
        ) : data ? (
          <div className="chart-container">
            <Bar data={getChartData()} options={chartOptions} />
          </div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : null}
      </div>
    </div>
  );
};

export default Dashboard;

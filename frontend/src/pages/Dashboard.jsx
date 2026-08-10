/**
 * Dashboard — Main landing page.
 * Displays real-time metrics, charts, low stock alerts, and AI recommendations.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'dark');

  // Listen for theme changes to update chart grid colors
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          setTheme(document.documentElement.getAttribute('data-theme'));
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await dashboardAPI.getMetrics();
        setData(response.data);
      } catch (error) {
        console.error('Error fetching dashboard:', error);
        toast.error('Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner fullPage message="Crunching the latest numbers..." />;
  }

  if (!data) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <h3>Error loading dashboard</h3>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // --- Chart Configurations ---
  
  const isDark = theme === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = isDark ? '#a1a0b8' : '#4b4a65';

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: textColor, font: { family: "'Inter', sans-serif", size: 13, weight: 600 } }
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(30, 30, 40, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#fff' : '#000',
        bodyColor: isDark ? '#a1a0b8' : '#4b4a65',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
      }
    },
    scales: {
      x: { grid: { color: 'transparent' }, ticks: { color: textColor, font: { family: "'Inter', sans-serif" } } },
      y: { grid: { color: gridColor, drawBorder: false }, ticks: { color: textColor, font: { family: "'Inter', sans-serif" } }, border: { display: false } }
    },
    interaction: { mode: 'index', intersect: false },
  };

  const revenueData = {
    labels: data.revenue_chart.labels,
    datasets: data.revenue_chart.datasets.map(ds => ({
      ...ds,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: ds.borderColor,
      pointBorderColor: isDark ? '#1e1e28' : '#ffffff',
      pointBorderWidth: 2,
    }))
  };

  const ordersData = {
    labels: data.orders_chart.labels,
    datasets: data.orders_chart.datasets.map(ds => ({
      ...ds,
      borderRadius: 4,
      barPercentage: 0.6,
      categoryPercentage: 0.8
    }))
  };

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">
              Good {getTimeGreeting()},{' '}
              <span className="gradient-text">{user?.full_name?.split(' ')[0] || 'there'}</span>! 👋
            </h1>
            <p className="page-subtitle">Here's what's happening at your restaurant today</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/reports')}>
              <i className="bi bi-download"></i> View Reports
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        {data.quick_stats.map((stat, i) => (
          <div key={i} className="stat-card" style={{ '--gradient': stat.color }}>
            <div>
              <p className="stat-label">{stat.label}</p>
              <p className="stat-value">{stat.value}</p>
              {stat.change && (
                <p className={`stat-change ${stat.trend}`}>
                  <i className={`bi bi-arrow-${stat.trend}-right`}></i> {stat.change} vs last week
                </p>
              )}
            </div>
            <div className="stat-icon" style={{ background: `${stat.color}18`, color: stat.color, fontSize: '24px' }}>
              <i className={`bi ${stat.icon}`}></i>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Revenue Trend</h3>
              <p className="card-subtitle">Last 7 days performance</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/analytics')}>View Analytics</button>
          </div>
          <div style={{ height: '300px' }}>
            <Line data={revenueData} options={chartOptions} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Orders Breakdown</h3>
              <p className="card-subtitle">Dine-in vs Delivery</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/orders')}>View Orders</button>
          </div>
          <div style={{ height: '300px' }}>
            <Bar data={ordersData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid-2">
        {/* AI Recommendations */}
        <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: 'radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
          
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'var(--gradient-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                <i className="bi bi-stars"></i>
              </div>
              <div>
                <h3 className="card-title">AI Recommendations</h3>
                <p className="card-subtitle">Actionable insights by Gemini AI</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {data.ai_recommendations.map((rec, i) => (
              <div key={i} style={{ 
                padding: '16px', 
                borderRadius: 'var(--radius-md)', 
                background: `var(--color-${rec.type}-bg)`,
                border: `1px solid rgba(var(--color-${rec.type}-rgb), 0.2)`,
                borderLeft: `3px solid var(--color-${rec.type})`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <i className={`bi ${getIconForType(rec.type)}`} style={{ color: `var(--color-${rec.type})` }}></i>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{rec.title}</h4>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: rec.action_text ? '12px' : 0 }}>
                  {rec.description}
                </p>
                {rec.action_text && (
                  <button className="btn btn-sm btn-secondary" onClick={() => navigate('/ai-assistant')} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    {rec.action_text} <i className="bi bi-arrow-right-short"></i>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Low Stock Alerts</h3>
              <p className="card-subtitle">Items requiring immediate restock</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/inventory')}>View Inventory</button>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.low_stock_items.map((item) => {
                  const critical = item.quantity <= item.reorder_level / 2;
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                      <td>{item.quantity} {item.unit}</td>
                      <td>{item.reorder_level} {item.unit}</td>
                      <td>
                        <span className={`badge ${critical ? 'badge-danger' : 'badge-warning'}`}>
                          {critical ? 'Critical' : 'Low'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {data.low_stock_items.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px' }}>
                      <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}></i>
                      Inventory levels are optimal
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function getIconForType(type) {
  switch (type) {
    case 'warning': return 'bi-exclamation-triangle-fill';
    case 'success': return 'bi-check-circle-fill';
    case 'danger': return 'bi-shield-fill-exclamation';
    case 'info': return 'bi-info-circle-fill';
    default: return 'bi-lightbulb-fill';
  }
}

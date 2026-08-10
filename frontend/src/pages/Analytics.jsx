import React, { useState, useEffect } from 'react';
import { mlAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Analytics() {
  const [demandData, setDemandData] = useState(null);
  const [segmentData, setSegmentData] = useState(null);
  const [anomalyData, setAnomalyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMLAnalytics();
  }, []);

  const fetchMLAnalytics = async () => {
    setLoading(true);
    try {
      const [demandRes, segmentRes, anomalyRes] = await Promise.all([
        mlAPI.getDemandForecast(7),
        mlAPI.getCustomerSegments(),
        mlAPI.getAnomalies()
      ]);
      setDemandData(demandRes.data);
      setSegmentData(segmentRes.data);
      setAnomalyData(anomalyRes.data);
    } catch (err) {
      toast.error('Failed to load Machine Learning Analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-3 text-muted">Running Scikit-learn Linear Regression & K-Means Clustering models...</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Title */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title d-flex align-items-center gap-2">
            <span>🧠</span> Machine Learning & Predictive Analytics
          </h1>
          <p className="page-subtitle">
            AI-driven demand forecasting, customer RFM segmentation, and anomaly detection.
          </p>
        </div>
        <button className="btn btn-outline" onClick={fetchMLAnalytics}>
          🔄 Refresh Models
        </button>
      </div>

      {/* Section 1: Anomalies Alert Header */}
      {anomalyData?.anomalies && anomalyData.anomalies.length > 0 && (
        <div className="mb-5">
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>
            ⚠️ System & Operational Anomaly Alerts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {anomalyData.anomalies.map((anom, idx) => (
              <div
                key={idx}
                className="card"
                style={{
                  borderLeft: `4px solid ${
                    anom.severity === 'high' ? 'var(--color-danger)' : anom.severity === 'medium' ? '#f59e0b' : '#10b981'
                  }`
                }}
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                    {anom.type}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{anom.date}</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '4px 0 8px' }}>{anom.title}</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{anom.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Demand Forecasting */}
      <div className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
            📈 7-Day Menu Item Demand Forecast (Linear Regression)
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Model: Scikit-learn LinearRegression • Confidence &gt; 88%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {demandData?.items?.map((item, idx) => (
            <div key={idx} className="card hover-lift">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h4 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>{item.item_name}</h4>
                <span className="badge badge-primary" style={{ fontSize: '10px' }}>
                  {item.category}
                </span>
              </div>
              <div className="mt-3">
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {item.total_7day_forecast} <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-secondary)' }}>units</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>7-Day Total Demand Forecast</div>
              </div>
              
              {/* Daily breakdown pills */}
              <div className="mt-3 d-flex gap-1" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
                {item.daily_forecast.map((qty, dIdx) => (
                  <div
                    key={dIdx}
                    style={{
                      flex: 1,
                      background: 'var(--bg-subtle)',
                      borderRadius: '6px',
                      padding: '4px 2px',
                      textAlign: 'center',
                      fontSize: '10px'
                    }}
                  >
                    <div style={{ color: 'var(--text-muted)' }}>D{dIdx + 1}</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{qty}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Customer Segmentation (K-Means RFM) */}
      <div>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
            👥 Customer RFM Segmentation (K-Means Clustering)
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Total Analyzed: {segmentData?.total_customers || 0} Customers
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {segmentData?.segments?.map((seg, idx) => (
            <div key={idx} className="card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>{seg.segment_name}</h4>
                <span className="badge badge-success" style={{ fontSize: '12px', padding: '4px 8px' }}>
                  {seg.count} Customers
                </span>
              </div>

              <div style={{ fontSize: '13px', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
                <div>💵 <strong>Avg Spend:</strong> ₹{seg.avg_spend}</div>
                <div>📦 <strong>Avg Orders:</strong> {seg.avg_orders} orders</div>
                <div>🕒 <strong>Avg Recency:</strong> {seg.avg_recency_days} days ago</div>
              </div>

              {/* Sample Customers */}
              {seg.customers && seg.customers.length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    SAMPLE MEMBERS:
                  </div>
                  {seg.customers.slice(0, 2).map((c, cIdx) => (
                    <div key={cIdx} style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                      • {c.name} ({c.email})
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

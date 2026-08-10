/**
 * Reports & Analytics Page.
 * Generate, view, and manage business reports (Sales, Waste, Inventory).
 * Restricted to Admin/Manager.
 */

import { useState, useEffect } from 'react';
import { reportsAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

const REPORT_TYPES = [
  { id: 'sales', label: 'Sales & Revenue Report' },
  { id: 'waste', label: 'Food Waste Analysis' },
  { id: 'inventory', label: 'Inventory Status' },
];

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [viewingReport, setViewingReport] = useState(null); // Document Viewer

  const [formData, setFormData] = useState({
    report_type: 'sales',
    period_start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0], // 7 days ago
    period_end: new Date().toISOString().split('T')[0], // today
  });

  useEffect(() => {
    fetchReports();
  }, [filterType]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = { per_page: 50 };
      if (filterType) params.report_type = filterType;
      const res = await reportsAPI.list(params);
      setReports(res.data.reports);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      // Ensure time is attached for accurate datetime parsing in backend
      const payload = {
        report_type: formData.report_type,
        period_start: formData.period_start ? `${formData.period_start}T00:00:00Z` : null,
        period_end: formData.period_end ? `${formData.period_end}T23:59:59Z` : null,
      };
      
      await reportsAPI.generate(payload);
      toast.success('Report generated successfully!');
      setIsModalOpen(false);
      fetchReports();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this saved report permanently?')) return;
    try {
      await reportsAPI.delete(id);
      toast.success('Report deleted');
      if (viewingReport?.id === id) setViewingReport(null);
      fetchReports();
    } catch {
      toast.error('Failed to delete report');
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return 'N/A';
    return new Date(isoStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  // Helper to render the JSON content dynamically based on report type
  const renderReportContent = (report) => {
    const data = report.content?.metrics;
    if (!data) return <p className="text-muted">No data available for this period.</p>;

    if (report.report_type === 'sales') {
      return (
        <div className="grid-2">
          <div className="stat-card">
            <p className="stat-label">Gross Revenue</p>
            <p className="stat-value text-success">₹{data.gross_revenue.toLocaleString('en-IN')}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total Discounts</p>
            <p className="stat-value text-danger">₹{data.total_discounts.toLocaleString('en-IN')}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Net Revenue</p>
            <p className="stat-value text-primary">₹{data.net_revenue.toLocaleString('en-IN')}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total Orders</p>
            <p className="stat-value">{data.total_orders}</p>
          </div>
        </div>
      );
    }

    if (report.report_type === 'waste') {
      return (
        <div className="grid-3">
          <div className="stat-card">
            <p className="stat-label">Events</p>
            <p className="stat-value">{data.total_waste_events}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Quantity</p>
            <p className="stat-value">{data.total_wasted_quantity.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Financial Loss</p>
            <p className="stat-value text-danger">₹{data.total_financial_loss.toLocaleString('en-IN')}</p>
          </div>
        </div>
      );
    }

    if (report.report_type === 'inventory') {
      return (
        <div className="grid-3">
          <div className="stat-card">
            <p className="stat-label">Items Tracked</p>
            <p className="stat-value">{data.total_items_tracked}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Low Stock Alerts</p>
            <p className="stat-value text-warning">{data.items_needing_reorder}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total Value</p>
            <p className="stat-value text-success">₹{data.total_inventory_value.toLocaleString('en-IN')}</p>
          </div>
        </div>
      );
    }

    return <pre>{JSON.stringify(data, null, 2)}</pre>;
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title">Business Reports</h1>
            <p className="page-subtitle">Generate and review operational analytics</p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <i className="bi bi-file-earmark-bar-graph"></i> Generate Report
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        
        {/* Left Side: Report History List */}
        <div style={{ flex: 1 }}>
          <div className="card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Filter by Type:</label>
            <select className="form-input" style={{ width: '220px', margin: 0 }}
              value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Reports</option>
              {REPORT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? <LoadingSpinner fullPage={false} message="Loading reports..." /> : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Report Title</th>
                      <th>Type</th>
                      <th>Period</th>
                      <th>Generated On</th>
                      <th style={{ width: '80px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => (
                      <tr 
                        key={r.id} 
                        style={{ cursor: 'pointer', background: viewingReport?.id === r.id ? 'var(--bg-elevated)' : '' }}
                        onClick={() => setViewingReport(r)}
                      >
                        <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                          <i className="bi bi-file-text" style={{ marginRight: '8px' }}></i>
                          {r.title}
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'var(--bg-base)' }}>
                            {r.report_type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {formatDate(r.period_start)} – {formatDate(r.period_end)}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {formatDate(r.created_at)}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <button className="navbar-icon-btn" onClick={() => handleDelete(r.id)}
                            style={{ width: '32px', height: '32px', color: 'var(--color-danger)' }}>
                            <i className="bi bi-trash" style={{ fontSize: '13px' }}></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {reports.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '48px' }}>
                          <i className="bi bi-folder2-open" style={{ fontSize: '48px', color: 'var(--text-muted)', display: 'block', marginBottom: '12px' }}></i>
                          No reports generated yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Report Viewer (Document Style) */}
        {viewingReport && (
          <div className="card fade-in" style={{ 
            width: '450px', flexShrink: 0, position: 'sticky', top: '80px', 
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--color-primary)' }}>
                  {viewingReport.title}
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  Generated on {formatDate(viewingReport.created_at)}
                </p>
              </div>
              <button className="navbar-icon-btn" onClick={() => setViewingReport(null)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Reporting Period
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-base)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <i className="bi bi-calendar-range" style={{ fontSize: '20px', color: 'var(--color-primary)' }}></i>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>{formatDate(viewingReport.period_start)}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>To</p>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>{formatDate(viewingReport.period_end)}</p>
                </div>
              </div>
            </div>

            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Executive Summary
              </p>
              {renderReportContent(viewingReport)}
            </div>

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <button className="btn btn-secondary w-full" onClick={() => window.print()}>
                <i className="bi bi-printer"></i> Print / Save as PDF
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', padding: '20px',
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Generate New Report</h2>
              <button className="navbar-icon-btn" onClick={() => setIsModalOpen(false)}><i className="bi bi-x-lg"></i></button>
            </div>

            <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Report Type</label>
                <select className="form-input" value={formData.report_type}
                  onChange={e => setFormData({ ...formData, report_type: e.target.value })}>
                  {REPORT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>

              {formData.report_type !== 'inventory' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input type="date" className="form-input" required value={formData.period_start}
                      onChange={e => setFormData({ ...formData, period_start: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input type="date" className="form-input" required value={formData.period_end}
                      onChange={e => setFormData({ ...formData, period_end: e.target.value })} />
                  </div>
                </>
              )}
              {formData.report_type === 'inventory' && (
                <div style={{ 
                  background: 'rgba(59,130,246,0.1)', padding: '12px', borderRadius: 'var(--radius-md)', 
                  color: '#3b82f6', fontSize: '13px', display: 'flex', gap: '8px'
                }}>
                  <i className="bi bi-info-circle"></i> 
                  Inventory reports capture the current real-time stock snapshot, so date ranges are ignored.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className={`btn btn-primary ${isGenerating ? 'btn-loading' : ''}`} disabled={isGenerating}>
                  {isGenerating ? <span className="btn-spinner"></span> : <i className="bi bi-lightning-charge-fill"></i>}
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

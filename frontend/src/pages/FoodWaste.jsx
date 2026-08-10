/**
 * Food Waste Management Page.
 * Allows staff to log daily waste events and view financial impact analytics.
 */

import { useState, useEffect } from 'react';
import { wasteAPI, inventoryAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

const WASTE_REASONS = [
  'Expired / Spoiled',
  'Overcooked',
  'Dropped / Spilled',
  'Overproduction',
  'Customer Return',
  'Damaged Packaging',
  'Other',
];

export default function FoodWaste() {
  const [records, setRecords] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    inventory_id: '',
    quantity_wasted: '',
    reason: WASTE_REASONS[0],
    waste_date: new Date().toISOString().split('T')[0],
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchInventory();
    fetchRecords();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await inventoryAPI.list({ per_page: 100 });
      setInventoryItems(res.data.items);
    } catch { /* silent */ }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = { per_page: 50 };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await wasteAPI.list(params);
      setRecords(res.data.records);
    } catch (error) {
      toast.error('Failed to load waste records');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Look up the selected inventory item to get ingredient_name and unit
      const selectedItem = inventoryItems.find(i => i.id === parseInt(formData.inventory_id));
      const payload = {
        inventory_id: parseInt(formData.inventory_id),
        quantity_wasted: parseFloat(formData.quantity_wasted),
        reason: formData.reason,
        ingredient_name: selectedItem ? selectedItem.item_name : 'Unknown',
        unit: selectedItem ? selectedItem.unit : 'kg',
        waste_date: formData.waste_date ? formData.waste_date + 'T00:00:00Z' : undefined,
      };

      await wasteAPI.log(payload);
      toast.success('Waste event logged and stock deducted!');
      setIsModalOpen(false);
      setFormData({
        inventory_id: '',
        quantity_wasted: '',
        reason: WASTE_REASONS[0],
        waste_date: new Date().toISOString().split('T')[0],
      });
      fetchRecords();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to log waste');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this waste record?')) return;
    try {
      await wasteAPI.delete(id);
      toast.success('Record deleted');
      fetchRecords();
    } catch {
      toast.error('Failed to delete record');
    }
  };

  // Aggregate stats — use `cost` from backend (was cost_impact)
  const totalWasteEvents = records.length;
  const totalCostImpact = records.reduce((sum, r) => sum + (r.cost || 0), 0);
  const reasonBreakdown = records.reduce((acc, r) => {
    acc[r.reason] = (acc[r.reason] || 0) + 1;
    return acc;
  }, {});
  const topReason = Object.entries(reasonBreakdown).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title">Food Waste Management</h1>
            <p className="page-subtitle">Track and minimize food waste to reduce costs</p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <i className="bi bi-plus-circle-fill"></i> Log Waste Event
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div>
            <p className="stat-label">Total Events</p>
            <p className="stat-value">{totalWasteEvents}</p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--color-primary)' }}>
            <i className="bi bi-trash3"></i>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">Total Cost Impact</p>
            <p className="stat-value" style={{ color: 'var(--color-danger)' }}>₹{totalCostImpact.toFixed(2)}</p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}>
            <i className="bi bi-currency-rupee"></i>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">Top Waste Reason</p>
            <p className="stat-value" style={{ fontSize: '18px', fontWeight: 700 }}>
              {topReason ? topReason[0].split('/')[0].trim() : '—'}
            </p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--color-warning)' }}>
            <i className="bi bi-pie-chart"></i>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">From Date</label>
          <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">To Date</label>
          <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <button className="btn btn-secondary" onClick={fetchRecords}>
          <i className="bi bi-funnel"></i> Apply Filter
        </button>
        {(startDate || endDate) && (
          <button className="btn btn-ghost" onClick={() => { setStartDate(''); setEndDate(''); setTimeout(fetchRecords, 0); }}>
            Clear
          </button>
        )}
      </div>

      {/* Records Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <LoadingSpinner fullPage={false} message="Loading waste records..." />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Ingredient</th>
                  <th>Quantity Wasted</th>
                  <th>Reason</th>
                  <th>Cost Impact</th>
                  <th style={{ width: '60px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr key={record.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {record.waste_date ? new Date(record.waste_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ fontWeight: 600 }}>{record.ingredient_name}</td>
                    <td>{record.quantity_wasted} {record.unit}</td>
                    <td>
                      <span className="badge badge-warning" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {record.reason}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: (record.cost || 0) > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                      {(record.cost || 0) > 0 ? `−₹${Number(record.cost).toFixed(2)}` : '₹0.00'}
                    </td>
                    <td>
                      <button className="navbar-icon-btn" onClick={() => handleDelete(record.id)} style={{ width: '32px', height: '32px', color: 'var(--color-danger)' }} title="Delete">
                        <i className="bi bi-trash" style={{ fontSize: '14px' }}></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && !loading && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '48px' }}>
                      <i className="bi bi-check-circle" style={{ fontSize: '48px', color: 'var(--color-success)', display: 'block', marginBottom: '12px' }}></i>
                      <p style={{ color: 'var(--text-secondary)' }}>No waste records found — great job!</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Waste Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', padding: '20px'
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Log Waste Event</h2>
              <button className="navbar-icon-btn" onClick={() => setIsModalOpen(false)}><i className="bi bi-x-lg"></i></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Ingredient / Item *</label>
                <select className="form-input" required value={formData.inventory_id} onChange={e => setFormData({ ...formData, inventory_id: e.target.value })}>
                  <option value="">-- Select ingredient --</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.item_name} ({item.quantity} {item.unit} available)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Wasted Quantity *</label>
                  <input type="number" step="0.01" min="0.01" className="form-input" required
                    value={formData.quantity_wasted} onChange={e => setFormData({ ...formData, quantity_wasted: e.target.value })} placeholder="e.g. 2.5" />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Waste *</label>
                  <input type="date" className="form-input" required
                    value={formData.waste_date} onChange={e => setFormData({ ...formData, waste_date: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason *</label>
                <select className="form-input" required value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })}>
                  {WASTE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius-md)', padding: '12px', fontSize: '13px', color: 'var(--color-danger)'
              }}>
                <i className="bi bi-info-circle"></i> Logging this event will automatically deduct the quantity from the selected ingredient's stock.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className={`btn btn-primary ${isSaving ? 'btn-loading' : ''}`} disabled={isSaving}>
                  {isSaving ? <span className="btn-spinner"></span> : <i className="bi bi-check-lg"></i>}
                  Log Waste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

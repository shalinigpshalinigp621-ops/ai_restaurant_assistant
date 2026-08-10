/**
 * Supplier Management Page.
 * Manage vendors, contact persons, items supplied, payment & delivery terms.
 * Restricted to Admin/Manager.
 */

import { useState, useEffect } from 'react';
import { suppliersAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

const emptyForm = {
  name: '', contact_person: '', phone: '', email: '',
  address: '', items_supplied: '', payment_terms: '',
  delivery_schedule: '', is_active: true,
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingSupplier, setViewingSupplier] = useState(null); // detail drawer
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(fetchSuppliers, 300);
    return () => clearTimeout(t);
  }, [searchQuery, activeOnly]);

  const fetchSuppliers = async () => {
    try {
      const params = { per_page: 100 };
      if (searchQuery) params.search = searchQuery;
      if (activeOnly) params.active_only = true;
      const res = await suppliersAPI.list(params);
      setSuppliers(res.data.suppliers);
    } catch {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        items_supplied: supplier.items_supplied || '',
        payment_terms: supplier.payment_terms || '',
        delivery_schedule: supplier.delivery_schedule || '',
        is_active: supplier.is_active,
      });
    } else {
      setEditingSupplier(null);
      setFormData(emptyForm);
    }
    setIsModalOpen(true);
    setViewingSupplier(null);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingSupplier(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        items_supplied: formData.items_supplied || null,
        payment_terms: formData.payment_terms || null,
        delivery_schedule: formData.delivery_schedule || null,
      };
      if (editingSupplier) {
        await suppliersAPI.update(editingSupplier.id, payload);
        toast.success('Supplier updated!');
      } else {
        await suppliersAPI.create(payload);
        toast.success('Supplier added!');
      }
      closeModal();
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this supplier?')) return;
    try {
      await suppliersAPI.delete(id);
      toast.success('Supplier removed');
      setViewingSupplier(null);
      fetchSuppliers();
    } catch { toast.error('Failed to delete'); }
  };

  const totalActive = suppliers.filter(s => s.is_active).length;

  if (loading) return <LoadingSpinner fullPage message="Loading supplier database..." />;

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title">Supplier Management</h1>
            <p className="page-subtitle">Manage vendors, delivery schedules, and payment terms</p>
          </div>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <i className="bi bi-truck"></i> Add Supplier
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div>
            <p className="stat-label">Total Suppliers</p>
            <p className="stat-value">{suppliers.length}</p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--color-primary)' }}>
            <i className="bi bi-shop"></i>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">Active Vendors</p>
            <p className="stat-value">{totalActive}</p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>
            <i className="bi bi-check-circle"></i>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">Inactive / On Hold</p>
            <p className="stat-value">{suppliers.length - totalActive}</p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}>
            <i className="bi bi-pause-circle"></i>
          </div>
        </div>
      </div>

      {/* Main content: list + optional detail panel */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* List */}
        <div style={{ flex: 1 }}>
          {/* Filters */}
          <div className="card" style={{ padding: '14px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="form-input-wrapper" style={{ margin: 0, flex: 1, minWidth: '220px' }}>
              <input type="text" className="form-input" placeholder="Search by name, contact, or items..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <i className="bi bi-search form-input-icon"></i>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', color: activeOnly ? 'var(--color-success)' : 'var(--text-secondary)' }}>
              <input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--color-success)' }} />
              Active only
            </label>
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Supplier Name</th>
                    <th>Contact Person</th>
                    <th>Phone / Email</th>
                    <th>Items Supplied</th>
                    <th>Status</th>
                    <th style={{ width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map(s => (
                    <tr
                      key={s.id}
                      style={{ cursor: 'pointer', background: viewingSupplier?.id === s.id ? 'var(--bg-elevated)' : '' }}
                      onClick={() => setViewingSupplier(viewingSupplier?.id === s.id ? null : s)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
                            background: 'var(--color-primary-glow)', color: 'var(--color-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                          }}>
                            {s.name[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600 }}>{s.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{s.contact_person || '—'}</td>
                      <td style={{ fontSize: '13px' }}>
                        {s.phone && <div><i className="bi bi-telephone" style={{ marginRight: '4px' }}></i>{s.phone}</div>}
                        {s.email && <div style={{ color: 'var(--text-muted)' }}><i className="bi bi-envelope" style={{ marginRight: '4px' }}></i>{s.email}</div>}
                        {!s.phone && !s.email && '—'}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.items_supplied || '—'}
                      </td>
                      <td>
                        <span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="navbar-icon-btn" onClick={() => openModal(s)} style={{ width: '30px', height: '30px' }}>
                            <i className="bi bi-pencil" style={{ fontSize: '13px' }}></i>
                          </button>
                          <button className="navbar-icon-btn" onClick={() => handleDelete(s.id)}
                            style={{ width: '30px', height: '30px', color: 'var(--color-danger)' }}>
                            <i className="bi bi-trash" style={{ fontSize: '13px' }}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {suppliers.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '48px' }}>
                        <i className="bi bi-truck" style={{ fontSize: '48px', color: 'var(--text-muted)', display: 'block', marginBottom: '12px' }}></i>
                        No suppliers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detail Drawer (click a row to expand) */}
        {viewingSupplier && (
          <div className="card fade-in" style={{ width: '320px', flexShrink: 0, position: 'sticky', top: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, fontSize: '16px' }}>{viewingSupplier.name}</h3>
              <button className="navbar-icon-btn" onClick={() => setViewingSupplier(null)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              {[
                { icon: 'person', label: 'Contact', value: viewingSupplier.contact_person },
                { icon: 'telephone', label: 'Phone', value: viewingSupplier.phone },
                { icon: 'envelope', label: 'Email', value: viewingSupplier.email },
                { icon: 'geo-alt', label: 'Address', value: viewingSupplier.address },
                { icon: 'box-seam', label: 'Items Supplied', value: viewingSupplier.items_supplied },
                { icon: 'credit-card', label: 'Payment Terms', value: viewingSupplier.payment_terms },
                { icon: 'calendar-check', label: 'Delivery Schedule', value: viewingSupplier.delivery_schedule },
              ].map(({ icon, label, value }) => value ? (
                <div key={label}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{label}</p>
                  <p style={{ color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                    <i className={`bi bi-${icon}`} style={{ marginRight: '6px', color: 'var(--color-primary)' }}></i>
                    {value}
                  </p>
                </div>
              ) : null)}
            </div>

            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: '8px' }} onClick={() => openModal(viewingSupplier)}>
                <i className="bi bi-pencil"></i> Edit
              </button>
              <button className="btn" style={{ flex: 1, padding: '8px', background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', border: '1px solid rgba(239,68,68,0.3)' }}
                onClick={() => handleDelete(viewingSupplier.id)}>
                <i className="bi bi-trash"></i> Remove
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', padding: '20px',
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
              <button className="navbar-icon-btn" onClick={closeModal}><i className="bi bi-x-lg"></i></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Supplier / Company Name *</label>
                  <input type="text" className="form-input" required value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Fresh Farms Ltd." />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input type="text" className="form-input" value={formData.contact_person}
                    onChange={e => setFormData({ ...formData, contact_person: e.target.value })} placeholder="e.g. Mr. Sharma" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="tel" className="form-input" value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 ..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="supplier@example.com" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <input type="text" className="form-input" value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Full address..." />
              </div>

              <div className="form-group">
                <label className="form-label">Items / Products Supplied</label>
                <input type="text" className="form-input" value={formData.items_supplied}
                  onChange={e => setFormData({ ...formData, items_supplied: e.target.value })}
                  placeholder="e.g. Vegetables, Dairy, Bread..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Payment Terms</label>
                  <input type="text" className="form-input" value={formData.payment_terms}
                    onChange={e => setFormData({ ...formData, payment_terms: e.target.value })}
                    placeholder="e.g. Net 30 days, Advance..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Delivery Schedule</label>
                  <input type="text" className="form-input" value={formData.delivery_schedule}
                    onChange={e => setFormData({ ...formData, delivery_schedule: e.target.value })}
                    placeholder="e.g. Every Monday & Thursday..." />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-success)' }} />
                <span style={{ color: formData.is_active ? 'var(--color-success)' : 'var(--text-muted)' }}>
                  {formData.is_active ? 'Active Supplier' : 'Inactive / On Hold'}
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className={`btn btn-primary ${isSaving ? 'btn-loading' : ''}`} disabled={isSaving}>
                  {isSaving ? <span className="btn-spinner"></span> : <i className="bi bi-check-lg"></i>}
                  {editingSupplier ? 'Save Changes' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

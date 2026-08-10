/**
 * Customers Management Page.
 * Displays a list of customers with search, loyalty points, and CRUD capabilities.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { customersAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Customers() {
  const { user } = useAuth();
  const isManager = ['admin', 'manager'].includes(user?.role);
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', loyalty_points: 0, preferences: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Debounce search slightly
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchCustomers = async () => {
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      
      const res = await customersAPI.list(params);
      setCustomers(res.data.customers);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        loyalty_points: customer.loyalty_points || 0,
        preferences: customer.preferences || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '', phone: '', email: '', loyalty_points: 0, preferences: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const payload = {
        ...formData,
        phone: formData.phone || null,
        email: formData.email || null,
        loyalty_points: parseInt(formData.loyalty_points) || 0,
        preferences: formData.preferences || null,
      };

      if (editingCustomer) {
        await customersAPI.update(editingCustomer.id, payload);
        toast.success('Customer updated successfully!');
      } else {
        await customersAPI.create(payload);
        toast.success('Customer added successfully!');
      }
      closeModal();
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save customer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await customersAPI.delete(id);
      toast.success('Customer deleted');
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  if (loading && customers.length === 0) {
    return <LoadingSpinner fullPage message="Loading customer database..." />;
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title">Customers</h1>
            <p className="page-subtitle">Manage customer profiles and loyalty points</p>
          </div>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <i className="bi bi-person-plus-fill"></i> Add Customer
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div className="form-input-wrapper" style={{ margin: 0 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <i className="bi bi-search form-input-icon"></i>
        </div>
      </div>

      {/* Customer List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Loyalty Points</th>
                <th>Preferences / Notes</th>
                <th style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => (
                <tr key={customer.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: 'var(--color-primary-glow)',
                        color: 'var(--color-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '14px'
                      }}>
                        {customer.name[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{customer.name}</span>
                    </div>
                  </td>
                  <td>
                    {customer.phone && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}><i className="bi bi-telephone"></i> {customer.phone}</div>}
                    {customer.email && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}><i className="bi bi-envelope"></i> {customer.email}</div>}
                    {!customer.phone && !customer.email && <span className="text-muted" style={{fontSize:'12px'}}>No contact info</span>}
                  </td>
                  <td>
                    <span className="badge badge-success" style={{ padding: '4px 8px', fontSize: '12px' }}>
                      <i className="bi bi-star-fill"></i> {customer.loyalty_points} pts
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {customer.preferences || '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="navbar-icon-btn" onClick={() => openModal(customer)} style={{ width: '32px', height: '32px' }} title="Edit">
                        <i className="bi bi-pencil" style={{ fontSize: '14px' }}></i>
                      </button>
                      {isManager && (
                        <button className="navbar-icon-btn" onClick={() => handleDelete(customer.id)} style={{ width: '32px', height: '32px', color: 'var(--color-danger)' }} title="Delete">
                          <i className="bi bi-trash" style={{ fontSize: '14px' }}></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                    <i className="bi bi-people text-muted" style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}></i>
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal overlay */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', padding: '20px'
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button className="navbar-icon-btn" onClick={closeModal}><i className="bi bi-x-lg"></i></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <div className="form-input-wrapper">
                  <input type="text" className="form-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Customer Name" />
                  <i className="bi bi-person form-input-icon"></i>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <div className="form-input-wrapper">
                    <input type="tel" className="form-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="e.g. +91 9876543210" />
                    <i className="bi bi-telephone form-input-icon"></i>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Loyalty Points</label>
                  <div className="form-input-wrapper">
                    <input type="number" min="0" className="form-input" required value={formData.loyalty_points} onChange={e => setFormData({...formData, loyalty_points: e.target.value})} />
                    <i className="bi bi-star form-input-icon"></i>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="form-input-wrapper">
                  <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="customer@example.com" />
                  <i className="bi bi-envelope form-input-icon"></i>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Dietary Preferences / Notes</label>
                <textarea className="form-input" rows="3" value={formData.preferences} onChange={e => setFormData({...formData, preferences: e.target.value})} placeholder="e.g. Vegan, allergic to peanuts..."></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className={`btn btn-primary ${isSaving ? 'btn-loading' : ''}`} disabled={isSaving}>
                  {isSaving ? <span className="btn-spinner"></span> : <i className="bi bi-check-lg"></i>}
                  {editingCustomer ? 'Save Changes' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

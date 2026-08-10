import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { usersAPI } from '../services/api';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || 'Restaurant Admin',
    email: user?.email || 'admin@restaurant.com',
    role: user?.role || 'admin'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await usersAPI.updateMe({ full_name: formData.name });
      updateUser({ full_name: formData.name });
      toast.success('Profile details updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="mb-4">
        <h1 className="page-title">👤 User Profile</h1>
        <p className="page-subtitle">Manage your account information and credentials.</p>
      </div>

      <div className="card">
        <div className="d-flex align-items-center gap-4 mb-4 pb-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary), #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '28px',
              fontWeight: 700
            }}
          >
            {formData.name.charAt(0)}
          </div>
          <div>
            <h2 style={{ fontSize: '20px', margin: 0 }}>{formData.name}</h2>
            <div className="badge badge-primary mt-1" style={{ textTransform: 'capitalize' }}>
              {formData.role}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {formData.email}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled
            />
            <small style={{ color: 'var(--text-muted)' }}>Email address cannot be modified.</small>
          </div>
          <div className="mb-4">
            <label className="form-label">Assigned System Role</label>
            <input
              type="text"
              className="form-control"
              value={formData.role}
              disabled
              style={{ textTransform: 'capitalize' }}
            />
          </div>
          <div className="d-flex justify-content-end">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

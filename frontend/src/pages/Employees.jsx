/**
 * Employee Management Page.
 * Displays staff roster with roles, shifts, departments, and salary info.
 * Restricted to Admin/Manager.
 */

import { useState, useEffect } from 'react';
import { employeesAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

const DEPARTMENTS = ['Kitchen', 'Service', 'Bar', 'Management', 'Delivery', 'Cleaning', 'Security'];
const SHIFTS = ['Morning (6am–2pm)', 'Afternoon (2pm–10pm)', 'Night (10pm–6am)', 'Full Day'];

const DEPT_COLORS = {
  Kitchen: '#f97316',
  Service: '#3b82f6',
  Bar: '#8b5cf6',
  Management: '#10b981',
  Delivery: '#f59e0b',
  Cleaning: '#6b7280',
  Security: '#ef4444',
};

const emptyForm = {
  name: '', role: '', department: DEPARTMENTS[0],
  phone: '', email: '', salary: '', shift: SHIFTS[0],
  join_date: new Date().toISOString().split('T')[0], is_active: true,
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(t);
  }, [searchQuery, filterDept, activeOnly]);

  const fetchEmployees = async () => {
    try {
      const params = { per_page: 100 };
      if (searchQuery) params.search = searchQuery;
      if (filterDept) params.department = filterDept;
      if (activeOnly) params.active_only = true;
      const res = await employeesAPI.list(params);
      setEmployees(res.data.employees);
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (emp = null) => {
    if (emp) {
      setEditingEmployee(emp);
      setFormData({
        name: emp.name,
        role: emp.role,
        department: emp.department,
        phone: emp.phone || '',
        email: emp.email || '',
        salary: emp.salary || '',
        shift: emp.shift || SHIFTS[0],
        join_date: emp.join_date || new Date().toISOString().split('T')[0],
        is_active: emp.is_active,
      });
    } else {
      setEditingEmployee(null);
      setFormData(emptyForm);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingEmployee(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        phone: formData.phone || null,
        email: formData.email || null,
      };
      if (editingEmployee) {
        await employeesAPI.update(editingEmployee.id, payload);
        toast.success('Employee updated!');
      } else {
        await employeesAPI.create(payload);
        toast.success('Employee added!');
      }
      closeModal();
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this employee from the roster?')) return;
    try {
      await employeesAPI.delete(id);
      toast.success('Employee removed');
      fetchEmployees();
    } catch { toast.error('Failed to delete'); }
  };

  // Stats
  const total = employees.length;
  const active = employees.filter(e => e.is_active).length;
  const totalSalary = employees
    .filter(e => e.is_active && e.salary)
    .reduce((s, e) => s + e.salary, 0);
  const deptCounts = employees.reduce((acc, e) => {
    acc[e.department] = (acc[e.department] || 0) + 1;
    return acc;
  }, {});
  const topDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0];

  if (loading) return <LoadingSpinner fullPage message="Loading employee roster..." />;

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title">Employee Management</h1>
            <p className="page-subtitle">Manage staff roster, roles, and shift assignments</p>
          </div>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <i className="bi bi-person-plus-fill"></i> Add Employee
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div>
            <p className="stat-label">Total Staff</p>
            <p className="stat-value">{total}</p>
            <p className="stat-change positive">{active} active</p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--color-primary)' }}>
            <i className="bi bi-people-fill"></i>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">Monthly Salary Cost</p>
            <p className="stat-value">₹{totalSalary.toLocaleString('en-IN')}</p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>
            <i className="bi bi-cash-stack"></i>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <p className="stat-label">Largest Department</p>
            <p className="stat-value" style={{ fontSize: '20px' }}>{topDept ? topDept[0] : '—'}</p>
            <p className="stat-change">{topDept ? `${topDept[1]} staff` : ''}</p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
            <i className="bi bi-building"></i>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="form-input-wrapper" style={{ margin: 0, flex: 1, minWidth: '220px' }}>
          <input type="text" className="form-input" placeholder="Search by name or role..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <i className="bi bi-search form-input-icon"></i>
        </div>
        <select className="form-input" style={{ width: '160px', margin: 0 }}
          value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', color: activeOnly ? 'var(--color-success)' : 'var(--text-secondary)' }}>
          <input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: 'var(--color-success)' }} />
          Active only
        </label>
      </div>

      {/* Employee Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {employees.map(emp => {
          const color = DEPT_COLORS[emp.department] || 'var(--color-primary)';
          return (
            <div key={emp.id} className="card" style={{
              padding: '20px', position: 'relative', overflow: 'hidden',
              border: emp.is_active ? '1px solid var(--border-subtle)' : '1px dashed var(--border-subtle)',
              opacity: emp.is_active ? 1 : 0.6,
            }}>
              {/* Dept colour bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: color }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {/* Avatar + name */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: `${color}22`, color, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '18px', flexShrink: 0,
                  }}>
                    {emp.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>{emp.name}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 0 }}>{emp.role}</p>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="navbar-icon-btn" onClick={() => openModal(emp)} style={{ width: '30px', height: '30px' }}>
                    <i className="bi bi-pencil" style={{ fontSize: '12px' }}></i>
                  </button>
                  <button className="navbar-icon-btn" onClick={() => handleDelete(emp.id)}
                    style={{ width: '30px', height: '30px', color: 'var(--color-danger)' }}>
                    <i className="bi bi-trash" style={{ fontSize: '12px' }}></i>
                  </button>
                </div>
              </div>

              {/* Details */}
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: `${color}22`, color }}>
                    {emp.department}
                  </span>
                  {emp.shift && (
                    <span className="badge" style={{ fontSize: '11px', background: 'var(--bg-base)', color: 'var(--text-secondary)' }}>
                      <i className="bi bi-clock"></i> {emp.shift.split('(')[0].trim()}
                    </span>
                  )}
                  {!emp.is_active && <span className="badge badge-danger" style={{ fontSize: '11px' }}>Inactive</span>}
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                  {emp.phone && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      <i className="bi bi-telephone"></i> {emp.phone}
                    </span>
                  )}
                  {emp.salary && (
                    <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 600 }}>
                      ₹{emp.salary.toLocaleString('en-IN')}/mo
                    </span>
                  )}
                </div>
                {emp.join_date && (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                    Joined: {new Date(emp.join_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {employees.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <i className="bi bi-people" style={{ fontSize: '56px', display: 'block', marginBottom: '12px' }}></i>
          <p>No employees found. Add your first team member!</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', padding: '20px',
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h2>
              <button className="navbar-icon-btn" onClick={closeModal}><i className="bi bi-x-lg"></i></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input type="text" className="form-input" required value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Ravi Kumar" />
                </div>
                <div className="form-group">
                  <label className="form-label">Role / Designation *</label>
                  <input type="text" className="form-input" required value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })} placeholder="e.g. Head Chef" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select className="form-input" required value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Shift</label>
                  <select className="form-input" value={formData.shift}
                    onChange={e => setFormData({ ...formData, shift: e.target.value })}>
                    {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="tel" className="form-input" value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 ..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Salary (₹)</label>
                  <input type="number" min="0" className="form-input" value={formData.salary}
                    onChange={e => setFormData({ ...formData, salary: e.target.value })} placeholder="e.g. 25000" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="emp@restaurant.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Join Date</label>
                  <input type="date" className="form-input" value={formData.join_date}
                    onChange={e => setFormData({ ...formData, join_date: e.target.value })} />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-success)' }} />
                <span style={{ color: formData.is_active ? 'var(--color-success)' : 'var(--text-muted)' }}>
                  {formData.is_active ? 'Currently Active' : 'Inactive (on leave / terminated)'}
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className={`btn btn-primary ${isSaving ? 'btn-loading' : ''}`} disabled={isSaving}>
                  {isSaving ? <span className="btn-spinner"></span> : <i className="bi bi-check-lg"></i>}
                  {editingEmployee ? 'Save Changes' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

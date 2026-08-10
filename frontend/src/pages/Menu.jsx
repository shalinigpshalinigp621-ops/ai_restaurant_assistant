/**
 * Menu Management Page — Displays, adds, and edits food items.
 * Uses a premium card grid for items, and a modal for CRUD operations.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { menuAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CATEGORIES = [
  { id: 'APPETIZER', label: 'Appetizers' },
  { id: 'MAIN_COURSE', label: 'Main Courses' },
  { id: 'DESSERT', label: 'Desserts' },
  { id: 'BEVERAGE', label: 'Beverages' },
];

export default function Menu() {
  const { user } = useAuth();
  const isManager = ['admin', 'manager'].includes(user?.role);
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', category: 'MAIN_COURSE',
    price: '', cost_price: '', is_available: true,
    is_vegetarian: false, calories: '', preparation_time: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchMenu();
  }, [filterCategory, searchQuery]);

  const fetchMenu = async () => {
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (searchQuery) params.search = searchQuery;
      
      const res = await menuAPI.list(params);
      setItems(res.data.items);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name, description: item.description || '', category: item.category,
        price: item.price, cost_price: item.cost_price || '', is_available: item.is_available,
        is_vegetarian: item.is_vegetarian, calories: item.calories || '', preparation_time: item.preparation_time || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '', description: '', category: 'MAIN_COURSE',
        price: '', cost_price: '', is_available: true,
        is_vegetarian: false, calories: '', preparation_time: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Parse numbers
    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
      calories: formData.calories ? parseInt(formData.calories) : null,
      preparation_time: formData.preparation_time ? parseInt(formData.preparation_time) : null,
    };

    try {
      if (editingItem) {
        await menuAPI.update(editingItem.id, payload);
        toast.success('Menu item updated!');
      } else {
        await menuAPI.create(payload);
        toast.success('Menu item created!');
      }
      closeModal();
      fetchMenu();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await menuAPI.delete(id);
      toast.success('Item deleted');
      fetchMenu();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  if (loading) return <LoadingSpinner fullPage message="Loading menu..." />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title">Menu Management</h1>
            <p className="page-subtitle">Manage dishes, pricing, and availability</p>
          </div>
          {isManager && (
            <button className="btn btn-primary" onClick={() => openModal()}>
              <i className="bi bi-plus-lg"></i> Add Item
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div className="form-input-wrapper" style={{ flex: 1, minWidth: '200px', margin: 0 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <i className="bi bi-search form-input-icon"></i>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button 
            className={`btn btn-sm ${filterCategory === '' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilterCategory('')}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button 
              key={cat.id}
              className={`btn btn-sm ${filterCategory === cat.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      {items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <i className="bi bi-journal-x" style={{ fontSize: '48px', color: 'var(--text-muted)' }}></i>
          <h3 style={{ marginTop: '16px' }}>No items found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {items.map(item => (
            <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ 
                height: '140px', 
                background: item.image_url ? `url(${item.image_url}) center/cover` : 'var(--bg-elevated)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '12px',
                borderBottom: '1px solid var(--border-subtle)'
              }}>
                {!item.image_url && <i className="bi bi-image" style={{ fontSize: '32px', color: 'var(--text-muted)', margin: 'auto' }}></i>}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {item.is_vegetarian && (
                    <span className="badge badge-success" style={{ boxShadow: 'var(--shadow-sm)' }}><i className="bi bi-circle-fill text-success" style={{fontSize:'8px'}}></i> Veg</span>
                  )}
                  {!item.is_available && (
                    <span className="badge badge-danger" style={{ boxShadow: 'var(--shadow-sm)' }}>Out of Stock</span>
                  )}
                </div>
              </div>
              
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{item.name}</h3>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>₹{item.price}</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.description || 'No description provided.'}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {item.category.replace('_', ' ')}
                  </span>
                  
                  {isManager && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="navbar-icon-btn" onClick={() => openModal(item)} style={{ width: '28px', height: '28px' }} title="Edit">
                        <i className="bi bi-pencil" style={{ fontSize: '12px' }}></i>
                      </button>
                      <button className="navbar-icon-btn" onClick={() => handleDelete(item.id)} style={{ width: '28px', height: '28px', color: 'var(--color-danger)' }} title="Delete">
                        <i className="bi bi-trash" style={{ fontSize: '12px' }}></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal overlay */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', padding: '20px'
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{editingItem ? 'Edit Menu Item' : 'Add New Item'}</h2>
              <button className="navbar-icon-btn" onClick={closeModal}><i className="bi bi-x-lg"></i></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Item Name *</label>
                  <input type="text" className="form-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-input" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Selling Price (₹) *</label>
                  <input type="number" step="0.01" min="0" className="form-input" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cost Price (₹)</label>
                  <input type="number" step="0.01" min="0" className="form-input" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Calories</label>
                  <input type="number" min="0" className="form-input" value={formData.calories} onChange={e => setFormData({...formData, calories: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Prep Time (mins)</label>
                  <input type="number" min="0" className="form-input" value={formData.preparation_time} onChange={e => setFormData({...formData, preparation_time: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '24px', padding: '12px', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                  <input type="checkbox" checked={formData.is_vegetarian} onChange={e => setFormData({...formData, is_vegetarian: e.target.checked})} style={{ width: '16px', height: '16px', accentColor: 'var(--color-success)' }} />
                  Vegetarian
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                  <input type="checkbox" checked={formData.is_available} onChange={e => setFormData({...formData, is_available: e.target.checked})} style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }} />
                  Available
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className={`btn btn-primary ${isSaving ? 'btn-loading' : ''}`} disabled={isSaving}>
                  {isSaving ? <span className="btn-spinner"></span> : <i className="bi bi-check-lg"></i>}
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

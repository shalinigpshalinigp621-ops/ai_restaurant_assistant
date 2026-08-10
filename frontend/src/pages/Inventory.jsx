/**
 * Inventory Management Page.
 * Tracks stock levels, highlights low stock, and allows updates.
 * Restricted to managers and admins.
 */

import { useState, useEffect } from 'react';
import { inventoryAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    item_name: '', category: '', quantity: '', unit: '', reorder_level: '', unit_price: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventory();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showLowStock]);

  const fetchInventory = async () => {
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (showLowStock) params.low_stock_only = true;
      
      const res = await inventoryAPI.list(params);
      setInventory(res.data.items);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        item_name: item.item_name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        reorder_level: item.reorder_level,
        unit_price: item.unit_price || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        item_name: '', category: '', quantity: '', unit: 'kg', reorder_level: '', unit_price: ''
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
    
    try {
      const payload = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        reorder_level: parseFloat(formData.reorder_level),
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
      };

      if (editingItem) {
        await inventoryAPI.update(editingItem.id, payload);
        toast.success('Inventory updated successfully!');
      } else {
        await inventoryAPI.create(payload);
        toast.success('Item added to inventory!');
      }
      closeModal();
      fetchInventory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this item from inventory?')) return;
    try {
      await inventoryAPI.delete(id);
      toast.success('Item removed');
      fetchInventory();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  if (loading && inventory.length === 0) {
    return <LoadingSpinner fullPage message="Counting stock..." />;
  }

  // Calculate stats
  const totalItems = inventory.length;
  const lowStockCount = inventory.filter(i => i.quantity <= i.reorder_level).length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title">Inventory Management</h1>
            <p className="page-subtitle">Track raw materials, stock levels, and costs</p>
          </div>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <i className="bi bi-box-seam"></i> Add New Item
          </button>
        </div>
      </div>

      {/* Mini Stats */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ '--gradient': 'var(--color-primary)' }}>
          <div>
            <p className="stat-label">Total Unique Items</p>
            <p className="stat-value">{totalItems}</p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--color-primary)' }}>
            <i className="bi bi-boxes"></i>
          </div>
        </div>
        <div className="stat-card" style={{ '--gradient': 'var(--color-danger)' }}>
          <div>
            <p className="stat-label">Low Stock Alerts</p>
            <p className="stat-value">{lowStockCount}</p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}>
            <i className="bi bi-exclamation-octagon"></i>
          </div>
        </div>
        <div className="stat-card" style={{ '--gradient': 'var(--color-success)' }}>
          <div>
            <p className="stat-label">Estimated Stock Value</p>
            <p className="stat-value">₹{totalValue.toFixed(2)}</p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>
            <i className="bi bi-cash-stack"></i>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="form-input-wrapper" style={{ margin: 0, flex: 1, minWidth: '250px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <i className="bi bi-search form-input-icon"></i>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: showLowStock ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
          <input 
            type="checkbox" 
            checked={showLowStock} 
            onChange={(e) => setShowLowStock(e.target.checked)} 
            style={{ width: '18px', height: '18px', accentColor: 'var(--color-danger)' }} 
          />
          Show low stock only
        </label>
      </div>

      {/* Inventory List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Reorder Level</th>
                <th>Unit Cost</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => {
                const isCritical = item.quantity <= (item.reorder_level / 2);
                const isLow = item.quantity <= item.reorder_level;
                
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.item_name}</td>
                    <td><span style={{ fontSize: '12px', background: 'var(--bg-base)', padding: '4px 8px', borderRadius: '4px' }}>{item.category}</span></td>
                    <td style={{ fontWeight: 800, color: isCritical ? 'var(--color-danger)' : isLow ? 'var(--color-warning)' : 'var(--text-primary)' }}>
                      {item.quantity} {item.unit}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{item.reorder_level} {item.unit}</td>
                    <td>{item.unit_price ? `₹${item.unit_price}` : '—'}</td>
                    <td>
                      {isCritical ? (
                        <span className="badge badge-danger">Critical</span>
                      ) : isLow ? (
                        <span className="badge badge-warning">Low Stock</span>
                      ) : (
                        <span className="badge badge-success">Good</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="navbar-icon-btn" onClick={() => openModal(item)} style={{ width: '32px', height: '32px' }} title="Update Stock">
                          <i className="bi bi-pencil" style={{ fontSize: '14px' }}></i>
                        </button>
                        <button className="navbar-icon-btn" onClick={() => handleDelete(item.id)} style={{ width: '32px', height: '32px', color: 'var(--color-danger)' }} title="Delete">
                          <i className="bi bi-trash" style={{ fontSize: '14px' }}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {inventory.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                    <i className="bi bi-box-seam text-muted" style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}></i>
                    No inventory items found.
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
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{editingItem ? 'Update Inventory' : 'Add Inventory Item'}</h2>
              <button className="navbar-icon-btn" onClick={closeModal}><i className="bi bi-x-lg"></i></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Item Name *</label>
                <input type="text" className="form-input" required value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} placeholder="e.g. Basmati Rice" />
              </div>

              <div className="form-group">
                <label className="form-label">Category *</label>
                <input type="text" className="form-input" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. Grains, Vegetables, Dairy..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Current Quantity *</label>
                  <input type="number" step="0.01" min="0" className="form-input" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit *</label>
                  <select className="form-input" required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                    <option value="kg">kg</option>
                    <option value="g">grams</option>
                    <option value="L">Liters</option>
                    <option value="ml">ml</option>
                    <option value="pcs">Pieces</option>
                    <option value="boxes">Boxes</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Reorder Level *</label>
                  <input type="number" step="0.01" min="0" className="form-input" required value={formData.reorder_level} onChange={e => setFormData({...formData, reorder_level: e.target.value})} placeholder="Alert when below" />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Cost (₹)</label>
                  <input type="number" step="0.01" min="0" className="form-input" value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: e.target.value})} placeholder="Cost per unit" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className={`btn btn-primary ${isSaving ? 'btn-loading' : ''}`} disabled={isSaving}>
                  {isSaving ? <span className="btn-spinner"></span> : <i className="bi bi-check-lg"></i>}
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Orders / Point of Sale (POS) Page.
 * Handles creating new orders (POS) and viewing order history.
 */

import { useState, useEffect } from 'react';
import { menuAPI, ordersAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CATEGORIES = [
  { id: 'APPETIZER', label: 'Appetizers' },
  { id: 'MAIN_COURSE', label: 'Main Courses' },
  { id: 'DESSERT', label: 'Desserts' },
  { id: 'BEVERAGE', label: 'Beverages' },
];

export default function Orders() {
  const [activeTab, setActiveTab] = useState('POS'); // 'POS' or 'HISTORY'
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // POS State
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('DINE_IN');
  const [tableNumber, setTableNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === 'POS') fetchMenu();
    else fetchOrders();
  }, [activeTab, filterCategory, searchQuery]);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (searchQuery) params.search = searchQuery;
      const res = await menuAPI.list(params);
      setMenuItems(res.data.items.filter(item => item.is_available));
    } catch (error) {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await ordersAPI.list();
      setOrders(res.data.orders);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // --- POS Logic ---
  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateCartQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const tax = subtotal * 0.05; // 5% GST
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error('Cart is empty');
    if (orderType === 'DINE_IN' && !tableNumber) return toast.error('Table number is required for Dine-in');

    setIsSubmitting(true);
    try {
      const payload = {
        order_type: orderType,
        table_number: tableNumber || null,
        notes: notes || null,
        discount_amount: 0,
        items: cart.map(i => ({ menu_item_id: i.id, quantity: i.qty }))
      };
      
      await ordersAPI.create(payload);
      toast.success('Order placed successfully!');
      
      // Reset POS
      setCart([]);
      setTableNumber('');
      setNotes('');
      // Optionally switch to history
      setActiveTab('HISTORY');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- History Logic ---
  const updateOrderStatus = async (id, status) => {
    try {
      await ordersAPI.updateStatus(id, { status });
      toast.success(`Order marked as ${status.replace('_', ' ')}`);
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PENDING': return 'badge-warning';
      case 'PREPARING': return 'badge-info';
      case 'READY': return 'badge-primary';
      case 'COMPLETED': return 'badge-success';
      case 'CANCELLED': return 'badge-danger';
      default: return '';
    }
  };

  return (
    <div className="fade-in" style={{ height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header & Tabs */}
      <div className="page-header" style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Orders & POS</h1>
            <p className="page-subtitle">Manage new orders and track history</p>
          </div>
          
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <button 
              className={`btn btn-sm ${activeTab === 'POS' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('POS')}
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              <i className="bi bi-display"></i> Point of Sale
            </button>
            <button 
              className={`btn btn-sm ${activeTab === 'HISTORY' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('HISTORY')}
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              <i className="bi bi-clock-history"></i> Order History
            </button>
          </div>
        </div>
      </div>

      {loading && activeTab === 'HISTORY' && <LoadingSpinner fullPage={false} message="Loading orders..." />}

      {/* Point of Sale View */}
      {activeTab === 'POS' && (
        <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
          
          {/* Menu Selection Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div className="form-input-wrapper" style={{ flex: 1, margin: 0 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <i className="bi bi-search form-input-icon"></i>
              </div>
              <select 
                className="form-input" 
                style={{ width: '150px', margin: 0 }}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>

            {/* Grid */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              {loading ? (
                <LoadingSpinner />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {menuItems.map(item => (
                    <div 
                      key={item.id} 
                      className="card" 
                      style={{ padding: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-subtle)' }}
                      onClick={() => addToCart(item)}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                    >
                      <div style={{ height: '100px', background: item.image_url ? `url(${item.image_url}) center/cover` : 'var(--bg-base)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}></div>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h4>
                      <p style={{ color: 'var(--color-primary)', fontWeight: 800, margin: 0 }}>₹{item.price}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart Area */}
          <div className="card" style={{ width: '380px', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Current Order</h3>
            </div>

            {/* Cart Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                  <i className="bi bi-cart-x" style={{ fontSize: '48px' }}></i>
                  <p>Cart is empty</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {cart.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{item.name}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>₹{item.price} x {item.qty}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={() => updateCartQty(item.id, -1)}>-</button>
                        <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={() => updateCartQty(item.id, 1)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkout Form */}
            <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <select className="form-input" value={orderType} onChange={e => setOrderType(e.target.value)} style={{ flex: 1 }}>
                  <option value="DINE_IN">Dine-in</option>
                  <option value="TAKEAWAY">Takeaway</option>
                  <option value="DELIVERY">Delivery</option>
                </select>
                {orderType === 'DINE_IN' && (
                  <input type="text" className="form-input" placeholder="Table #" value={tableNumber} onChange={e => setTableNumber(e.target.value)} style={{ width: '80px' }} />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tax (5%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>

              <button 
                className={`btn btn-primary btn-block ${isSubmitting ? 'btn-loading' : ''}`} 
                onClick={handleCheckout}
                disabled={cart.length === 0 || isSubmitting}
                style={{ height: '48px', fontSize: '16px' }}
              >
                {isSubmitting ? <span className="btn-spinner"></span> : <><i className="bi bi-credit-card-fill"></i> Place Order</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order History View */}
      {activeTab === 'HISTORY' && (
        <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="table-wrapper" style={{ flex: 1, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 700 }}>#{order.id}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{new Date(order.created_at).toLocaleString()}</td>
                    <td>
                      {order.order_type.replace('_', ' ')}
                      {order.table_number && <span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Table {order.table_number}</span>}
                    </td>
                    <td>{order.items.length} items</td>
                    <td style={{ fontWeight: 700 }}>₹{order.total_amount.toFixed(2)}</td>
                    <td><span className={`badge ${getStatusBadgeClass(order.status)}`}>{order.status}</span></td>
                    <td>
                      <div className="dropdown" style={{ display: 'inline-block' }}>
                        <select 
                          className="form-input" 
                          style={{ padding: '4px 28px 4px 8px', fontSize: '12px', height: 'auto', background: 'var(--bg-base)' }}
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="PREPARING">Preparing</option>
                          <option value="READY">Ready</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && !loading && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                      <i className="bi bi-inbox text-muted" style={{ fontSize: '32px', display: 'block' }}></i>
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

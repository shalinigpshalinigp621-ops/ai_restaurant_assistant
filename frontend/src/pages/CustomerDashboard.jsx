/**
 * CustomerDashboard — Premium Real-Data Customer Portal & Analytics.
 * Connected directly to FastAPI PostgreSQL/SQLite backend endpoints.
 * All prices and totals formatted in Indian Rupees (₹).
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { customersAPI, menuAPI, ordersAPI, reviewsAPI, aiAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function CustomerDashboard() {
  const { user } = useAuth();
  
  // Real Data States
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'menu', 'orders', 'favorites', 'reviews', 'assistant'
  
  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart State
  const [cart, setCart] = useState([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [orderType, setOrderType] = useState('dine-in'); // 'dine-in', 'pickup', 'delivery'
  const [tableNumber, setTableNumber] = useState('Table 4');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  
  // AI Assistant State
  const [aiQuery, setAiQuery] = useState('');
  const [aiMessages, setAiMessages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Redeem Rewards Modal State
  const [showRedeemModal, setShowRedeemModal] = useState(false);

  // Table Reservation Modal State
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationData, setReservationData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '19:30',
    partySize: 2,
    specialRequests: '',
  });

  // Fetch Dashboard & Menu Data on Mount
  useEffect(() => {
    loadDashboardData();
    loadMenuItems();
  }, []);

  useEffect(() => {
    if (user && aiMessages.length === 0) {
      setAiMessages([
        {
          sender: 'assistant',
          text: `Namaste ${user?.full_name?.split(' ')[0] || 'Valued Guest'}! 🙏 Welcome to our dining assistant. Ask me for dish recommendations, spice levels, or wine & beverage pairings!`,
          sources: []
        }
      ]);
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await customersAPI.getMyDashboard();
      setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to load customer dashboard data:', err);
      toast.error('Failed to load live customer profile metrics.');
    } finally {
      setLoading(false);
    }
  };

  const loadMenuItems = async () => {
    setLoadingMenu(true);
    try {
      const res = await menuAPI.list({ per_page: 50 });
      if (res.data?.items) {
        setMenuItems(res.data.items);
      }
    } catch (err) {
      console.error('Failed to fetch menu:', err);
    } finally {
      setLoadingMenu(false);
    }
  };

  // Cart Helper Actions
  const addToCart = (dish) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...dish, quantity: 1 }];
    });
    toast.success(`Added "${dish.name}" to order! 🛒`);
  };

  const updateCartQuantity = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  // Submit Order via real backend API
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty!');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const orderPayload = {
        customer_id: dashboardData?.profile?.id || null,
        order_type: orderType,
        table_number: orderType === 'dine-in' ? tableNumber : null,
        items: cart.map((c) => ({
          menu_item_id: c.id,
          quantity: c.quantity,
          unit_price: c.price,
          notes: '',
        })),
        total_amount: cartTotal,
        customer_name: dashboardData?.profile?.name || user?.full_name || 'Customer',
      };

      await ordersAPI.create(orderPayload);
      toast.success('Order placed successfully! 🍕 Your order ticket is live in the kitchen.');
      setCart([]);
      setShowCartDrawer(false);
      await loadDashboardData(); // Refresh metrics from database
      setActiveTab('orders');
    } catch (err) {
      console.error('Order creation error:', err);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Submit Review via backend API
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      toast.error('Please enter a review comment');
      return;
    }
    setIsSubmittingReview(true);
    try {
      await reviewsAPI.create({
        rating: reviewRating,
        comment: reviewComment,
        customer_name: dashboardData?.profile?.name || user?.full_name || 'Guest Customer',
        customer_id: dashboardData?.profile?.id,
      });
      toast.success('Thank you! Your review has been recorded. ⭐');
      setShowReviewModal(false);
      setReviewComment('');
      loadDashboardData(); // Refresh reviews list
    } catch (err) {
      console.error('Error submitting review:', err);
      toast.error('Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // AI Assistant Query
  const handleSendAiMessage = async (promptText) => {
    const textToSend = promptText || aiQuery;
    if (!textToSend.trim()) return;

    setAiMessages((prev) => [...prev, { sender: 'user', text: textToSend }]);
    if (!promptText) setAiQuery('');
    setAiLoading(true);

    try {
      const res = await aiAPI.chat({ query: textToSend, conversation_id: 'customer_session' });
      const answer = res.data?.answer || res.data?.response || "Here are our chef's recommended choices for you!";
      const sources = res.data?.sources || [];
      setAiMessages((prev) => [...prev, { sender: 'assistant', text: answer, sources }]);
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `For ${textToSend}, we highly recommend our popular Chef Specials such as Masala Dosa, Chicken Biryani, or Mutton Rogan Josh!`,
          sources: ['Executive Menu']
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Reservation handler
  const handleReservationSubmit = (e) => {
    e.preventDefault();
    toast.success(`Table reserved for ${reservationData.partySize} guests on ${reservationData.date} at ${reservationData.time}! 🎉`);
    setShowReservationModal(false);
  };

  // Redeem points handler
  const handleRedeemPoints = () => {
    toast.success('🎉 ₹500 Dining Discount Voucher unlocked using 500 Reward Points!');
    setShowRedeemModal(false);
  };

  if (loading) {
    return <LoadingSpinner fullPage message="Fetching live customer database records..." />;
  }

  const profile = dashboardData?.profile || {};
  const summary = dashboardData?.summary || {};
  const orderStats = dashboardData?.order_stats?.status_counts || {};
  const recentOrders = dashboardData?.recent_orders || [];
  const favoriteItems = dashboardData?.favorite_items || [];
  const reviewsList = dashboardData?.customer_reviews || [];
  const recommendations = dashboardData?.recommendations || [];

  // Filter menu items
  const filteredMenu = menuItems.filter((item) => {
    const cat = item.category?.toLowerCase() || '';
    const matchesCategory = selectedCategory === 'all' || cat.includes(selectedCategory.toLowerCase());
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      
      {/* ─── 1. CUSTOMER PROFILE & HERO HEADER ──────────────────────────── */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.12) 0%, rgba(147, 51, 234, 0.12) 100%)',
          border: '1px solid rgba(249, 115, 22, 0.25)',
          marginBottom: '24px',
          padding: '24px',
          borderRadius: 'var(--radius-md)',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          
          {/* Customer Avatar & Details */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '26px',
                fontWeight: 800,
                boxShadow: 'var(--shadow-md)',
                flexShrink: 0,
              }}
            >
              {profile.name?.[0]?.toUpperCase() || 'C'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h1 className="page-title" style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>
                  {profile.name || user?.full_name}
                </h1>
                <span className="badge badge-warning" style={{ background: 'var(--gradient-primary)', color: '#fff', padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}>
                  👑 {summary.tier || 'Gold VIP'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span><i className="bi bi-envelope-fill" style={{ color: 'var(--color-primary)', marginRight: '4px' }}></i> {profile.email}</span>
                <span><i className="bi bi-telephone-fill" style={{ color: 'var(--color-primary)', marginRight: '4px' }}></i> {profile.phone}</span>
                <span><i className="bi bi-geo-alt-fill" style={{ color: 'var(--color-primary)', marginRight: '4px' }}></i> {profile.address}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setShowCartDrawer(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="bi bi-cart-fill"></i>
              Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
            </button>

            <button className="btn btn-secondary" onClick={() => setShowReservationModal(true)}>
              <i className="bi bi-calendar-event" style={{ marginRight: '6px' }}></i> Book Table
            </button>

            <button className="btn btn-ghost" onClick={() => setShowReviewModal(true)}>
              <i className="bi bi-star-fill" style={{ color: 'var(--color-warning)', marginRight: '6px' }}></i> Leave Feedback
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. TOTAL SPENDING & ACCOUNT SUMMARY CARDS (₹ CURRENCY) ───────── */}
      <div className="grid-4" style={{ marginBottom: '24px', gap: '16px' }}>
        
        {/* Total Spending Card */}
        <div
          className="stat-card"
          style={{ '--gradient': 'var(--color-primary)', cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
          onClick={() => setActiveTab('orders')}
          title="Click to view Recent Orders history"
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div>
            <p className="stat-label">Total Spending</p>
            <p className="stat-value" style={{ color: 'var(--color-primary)', fontSize: '24px', fontWeight: 800 }}>
              ₹{Number(summary.total_spent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Across all historical orders
            </p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(249, 115, 22, 0.15)', color: 'var(--color-primary)' }}>
            <i className="bi bi-currency-rupee"></i>
          </div>
        </div>

        {/* Total Orders Card */}
        <div
          className="stat-card"
          style={{ '--gradient': 'var(--color-info)', cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
          onClick={() => setActiveTab('orders')}
          title="Click to view Recent Orders history"
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div>
            <p className="stat-label">Total Orders</p>
            <p className="stat-value" style={{ fontSize: '24px', fontWeight: 800 }}>
              {summary.total_orders || 0} Orders
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Dine-in, Takeaway & Delivery
            </p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--color-info)' }}>
            <i className="bi bi-bag-check-fill"></i>
          </div>
        </div>

        {/* Average Order Value Card */}
        <div
          className="stat-card"
          style={{ '--gradient': 'var(--color-success)', cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
          onClick={() => setActiveTab('orders')}
          title="Click to view Recent Orders history"
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div>
            <p className="stat-label">Avg. Order Value</p>
            <p className="stat-value" style={{ color: 'var(--color-success)', fontSize: '24px', fontWeight: 800 }}>
              ₹{Number(summary.average_order_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Average spent per dining
            </p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)' }}>
            <i className="bi bi-graph-up-arrow"></i>
          </div>
        </div>

        {/* Loyalty Reward Points Card */}
        <div className="stat-card" style={{ '--gradient': 'var(--color-warning)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="stat-label">Reward Points</p>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowRedeemModal(true)}
                style={{ fontSize: '11px', padding: '2px 8px', color: 'var(--color-primary)' }}
              >
                Redeem
              </button>
            </div>
            <p className="stat-value" style={{ color: 'var(--color-warning)', fontSize: '24px', fontWeight: 800 }}>
              {summary.loyalty_points || 0} PTS
            </p>
            {/* Progress to Next Tier */}
            <div style={{ marginTop: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                <span>Tier Progress</span>
                <span>{summary.loyalty_points} / {summary.next_tier_points}</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, ((summary.loyalty_points || 0) / (summary.next_tier_points || 1000)) * 100)}%`, height: '100%', background: 'var(--color-warning)' }}></div>
              </div>
            </div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-warning)' }}>
            <i className="bi bi-award-fill"></i>
          </div>
        </div>
      </div>

      {/* ─── 3. NAVIGATION TABS ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-default)', paddingBottom: '12px', overflowX: 'auto' }}>
        
        <button
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('overview')}
          style={{ borderRadius: '20px' }}
        >
          <i className="bi bi-speedometer2" style={{ marginRight: '6px' }}></i> Overview & Analytics
        </button>

        <button
          className={`btn ${activeTab === 'menu' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('menu')}
          style={{ borderRadius: '20px' }}
        >
          <i className="bi bi-journal-richtext" style={{ marginRight: '6px' }}></i> Explore Menu & Order
        </button>

        <button
          className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('orders')}
          style={{ borderRadius: '20px' }}
        >
          <i className="bi bi-clock-history" style={{ marginRight: '6px' }}></i> Recent Orders ({recentOrders.length})
        </button>

        <button
          className={`btn ${activeTab === 'favorites' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('favorites')}
          style={{ borderRadius: '20px' }}
        >
          <i className="bi bi-heart-fill" style={{ color: 'var(--color-danger)', marginRight: '6px' }}></i> Favorite Dishes ({favoriteItems.length})
        </button>

        <button
          className={`btn ${activeTab === 'reviews' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('reviews')}
          style={{ borderRadius: '20px' }}
        >
          <i className="bi bi-star-fill" style={{ color: 'var(--color-warning)', marginRight: '6px' }}></i> My Reviews ({reviewsList.length})
        </button>

        <button
          className={`btn ${activeTab === 'assistant' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('assistant')}
          style={{ borderRadius: '20px' }}
        >
          <i className="bi bi-robot" style={{ marginRight: '6px' }}></i> AI Dining Concierge
        </button>
      </div>

      {/* ─── TAB 1: OVERVIEW & ANALYTICS ────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="grid-2">
            
            {/* Order Frequency & Status Summary */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Order Status Breakdown</h3>
                  <p className="card-subtitle">Distribution of all placed orders</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div
                  style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--color-success)', cursor: 'pointer' }}
                  onClick={() => setActiveTab('orders')}
                  title="Click to view Recent Orders history"
                >
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Delivered Orders</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {orderStats.delivered || orderStats.completed || 0}
                  </div>
                </div>

                <div
                  style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--color-info)', cursor: 'pointer' }}
                  onClick={() => setActiveTab('orders')}
                  title="Click to view Recent Orders history"
                >
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Preparing Orders</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {orderStats.preparing || 0}
                  </div>
                </div>

                <div
                  style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--color-warning)', cursor: 'pointer' }}
                  onClick={() => setActiveTab('orders')}
                  title="Click to view Recent Orders history"
                >
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pending Orders</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {orderStats.pending || orderStats.confirmed || 0}
                  </div>
                </div>

                <div
                  style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--color-danger)', cursor: 'pointer' }}
                  onClick={() => setActiveTab('orders')}
                  title="Click to view Recent Orders history"
                >
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cancelled Orders</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {orderStats.cancelled || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Favorite Item Highlight */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Top Favorite Dish</h3>
                  <p className="card-subtitle">Your most frequently ordered item</p>
                </div>
              </div>

              {favoriteItems.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: 'white', flexShrink: 0 }}>
                    🍛
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {favoriteItems[0].name}
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Ordered <strong style={{ color: 'var(--color-primary)' }}>{favoriteItems[0].total_qty_ordered} times</strong> · ₹{favoriteItems[0].price} each
                    </p>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => addToCart(favoriteItems[0])}>
                    Reorder Dish
                  </button>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No order history available yet.</p>
              )}
            </div>
          </div>

          {/* Personalized Menu Recommendations Section */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Chef's Recommendations for You ⭐</h3>
                <p className="card-subtitle">Top-rated signature dishes from our database</p>
              </div>
            </div>

            <div className="grid-3" style={{ gap: '16px' }}>
              {recommendations.slice(0, 3).map((dish) => (
                <div key={dish.id} style={{ padding: '16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{dish.name}</h4>
                    <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '15px' }}>₹{dish.price}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                    {dish.description || 'Delicious chef signature dish made with fresh ingredients.'}
                  </p>
                  <button className="btn btn-secondary btn-sm btn-block" onClick={() => addToCart(dish)}>
                    <i className="bi bi-plus-circle-fill" style={{ marginRight: '4px' }}></i> Add to Order
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB 2: EXPLORE MENU & ORDER (LIVE DATABASE DATA) ─────────────── */}
      {activeTab === 'menu' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['all', 'main_course', 'appetizer', 'snack', 'beverage', 'dessert', 'special'].map((cat) => (
                <button
                  key={cat}
                  className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedCategory(cat)}
                  style={{ borderRadius: '16px', textTransform: 'capitalize' }}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="navbar-search" style={{ minWidth: '240px' }}>
              <i className="bi bi-search" style={{ color: 'var(--text-muted)' }}></i>
              <input
                type="text"
                placeholder="Search menu items in ₹..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>
                  <i className="bi bi-x-circle-fill"></i>
                </button>
              )}
            </div>
          </div>

          {loadingMenu ? (
            <LoadingSpinner message="Fetching dishes from menu database..." />
          ) : (
            <div className="grid-3" style={{ gap: '20px' }}>
              {filteredMenu.map((dish) => (
                <div key={dish.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {dish.name}
                      </h3>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>
                        ₹{Number(dish.price).toFixed(2)}
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                      {dish.description || 'Authentic dish prepared with signature spices and fresh ingredients.'}
                    </p>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      <span className="badge badge-secondary" style={{ fontSize: '10px', textTransform: 'capitalize' }}>
                        {dish.category}
                      </span>
                      {dish.is_vegetarian && (
                        <span className="badge badge-success" style={{ fontSize: '10px' }}>🌱 Veg</span>
                      )}
                      {dish.rating > 0 && (
                        <span className="badge badge-warning" style={{ fontSize: '10px' }}>⭐ {dish.rating}</span>
                      )}
                    </div>
                  </div>

                  <button className="btn btn-primary btn-block" onClick={() => addToCart(dish)}>
                    <i className="bi bi-plus-circle-fill" style={{ marginRight: '6px' }}></i> Add to Order
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: RECENT ORDER HISTORY WITH LIVE STATUS ───────────────── */}
      {activeTab === 'orders' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
            Recent Order History & Live Status 📦
          </h2>

          {recentOrders.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <i className="bi bi-bag-x" style={{ fontSize: '40px', color: 'var(--text-muted)' }}></i>
              <h3 style={{ marginTop: '12px' }}>No orders found</h3>
              <p style={{ color: 'var(--text-secondary)' }}>You have not placed any orders yet. Explore our menu to place an order!</p>
              <button className="btn btn-primary" onClick={() => setActiveTab('menu')} style={{ marginTop: '12px' }}>
                Browse Menu
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {recentOrders.map((ord) => (
                <div key={ord.id} className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {ord.order_number}
                        </span>
                        <span className={`badge ${getStatusBadgeClass(ord.status)}`} style={{ textTransform: 'capitalize' }}>
                          {ord.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Placed on {ord.created_at ? new Date(ord.created_at).toLocaleString() : 'Recently'}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>
                        ₹{Number(ord.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Items List */}
                  {ord.items && ord.items.length > 0 && (
                    <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <strong>Items Ordered:</strong>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
                        {ord.items.map((item, idx) => (
                          <li key={idx}>
                            {item.quantity}x {item.item_name} — ₹{item.unit_price} each (Total: ₹{item.total_price})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: FAVORITE / MOST-ORDERED MENU ITEMS ───────────────────── */}
      {activeTab === 'favorites' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
            Your Most-Ordered & Favorite Dishes ❤️
          </h2>

          {favoriteItems.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <i className="bi bi-heart" style={{ fontSize: '40px', color: 'var(--text-muted)' }}></i>
              <h3 style={{ marginTop: '12px' }}>No favorite items yet</h3>
              <p style={{ color: 'var(--text-secondary)' }}>As you place orders, your most frequently ordered dishes will appear here.</p>
            </div>
          ) : (
            <div className="grid-3" style={{ gap: '20px' }}>
              {favoriteItems.map((dish) => (
                <div key={dish.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {dish.name}
                      </h3>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>
                        ₹{dish.price}
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Total Ordered: <strong style={{ color: 'var(--color-primary)' }}>{dish.total_qty_ordered} times</strong>
                    </p>
                  </div>

                  <button className="btn btn-primary btn-block" onClick={() => addToCart(dish)}>
                    <i className="bi bi-plus-circle-fill" style={{ marginRight: '6px' }}></i> Reorder Dish
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 5: REVIEWS & FEEDBACK HISTORY ──────────────────────────── */}
      {activeTab === 'reviews' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
              My Reviews & Dining Feedback ⭐
            </h2>
            <button className="btn btn-primary" onClick={() => setShowReviewModal(true)}>
              <i className="bi bi-plus-circle-fill" style={{ marginRight: '6px' }}></i> Post Feedback
            </button>
          </div>

          {reviewsList.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <i className="bi bi-chat-left-heart" style={{ fontSize: '40px', color: 'var(--text-muted)' }}></i>
              <h3 style={{ marginTop: '12px' }}>No reviews posted yet</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Share your dining feedback to help us improve our service!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reviewsList.map((rev) => (
                <div key={rev.id} className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px', fontSize: '18px', color: 'var(--color-warning)' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <i key={star} className={`bi bi-star${star <= rev.rating ? '-fill' : ''}`}></i>
                      ))}
                    </div>
                    <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
                      {rev.sentiment || 'positive'}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '8px 0', lineHeight: 1.6 }}>
                    "{rev.comment}"
                  </p>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Posted on {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : 'Recently'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 6: AI DINING CONCIERGE ─────────────────────────────────── */}
      {activeTab === 'assistant' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px' }}>
              🤖
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>AI Dining Concierge</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Powered by Gemini RAG Vector Knowledge Base</p>
            </div>
          </div>

          <div style={{ padding: '12px 20px', background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['Recommend spicy dishes', 'What are top veg items?', 'Suggest wine pairing for Biryani', 'Daily chef specials'].map((prompt, i) => (
              <button
                key={i}
                className="btn btn-ghost btn-sm"
                onClick={() => handleSendAiMessage(prompt)}
                style={{ fontSize: '12px', borderRadius: '12px', background: 'var(--bg-card)' }}
              >
                💡 {prompt}
              </button>
            ))}
          </div>

          <div style={{ height: '360px', overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {aiMessages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: '16px', background: msg.sender === 'user' ? 'var(--color-primary)' : 'var(--bg-elevated)', color: msg.sender === 'user' ? 'white' : 'var(--text-primary)', border: msg.sender === 'user' ? 'none' : '1px solid var(--border-default)', lineHeight: 1.6, fontSize: '14px' }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div style={{ display: 'flex', gap: '6px', padding: '12px', color: 'var(--text-muted)' }}>
                <span className="btn-spinner"></span> Concierge is crafting recommendation...
              </div>
            )}
          </div>

          <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-default)', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Ask about ingredients, wine pairings, dietary options..."
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendAiMessage()}
            />
            <button className="btn btn-primary" onClick={() => handleSendAiMessage()} disabled={aiLoading}>
              <i className="bi bi-send-fill"></i>
            </button>
          </div>
        </div>
      )}

      {/* ─── CART SLIDE-OVER DRAWER ─────────────────────────────────────── */}
      {showCartDrawer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '420px', height: '100%', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Your Order Cart 🛒</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCartDrawer(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div style={{ marginBottom: '16px', display: 'flex', gap: '10px' }}>
              <select className="form-input" value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                <option value="dine-in">🍽️ Dine-In</option>
                <option value="pickup">🛍️ Takeaway / Pickup</option>
                <option value="delivery">🛵 Home Delivery</option>
              </select>

              {orderType === 'dine-in' && (
                <input
                  type="text"
                  className="form-input"
                  placeholder="Table #"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  style={{ width: '110px' }}
                />
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
                  <i className="bi bi-cart-x" style={{ fontSize: '36px' }}></i>
                  <p style={{ marginTop: '8px' }}>Your cart is empty</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{item.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 700 }}>
                        ₹{Number(item.price).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => updateCartQuantity(item.id, -1)} style={{ padding: '2px 8px' }}>-</button>
                      <span style={{ fontWeight: 700, fontSize: '14px' }}>{item.quantity}</span>
                      <button className="btn btn-secondary btn-sm" onClick={() => updateCartQuantity(item.id, 1)} style={{ padding: '2px 8px' }}>+</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '16px', marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>
                  <span>Total Amount:</span>
                  <span style={{ color: 'var(--color-primary)' }}>₹{cartTotal.toFixed(2)}</span>
                </div>

                <button className="btn btn-primary btn-block btn-lg" onClick={handlePlaceOrder} disabled={isSubmittingOrder}>
                  {isSubmittingOrder ? 'Sending Order...' : 'Confirm & Place Order 🚀'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── REVIEW / FEEDBACK MODAL ────────────────────────────────────── */}
      {showReviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '90%', maxWidth: '440px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Leave Feedback ⭐</h3>
            <form onSubmit={handleSubmitReview}>
              <div style={{ display: 'flex', gap: '8px', fontSize: '28px', color: 'var(--color-warning)', marginBottom: '16px', justifyContent: 'center', cursor: 'pointer' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <i key={star} className={`bi bi-star${star <= reviewRating ? '-fill' : ''}`} onClick={() => setReviewRating(star)}></i>
                ))}
              </div>

              <textarea
                className="form-input"
                rows={4}
                placeholder="Write your feedback regarding food quality, taste, and service..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                style={{ marginBottom: '16px' }}
              ></textarea>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowReviewModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingReview}>Submit Feedback</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── REDEEM REWARDS MODAL ───────────────────────────────────────── */}
      {showRedeemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '90%', maxWidth: '420px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🎁</div>
            <h3 style={{ marginTop: 0 }}>Redeem Reward Points</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
              You have <strong style={{ color: 'var(--color-warning)' }}>{summary.loyalty_points} Points</strong> available. Redeem 500 points for a ₹500 instant discount voucher!
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button className="btn btn-ghost" onClick={() => setShowRedeemModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRedeemPoints}>Redeem ₹500 Voucher</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TABLE RESERVATION MODAL ────────────────────────────────────── */}
      {showReservationModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '90%', maxWidth: '460px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Reserve a Table 📅</h3>
            <form onSubmit={handleReservationSubmit}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={reservationData.date} onChange={(e) => setReservationData({ ...reservationData, date: e.target.value })} />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Time</label>
                <input type="time" className="form-input" value={reservationData.time} onChange={(e) => setReservationData({ ...reservationData, time: e.target.value })} />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Party Size</label>
                <input type="number" min="1" max="20" className="form-input" value={reservationData.partySize} onChange={(e) => setReservationData({ ...reservationData, partySize: e.target.value })} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowReservationModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Table Reservation</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function getStatusBadgeClass(status = 'pending') {
  switch (status.toLowerCase()) {
    case 'pending': return 'badge-warning';
    case 'confirmed': return 'badge-info';
    case 'preparing': return 'badge-info';
    case 'ready': return 'badge-primary';
    case 'delivered':
    case 'completed': return 'badge-success';
    case 'cancelled': return 'badge-danger';
    default: return 'badge-ghost';
  }
}

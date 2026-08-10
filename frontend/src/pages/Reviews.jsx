/**
 * Customer Reviews & Sentiment Analysis Page.
 * Displays customer feedback, AI-driven sentiment, and overall ratings.
 */

import { useState, useEffect } from 'react';
import { reviewsAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Utility for formatting dates
const formatDate = (isoString) => {
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');

  // Add review modal (simulated customer submission)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    rating: 5,
    comment: '',
    is_verified: true,
  });

  useEffect(() => {
    const t = setTimeout(() => {
      fetchReviews();
      fetchStats();
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, sentimentFilter]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = { per_page: 50 };
      if (searchQuery) params.search = searchQuery;
      if (sentimentFilter) params.sentiment = sentimentFilter;
      const res = await reviewsAPI.list(params);
      setReviews(res.data.reviews);
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await reviewsAPI.stats();
      setStats(res.data);
    } catch {
      // silent fail for stats
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await reviewsAPI.create(formData);
      toast.success('Review submitted successfully');
      setIsModalOpen(false);
      setFormData({ rating: 5, comment: '', is_verified: true });
      fetchReviews();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit review');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await reviewsAPI.delete(id);
      toast.success('Review deleted');
      fetchReviews();
      fetchStats();
    } catch { toast.error('Failed to delete review'); }
  };

  // Helper for stars
  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <i key={i} className={`bi bi-star-fill`} style={{ 
        color: i < rating ? '#fbbf24' : 'var(--border-color)',
        marginRight: '2px', fontSize: '13px' 
      }}></i>
    ));
  };

  // Helper for sentiment styling
  const getSentimentStyle = (sentiment, score) => {
    if (sentiment === 'positive') return { color: 'var(--color-success)', bg: 'rgba(16,185,129,0.1)', icon: 'emoji-smile' };
    if (sentiment === 'negative') return { color: 'var(--color-danger)', bg: 'rgba(239,68,68,0.1)', icon: 'emoji-frown' };
    return { color: 'var(--color-warning)', bg: 'rgba(245,158,11,0.1)', icon: 'emoji-neutral' };
  };

  if (loading && !stats) return <LoadingSpinner fullPage message="Analyzing customer sentiments..." />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title">Reviews & Sentiment</h1>
            <p className="page-subtitle">AI-powered analysis of customer feedback</p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <i className="bi bi-chat-right-text-fill"></i> Simulate Review
          </button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid-4" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div>
              <p className="stat-label">Average Rating</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p className="stat-value">{stats.average_rating.toFixed(1)}</p>
                <div style={{ marginTop: '-4px' }}>{renderStars(Math.round(stats.average_rating))}</div>
              </div>
              <p className="stat-change" style={{ color: 'var(--text-secondary)' }}>From {stats.total} reviews</p>
            </div>
          </div>
          <div className="stat-card" style={{ borderBottom: '4px solid var(--color-success)' }}>
            <div>
              <p className="stat-label">Positive Feedback</p>
              <p className="stat-value" style={{ color: 'var(--color-success)' }}>{stats.positive}</p>
              <p className="stat-change positive">
                {stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0}% of total
              </p>
            </div>
            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>
              <i className="bi bi-emoji-smile"></i>
            </div>
          </div>
          <div className="stat-card" style={{ borderBottom: '4px solid var(--color-warning)' }}>
            <div>
              <p className="stat-label">Neutral</p>
              <p className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.neutral}</p>
            </div>
            <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--color-warning)' }}>
              <i className="bi bi-emoji-neutral"></i>
            </div>
          </div>
          <div className="stat-card" style={{ borderBottom: '4px solid var(--color-danger)' }}>
            <div>
              <p className="stat-label">Negative Feedback</p>
              <p className="stat-value" style={{ color: 'var(--color-danger)' }}>{stats.negative}</p>
            </div>
            <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}>
              <i className="bi bi-emoji-frown"></i>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="form-input-wrapper" style={{ margin: 0, flex: 1, minWidth: '220px' }}>
          <input type="text" className="form-input" placeholder="Search review text..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <i className="bi bi-search form-input-icon"></i>
        </div>
        <select className="form-input" style={{ width: '180px', margin: 0 }}
          value={sentimentFilter} onChange={e => setSentimentFilter(e.target.value)}>
          <option value="">All Sentiments</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
      </div>

      {/* Review List (Card layout for better text reading) */}
      {loading ? (
        <LoadingSpinner fullPage={false} message="Loading feedback..." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {reviews.map(rev => {
            const style = getSentimentStyle(rev.sentiment, rev.sentiment_score);
            return (
              <div key={rev.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '36px', height: '36px', borderRadius: '50%', 
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' 
                      }}>
                        <i className="bi bi-person-fill" style={{ color: 'var(--text-muted)' }}></i>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Customer
                          {rev.is_verified && <i className="bi bi-patch-check-fill" style={{ color: '#3b82f6', fontSize: '13px' }} title="Verified Order"></i>}
                        </p>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(rev.created_at)}</p>
                      </div>
                    </div>
                  </div>
                  <button className="navbar-icon-btn" onClick={() => handleDelete(rev.id)}
                    style={{ width: '28px', height: '28px', color: 'var(--color-danger)' }}>
                    <i className="bi bi-trash" style={{ fontSize: '13px' }}></i>
                  </button>
                </div>

                {/* Rating & Comment */}
                <div style={{ marginBottom: '8px' }}>
                  {renderStars(rev.rating)}
                </div>
                <p style={{ 
                  flex: 1, fontSize: '14px', lineHeight: 1.5, color: 'var(--text-primary)', 
                  fontStyle: rev.comment ? 'normal' : 'italic'
                }}>
                  {rev.comment ? `"${rev.comment}"` : 'No comment provided.'}
                </p>

                {/* AI Sentiment Analysis Footer */}
                <div style={{ 
                  marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="bi bi-robot" style={{ color: '#8b5cf6', fontSize: '14px' }}></i>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      AI Sentiment
                    </span>
                  </div>
                  <span style={{ 
                    fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '12px',
                    background: style.bg, color: style.color, display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    <i className={`bi bi-${style.icon}`}></i>
                    {rev.sentiment} ({Math.round(rev.sentiment_score * 100)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reviews.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <i className="bi bi-chat-square-heart" style={{ fontSize: '56px', display: 'block', marginBottom: '12px' }}></i>
          <p>No reviews found matching your criteria.</p>
        </div>
      )}

      {/* Modal to simulate receiving a review */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', padding: '20px',
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Simulate Customer Review</h2>
              <button className="navbar-icon-btn" onClick={() => setIsModalOpen(false)}><i className="bi bi-x-lg"></i></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Rating (1 to 5) *</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="range" min="1" max="5" value={formData.rating}
                    onChange={e => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                    style={{ flex: 1 }} />
                  <span style={{ fontWeight: 700, fontSize: '18px', width: '30px', textAlign: 'center' }}>
                    {formData.rating}
                  </span>
                </div>
                <div style={{ marginTop: '8px' }}>{renderStars(formData.rating)}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Customer Comment</label>
                <textarea className="form-input" rows="4" value={formData.comment}
                  onChange={e => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="e.g. The food was amazing but the service was a bit slow..."></textarea>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" checked={formData.is_verified}
                  onChange={e => setFormData({ ...formData, is_verified: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }} />
                Verified Order
              </label>

              <div style={{ 
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: 'var(--radius-md)', padding: '12px', fontSize: '13px', color: '#8b5cf6',
                display: 'flex', gap: '10px', alignItems: 'flex-start'
              }}>
                <i className="bi bi-robot" style={{ fontSize: '16px' }}></i>
                <div>
                  <strong>AI Analysis Trigger</strong><br/>
                  Submitting this will automatically analyze the sentiment based on the rating and keywords.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className={`btn btn-primary ${isSaving ? 'btn-loading' : ''}`} disabled={isSaving}>
                  {isSaving ? <span className="btn-spinner"></span> : <i className="bi bi-send-fill"></i>}
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

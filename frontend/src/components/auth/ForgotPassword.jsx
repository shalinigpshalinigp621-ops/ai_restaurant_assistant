/**
 * ForgotPassword Page — Initiates password reset flow.
 * Sends reset token to email (in dev mode, displayed on screen).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const { data } = await authAPI.forgotPassword(email);
      setSent(true);
      if (data.reset_token) {
        // Dev mode: show token
        setResetToken(data.reset_token);
      }
      toast.success('Reset instructions sent!');
    } catch (err) {
      const message = err.response?.data?.detail || 'Something went wrong. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ maxWidth: '420px' }}>
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">🍽️</div>
            <span className="auth-logo-text">RestaurantAI</span>
          </div>

          {!sent ? (
            <>
              {/* Icon */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'var(--color-warning-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', margin: '0 auto 16px',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}>
                  🔑
                </div>
                <h1 className="auth-title">Forgot Password?</h1>
                <p className="auth-subtitle">
                  Enter your email and we'll send you instructions to reset your password
                </p>
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                  <i className="bi bi-exclamation-circle-fill"></i>
                  <span>{error}</span>
                </div>
              )}

              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label htmlFor="forgot-email" className="form-label">Email Address</label>
                  <div className="form-input-wrapper">
                    <input
                      id="forgot-email"
                      type="email"
                      className={`form-input ${error ? 'error' : ''}`}
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      autoFocus
                    />
                    <i className="bi bi-envelope form-input-icon"></i>
                  </div>
                </div>

                <button
                  id="forgot-password-btn"
                  type="submit"
                  className={`btn btn-primary btn-block ${isLoading ? 'btn-loading' : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><span className="btn-spinner"></span><span>Sending...</span></>
                  ) : (
                    <><i className="bi bi-send-fill"></i><span>Send Reset Link</span></>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'var(--color-success-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', margin: '0 auto 20px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}>
                ✅
              </div>
              <h2 className="auth-title">Email Sent!</h2>
              <p className="auth-subtitle" style={{ marginBottom: '24px' }}>
                We've sent password reset instructions to <strong style={{ color: 'var(--color-primary)' }}>{email}</strong>
              </p>

              {/* Dev mode: show reset token */}
              {resetToken && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.06)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '20px',
                  textAlign: 'left',
                }}>
                  <p style={{ fontSize: '11px', color: 'var(--color-warning)', fontWeight: 700, marginBottom: '6px' }}>
                    🛠️ DEV MODE — Reset Token (remove in production)
                  </p>
                  <code style={{
                    fontSize: '11px', color: 'var(--text-secondary)',
                    wordBreak: 'break-all', display: 'block',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {resetToken}
                  </code>
                  <Link
                    to={`/reset-password?token=${resetToken}`}
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}
                  >
                    Use this token to reset →
                  </Link>
                </div>
              )}

              <button
                onClick={() => { setSent(false); setEmail(''); setResetToken(''); }}
                className="btn btn-secondary btn-block"
              >
                <i className="bi bi-arrow-left"></i>
                <span>Try another email</span>
              </button>
            </div>
          )}

          <div className="auth-footer">
            <Link to="/login">
              <i className="bi bi-arrow-left"></i> Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

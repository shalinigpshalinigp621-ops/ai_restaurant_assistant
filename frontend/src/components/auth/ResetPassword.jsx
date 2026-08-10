/**
 * ResetPassword Page — Completes password reset flow.
 * Uses the reset token from the URL to set a new password.
 */

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [formData, setFormData] = useState({
    password: '',
    confirm_password: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!token) newErrors.general = 'Reset token is missing or invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(formData.password)) newErrors.password = 'Must include at least one uppercase letter';
    else if (!/[0-9]/.test(formData.password)) newErrors.password = 'Must include at least one number';
    if (!formData.confirm_password) newErrors.confirm_password = 'Please confirm your password';
    else if (formData.password !== formData.confirm_password) newErrors.confirm_password = 'Passwords do not match';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.resetPassword({ token, new_password: formData.password });
      toast.success('Password reset successfully! Please log in.');
      navigate('/login');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to reset password. Please try again.';
      toast.error(message);
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { strength: score, label: 'Weak', color: 'var(--color-danger)' };
    if (score <= 3) return { strength: score, label: 'Fair', color: 'var(--color-warning)' };
    return { strength: score, label: 'Strong', color: 'var(--color-success)' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ maxWidth: '420px' }}>
        <div className="auth-card">
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-icon">🍽️</div>
            <span className="auth-logo-text">RestaurantAI</span>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'var(--color-primary-bg, rgba(59, 130, 246, 0.1))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', margin: '0 auto 16px',
              border: '1px solid var(--color-primary-border, rgba(59, 130, 246, 0.2))',
            }}>
              🔒
            </div>
            <h1 className="auth-title">Reset Password</h1>
            <p className="auth-subtitle">
              Enter your new password below
            </p>
          </div>

          {errors.general && (
            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
              <i className="bi bi-exclamation-circle-fill"></i>
              <span>{errors.general}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {/* Token (Read-only) */}
            <div className="form-group">
              <label htmlFor="reset-token" className="form-label">Reset Token</label>
              <div className="form-input-wrapper">
                <input
                  id="reset-token"
                  type="text"
                  className="form-input"
                  value={token}
                  readOnly
                  disabled
                  style={{ background: 'var(--bg-elevated)' }}
                />
                <i className="bi bi-key form-input-icon"></i>
              </div>
            </div>

            {/* New Password */}
            <div className="form-group">
              <label htmlFor="new-password" className="form-label">New Password</label>
              <div className="form-input-wrapper">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  style={{ paddingRight: '48px' }}
                />
                <i className="bi bi-lock form-input-icon"></i>
                <button type="button" className="password-toggle" onClick={() => setShowPassword((p) => !p)} tabIndex={-1}>
                  <i className={`bi bi-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                </button>
              </div>
              {/* Password strength bar */}
              {formData.password && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <div style={{ flex: 1, height: '4px', background: 'var(--border-default)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(passwordStrength.strength / 5) * 100}%`,
                      background: passwordStrength.color,
                      borderRadius: '4px',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: '11px', color: passwordStrength.color, fontWeight: 600, flexShrink: 0 }}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
              {errors.password && <span className="form-error"><i className="bi bi-exclamation-circle"></i> {errors.password}</span>}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="confirm_password" className="form-label">Confirm Password</label>
              <div className="form-input-wrapper">
                <input
                  id="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirm_password"
                  className={`form-input ${errors.confirm_password ? 'error' : ''}`}
                  placeholder="Re-enter your new password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  style={{ paddingRight: '48px' }}
                />
                <i className="bi bi-shield-lock form-input-icon"></i>
                <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((p) => !p)} tabIndex={-1}>
                  <i className={`bi bi-${showConfirmPassword ? 'eye-slash' : 'eye'}`}></i>
                </button>
              </div>
              {errors.confirm_password && <span className="form-error"><i className="bi bi-exclamation-circle"></i> {errors.confirm_password}</span>}
            </div>

            {/* Submit */}
            <button
              id="reset-submit-btn"
              type="submit"
              className={`btn btn-primary btn-block ${isLoading ? 'btn-loading' : ''}`}
              disabled={isLoading || !token}
              style={{ marginTop: '8px' }}
            >
              {isLoading ? (
                <>
                  <span className="btn-spinner"></span>
                  <span>Resetting...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle-fill"></i>
                  <span>Reset Password</span>
                </>
              )}
            </button>
          </form>

          <div className="auth-footer" style={{ marginTop: '24px' }}>
            <Link to="/login">
              <i className="bi bi-arrow-left"></i> Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

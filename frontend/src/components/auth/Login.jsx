/**
 * Login Page — Premium glassmorphism authentication form.
 * Features: animated background, form validation, password toggle,
 * loading state, error handling, and smooth transitions.
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = location.state?.from?.pathname || '/dashboard';

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
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
      await login(formData.email, formData.password);
      toast.success('Welcome back! 🍽️');
      // Navigate to the intended page, but never back to /login
      const destination = from && from !== '/login' ? from : '/dashboard';
      navigate(destination, { replace: true });
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed. Please try again.';
      toast.error(message);
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-icon">🍽️</div>
            <span className="auth-logo-text">RestaurantAI</span>
          </div>

          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">
            Sign in to your dashboard and manage your restaurant with AI-powered insights
          </p>

          {/* Error Alert */}
          {errors.general && (
            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
              <i className="bi bi-exclamation-circle-fill"></i>
              <span>{errors.general}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address</label>
              <div className="form-input-wrapper">
                <input
                  id="email"
                  type="email"
                  name="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  autoFocus
                />
                <i className="bi bi-envelope form-input-icon"></i>
              </div>
              {errors.email && (
                <span className="form-error">
                  <i className="bi bi-exclamation-circle"></i> {errors.email}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="password" className="form-label">Password</label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="form-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  style={{ paddingRight: '48px' }}
                />
                <i className="bi bi-lock form-input-icon"></i>
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={`bi bi-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                </button>
              </div>
              {errors.password && (
                <span className="form-error">
                  <i className="bi bi-exclamation-circle"></i> {errors.password}
                </span>
              )}
            </div>

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              className={`btn btn-primary btn-block ${isLoading ? 'btn-loading' : ''}`}
              disabled={isLoading}
              style={{ marginTop: '8px' }}
            >
              {isLoading ? (
                <>
                  <span className="btn-spinner"></span>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right"></i>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div style={{
            marginTop: '20px',
            padding: '12px 16px',
            background: 'rgba(249, 115, 22, 0.06)',
            borderRadius: '8px',
            border: '1px solid rgba(249, 115, 22, 0.15)',
          }}>
            <p style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '4px' }}>
              🔑 Demo Credentials
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              After setup: admin@restaurant.com / Admin@123
            </p>
          </div>

          <p className="auth-footer">
            Don't have an account?{' '}
            <Link to="/register">Create account</Link>
          </p>
        </div>

        {/* Branding below card */}
        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}>
          Powered by Google Gemini AI · Built with FastAPI & React
        </p>
      </div>
    </div>
  );
}

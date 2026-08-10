/**
 * Register Page — New user account creation.
 * Supports role selection (admin/manager/staff), strong password validation,
 * phone number field, and smooth animated form.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'admin', label: 'Admin', icon: 'bi-shield-fill' },
  { value: 'manager', label: 'Manager', icon: 'bi-person-badge-fill' },
  { value: 'staff', label: 'Staff', icon: 'bi-person-fill' },
];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    role: 'staff',
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

  const setRole = (role) => {
    setFormData((prev) => ({ ...prev, role }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';
    else if (formData.full_name.trim().length < 2) newErrors.full_name = 'Name must be at least 2 characters';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
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
      const { confirm_password, ...registrationData } = formData;
      await register(registrationData);
      toast.success('Account created successfully! Please sign in. 🎉');
      navigate('/login');
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed. Please try again.';
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
      <div className="auth-container" style={{ maxWidth: '500px' }}>
        <div className="auth-card">
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-icon">🍽️</div>
            <span className="auth-logo-text">RestaurantAI</span>
          </div>

          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">
            Join RestaurantAI and transform your restaurant with AI-powered analytics
          </p>

          {errors.general && (
            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
              <i className="bi bi-exclamation-circle-fill"></i>
              <span>{errors.general}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {/* Role Selection */}
            <div className="form-group">
              <label className="form-label">Select Role</label>
              <div className="role-options">
                {ROLES.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={`role-option ${formData.role === value ? 'selected' : ''}`}
                    onClick={() => setRole(value)}
                    id={`role-${value}`}
                  >
                    <i className={`bi ${icon}`} style={{ marginRight: '4px' }}></i>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Full Name */}
            <div className="form-group">
              <label htmlFor="full_name" className="form-label">Full Name</label>
              <div className="form-input-wrapper">
                <input
                  id="full_name"
                  type="text"
                  name="full_name"
                  className={`form-input ${errors.full_name ? 'error' : ''}`}
                  placeholder="Your full name"
                  value={formData.full_name}
                  onChange={handleChange}
                  autoComplete="name"
                />
                <i className="bi bi-person form-input-icon"></i>
              </div>
              {errors.full_name && <span className="form-error"><i className="bi bi-exclamation-circle"></i> {errors.full_name}</span>}
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="reg-email" className="form-label">Email Address</label>
              <div className="form-input-wrapper">
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
                <i className="bi bi-envelope form-input-icon"></i>
              </div>
              {errors.email && <span className="form-error"><i className="bi bi-exclamation-circle"></i> {errors.email}</span>}
            </div>

            {/* Phone */}
            <div className="form-group">
              <label htmlFor="phone" className="form-label">Phone Number <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <div className="form-input-wrapper">
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                />
                <i className="bi bi-telephone form-input-icon"></i>
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="reg-password" className="form-label">Password</label>
              <div className="form-input-wrapper">
                <input
                  id="reg-password"
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
                  placeholder="Re-enter your password"
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
              id="register-submit-btn"
              type="submit"
              className={`btn btn-primary btn-block ${isLoading ? 'btn-loading' : ''}`}
              disabled={isLoading}
              style={{ marginTop: '8px' }}
            >
              {isLoading ? (
                <>
                  <span className="btn-spinner"></span>
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-person-plus-fill"></i>
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

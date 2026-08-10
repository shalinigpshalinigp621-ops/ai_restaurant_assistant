/**
 * ProtectedRoute — Guards routes from unauthenticated access.
 * Redirects to /login if not authenticated, preserving the intended destination.
 * Optionally enforces role-based access control.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * @param {object} props
 * @param {React.ReactNode} props.children - Protected content
 * @param {string[]} [props.roles] - Allowed roles; omit to allow any authenticated user
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading while auth state is being restored
  if (isLoading) {
    return <LoadingSpinner fullPage message="Loading your workspace..." />;
  }

  // Not authenticated — redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check — redirect to dashboard if unauthorized
  if (roles && user && !roles.includes(user.role)) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        gap: '16px',
      }}>
        <div style={{ fontSize: '48px' }}>🚫</div>
        <h2 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          You don't have permission to access this page.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Required role: {roles.join(' or ')} · Your role: {user.role}
        </p>
        <a href="/dashboard" className="btn btn-primary" style={{ marginTop: '8px' }}>
          Go to Dashboard
        </a>
      </div>
    );
  }

  return children;
}

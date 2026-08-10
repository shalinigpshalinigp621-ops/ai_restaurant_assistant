/**
 * NotFound (404) page — shown when route doesn't match.
 */
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      gap: '16px',
      textAlign: 'center',
      padding: '24px',
    }}>
      <div style={{ fontSize: '80px', lineHeight: 1 }}>🍽️</div>
      <h1 style={{
        fontSize: '80px',
        fontWeight: 900,
        background: 'var(--gradient-primary)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        lineHeight: 1,
      }}>404</h1>
      <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '24px' }}>
        Page Not Found
      </h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
        Looks like this dish isn't on our menu! The page you're looking for doesn't exist.
      </p>
      <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: '8px' }}>
        <i className="bi bi-house-fill"></i> Back to Dashboard
      </Link>
    </div>
  );
}

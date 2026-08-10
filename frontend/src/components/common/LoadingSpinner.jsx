/**
 * LoadingSpinner — Reusable loading indicator component.
 * Supports full-page, inline, and overlay variants.
 */

export default function LoadingSpinner({
  fullPage = false,
  message = 'Loading...',
  size = 'md',
}) {
  const spinnerClass = size === 'sm' ? 'spinner spinner-sm' : 'spinner';

  if (fullPage) {
    return (
      <div className="loading-page" id="loading-spinner">
        <div style={{
          width: 60, height: 60,
          background: 'var(--gradient-primary)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-primary)',
          animation: 'scale-in 0.4s ease',
        }}>
          🍽️
        </div>
        <div className={spinnerClass}></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
          {message}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      <div className={spinnerClass}></div>
    </div>
  );
}

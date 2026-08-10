/**
 * Sidebar — Premium collapsible navigation sidebar.
 * Features: animated collapse, active route highlighting, role-based menu,
 * badge counts, section groups, and smooth hover effects.
 */

import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Navigation menu configuration
const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2', roles: ['admin', 'manager', 'staff'] },
    ],
  },
  {
    title: 'Operations',
    items: [
      { path: '/orders', label: 'Orders', icon: 'bi-bag-fill', badge: null, roles: ['admin', 'manager', 'staff'] },
      { path: '/menu', label: 'Menu', icon: 'bi-journal-richtext', roles: ['admin', 'manager', 'staff'] },
      { path: '/customers', label: 'Customers', icon: 'bi-people-fill', roles: ['admin', 'manager', 'staff'] },
    ],
  },
  {
    title: 'Management',
    items: [
      { path: '/inventory', label: 'Inventory', icon: 'bi-box-seam-fill', badge: 'low', roles: ['admin', 'manager'] },
      { path: '/employees', label: 'Employees', icon: 'bi-person-badge', roles: ['admin', 'manager'] },
      { path: '/suppliers', label: 'Suppliers', icon: 'bi-truck', roles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'Insights',
    items: [
      { path: '/analytics', label: 'Analytics', icon: 'bi-bar-chart-fill', roles: ['admin', 'manager'] },
      { path: '/reports', label: 'Reports', icon: 'bi-file-earmark-bar-graph-fill', roles: ['admin', 'manager'] },
      { path: '/reviews', label: 'Reviews', icon: 'bi-star-fill', roles: ['admin', 'manager', 'staff'] },
      { path: '/food-waste', label: 'Food Waste', icon: 'bi-recycle', roles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'AI Features',
    items: [
      { path: '/ai-assistant', label: 'AI Assistant', icon: 'bi-robot', badge: 'new', roles: ['admin', 'manager', 'staff'] },
      { path: '/knowledge-base', label: 'Knowledge Base', icon: 'bi-database-fill', roles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'Settings',
    items: [
      { path: '/profile', label: 'My Profile', icon: 'bi-person-circle', roles: ['admin', 'manager', 'staff'] },
      { path: '/settings', label: 'Settings', icon: 'bi-gear-fill', roles: ['admin'] },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  const location = useLocation();
  const userRole = user?.role || 'staff';

  const filteredSections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => item.roles.includes(userRole)),
  })).filter(section => section.items.length > 0);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} id="main-sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🍽️</div>
        <span className="sidebar-logo-name">RestaurantAI</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {filteredSections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            <div className="sidebar-section-title">{section.title}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                id={`sidebar-${item.path.replace('/', '')}`}
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
                title={collapsed ? item.label : ''}
              >
                <span className="sidebar-nav-icon">
                  <i className={`bi ${item.icon}`}></i>
                </span>
                <span className="sidebar-nav-label">{item.label}</span>
                {item.badge && (
                  <span
                    className="sidebar-badge"
                    style={{
                      background: item.badge === 'new'
                        ? 'var(--color-secondary)'
                        : 'var(--color-danger)',
                    }}
                  >
                    {item.badge === 'new' ? 'NEW' : '!'}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer — User Info */}
      <div className="sidebar-footer">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 12px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(249, 115, 22, 0.06)',
          border: '1px solid rgba(249, 115, 22, 0.12)',
        }}>
          <div style={{
            width: '36px', height: '36px',
            borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 700, color: 'white',
            flexShrink: 0,
          }}>
            {user?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.full_name || 'User'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 500, textTransform: 'capitalize' }}>
                {userRole}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

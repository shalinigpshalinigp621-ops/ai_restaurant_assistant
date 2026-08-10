/**
 * Layout — Main application shell that wraps all authenticated pages.
 * Manages sidebar collapse state, dark/light theme, and responsive layout.
 */

import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Auto-collapse sidebar on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);
  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <div className="app-layout" data-theme={theme}>
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* Top Navbar */}
      <Navbar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      {/* Main Page Content */}
      <main
        className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
        id="main-content"
        role="main"
      >
        <div className="fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

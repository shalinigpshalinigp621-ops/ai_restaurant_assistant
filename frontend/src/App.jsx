/**
 * Main application component.
 * Configures routing, context providers, and toast notifications.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

// Layout & Guards
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Auth Pages
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';

// Application Pages
import Dashboard from './pages/Dashboard';
import Menu from './pages/Menu';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import FoodWaste from './pages/FoodWaste';
import Employees from './pages/Employees';
import Suppliers from './pages/Suppliers';
import Reviews from './pages/Reviews';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import AIAssistant from './pages/AIAssistant';
import KnowledgeBase from './pages/KnowledgeBase';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Global Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-md)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              fontFamily: 'var(--font-sans)',
            },
            success: {
              iconTheme: { primary: 'var(--color-success)', secondary: 'var(--bg-elevated)' },
            },
            error: {
              iconTheme: { primary: 'var(--color-danger)', secondary: 'var(--bg-elevated)' },
            },
          }}
        />

        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected Application Routes — no path on parent so all child paths are absolute */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/food-waste" element={<FoodWaste />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/profile" element={<Profile />} />

            <Route
              path="/inventory"
              element={
                <ProtectedRoute roles={['admin', 'manager']}>
                  <Inventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute roles={['admin', 'manager']}>
                  <Employees />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute roles={['admin', 'manager']}>
                  <Suppliers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute roles={['admin', 'manager']}>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute roles={['admin', 'manager']}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/knowledge-base"
              element={
                <ProtectedRoute roles={['admin', 'manager']}>
                  <KnowledgeBase />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

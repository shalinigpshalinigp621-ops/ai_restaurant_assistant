import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { settingsAPI } from '../services/api';

export default function Settings() {
  const [settings, setSettings] = useState({
    restaurantName: 'Intelligent Gourmet Bistro',
    currency: 'INR (₹)',
    taxRate: '5.0',
    geminiModel: 'gemini-2.5-flash',
    enableNotifications: true,
    autoReorder: false
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await settingsAPI.get();
        const data = response.data;
        setSettings({
          restaurantName: data.restaurant_name,
          currency: data.currency,
          taxRate: data.tax_rate,
          geminiModel: data.gemini_model,
          enableNotifications: data.enable_notifications,
          autoReorder: data.auto_reorder
        });
      } catch (error) {
        toast.error('Failed to load settings');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        restaurant_name: settings.restaurantName,
        currency: settings.currency,
        tax_rate: settings.taxRate,
        gemini_model: settings.geminiModel,
        enable_notifications: settings.enableNotifications,
        auto_reorder: settings.autoReorder
      };
      await settingsAPI.update(payload);
      toast.success('System settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading settings...</div>;
  }

  return (
    <div className="fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="mb-4">
        <h1 className="page-title">⚙️ System Settings</h1>
        <p className="page-subtitle">Configure application settings, AI model options, and operational parameters.</p>
      </div>

      <form onSubmit={handleSave} className="card">
        <h3 style={{ fontSize: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border-default)', paddingBottom: '8px' }}>
          🏬 Restaurant Details
        </h3>
        <div className="mb-3">
          <label className="form-label">Restaurant Display Name</label>
          <input
            type="text"
            className="form-control"
            value={settings.restaurantName}
            onChange={(e) => setSettings({ ...settings, restaurantName: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="form-label">Default Currency</label>
            <select
              className="form-control"
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
            >
              <option value="INR (₹)">INR (₹)</option>
              <option value="USD ($)">USD ($)</option>
              <option value="EUR (€)">EUR (€)</option>
            </select>
          </div>
          <div>
            <label className="form-label">Tax Rate (%)</label>
            <input
              type="number"
              className="form-control"
              value={settings.taxRate}
              onChange={(e) => setSettings({ ...settings, taxRate: e.target.value })}
            />
          </div>
        </div>

        <h3 style={{ fontSize: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border-default)', paddingBottom: '8px' }}>
          🤖 Generative AI Configuration
        </h3>
        <div className="mb-4">
          <label className="form-label">Gemini AI Model Selection</label>
          <select
            className="form-control"
            value={settings.geminiModel}
            onChange={(e) => setSettings({ ...settings, geminiModel: e.target.value })}
          >
            <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (Recommended)</option>
            <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
          </select>
          <small style={{ color: 'var(--text-muted)' }}>
            Used by the RAG Knowledge Assistant pipeline for response generation.
          </small>
        </div>

        <h3 style={{ fontSize: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border-default)', paddingBottom: '8px' }}>
          🔔 Preferences
        </h3>
        <div className="mb-3 d-flex align-items-center gap-2">
          <input
            type="checkbox"
            id="notifications"
            checked={settings.enableNotifications}
            onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
          />
          <label htmlFor="notifications" style={{ fontSize: '14px', cursor: 'pointer' }}>
            Enable low stock & anomaly notifications
          </label>
        </div>
        <div className="mb-4 d-flex align-items-center gap-2">
          <input
            type="checkbox"
            id="autoReorder"
            checked={settings.autoReorder}
            onChange={(e) => setSettings({ ...settings, autoReorder: e.target.checked })}
          />
          <label htmlFor="autoReorder" style={{ fontSize: '14px', cursor: 'pointer' }}>
            Auto-generate reorder suggestions when inventory drops below threshold
          </label>
        </div>

        <div className="d-flex justify-content-end">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save System Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

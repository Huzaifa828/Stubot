import React, { useState } from 'react';
import { User, Phone, Save, CheckCircle, AlertTriangle, Shield, Key } from 'lucide-react';

export default function ProfileSettings({ student, onUpdateWhatsApp, API_URL }) {
  const [newPhone, setNewPhone] = useState(student?.whatsapp_number || '');
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMsg(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/students/me/whatsapp?new_number=${encodeURIComponent(newPhone)}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update WhatsApp number.');
      setMsg({ type: 'success', text: 'WhatsApp number updated successfully!' });
      if (onUpdateWhatsApp) onUpdateWhatsApp(newPhone);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <User size={22} color="var(--accent-primary)" /> Student Account Settings
        </h3>

        {/* Profile Info Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Registration Number
            </span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
              {student?.regno || 'N/A'}
            </strong>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Student ID
            </span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--accent-primary)' }}>
              #{student?.id || 'N/A'}
            </strong>
          </div>
        </div>

        {/* Form to Update WhatsApp Number */}
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} color="var(--whatsapp-green)" /> Registered WhatsApp Phone Number
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="03001234567"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              This number is used to pair inbound WhatsApp commands (marks, refresh) with your account.
            </span>
          </div>

          {msg && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '16px',
              background: msg.type === 'success' ? 'rgba(37, 211, 102, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: msg.type === 'success' ? 'var(--whatsapp-green)' : 'var(--danger)',
              border: `1px solid ${msg.type === 'success' ? 'rgba(37, 211, 102, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              {msg.text}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={updating} style={{ width: '100%' }}>
            <Save size={16} /> {updating ? 'Saving...' : 'Update WhatsApp Number'}
          </button>
        </form>

      </div>
    </div>
  );
}

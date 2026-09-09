import React, { useState } from 'react';
import { Lock, ShieldAlert, X, Eye, EyeOff } from 'lucide-react';

export default function AdminLoginModal({ isOpen, onClose, onVerified, ADMIN_PIN }) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (pin === ADMIN_PIN) {
      setPin('');
      onVerified();
    } else {
      setError('Incorrect PIN. Access denied.');
    }
  };

  const handleClose = () => {
    setPin('');
    setError(null);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 8, 16, 0.9)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '360px',
        padding: '32px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        position: 'relative'
      }}>
        {/* Close */}
        <button
          onClick={handleClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(37,211,102,0.15) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto'
        }}>
          <Lock size={26} color="var(--accent-primary)" />
        </div>

        <h3 style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>Admin Access</h3>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.83rem', marginBottom: '24px' }}>
          Enter the admin PIN to unlock the WhatsApp Bot control panel.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Admin PIN</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPin ? 'text' : 'password'}
                className="input-control"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
                autoComplete="off"
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(p => !p)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '0.83rem',
              marginBottom: '16px'
            }}>
              <ShieldAlert size={16} /> {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
          >
            <Lock size={16} /> Unlock Admin Panel
          </button>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { User, Lock, Key, Phone, ArrowRight, ShieldCheck, UserPlus, AlertCircle } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onLoginSuccess, API_URL }) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  
  // Login Form
  const [regno, setRegno] = useState('');
  const [password, setPassword] = useState('');
  
  // Signup Extra Fields
  const [portalPassword, setPortalPassword] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ regno, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed.');
        
        localStorage.setItem('access_token', data.access_token);
        onLoginSuccess(data.access_token);
        onClose();
      } else {
        // Signup
        const res = await fetch(`${API_URL}/students/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            regno,
            portal_password: portalPassword,
            app_password: appPassword,
            whatsapp_number: whatsappNumber
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Registration failed.');

        // Auto login after signup
        const loginRes = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ regno, password: appPassword })
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) {
          localStorage.setItem('access_token', loginData.access_token);
          onLoginSuccess(loginData.access_token);
          onClose();
        } else {
          setMode('login');
          setError('Account created! Please sign in with your App Password.');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 8, 16, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '32px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}>
        
        {/* Toggle Mode Bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(15,23,42,0.8)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(null); }}
          >
            <ShieldCheck size={16} /> Sign In
          </button>
          <button
            type="button"
            className={`tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(null); }}
          >
            <UserPlus size={16} /> Register
          </button>
        </div>

        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px', textAlign: 'center' }}>
          {mode === 'login' ? 'Welcome Back' : 'Create Student Account'}
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '24px' }}>
          {mode === 'login' 
            ? 'Sign in to access your SSUET portal assistant' 
            : 'Connect your portal credentials & WhatsApp number'}
        </p>

        {error && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.12)',
            color: 'var(--danger)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '0.85rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Registration Number (e.g. 2021-BS-CS-001)</label>
            <input
              type="text"
              className="input-control"
              placeholder="2021-BS-CS-001"
              value={regno}
              onChange={(e) => setRegno(e.target.value)}
              required
            />
          </div>

          {mode === 'login' ? (
            <div className="form-group">
              <label>App Password</label>
              <input
                type="password"
                className="input-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>SSUET Portal Password (for automated scraper)</label>
                <input
                  type="password"
                  className="input-control"
                  placeholder="Portal Password"
                  value={portalPassword}
                  onChange={(e) => setPortalPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Create Dashboard App Password</label>
                <input
                  type="password"
                  className="input-control"
                  placeholder="New Password for App"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>WhatsApp Number (e.g. 03001234567)</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="03001234567"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '12px', marginTop: '12px' }}
          >
            {loading ? 'Processing...' : (mode === 'login' ? 'Sign In to Dashboard' : 'Register Account')}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Cancel & Close
          </button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Bot, User, LogOut, GraduationCap, Settings, ShieldCheck, Crown, Lock, Unlock } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, student, waStatus, onLogout, onOpenAuth, isAdmin, onOpenAdminLogin, onAdminLogout }) {
  return (
    <nav style={{
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '12px 24px'
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveTab('overview')}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #25d366 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)'
          }}>
            <Bot size={24} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SSUET Portal Hub
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Automated Student Portal Assistant
            </span>
          </div>
        </div>

        {/* Center Nav Tabs — student-facing only */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(30, 41, 59, 0.6)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            style={{ padding: '8px 16px' }}
          >
            <GraduationCap size={16} /> Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'marks' ? 'active' : ''}`}
            onClick={() => setActiveTab('marks')}
            style={{ padding: '8px 16px' }}
          >
            <ShieldCheck size={16} /> My Marks
          </button>
          <button
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            style={{ padding: '8px 16px' }}
          >
            <Settings size={16} /> Settings
          </button>

          {/* WhatsApp Bot tab is ONLY rendered in the DOM when Admin is active */}
          {isAdmin && (
            <button
              className={`tab-btn ${activeTab === 'whatsapp' ? 'active' : ''}`}
              onClick={() => setActiveTab('whatsapp')}
              style={{
                padding: '8px 16px',
                background: activeTab === 'whatsapp'
                  ? 'linear-gradient(135deg, #25d366 0%, #16a34a 100%)'
                  : 'rgba(37, 211, 102, 0.08)',
                color: activeTab === 'whatsapp' ? '#052e16' : '#25d366',
                fontWeight: 700,
                border: '1px solid rgba(37, 211, 102, 0.3)'
              }}
            >
              <Crown size={16} /> Bot Control
            </button>
          )}
        </div>

        {/* Right Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

          {/* Admin status badge — only visible when admin is active */}
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-connected" style={{ fontSize: '0.75rem' }}>
                <span className="pulse-dot green"></span>
                {waStatus?.connected ? 'Bot Live' : 'Bot Offline'}
              </span>
              <button
                className="btn btn-danger"
                onClick={onAdminLogout}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                title="Exit Admin Mode"
              >
                <Unlock size={14} /> Exit Admin
              </button>
            </div>
          )}

          {/* Admin login button — only visible when not in admin mode */}
          {!isAdmin && (
            <button
              className="btn btn-secondary"
              onClick={onOpenAdminLogin}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              title="Admin Login"
            >
              <Lock size={14} />
            </button>
          )}

          {student ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                <User size={14} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{student.regno}</span>
              </div>
              <button className="btn btn-secondary" onClick={onLogout} style={{ padding: '8px 12px' }}>
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onOpenAuth}>
              <User size={16} /> Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

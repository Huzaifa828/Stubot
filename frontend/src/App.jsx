import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import WhatsAppCard from './components/WhatsAppCard';
import MarksView from './components/MarksView';
import LoginModal from './components/LoginModal';
import ProfileSettings from './components/ProfileSettings';
import AdminLoginModal from './components/AdminLoginModal';
import { GraduationCap, ShieldCheck, Zap, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WA_URL = import.meta.env.VITE_WA_URL || 'http://localhost:3000';

// Hardcoded admin PIN — for access to the admin-only WhatsApp Bot panel.
// This is purely client-side convenience, not a security boundary (that lives in the backend).
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '0000';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [student, setStudent] = useState(null);
  const [marks, setMarks] = useState([]);
  const [waStatus, setWaStatus] = useState({ connected: false, qr: null });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Only poll WhatsApp status when admin is active — no point exposing it otherwise
  const fetchWhatsAppStatus = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${WA_URL}/status`);
      if (res.ok) {
        const data = await res.json();
        setWaStatus(data);
      }
    } catch (err) {
      setWaStatus({ connected: false, qr: null });
    }
  }, [isAdmin]);

  // Fetch Current Student Profile
  const fetchStudentProfile = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setStudent(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/students/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudent(data);
        fetchStudentMarks(token);
      } else {
        localStorage.removeItem('access_token');
        setStudent(null);
      }
    } catch (err) {
      console.error('Failed to fetch student profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudentMarks = async (token) => {
    try {
      const res = await fetch(`${API_URL}/marks/me`, {
        headers: { 'Authorization': `Bearer ${token || localStorage.getItem('access_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMarks(data);
      }
    } catch (err) {
      console.error('Failed to fetch marks:', err);
    }
  };

  useEffect(() => {
    fetchStudentProfile();
  }, [fetchStudentProfile]);

  // Start polling WhatsApp status only when admin mode is enabled
  useEffect(() => {
    if (!isAdmin) return;
    fetchWhatsAppStatus();
    const interval = setInterval(fetchWhatsAppStatus, 3000);
    return () => clearInterval(interval);
  }, [isAdmin, fetchWhatsAppStatus]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setStudent(null);
    setMarks([]);
  };

  // Admin Mode: verified by PIN modal
  const handleAdminVerified = () => {
    setIsAdmin(true);
    setAdminModalOpen(false);
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    // If currently on the WhatsApp admin tab, redirect to overview
    if (activeTab === 'whatsapp') setActiveTab('overview');
    setWaStatus({ connected: false, qr: null });
  };

  const handleTriggerPortalRefresh = async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !student) {
      setAuthModalOpen(true);
      throw new Error('Please sign in first.');
    }
    const res = await fetch(`${API_URL}/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: student.whatsapp_number,
        message: 'refresh'
      })
    });
    const data = await res.json();
    return data;
  };

  // Guard: if someone manually sets tab to 'whatsapp' but is not admin, redirect
  const handleSetTab = (tab) => {
    if (tab === 'whatsapp' && !isAdmin) return;
    setActiveTab(tab);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleSetTab}
        student={student}
        waStatus={waStatus}
        onLogout={handleLogout}
        onOpenAuth={() => setAuthModalOpen(true)}
        isAdmin={isAdmin}
        onOpenAdminLogin={() => setAdminModalOpen(true)}
        onAdminLogout={handleAdminLogout}
      />

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '32px 24px' }}>

        {/* TAB 1: OVERVIEW — student-facing only */}
        {activeTab === 'overview' && (
          <div>
            {/* Hero Banner */}
            <div className="glass-panel" style={{
              padding: '36px',
              marginBottom: '32px',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'relative', zIndex: 1, maxWidth: '720px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', color: '#a5b4fc', fontWeight: 600, marginBottom: '16px' }}>
                  <Zap size={14} /> Automated SSUET Portal Assistant
                </div>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: '1.2', marginBottom: '12px' }}>
                  Welcome back, <span style={{ background: 'linear-gradient(to right, #6366f1, #25d366)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {student ? student.regno : 'Student'}
                  </span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '24px' }}>
                  Your portal is automatically monitored in the background. You will receive WhatsApp alerts whenever new marks are published — no manual checking needed.
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => handleSetTab('marks')}>
                    <GraduationCap size={18} /> View My Marks
                  </button>
                  {!student && (
                    <button className="btn btn-secondary" onClick={() => setAuthModalOpen(true)}>
                      Sign In / Register
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Student Overview Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>

              {/* Account Status */}
              <div className="glass-panel" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => !student && setAuthModalOpen(true)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Account Status</span>
                  <ShieldCheck size={20} color="var(--accent-primary)" />
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px' }}>
                  {student ? student.regno : 'Not Signed In'}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {student ? 'Monitoring active — alerts are enabled' : 'Click here to sign in or register'}
                </span>
              </div>

              {/* Recorded Marks */}
              <div className="glass-panel" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => handleSetTab('marks')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Recorded Marks</span>
                  <GraduationCap size={20} color="#a5b4fc" />
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px' }}>
                  {Array.isArray(marks) ? `${marks.length} Records` : '0 Records'}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Click to view full subject breakdown
                </span>
              </div>

              {/* Bot Status — shown to students but no details, no clickable link */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Auto-Alerts Service</span>
                  <AlertCircle size={20} color="var(--whatsapp-green)" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="pulse-dot green"></span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>Active</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  WhatsApp alerts are running in the background
                </span>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: MARKS */}
        {activeTab === 'marks' && (
          <MarksView
            marks={marks}
            onTriggerRefresh={handleTriggerPortalRefresh}
            student={student}
          />
        )}

        {/* TAB 3: SETTINGS */}
        {activeTab === 'settings' && (
          <ProfileSettings
            student={student}
            onUpdateWhatsApp={(newNum) => setStudent(prev => prev ? { ...prev, whatsapp_number: newNum } : null)}
            API_URL={API_URL}
          />
        )}

        {/* TAB 4: WHATSAPP BOT — ADMIN ONLY, never renders for students */}
        {activeTab === 'whatsapp' && isAdmin && (
          <WhatsAppCard
            waStatus={waStatus}
            onRefreshStatus={fetchWhatsAppStatus}
            WA_URL={WA_URL}
          />
        )}

        {/* Safety Fallback: if someone lands on whatsapp tab without admin */}
        {activeTab === 'whatsapp' && !isAdmin && (
          <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
            <ShieldCheck size={48} color="var(--accent-primary)" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>Access Restricted</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>This section is for administrators only.</p>
          </div>
        )}

      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={() => fetchStudentProfile()}
        API_URL={API_URL}
      />

      {/* Admin PIN Modal */}
      <AdminLoginModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onVerified={handleAdminVerified}
        ADMIN_PIN={ADMIN_PIN}
      />
    </div>
  );
}

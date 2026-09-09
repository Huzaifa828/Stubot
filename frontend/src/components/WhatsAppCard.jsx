import React, { useState } from 'react';
import { MessageSquare, QrCode, RefreshCw, CheckCircle2, AlertTriangle, Send, Power, ShieldAlert, Cpu } from 'lucide-react';

export default function WhatsAppCard({ waStatus, onRefreshStatus, WA_URL }) {
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hello from SSUET Agent Dashboard! 🤖');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleSendTestMessage = async (e) => {
    e.preventDefault();
    if (!testPhone) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`${WA_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testPhone, message: testMessage })
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ type: 'success', message: `Message sent successfully to ${data.to}!` });
      } else {
        setSendResult({ type: 'error', message: data.error || 'Failed to send message.' });
      }
    } catch (err) {
      setSendResult({ type: 'error', message: `Network Error: ${err.message}` });
    } finally {
      setSending(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect WhatsApp? You will need to scan a new QR code.")) return;
    setDisconnecting(true);
    try {
      await fetch(`${WA_URL}/disconnect`, { method: 'POST' });
      await onRefreshStatus();
    } catch (err) {
      alert("Error disconnecting: " + err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
      
      {/* Main Connection & QR Container */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(37, 211, 102, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(37, 211, 102, 0.3)'
            }}>
              <MessageSquare size={22} color="var(--whatsapp-green)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>WhatsApp Baileys Service</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Persistent Session Microservice</p>
            </div>
          </div>

          <button className="btn btn-secondary" onClick={onRefreshStatus} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Live Status Banner */}
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          background: waStatus?.connected 
            ? 'rgba(37, 211, 102, 0.08)' 
            : 'rgba(245, 158, 11, 0.08)',
          border: `1px solid ${waStatus?.connected ? 'rgba(37, 211, 102, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`pulse-dot ${waStatus?.connected ? 'green' : 'yellow'}`} style={{ width: '12px', height: '12px' }}></span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: waStatus?.connected ? 'var(--whatsapp-green)' : 'var(--warning)' }}>
                {waStatus?.connected ? 'WhatsApp Connected & Active' : 'Waiting for WhatsApp QR Scan'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {waStatus?.connected 
                  ? `Connected User: ${waStatus?.user?.name || waStatus?.user?.id || 'Active Session'}`
                  : 'Scan the QR code below using your mobile WhatsApp app'}
              </div>
            </div>
          </div>
          {waStatus?.connected && (
            <button className="btn btn-danger" onClick={handleDisconnect} disabled={disconnecting} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <Power size={14} /> Disconnect
            </button>
          )}
        </div>

        {/* QR Code Scanner Display */}
        {!waStatus?.connected && (
          <div style={{
            textAlign: 'center',
            padding: '24px',
            background: 'rgba(15, 23, 42, 0.8)',
            borderRadius: '16px',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            marginBottom: '24px'
          }}>
            {waStatus?.qr ? (
              <div>
                <div style={{
                  display: 'inline-block',
                  padding: '16px',
                  background: '#ffffff',
                  borderRadius: '16px',
                  boxShadow: '0 0 30px rgba(37, 211, 102, 0.25)'
                }}>
                  <img src={waStatus.qr} alt="WhatsApp QR Code" style={{ width: '220px', height: '220px', display: 'block' }} />
                </div>
                <p style={{ marginTop: '14px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  <QrCode size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  Scan with WhatsApp on your phone
                </p>
              </div>
            ) : (
              <div style={{ padding: '30px 0' }}>
                <RefreshCw size={32} className="spin" style={{ color: 'var(--accent-primary)', marginBottom: '12px' }} />
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Initializing WhatsApp connection & generating QR code...</p>
              </div>
            )}
          </div>
        )}

        {/* Connection Persistence Explainer */}
        <div style={{
          padding: '16px',
          background: 'rgba(99, 102, 241, 0.06)',
          borderRadius: '12px',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          display: 'flex',
          gap: '12px',
          fontSize: '0.85rem'
        }}>
          <Cpu size={20} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
              Persistent Connection Enabled
            </strong>
            <span style={{ color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Your session credentials are saved locally in <code style={{ color: '#a5b4fc', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>auth_info_baileys</code>. Once paired, WhatsApp stays connected automatically across server reboots until explicitly disconnected.
            </span>
          </div>
        </div>
      </div>

      {/* Side Panel: Instructions & Outbound Test Tool */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Connection Steps */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="var(--whatsapp-green)" /> How to Connect WhatsApp
          </h4>
          <ol style={{ paddingLeft: '20px', color: 'var(--text-muted)', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <li>Open <strong>WhatsApp</strong> on your mobile phone.</li>
            <li>Tap <strong>Settings</strong> or <strong>Menu (⋮)</strong> and select <strong>Linked Devices</strong>.</li>
            <li>Tap <strong>Link a Device</strong>.</li>
            <li>Point your phone camera at the QR code shown on this web page.</li>
            <li>Once scanned, your bot will remain <strong>permanently connected</strong> to receive portal commands like <code style={{ color: '#818cf8' }}>marks</code> or <code style={{ color: '#818cf8' }}>refresh</code>.</li>
          </ol>
        </div>

        {/* Test Message Sender */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={18} color="var(--accent-primary)" /> Test Outbound WhatsApp Message
          </h4>
          <form onSubmit={handleSendTestMessage}>
            <div className="form-group">
              <label>Recipient Phone Number (e.g. 03001234567 or 923001234567)</label>
              <input
                type="text"
                className="input-control"
                placeholder="03001234567"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Message Content</label>
              <textarea
                className="input-control"
                rows="3"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                required
              ></textarea>
            </div>
            <button
              type="submit"
              className="btn btn-whatsapp"
              disabled={sending || !waStatus?.connected}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {sending ? <RefreshCw className="spin" size={16} /> : <Send size={16} />}
              {sending ? 'Sending...' : 'Send WhatsApp Message'}
            </button>
          </form>

          {sendResult && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              background: sendResult.type === 'success' ? 'rgba(37, 211, 102, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: sendResult.type === 'success' ? 'var(--whatsapp-green)' : 'var(--danger)',
              border: `1px solid ${sendResult.type === 'success' ? 'rgba(37, 211, 102, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              {sendResult.message}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

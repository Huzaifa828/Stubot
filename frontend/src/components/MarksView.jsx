import React, { useState } from 'react';
import { BookOpen, RefreshCw, Award, ChevronDown, ChevronUp, AlertCircle, BarChart3 } from 'lucide-react';

export default function MarksView({ marks, onTriggerRefresh, student }) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState(null);
  const [expandedSubject, setExpandedSubject] = useState(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await onTriggerRefresh();
      if (res?.status === 'processing') {
        setRefreshMsg({ type: 'info', text: '⚡ Live portal scrape initiated! Please check back in ~1 minute.' });
      } else if (res?.status === 'rate_limited') {
        setRefreshMsg({ type: 'warning', text: '⏳ Rate limit reached. You can refresh once every 5 minutes.' });
      } else {
        setRefreshMsg({ type: 'info', text: res?.message || 'Portal check requested.' });
      }
    } catch (err) {
      setRefreshMsg({ type: 'error', text: 'Error triggering portal check: ' + err.message });
    } finally {
      setRefreshing(false);
    }
  };

  // Group and aggregate marks per subject (without CLO separation)
  const processSubjectData = (rawMarks) => {
    if (!Array.isArray(rawMarks)) return {};

    const subjects = {};

    rawMarks.forEach(item => {
      const subjectName = item.course || item.course_name || item.subject || 'General Subject';
      if (!subjects[subjectName]) {
        subjects[subjectName] = [];
      }
      subjects[subjectName].push(item);
    });

    const result = {};

    Object.entries(subjects).forEach(([subjectName, items]) => {
      let midObtained = 0, midMax = 0;
      let qaObtained = 0, qaMax = 0;
      let labObtained = 0, labMax = 0;

      const midItems = [];
      const qaItems = [];
      const labItems = [];

      items.forEach(item => {
        const type = (item.assessment_type || '').toLowerCase();
        const name = (item.assessment_name || '').toLowerCase();
        const title = `${type} ${name}`;

        const obt = parseFloat(item.obtained_marks) || 0;
        const tot = parseFloat(item.total_marks) || 0;

        // Skip standalone CLO metric rows with 0 total marks
        if (tot === 0 && (title.includes('clo') || title.includes('outcome'))) {
          return;
        }

        if (title.includes('mid')) {
          midObtained += obt;
          midMax += tot;
          midItems.push(item);
        } else if (title.includes('lab') || title.includes('practical') || title.includes('viva') || title.includes('journal')) {
          labObtained += obt;
          labMax += tot;
          labItems.push(item);
        } else {
          // Quizzes, Assignments, Class tests, HW, etc.
          qaObtained += obt;
          qaMax += tot;
          qaItems.push(item);
        }
      });

      const midScore = midMax > 0 ? (midObtained / midMax) * 30 : null;
      const qaScore = qaMax > 0 ? (qaObtained / qaMax) * 20 : null;
      const labScore = labMax > 0 ? (labObtained / labMax) * 50 : null;

      let grandTotal = 0;
      let hasData = false;

      if (midScore !== null) { grandTotal += midScore; hasData = true; }
      if (qaScore !== null) { grandTotal += qaScore; hasData = true; }
      if (labScore !== null) { grandTotal += labScore; hasData = true; }

      result[subjectName] = {
        midterm: {
          obtained: midObtained,
          max: midMax,
          scaled: midScore !== null ? midScore.toFixed(1) : 'N/A',
          outOf: 30,
          percentage: midScore !== null ? Math.round((midScore / 30) * 100) : 0,
          items: midItems
        },
        quizzesAssignments: {
          obtained: qaObtained,
          max: qaMax,
          scaled: qaScore !== null ? qaScore.toFixed(1) : 'N/A',
          outOf: 20,
          percentage: qaScore !== null ? Math.round((qaScore / 20) * 100) : 0,
          items: qaItems
        },
        lab: {
          obtained: labObtained,
          max: labMax,
          scaled: labScore !== null ? labScore.toFixed(1) : 'N/A',
          outOf: 50,
          percentage: labScore !== null ? Math.round((labScore / 50) * 100) : 0,
          items: labItems
        },
        totalScore: hasData ? grandTotal.toFixed(1) : 'N/A',
        totalPercentage: hasData ? Math.round(grandTotal) : 0,
        allItems: items
      };
    });

    return result;
  };

  const processedSubjects = processSubjectData(marks);
  const subjectList = Object.entries(processedSubjects);

  return (
    <div>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award color="var(--accent-primary)" size={26} /> Academic Performance & Marks Summary
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            Clean course view for Registration No: <strong style={{ color: 'var(--text-main)' }}>{student?.regno || 'N/A'}</strong>
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={refreshing ? 'spin' : ''} size={18} />
          {refreshing ? 'Scraping Portal...' : 'Force Live Portal Check'}
        </button>
      </div>

      {refreshMsg && (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          borderRadius: '12px',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: refreshMsg.type === 'warning' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(99, 102, 241, 0.12)',
          color: refreshMsg.type === 'warning' ? 'var(--warning)' : '#a5b4fc',
          border: `1px solid ${refreshMsg.type === 'warning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
        }}>
          <AlertCircle size={20} /> {refreshMsg.text}
        </div>
      )}

      {/* Subject Cards Grid */}
      {subjectList.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {subjectList.map(([subjectName, data], idx) => {
            const isExpanded = expandedSubject === subjectName;
            return (
              <div key={idx} className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
                
                {/* Subject Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <BookOpen size={20} color="var(--accent-primary)" />
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{subjectName}</h3>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Subject Total Breakdown</span>
                  </div>

                  {/* Grand Total Badge */}
                  <div style={{
                    padding: '8px 16px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
                    border: '1px solid rgba(37, 211, 102, 0.3)',
                    textAlign: 'right'
                  }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Total Marks</span>
                    <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--whatsapp-green)' }}>
                      {data.totalScore} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ 100</span>
                    </strong>
                  </div>
                </div>

                {/* 3 Main Combined Categories */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                  
                  {/* Category 1: Midterm (Out of 30) */}
                  <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a5b4fc' }}>
                        📌 Midterm Exam
                      </span>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                        {data.midterm.scaled} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 30</span>
                      </strong>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, data.midterm.percentage)}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #818cf8)', borderRadius: '4px' }}></div>
                    </div>
                  </div>

                  {/* Category 2: Quizzes & Assignments (Out of 20) */}
                  <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fcd34d' }}>
                        📝 Quizzes & Assignments
                      </span>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                        {data.quizzesAssignments.scaled} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 20</span>
                      </strong>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, data.quizzesAssignments.percentage)}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: '4px' }}></div>
                    </div>
                  </div>

                  {/* Category 3: Lab / Practical (Out of 50) */}
                  <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#6ee7b7' }}>
                        🔬 Lab & Practical Tasks
                      </span>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                        {data.lab.scaled} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 50</span>
                      </strong>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, data.lab.percentage)}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '4px' }}></div>
                    </div>
                  </div>

                </div>

                {/* Collapsible Details */}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.82rem', justifyContent: 'space-between' }}
                  onClick={() => setExpandedSubject(isExpanded ? null : subjectName)}
                >
                  <span>{isExpanded ? 'Hide Individual Assessments' : 'View Individual Items'} ({data.allItems.length})</span>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isExpanded && (
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                    {data.allItems.map((item, iIdx) => (
                      <div key={iIdx} style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                        <div>
                          <strong style={{ color: 'var(--text-main)' }}>{item.assessment_name || item.assessment_type}</strong>
                          <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>({item.assessment_type})</span>
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--whatsapp-green)' }}>
                          {item.obtained_marks} / {item.total_marks}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
          <BarChart3 size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>No Marks Records Available Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '460px', margin: '0 auto 20px auto' }}>
            Trigger a live portal check or send <code style={{ color: '#818cf8' }}>refresh</code> via WhatsApp to scrape your latest academic marks from the SSUET portal.
          </p>
          <button className="btn btn-primary" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'spin' : ''} size={16} /> Start Portal Check Now
          </button>
        </div>
      )}
    </div>
  );
}

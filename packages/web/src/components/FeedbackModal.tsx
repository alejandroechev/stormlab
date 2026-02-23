import { useState } from 'react';

const SUPABASE_URL = 'https://fyxrnlonaptoqwsuxmql.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3Wqn0906Eg3PJcTfpd-MrQ_cbsktW5T';

interface Props { product: string; onClose: () => void; }

export function FeedbackModal({ product, onClose }: Props) {
  const [type, setType] = useState<'bug'|'feature'|'general'>('general');
  const [message, setMessage] = useState('');
  const [professionalUse, setProfessionalUse] = useState('');
  const [discovery, setDiscovery] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle');

  const submit = async () => {
    if (!message.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product, type, message: message.trim(),
          professional_use: professionalUse.trim() || null,
          discovery: discovery || null,
          email: email.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setStatus('sent');
      setTimeout(onClose, 2000);
    } catch { setStatus('error'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>💬 Send Feedback</h3>
        {status === 'sent' ? (
          <p style={{textAlign:'center',padding:20,color:'var(--green, #198754)'}}>✅ Thank you! Feedback submitted.</p>
        ) : (
          <>
            <label>Type *</label>
            <div className="radio-group">
              {(['bug','feature','general'] as const).map(t => (
                <label key={t} className={type===t ? 'active' : ''}>
                  <input type="radio" name="type" value={t} checked={type===t} onChange={() => setType(t)} />
                  {t === 'bug' ? '🐛 Bug' : t === 'feature' ? '✨ Feature Request' : '💬 General'}
                </label>
              ))}
            </div>
            <label>Message *</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your feedback..." rows={4} />
            <label>Would you use this tool for your professional work? If not, what is missing?</label>
            <textarea value={professionalUse} onChange={e => setProfessionalUse(e.target.value)} placeholder="Optional" rows={2} />
            <label>How did you find this tool?</label>
            <select value={discovery} onChange={e => setDiscovery(e.target.value)}>
              <option value="">Select...</option>
              <option value="search">Search Engine</option>
              <option value="reddit">Reddit</option>
              <option value="colleague">Colleague</option>
              <option value="github">GitHub</option>
              <option value="other">Other</option>
            </select>
            <label>Email (optional, for follow-up)</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            <div className="modal-actions">
              <button onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={submit} disabled={!message.trim() || status==='sending'}>
                {status === 'sending' ? 'Sending...' : 'Submit'}
              </button>
            </div>
            {status === 'error' && <p style={{color:'var(--red, #dc3545)',fontSize:12,marginTop:8}}>Failed to submit. Please try again.</p>}
          </>
        )}
      </div>
    </div>
  );
}

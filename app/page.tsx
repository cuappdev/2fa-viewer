'use client';

import { useState, useEffect, useCallback } from 'react';

export default function Home() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [messageSnippet, setMessageSnippet] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const fetchCode = useCallback(async (pwd: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setError('Incorrect password.');
        setAuthed(false);
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Failed to fetch code.');
        return;
      }
      setAuthed(true);
      setCode(data.code);
      setMessageSnippet(data.snippet || '');
      setTimestamp(data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '');
      setCountdown(30);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 30s once authed
  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          fetchCode(password);
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [authed, fetchCode, password]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCode(password);
  };

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.title}>Verification Code Viewer</h1>
        <p style={styles.subtitle}>For app store review access</p>

        {!authed ? (
          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>Enter access password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={styles.input}
              autoFocus
            />
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Checking...' : 'View Code'}
            </button>
            {error && <p style={styles.error}>{error}</p>}
          </form>
        ) : (
          <div style={styles.codeSection}>
            {loading ? (
              <p style={styles.loading}>Fetching latest code...</p>
            ) : code ? (
              <>
                <p style={styles.codeLabel}>Latest verification code:</p>
                <div style={styles.codeBox}>{code}</div>
                {messageSnippet && (
                  <p style={styles.snippet}>
                    <strong>Message:</strong> {messageSnippet}
                  </p>
                )}
                {timestamp && <p style={styles.time}>Received at: {timestamp}</p>}
              </>
            ) : (
              <p style={styles.noCode}>No verification code found in recent messages.</p>
            )}
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.refreshRow}>
              <span style={styles.countdown}>Auto-refreshing in {countdown}s</span>
              <button
                onClick={() => fetchCode(password)}
                style={styles.refreshButton}
                disabled={loading}
              >
                Refresh now
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '2.5rem',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
  },
  title: { margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: 700, color: '#111' },
  subtitle: { margin: '0 0 2rem', color: '#666', fontSize: '0.9rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  label: { textAlign: 'left', fontWeight: 600, fontSize: '0.9rem', color: '#333' },
  input: {
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '8px',
    outline: 'none',
  },
  button: {
    padding: '0.75rem',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: { color: '#dc2626', fontSize: '0.875rem', margin: '0.25rem 0 0' },
  codeSection: { display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' },
  codeLabel: { color: '#555', fontSize: '0.9rem', margin: 0 },
  codeBox: {
    fontSize: '3rem',
    fontWeight: 800,
    letterSpacing: '0.15em',
    color: '#2563eb',
    background: '#eff6ff',
    padding: '1rem 2rem',
    borderRadius: '10px',
    border: '2px solid #bfdbfe',
    fontFamily: 'monospace',
  },
  snippet: { fontSize: '0.8rem', color: '#555', maxWidth: '320px', wordBreak: 'break-word', margin: 0 },
  time: { fontSize: '0.8rem', color: '#888', margin: 0 },
  noCode: { color: '#666', margin: 0 },
  loading: { color: '#666', margin: 0 },
  refreshRow: { display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' },
  countdown: { fontSize: '0.8rem', color: '#999' },
  refreshButton: {
    padding: '0.4rem 0.9rem',
    background: '#f3f4f6',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
};

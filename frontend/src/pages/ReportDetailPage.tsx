import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { ReportDetail } from '../types';
import { STATUS_LABELS } from '../types';

/**
 * Komunikacijski prozor — prijavitelj vidi poruke i može slati nove.
 * Interni komentari admina nisu vidljivi ovdje.
 */
export default function ReportDetailPage() {
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    const accessStr = sessionStorage.getItem('reportAccess');
    if (!accessStr) {
      setError('Nema pristupnih podataka. Prijavite se ponovo.');
      setLoading(false);
      return;
    }
    const { referenceNumber, secretKey } = JSON.parse(accessStr);
    try {
      const detail = await api.accessReport(referenceNumber, secretKey);
      setReport(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const accessStr = sessionStorage.getItem('reportAccess');
    if (!accessStr || !newMessage.trim()) return;

    setSending(true);
    try {
      const { referenceNumber, secretKey } = JSON.parse(accessStr);
      await api.sendReporterMessage(referenceNumber, secretKey, newMessage);
      setNewMessage('');
      await loadReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri slanju');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="text-center text-mgm-muted py-10">Učitavanje...</div>;
  }

  if (error && !report) {
    return (
      <div className="max-w-md mx-auto text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to="/pristup" className="mgm-btn-outline inline-block">Nazad</Link>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header prijave */}
      <div className="mgm-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-mono text-sm text-mgm-muted">{report.referenceNumber}</div>
            <h1 className="text-xl font-bold text-mgm-dark">{report.title || report.category}</h1>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-mgm-light text-mgm-dark border border-mgm-border">
            {STATUS_LABELS[report.status]}
          </span>
        </div>
        <div className="text-sm text-mgm-muted space-y-1">
          <p><strong>Kategorija:</strong> {report.category}</p>
          <p><strong>Podneseno:</strong> {new Date(report.createdAt).toLocaleString('bs-BA')}</p>
        </div>
      </div>

      {/* Poruke */}
      <div className="mgm-card p-6">
        <h2 className="font-bold text-mgm-dark mb-4">Komunikacija</h2>

        {report.messages.length === 0 ? (
          <p className="text-mgm-muted text-sm text-center py-8">
            Još nema poruka. Ovlaštena osoba će odgovoriti u roku od 7 radnih dana.
          </p>
        ) : (
          <div className="space-y-4">
            {report.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.authorType === 'REPORTER' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-md px-4 py-3 ${
                    msg.authorType === 'REPORTER'
                      ? 'bg-mgm-dark text-white'
                      : 'bg-mgm-light border border-mgm-border text-gray-900'
                  }`}
                >
                  <div className="text-xs mb-1 opacity-70">
                    {msg.authorType === 'REPORTER' ? 'Prijavitelj' : 'Ovlaštena osoba'}
                    {' • '}
                    {new Date(msg.createdAt).toLocaleString('bs-BA')}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nova poruka */}
      <form onSubmit={handleSend} className="mgm-card p-6">
        <label className="mgm-label" htmlFor="message">Pošalji novu poruku</label>
        <textarea
          id="message"
          rows={4}
          maxLength={5000}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="mgm-input"
          placeholder="Dodatne informacije, odgovor na pitanje ovlaštene osobe..."
        />
        <button type="submit" disabled={sending || !newMessage.trim()} className="mgm-btn-primary mt-3">
          {sending ? 'Slanje...' : 'Pošalji poruku'}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm text-center">{error}</p>}
    </div>
  );
}

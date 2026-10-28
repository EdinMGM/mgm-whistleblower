import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { STATUS_LABELS } from '../../types';

interface ReportDetail {
  id: string;
  referenceNumber: string;
  reportType: string;
  category: string;
  title: string | null;
  description: string;
  status: string;
  incidentDate: string | null;
  location: string | null;
  personsInvolved: string | null;
  createdAt: string;
  firstResponseDeadline: string;
  statusUpdateDeadline: string;
  lastResponseAt: string | null;
  messages: Array<{ id: string; authorType: string; content: string; createdAt: string }>;
  internalNotes: Array<{ id: string; content: string; createdAt: string; admin: { username: string } }>;
  statusHistory: Array<{ id: string; oldStatus: string | null; newStatus: string; createdAt: string; admin: { username: string } | null }>;
  assignments: Array<{ admin: { id: string; username: string; role: string } }>;
}

/**
 * Detaljni prikaz prijave za admin panel.
 * Sadrži: detalje, komunikaciju, interne bilješke, historiju statusa, akcije.
 */
export default function AdminReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const loadReport = useCallback(async () => {
    if (!id) return;
    try {
      const detail = await api.adminGetReport(id);
      setReport(detail);
      setNewStatus(detail.status);
    } catch (err) {
      if (err instanceof Error && err.message.includes('prijavljeni')) {
        navigate('/admin/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Greška');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { loadReport(); }, [loadReport]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !reply.trim()) return;
    try {
      await api.adminReply(id, reply);
      setReply('');
      setActionMsg('Odgovor uspješno poslan');
      await loadReport();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška');
    }
  }

  async function handleNote(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !note.trim()) return;
    try {
      await api.adminAddNote(id, note);
      setNote('');
      setActionMsg('Bilješka dodana');
      await loadReport();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška');
    }
  }

  async function handleStatusChange() {
    if (!id || !newStatus) return;
    try {
      await api.adminChangeStatus(id, newStatus);
      setActionMsg('Status promijenjen');
      await loadReport();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška');
    }
  }

  if (loading) return <div className="text-center py-10 text-mgm-muted">Učitavanje...</div>;
  if (error && !report) return <div className="text-center py-10 text-red-600">{error}</div>;
  if (!report) return null;

  return (
    <div className="min-h-screen bg-mgm-bg">
      <header className="bg-mgm-dark text-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/admin" className="hover:text-mgm-green">← Nazad na prijave</Link>
          <button onClick={() => { api.adminLogout(); navigate('/admin/login'); }} className="text-sm hover:text-mgm-green">Odjava</button>
        </div>
      </header>
      <div className="h-1 mgm-gradient-bar" />

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {actionMsg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-md px-4 py-2 text-sm">{actionMsg}</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-2 text-sm">{error}</div>}

        {/* Detalji prijave */}
        <div className="mgm-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="font-mono text-sm text-mgm-muted">{report.referenceNumber}</div>
              <h1 className="text-xl font-bold text-mgm-dark">{report.title || report.category}</h1>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${report.reportType === 'SENSITIVE' ? 'bg-red-100 text-red-700' : 'bg-mgm-light text-mgm-dark'}`}>
                {report.reportType === 'SENSITIVE' ? 'Osjetljiva prijava' : 'Opšta prijava'}
              </span>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
            <div><strong>Kategorija:</strong> {report.category}</div>
            <div><strong>Status:</strong> {STATUS_LABELS[report.status as keyof typeof STATUS_LABELS] ?? report.status}</div>
            {report.incidentDate && <div><strong>Datum događaja:</strong> {new Date(report.incidentDate).toLocaleDateString('bs-BA')}</div>}
            {report.location && <div><strong>Lokacija:</strong> {report.location}</div>}
            <div><strong>Podneseno:</strong> {new Date(report.createdAt).toLocaleString('bs-BA')}</div>
            <div><strong>Rok odgovora:</strong> {new Date(report.firstResponseDeadline).toLocaleDateString('bs-BA')}</div>
          </div>
          {report.personsInvolved && (
            <div className="text-sm mb-4"><strong>Osobe:</strong> {report.personsInvolved}</div>
          )}
          <div className="bg-mgm-light rounded-md p-4 text-sm whitespace-pre-wrap">{report.description}</div>
        </div>

        {/* Akcije */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Promjena statusa */}
          <div className="mgm-card p-6">
            <h3 className="font-bold text-mgm-dark mb-3">Promjena statusa</h3>
            <div className="flex gap-2">
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="mgm-input flex-1">
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <button onClick={handleStatusChange} className="mgm-btn-primary text-sm">Spremi</button>
            </div>
          </div>

          {/* Dodijeljene osobe */}
          <div className="mgm-card p-6">
            <h3 className="font-bold text-mgm-dark mb-3">Dodijeljeno</h3>
            {report.assignments.length === 0 ? (
              <p className="text-sm text-mgm-muted">Prijava nije dodijeljena nikome.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {report.assignments.map((a, i) => (
                  <li key={i}>▸ {a.admin.username} ({a.admin.role})</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Komunikacija */}
        <div className="mgm-card p-6">
          <h3 className="font-bold text-mgm-dark mb-4">Komunikacija s prijaviteljem</h3>
          <div className="space-y-3 mb-6">
            {report.messages.length === 0 ? (
              <p className="text-sm text-mgm-muted text-center py-4">Nema poruka.</p>
            ) : (
              report.messages.map((msg) => (
                <div key={msg.id} className={`rounded-md px-4 py-3 ${msg.authorType === 'REPORTER' ? 'bg-mgm-light border border-mgm-border' : 'bg-mgm-dark text-white'}`}>
                  <div className="text-xs mb-1 opacity-70">
                    {msg.authorType === 'REPORTER' ? 'Prijavitelj' : 'Ovlaštena osoba'} • {new Date(msg.createdAt).toLocaleString('bs-BA')}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleReply}>
            <label className="mgm-label">Odgovori prijavitelju</label>
            <textarea
              rows={3}
              maxLength={5000}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="mgm-input"
              placeholder="Vaš odgovor..."
            />
            <button type="submit" disabled={!reply.trim()} className="mgm-btn-primary mt-2 text-sm">Pošalji odgovor</button>
          </form>
        </div>

        {/* Interne bilješke */}
        <div className="mgm-card p-6">
          <h3 className="font-bold text-mgm-dark mb-4">Interne bilješke (nije vidljivo prijavitelju)</h3>
          <div className="space-y-3 mb-6">
            {report.internalNotes.length === 0 ? (
              <p className="text-sm text-mgm-muted">Nema internih bilješki.</p>
            ) : (
              report.internalNotes.map((note) => (
                <div key={note.id} className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
                  <div className="text-xs text-amber-700 mb-1">{note.admin.username} • {new Date(note.createdAt).toLocaleString('bs-BA')}</div>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleNote}>
            <textarea
              rows={2}
              maxLength={5000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mgm-input"
              placeholder="Dodaj internu bilješku..."
            />
            <button type="submit" disabled={!note.trim()} className="mgm-btn-outline mt-2 text-sm">Dodaj bilješku</button>
          </form>
        </div>

        {/* Historija statusa */}
        <div className="mgm-card p-6">
          <h3 className="font-bold text-mgm-dark mb-4">Historija statusa</h3>
          <div className="space-y-2 text-sm">
            {report.statusHistory.map((h) => (
              <div key={h.id} className="flex gap-3">
                <span className="text-mgm-muted">{new Date(h.createdAt).toLocaleString('bs-BA')}</span>
                <span>
                  {h.oldStatus ? STATUS_LABELS[h.oldStatus as keyof typeof STATUS_LABELS] : '—'} → {STATUS_LABELS[h.newStatus as keyof typeof STATUS_LABELS]}
                </span>
                <span className="text-mgm-muted">({h.admin?.username ?? 'Sistem'})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

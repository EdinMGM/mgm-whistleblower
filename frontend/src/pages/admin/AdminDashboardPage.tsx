import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { ReportStatus } from '../../types';
import { STATUS_LABELS } from '../../types';

interface ReportListItem {
  id: string;
  referenceNumber: string;
  reportType: string;
  category: string;
  title: string | null;
  status: ReportStatus;
  createdAt: string;
  firstResponseDeadline: string;
  lastActivityAt: string;
}

/**
 * Admin dashboard — pregled prijava sa filtriranjem i pretragom.
 */
export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    reportType: '',
    status: '',
    search: '',
  });

  const loadReports = useCallback(async () => {
    try {
      const result = await api.adminListReports({
        ...filters,
        page,
        pageSize: 20,
      });
      setReports(result.reports);
      setTotal(result.total);
    } catch (err) {
      if (err instanceof Error && err.message.includes('prijavljeni')) {
        navigate('/admin/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Greška');
    } finally {
      setLoading(false);
    }
  }, [filters, page, navigate]);

  useEffect(() => { loadReports(); }, [loadReports]);

  async function handleLogout() {
    await api.adminLogout();
    navigate('/admin/login');
  }

  function deadlineColor(deadline: string): string {
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (days < 0) return 'text-red-600';
    if (days <= 2) return 'text-amber-600';
    return 'text-green-600';
  }

  function deadlineLabel(deadline: string): string {
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (days < 0) return `Isteklo ${Math.abs(days)} dana`;
    return `${days} dana`;
  }

  if (loading) return <div className="text-center py-10 text-mgm-muted">Učitavanje...</div>;

  return (
    <div className="min-h-screen bg-mgm-bg">
      {/* Admin header */}
      <header className="bg-mgm-dark text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-mgm-green rounded flex items-center justify-center font-bold text-sm">M</div>
            <span className="font-bold">MGM Farm — Admin panel</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/admin/users" className="hover:text-mgm-green">Korisnici</Link>
            <button onClick={handleLogout} className="hover:text-mgm-green">Odjava</button>
          </div>
        </div>
      </header>
      <div className="h-1 mgm-gradient-bar" />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-mgm-dark mb-6">Prijave neusklađenosti</h1>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm mb-6">{error}</div>}

        {/* Filteri */}
        <div className="mgm-card p-4 mb-6 flex flex-wrap gap-3">
          <select
            value={filters.reportType}
            onChange={(e) => { setFilters({ ...filters, reportType: e.target.value }); setPage(1); }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Sve vrste</option>
            <option value="GENERAL">Opšte</option>
            <option value="SENSITIVE">Osjetljive</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Svi statusi</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Pretraga po ref. broju ili naslovu..."
            value={filters.search}
            onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1 min-w-[200px]"
          />
        </div>

        {/* Tabela prijava */}
        <div className="mgm-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mgm-light text-mgm-dark">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Ref. broj</th>
                <th className="text-left px-4 py-3 font-medium">Vrsta</th>
                <th className="text-left px-4 py-3 font-medium">Kategorija</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Rok odgovora</th>
                <th className="text-left px-4 py-3 font-medium">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-mgm-muted">Nema prijava</td></tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-mgm-light/50 cursor-pointer" onClick={() => navigate(`/admin/reports/${r.id}`)}>
                    <td className="px-4 py-3 font-mono text-mgm-dark">{r.referenceNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${r.reportType === 'SENSITIVE' ? 'bg-red-100 text-red-700' : 'bg-mgm-light text-mgm-dark'}`}>
                        {r.reportType === 'SENSITIVE' ? 'Osjetljiva' : 'Opšta'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.category}</td>
                    <td className="px-4 py-3">{STATUS_LABELS[r.status]}</td>
                    <td className={`px-4 py-3 ${deadlineColor(r.firstResponseDeadline)}`}>
                      {deadlineLabel(r.firstResponseDeadline)}
                    </td>
                    <td className="px-4 py-3 text-mgm-muted">{new Date(r.createdAt).toLocaleDateString('bs-BA')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacija */}
        {total > 20 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="mgm-btn-outline text-sm">Prethodna</button>
            <span className="text-sm text-mgm-muted">Strana {page}</span>
            <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} className="mgm-btn-outline text-sm">Sljedeća</button>
          </div>
        )}
      </div>
    </div>
  );
}

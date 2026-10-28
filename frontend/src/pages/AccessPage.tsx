import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ReportDetail } from '../types';

/**
 * Stranica za pristup postojećoj prijavi.
 * Prijavitelj unosi referentni broj i tajni ključ.
 */
export default function AccessPage() {
  const navigate = useNavigate();
  const [referenceNumber, setReferenceNumber] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const report = await api.accessReport(referenceNumber, secretKey);
      // Spremi u sessionStorage za ReportDetailPage
      sessionStorage.setItem('reportDetail', JSON.stringify(report));
      sessionStorage.setItem('reportAccess', JSON.stringify({ referenceNumber, secretKey }));
      navigate(`/prijava/${referenceNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri pristupu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-mgm-dark mb-2">Pristup postojećoj prijavi</h1>
      <p className="text-mgm-muted text-sm mb-8">
        Unesite referentni broj i tajni pristupni ključ koji ste dobili pri podnošenju prijave.
      </p>

      <form onSubmit={handleSubmit} className="mgm-card p-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="mgm-label" htmlFor="refNum">Referentni broj</label>
          <input
            id="refNum"
            type="text"
            required
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="mgm-input font-mono"
            placeholder="MGM-2026-XXXXXX"
          />
        </div>

        <div>
          <label className="mgm-label" htmlFor="secretKey">Tajni pristupni ključ</label>
          <input
            id="secretKey"
            type="text"
            required
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            className="mgm-input font-mono"
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
          />
        </div>

        <button type="submit" disabled={loading} className="mgm-btn-primary w-full">
          {loading ? 'Pristupanje...' : 'Pristupi prijavi'}
        </button>
      </form>
    </div>
  );
}

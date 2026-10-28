import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CreatedReport } from '../types';

/**
 * Potvrda o uspješnom podnošenju prijave.
 * Prikazuje referentni broj i tajni ključ — jedini put.
 * Omogućuje preuzimanje potvrde kao tekstualni fajl.
 */
export default function ConfirmationPage() {
  const [report, setReport] = useState<CreatedReport | null>(null);

  useEffect(() => {
    const data = sessionStorage.getItem('createdReport');
    if (data) {
      setReport(JSON.parse(data));
    }
  }, []);

  if (!report) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-mgm-muted">Nema podataka o prijavi. Vratite se na početnu stranicu.</p>
        <Link to="/" className="mgm-btn-outline inline-block mt-4">Početna</Link>
      </div>
    );
  }

  function downloadConfirmation() {
    if (!report) return;
    const text = `MGM FARM d.o.o. — ANONIMNA PRIJAVA
══════════════════════════════════════

Referentni broj: ${report.referenceNumber}
Tajni ključ:      ${report.secretKey}

══════════════════════════════════════
UPUTE ZA ČUVANJE PRISTUPNIH PODATAKA
══════════════════════════════════════

1. Sačuvajte ovaj dokument na sigurnom mjestu.
2. Bez referentnog broja i tajnog ključa ne možete
   pristupiti svojoj prijavi.
3. Tajni ključ se ne može obnoviti — ako ga izgubite,
   pristup prijavi je trajno onemogućen.
4. Pristupite prijavi na: ${window.location.origin}/pristup
5. Nikome ne šaljite ovaj dokument.

══════════════════════════════════════
Datum podnošenja: ${new Date(report.createdAt).toLocaleString('bs-BA')}
══════════════════════════════════════
`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mgm-prijava-${report.referenceNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Uspjeh */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-mgm-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-mgm-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-mgm-dark mb-2">Prijava uspješno podnesena</h1>
        <p className="text-mgm-muted">Sačuvajte sljedeće podatke — bez njih ne možete pristupiti prijavi.</p>
      </div>

      {/* Pristupni podaci */}
      <div className="mgm-card p-8 space-y-6">
        <div>
          <label className="mgm-label">Referentni broj</label>
          <div className="bg-mgm-light border border-mgm-border rounded-md px-4 py-3 font-mono text-lg font-bold text-mgm-dark select-all">
            {report.referenceNumber}
          </div>
        </div>

        <div>
          <label className="mgm-label">Tajni pristupni ključ</label>
          <div className="bg-mgm-light border border-mgm-border rounded-md px-4 py-3 font-mono text-lg font-bold text-mgm-dark select-all break-all">
            {report.secretKey}
          </div>
        </div>

        {/* Upozorenje */}
        <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
          <p className="text-sm text-amber-800">
            <strong>⚠️ Važno:</strong> Tajni ključ se prikazuje samo sada. Sačuvajte ga
            odmah. Bez njega pristup prijavi nije moguć, a ključ se ne može obnoviti.
          </p>
        </div>

        {/* Akcije */}
        <div className="space-y-3">
          <button onClick={downloadConfirmation} className="mgm-btn-green w-full">
            Preuzmi potvrdu (.txt)
          </button>
          <Link to="/pristup" className="mgm-btn-primary w-full text-center block">
            Pristupi prijavi
          </Link>
          <Link to="/" className="mgm-btn-outline w-full text-center block">
            Početna stranica
          </Link>
        </div>
      </div>
    </div>
  );
}

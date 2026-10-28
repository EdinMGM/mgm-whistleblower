import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { CreateReportInput, CreatedReport, ReportType } from '../types';

const CATEGORIES = [
  'Kršenje etičkog kodeksa',
  'Korupcija i podmićivanje',
  'Sukob interesa',
  'Nepravilnosti u poslovanju',
  'Kršenje internih procedura',
  'Diskriminacija ili uznemiravanje',
  'Sigurnost na radnom mjestu',
  'Ostalo',
];

interface Props {
  reportType: ReportType;
  title: string;
  description: string;
}

/**
 * Zajednička forma za podnošenje prijave (koriste je obje forme).
 * Razlika je samo u reportType i naslovu/opisu.
 */
export default function ReportForm({ reportType, title, description }: Props) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    category: '',
    title: '',
    description: '',
    incidentDate: '',
    location: '',
    personsInvolved: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const selected = Array.from(e.target.files).slice(0, 5);
      setFiles(selected);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const input: CreateReportInput = {
        reportType,
        category: form.category,
        title: form.title || undefined,
        description: form.description,
        incidentDate: form.incidentDate || undefined,
        location: form.location || undefined,
        personsInvolved: form.personsInvolved || undefined,
      };

      const result = await api.createReport(input);

      // Spremi rezultat u sessionStorage za ConfirmationPage
      sessionStorage.setItem('createdReport', JSON.stringify(result));

      navigate('/potvrda');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri slanju prijave');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-mgm-dark mb-2">{title}</h1>
      <p className="text-mgm-muted text-sm mb-8">{description}</p>

      <form onSubmit={handleSubmit} className="mgm-card p-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Kategorija */}
        <div>
          <label className="mgm-label" htmlFor="category">Kategorija neusklađenosti *</label>
          <select
            id="category"
            name="category"
            required
            value={form.category}
            onChange={handleChange}
            className="mgm-input"
          >
            <option value="">— Odaberite kategoriju —</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Naslov */}
        <div>
          <label className="mgm-label" htmlFor="title">Naslov prijave (opciono)</label>
          <input
            id="title"
            name="title"
            type="text"
            maxLength={200}
            value={form.title}
            onChange={handleChange}
            className="mgm-input"
            placeholder="Kratak naslov prijave"
          />
        </div>

        {/* Opis */}
        <div>
          <label className="mgm-label" htmlFor="description">Opis događaja *</label>
          <textarea
            id="description"
            name="description"
            required
            minLength={10}
            maxLength={10000}
            rows={8}
            value={form.description}
            onChange={handleChange}
            className="mgm-input"
            placeholder="Opišite detaljno šta se desilo, kada i kako..."
          />
        </div>

        {/* Datum */}
        <div>
          <label className="mgm-label" htmlFor="incidentDate">Datum ili period događaja (opciono)</label>
          <input
            id="incidentDate"
            name="incidentDate"
            type="date"
            value={form.incidentDate}
            onChange={handleChange}
            className="mgm-input"
          />
        </div>

        {/* Lokacija */}
        <div>
          <label className="mgm-label" htmlFor="location">Lokacija ili organizaciona jedinica (opciono)</label>
          <input
            id="location"
            name="location"
            type="text"
            maxLength={500}
            value={form.location}
            onChange={handleChange}
            className="mgm-input"
            placeholder="npr. Skladište, Sarajevo"
          />
        </div>

        {/* Osobe */}
        <div>
          <label className="mgm-label" htmlFor="personsInvolved">Osobe na koje se prijava odnosi (opciono)</label>
          <textarea
            id="personsInvolved"
            name="personsInvolved"
            maxLength={2000}
            rows={3}
            value={form.personsInvolved}
            onChange={handleChange}
            className="mgm-input"
            placeholder="Imena ili opisi pozicija osoba (nije obavezno)"
          />
        </div>

        {/* Prilozi */}
        <div>
          <label className="mgm-label">Prilozi (opciono, max 5 datoteka, 10 MB svaka)</label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.txt"
            onChange={handleFiles}
            className="mgm-input"
          />
          {files.length > 0 && (
            <p className="text-xs text-mgm-muted mt-1">
              Odabrano: {files.map((f) => f.name).join(', ')}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button type="submit" disabled={loading} className="mgm-btn-primary w-full">
            {loading ? 'Slanje...' : 'Podnesi anonimnu prijavu'}
          </button>
        </div>

        <p className="text-xs text-mgm-muted text-center">
          Vaši lični podaci se ne prikupljaju. Prijava je potpuno anonimna.
        </p>
      </form>
    </div>
  );
}

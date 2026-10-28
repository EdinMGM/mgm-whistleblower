import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

/**
 * Admin prijava — sigurna autentifikacija sa rate limiting.
 */
export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Provjeri da li je već prijavljen
    api.adminMe().then(() => navigate('/admin')).catch(() => {});
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.adminLogin(username, password);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri prijavi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-mgm-bg flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-mgm-green rounded-md flex items-center justify-center font-bold text-lg text-white mx-auto mb-2">M</div>
          <div className="font-bold text-mgm-dark">MGM FARM</div>
          <div className="text-xs text-mgm-muted">Administratorski pristup</div>
        </div>

        <form onSubmit={handleSubmit} className="mgm-card p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="mgm-label" htmlFor="username">Korisničko ime</label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mgm-input"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="mgm-label" htmlFor="password">Lozinka</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mgm-input"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={loading} className="mgm-btn-primary w-full">
            {loading ? 'Prijava...' : 'Prijavi se'}
          </button>
        </form>

        <div className="text-center mt-6">
          <a href="/" className="text-sm text-mgm-muted hover:text-mgm-dark">← Nazad na početnu</a>
        </div>
      </div>
    </div>
  );
}

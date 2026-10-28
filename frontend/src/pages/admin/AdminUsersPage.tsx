import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';

interface AdminUser {
  id: string;
  username: string;
  role: string;
  canAccessSensitive: boolean;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
}

/**
 * Upravljanje admin korisnicima — samo ADMIN uloga.
 * Kreiranje novih korisnika sa definisanim ulogama i dozvolama.
 */
export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'INVESTIGATOR',
    canAccessSensitive: false,
  });
  const [formError, setFormError] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const result = await api.adminListUsers();
      setUsers(result);
    } catch (err) {
      if (err instanceof Error && (err.message.includes('prijavljeni') || err.message.includes('ovlašten'))) {
        navigate('/admin/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Greška');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    try {
      await api.adminCreateUser(newUser);
      setNewUser({ username: '', password: '', role: 'INVESTIGATOR', canAccessSensitive: false });
      setShowForm(false);
      await loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Greška');
    }
  }

  if (loading) return <div className="text-center py-10 text-mgm-muted">Učitavanje...</div>;

  return (
    <div className="min-h-screen bg-mgm-bg">
      <header className="bg-mgm-dark text-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/admin" className="hover:text-mgm-green">← Nazad na prijave</Link>
          <button onClick={() => { api.adminLogout(); navigate('/admin/login'); }} className="text-sm hover:text-mgm-green">Odjava</button>
        </div>
      </header>
      <div className="h-1 mgm-gradient-bar" />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-mgm-dark">Korisnici</h1>
          <button onClick={() => setShowForm(!showForm)} className="mgm-btn-primary text-sm">
            {showForm ? 'Otkaži' : '+ Novi korisnik'}
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm mb-6">{error}</div>}

        {/* Forma za novog korisnika */}
        {showForm && (
          <form onSubmit={handleCreate} className="mgm-card p-6 mb-6 space-y-4">
            {formError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-2 text-sm">{formError}</div>}
            <div>
              <label className="mgm-label">Korisničko ime</label>
              <input type="text" required minLength={3} value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="mgm-input" />
            </div>
            <div>
              <label className="mgm-label">Lozinka (min. 12 karaktera)</label>
              <input type="password" required minLength={12} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="mgm-input" />
            </div>
            <div>
              <label className="mgm-label">Uloga</label>
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="mgm-input">
                <option value="INVESTIGATOR">Investigator (obrada dodijeljenih prijava)</option>
                <option value="ADMIN">Admin (upravljanje korisnicima i konfiguracijom)</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newUser.canAccessSensitive} onChange={(e) => setNewUser({ ...newUser, canAccessSensitive: e.target.checked })} />
              Dozvola za osjetljive prijave (direktor/Compliance Officer)
            </label>
            <button type="submit" className="mgm-btn-green">Kreiraj korisnika</button>
          </form>
        )}

        {/* Lista korisnika */}
        <div className="mgm-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mgm-light text-mgm-dark">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Korisničko ime</th>
                <th className="text-left px-4 py-3 font-medium">Uloga</th>
                <th className="text-left px-4 py-3 font-medium">Osjetljive prijave</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3">{u.isSuperAdmin ? 'SUPER ADMIN' : u.role === 'ADMIN' ? 'Admin' : 'Investigator'}</td>
                  <td className="px-4 py-3">
                    {u.isSuperAdmin ? 'Sve prijave' : u.canAccessSensitive ? 'Samo osjetljive' : 'Samo opste'}</td>
                  <td className="px-4 py-3">{u.isActive ? 'Aktivan' : 'Deaktiviran'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

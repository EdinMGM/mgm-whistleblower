import { Routes, Route, Outlet, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SubmitPage from './pages/SubmitPage';
import ConfirmationPage from './pages/ConfirmationPage';
import AccessPage from './pages/AccessPage';
import ReportDetailPage from './pages/ReportDetailPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminReportDetailPage from './pages/admin/AdminReportDetailPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';

/** Layout za javne stranice — MGM Farm header sa logotipom. */
function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-mgm-dark text-white">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-mgm-green rounded-md flex items-center justify-center font-bold text-lg">M</div>
            <div>
              <div className="font-bold text-lg leading-tight">MGM FARM</div>
              <div className="text-xs text-white/70 leading-tight">d.o.o. Sarajevo</div>
            </div>
          </div>
          <a href="/admin/login" className="text-sm text-white/70 hover:text-white transition-colors">Administracija</a>
        </div>
      </header>
      <div className="h-1 mgm-gradient-bar" />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        <Outlet />
      </main>
      <footer className="bg-mgm-dark text-white/60 text-sm">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center">
          <p>© {new Date().getFullYear()} MGM Farm d.o.o. — Anonimni kanal za prijavu neusklađenosti</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/prijavi-opstu" element={<SubmitPage />} />
        <Route path="/prijavi-osjetljivu" element={<SubmitPage />} />
        <Route path="/potvrda" element={<ConfirmationPage />} />
        <Route path="/pristup" element={<AccessPage />} />
        <Route path="/prijava/:referenceNumber" element={<ReportDetailPage />} />
      </Route>
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/admin/reports/:id" element={<AdminReportDetailPage />} />
      <Route path="/admin/users" element={<AdminUsersPage />} />
    </Routes>
  );
}

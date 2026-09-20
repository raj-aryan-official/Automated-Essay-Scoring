import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { SubmissionPage } from './pages/SubmissionPage';
import { EssayDetailPage } from './pages/EssayDetailPage';
import { UserRole } from './api';

const ROLE_BADGES: Record<UserRole, string> = {
  ADMIN: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  TEACHER: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  ML_ENGINEER: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  VIEWER: 'bg-slate-700/60 text-slate-300 border-slate-600/50',
};

const HeaderBar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-slate-800/90 border-b border-slate-700/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 text-white font-bold tracking-tight">
          <span className="w-2.5 h-2.5 bg-brand-500 rounded-full inline-block"></span>
          <span>AES Assessment Platform</span>
        </Link>

        <nav className="flex items-center space-x-5">
          {isAuthenticated && (
            <Link
              to="/"
              className="text-xs font-medium text-slate-300 hover:text-white transition"
            >
              Submit Essay
            </Link>
          )}

          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3 border-l border-slate-700 pl-4">
              <span
                id="header-role-badge"
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                  ROLE_BADGES[user.role] || 'bg-slate-800 text-slate-300'
                }`}
              >
                {user.role}
              </span>
              <span id="header-user-email" className="text-xs text-slate-300 font-mono hidden sm:inline">
                {user.email}
              </span>
              <button
                id="btn-logout"
                type="button"
                onClick={handleLogout}
                className="text-xs text-slate-400 hover:text-rose-400 font-medium transition"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              id="btn-nav-login"
              to="/login"
              className="text-xs font-semibold px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
          <HeaderBar />

          {/* Main Content Area */}
          <main className="flex-1 py-8">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
                    <SubmissionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/essays/:id"
                element={
                  <ProtectedRoute allowedRoles={['VIEWER', 'TEACHER', 'ML_ENGINEER', 'ADMIN']}>
                    <EssayDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
            Automated Essay Scoring (BERT + Regression Head &amp; Rubric Feedback) | Raj Aryan (240410700141)
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

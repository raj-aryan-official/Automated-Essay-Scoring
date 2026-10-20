import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../api';

// WHY: Predefined seed test accounts enabling 1-click role-based sign-in for viva demonstrations across TEACHER, ADMIN, ML_ENGINEER, and VIEWER roles.
const DEMO_ACCOUNTS: { role: UserRole; label: string; email: string; pass: string; badgeColor: string }[] = [
  {
    role: 'TEACHER',
    label: 'Teacher (Submit & Review)',
    email: 'teacher@aes.local',
    pass: 'Teacher123!',
    badgeColor: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-500/30 hover:bg-purple-500/20 dark:hover:bg-purple-500/30',
  },
  {
    role: 'ADMIN',
    label: 'Administrator (Full Access)',
    email: 'admin@aes.local',
    pass: 'Admin123!',
    badgeColor: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/30 hover:bg-rose-500/20 dark:hover:bg-rose-500/30',
  },
  {
    role: 'ML_ENGINEER',
    label: 'ML Engineer (Model Registry)',
    email: 'ml_engineer@aes.local',
    pass: 'Engineer123!',
    badgeColor: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-500/30 hover:bg-blue-500/20 dark:hover:bg-blue-500/30',
  },
  {
    role: 'VIEWER',
    label: 'Viewer (Read-Only)',
    email: 'viewer@aes.local',
    pass: 'Viewer123!',
    badgeColor: 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600/50 hover:bg-slate-200 dark:hover:bg-slate-700',
  },
];

// WHY: Authentication page providing standard credential submission and convenient 1-click demo logins with JWT session creation.
export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  // WHY: Dispatches user credentials to the OAuth2 token endpoint, stores JWT in browser storage, and returns user to target route.
  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setError(null);

    const loginEmail = customEmail || email;
    const loginPass = customPass || password;

    if (!loginEmail || !loginPass) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ email: loginEmail, password: loginPass });
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('[LoginPage] Login error:', err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Authentication failed. Please check your credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    handleLogin(undefined, demoEmail, demoPass);
  };

  return (
    <main className="max-w-md mx-auto my-10 px-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-500 dark:text-brand-400 mb-1">
          <span className="text-2xl font-black">A</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Sign In to AES Platform
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          Role-based access for automated essay evaluation, model diagnostics, and teacher overrides.
        </p>
      </div>

      {/* Main Login Card */}
      <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xl dark:shadow-2xl backdrop-blur space-y-5">
        {error && (
          <div
            id="login-error-banner"
            className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-lg text-xs leading-relaxed"
          >
            {error}
          </div>
        )}

        <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
          <div>
            <label
              htmlFor="login-email-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Email Address
            </label>
            <input
              id="login-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@aes.local"
              required
              disabled={isSubmitting}
              className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2.5 min-h-[44px] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div>
            <label
              htmlFor="login-password-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Password
            </label>
            <input
              id="login-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isSubmitting}
              className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2.5 min-h-[44px] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <button
            id="btn-login"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 min-h-[44px] bg-brand-600 hover:bg-brand-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-xs font-bold rounded-lg shadow-lg transition flex items-center justify-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In with Credentials</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 dark:border-slate-700 w-full" />
          <span className="bg-white dark:bg-slate-800 px-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Or 1-Click Demo Sign In
          </span>
        </div>

        {/* Demo Accounts List */}
        <div className="space-y-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.role}
              type="button"
              id={`btn-demo-${acc.role.toLowerCase()}`}
              onClick={() => handleDemoLogin(acc.email, acc.pass)}
              disabled={isSubmitting}
              className={`w-full p-2.5 min-h-[44px] rounded-lg border text-left flex items-center justify-between transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${acc.badgeColor}`}
            >
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">{acc.label}</div>
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">{acc.email}</div>
              </div>
              <span className="text-xs font-semibold">&rarr;</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
};

export default LoginPage;

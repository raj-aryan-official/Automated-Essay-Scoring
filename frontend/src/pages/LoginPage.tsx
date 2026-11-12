import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../api';

const DEMO_ACCOUNTS: { role: UserRole; label: string; email: string; pass: string; color: string }[] = [
  {
    role: 'TEACHER',
    label: 'Teacher — Submit & Review',
    email: 'teacher@aes.local',
    pass: 'Teacher123!',
    color: 'bg-ink-50 border-ink-300/50 text-ink-900 hover:bg-ink-100',
  },
  {
    role: 'ADMIN',
    label: 'Administrator — Full Access',
    email: 'admin@aes.local',
    pass: 'Admin123!',
    color: 'bg-rose-50 border-rose-300/50 text-rose-900 hover:bg-rose-100',
  },
  {
    role: 'ML_ENGINEER',
    label: 'ML Engineer — Model Registry',
    email: 'ml_engineer@aes.local',
    pass: 'Engineer123!',
    color: 'bg-sky-50 border-sky-300/50 text-sky-900 hover:bg-sky-100',
  },
  {
    role: 'VIEWER',
    label: 'Viewer — Read-Only',
    email: 'viewer@aes.local',
    pass: 'Viewer123!',
    color: 'bg-stone-100 border-stone-300 text-stone-800 hover:bg-stone-200',
  },
];

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

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
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-canvas px-4 text-sans">
      {/* Editorial Left Panel — Brand & Purpose */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-8 border-r border-faint">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-ink-100 border border-ink-300/50 flex items-center justify-center">
            <span className="text-xl font-black text-ink-700">A</span>
          </div>
          <span className="text-serif text-2xl font-bold text-heading tracking-tight">AES</span>
        </div>

        <h1 className="text-serif text-4xl font-bold text-heading leading-tight mb-4">
          Automated Essay Scoring
        </h1>
        <p className="text-lg text-muted leading-relaxed max-w-lg mb-8">
          A platform for automated essay evaluation, model diagnostics, and
          teacher-led score overrides. Built for educators, researchers, and
          institutions.
        </p>

        <div className="space-y-3 text-sm text-muted font-serif">
          <div className="flex items-start gap-3">
            <Check className="mt-1 w-3.5 h-3.5 text-ink-500 shrink-0" aria-hidden="true" />
            <span>Role-based access for teachers, admins, ML engineers, and viewers</span>
          </div>
          <div className="flex items-start gap-3">
            <Check className="mt-1 w-3.5 h-3.5 text-ink-500 shrink-0" aria-hidden="true" />
            <span>ASAP benchmark rubrics with multi-trait dimension feedback</span>
          </div>
          <div className="flex items-start gap-3">
            <Check className="mt-1 w-3.5 h-3.5 text-ink-500 shrink-0" aria-hidden="true" />
            <span>Human-in-the-loop reviewer overrides with audit trail</span>
          </div>
        </div>
      </div>

      {/* Right Panel — Sign In Form */}
      <div className="w-full max-w-md mt-8 lg:mt-0 lg:w-1/2 p-8 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-md bg-ink-100 border border-ink-300/50 flex items-center justify-center">
            <span className="text-lg font-black text-ink-700">A</span>
          </div>
          <span className="text-serif text-xl font-bold text-heading">Sign In</span>
        </div>
        <p className="text-xs text-tertiary mb-8">
          Sign in to continue to your dashboard
        </p>

        {error && (
          <div
            id="login-error-banner"
            className="p-3 mb-4 rounded-lg border border-error-border bg-error-bg text-error-text text-xs leading-relaxed"
          >
            {error}
          </div>
        )}

        <form onSubmit={(e) => handleLogin(e)} className="space-y-5">
          <div>
            <label
              htmlFor="login-email-input"
              className="block text-xs font-medium text-body mb-1.5"
            >
              Email Address
            </label>
            <input
              id="login-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@institution.edu"
              required
              disabled={isSubmitting}
              className="w-full bg-surface border border-base rounded-lg px-3 py-2.5 min-h-[44px] text-body placeholder:text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            />
          </div>

          <div>
            <label
              htmlFor="login-password-input"
              className="block text-xs font-medium text-body mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isSubmitting}
                className="w-full bg-surface border border-base rounded-lg px-3 py-2.5 pr-10 min-h-[44px] text-body placeholder:text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-body focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-500 p-1 transition-colors"
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <button
            id="btn-login"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 min-h-[44px] bg-ink-500 text-white hover:bg-ink-600 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-500"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing in</span>
              </>
            ) : (
              <span>Sign in</span>
            )}
          </button>
        </form>

        {/* Demo Accounts */}
        <div className="mt-10 border-t border-base pt-6 space-y-3">
          <div className="flex items-center gap-1.5">
            <span className="flex-1 border-t border-base"></span>
            <span className="text-xs font-medium text-muted uppercase tracking-wider bg-surface px-2">Demo accounts</span>
            <span className="flex-1 border-t border-base"></span>
          </div>

          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.role}
              type="button"
              id={`btn-demo-${acc.role.toLowerCase()}`}
              onClick={() => handleDemoLogin(acc.email, acc.pass)}
              disabled={isSubmitting}
              className={`w-full p-2.5 min-h-[44px] rounded-lg border border-base text-left flex items-center justify-between transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-500 ${acc.color}`}
            >
              <div>
                <div className="text-xs font-semibold text-heading">{acc.label}</div>
                <div className="text-[11px] font-mono text-tertiary">{acc.email}</div>
              </div>
              <span className="text-xs font-medium text-muted">→</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
};

export default LoginPage;

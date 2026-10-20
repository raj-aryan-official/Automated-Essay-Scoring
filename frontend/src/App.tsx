import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { TourProvider } from './context/TourContext';
import { ToastProvider } from './components/ui';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/navigation';
import { ProductTour } from './components/guidance/ProductTour';
import { ErrorBoundary } from './components/ErrorBoundary';
import { A11yAnnouncerProvider } from './context/A11yAnnouncerContext';

// Route-level code splitting with React.lazy
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const SubmissionPage = React.lazy(() => import('./pages/SubmissionPage').then(m => ({ default: m.SubmissionPage })));
const EssayManagerPage = React.lazy(() => import('./pages/EssayManagerPage').then(m => ({ default: m.EssayManagerPage })));
const EssayDetailPage = React.lazy(() => import('./pages/EssayDetailPage').then(m => ({ default: m.EssayDetailPage })));
const InferenceJobsPage = React.lazy(() => import('./pages/InferenceJobsPage').then(m => ({ default: m.InferenceJobsPage })));
const ModelEvaluationPage = React.lazy(() => import('./pages/ModelEvaluationPage').then(m => ({ default: m.ModelEvaluationPage })));
const HelpPage = React.lazy(() => import('./pages/HelpPage').then(m => ({ default: m.HelpPage })));
const DevComponentsPage = React.lazy(() => import('./pages/DevComponentsPage').then(m => ({ default: m.DevComponentsPage })));

/**
 * RouteLoadingFallback provides an accessible, non-jarring skeleton state
 * during lazy-loaded route chunk ingestion.
 */
const RouteLoadingFallback: React.FC = () => (
  <div
    className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse"
    role="status"
    aria-label="Loading page resources"
  >
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-4 w-96 bg-slate-100 dark:bg-slate-800/60 rounded" />
      </div>
      <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
    </div>
    <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
    <span className="sr-only">Loading application view...</span>
  </div>
);

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TourProvider>
          <A11yAnnouncerProvider>
            <ToastProvider>
              <ErrorBoundary>
                <BrowserRouter>
                  <ProductTour />
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <Routes>
                      {/* Public Authentication Route */}
                      <Route path="/login" element={<LoginPage />} />

                      {/* Authenticated Application Shell Routes */}
                      <Route
                        path="/*"
                        element={
                          <AppShell>
                            <Suspense fallback={<RouteLoadingFallback />}>
                              <Routes>
                                {/* Root Route: Essay Submission for TEACHER / ADMIN */}
                                <Route
                                  path="/"
                                  element={
                                    <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
                                      <SubmissionPage />
                                    </ProtectedRoute>
                                  }
                                />

                                {/* Central Dashboard Hub */}
                                <Route
                                  path="/dashboard"
                                  element={
                                    <ProtectedRoute allowedRoles={['VIEWER', 'TEACHER', 'ML_ENGINEER', 'ADMIN']}>
                                      <DashboardPage />
                                    </ProtectedRoute>
                                  }
                                />

                                {/* Essay Submission Explicit Route */}
                                <Route
                                  path="/submit"
                                  element={
                                    <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
                                      <SubmissionPage />
                                    </ProtectedRoute>
                                  }
                                />

                                {/* Essay Explorer & Management */}
                                <Route
                                  path="/essays"
                                  element={
                                    <ProtectedRoute allowedRoles={['VIEWER', 'TEACHER', 'ML_ENGINEER', 'ADMIN']}>
                                      <EssayManagerPage />
                                    </ProtectedRoute>
                                  }
                                />

                                {/* Essay Detail / Score Workspace */}
                                <Route
                                  path="/essays/:id"
                                  element={
                                    <ProtectedRoute allowedRoles={['VIEWER', 'TEACHER', 'ML_ENGINEER', 'ADMIN']}>
                                      <EssayDetailPage />
                                    </ProtectedRoute>
                                  }
                                />

                                {/* Inference Jobs Telemetry */}
                                <Route
                                  path="/jobs"
                                  element={
                                    <ProtectedRoute allowedRoles={['ML_ENGINEER', 'TEACHER', 'ADMIN']}>
                                      <InferenceJobsPage />
                                    </ProtectedRoute>
                                  }
                                />

                                {/* Model Evaluation & QWK Diagnostics */}
                                <Route
                                  path="/evaluation"
                                  element={
                                    <ProtectedRoute allowedRoles={['VIEWER', 'TEACHER', 'ML_ENGINEER', 'ADMIN']}>
                                      <ModelEvaluationPage />
                                    </ProtectedRoute>
                                  }
                                />

                                {/* Help & FAQs */}
                                <Route
                                  path="/help"
                                  element={
                                    <ProtectedRoute allowedRoles={['VIEWER', 'TEACHER', 'ML_ENGINEER', 'ADMIN']}>
                                      <HelpPage />
                                    </ProtectedRoute>
                                  }
                                />

                                {/* Developer UI Component Library */}
                                <Route path="/dev/components" element={<DevComponentsPage />} />

                                {/* Fallback */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                              </Routes>
                            </Suspense>
                          </AppShell>
                        }
                      />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </ErrorBoundary>
            </ToastProvider>
          </A11yAnnouncerProvider>
        </TourProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

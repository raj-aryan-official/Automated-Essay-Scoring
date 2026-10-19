import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/navigation';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SubmissionPage } from './pages/SubmissionPage';
import { EssayManagerPage } from './pages/EssayManagerPage';
import { EssayDetailPage } from './pages/EssayDetailPage';
import { InferenceJobsPage } from './pages/InferenceJobsPage';
import { ModelEvaluationPage } from './pages/ModelEvaluationPage';
import { DevComponentsPage } from './pages/DevComponentsPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Authenticated Application Shell Routes */}
              <Route
                path="/*"
                element={
                  <AppShell>
                    <Routes>
                      {/* Central Dashboard Hub */}
                      <Route
                        path="/"
                        element={
                          <ProtectedRoute allowedRoles={['VIEWER', 'TEACHER', 'ML_ENGINEER', 'ADMIN']}>
                            <DashboardPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute allowedRoles={['VIEWER', 'TEACHER', 'ML_ENGINEER', 'ADMIN']}>
                            <DashboardPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Essay Submission (Teacher / Admin) */}
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

                      {/* Developer UI Component Library */}
                      <Route path="/dev/components" element={<DevComponentsPage />} />

                      {/* Fallback */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </AppShell>
                }
              />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { SubmissionPage } from './pages/SubmissionPage';
import { EssayDetailPage } from './pages/EssayDetailPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        {/* Navigation Bar */}
        <header className="bg-slate-800/90 border-b border-slate-700/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2 text-white font-bold tracking-tight">
              <span className="w-2.5 h-2.5 bg-brand-500 rounded-full inline-block"></span>
              <span>AES Assessment Platform</span>
            </Link>
            <nav className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-xs font-medium text-slate-300 hover:text-white transition"
              >
                Submit Essay
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 py-8">
          <Routes>
            <Route path="/" element={<SubmissionPage />} />
            <Route path="/essays/:id" element={<EssayDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
          Automated Essay Scoring (BERT + Regression Head &amp; Rubric Feedback) | Raj Aryan (240410700141)
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;

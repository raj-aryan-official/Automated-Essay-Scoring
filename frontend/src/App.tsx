import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-xl text-center space-y-4">
        <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full uppercase tracking-wider">
          Scaffolding Ready
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Automated Essay Scoring Platform
        </h1>
        <p className="text-slate-400 text-sm">
          BERT + Regression Head Essay Scorer &amp; Rubric-Aligned Feedback Platform.
        </p>
        <div className="text-xs text-slate-500">
          Roll No: 240410700141 | Raj Aryan
        </div>
      </div>
    </div>
  );
};

export default App;

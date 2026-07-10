import React, { useState } from 'react';
import { Search, Users, Folder, FileText, MessageCircle, Sparkles, Layers } from 'lucide-react';

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'];

export default function LoginScreen({ onLogin }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    onLogin({
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      color,
    });
  };

  return (
    <div className="h-screen bg-white flex items-center justify-center p-6" role="main">
      <div className="w-full max-w-xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Search className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">ResearchTogether</h1>
          <p className="text-slate-500 text-lg max-w-md mx-auto leading-relaxed">
            The collaborative workspace where research teams turn every source into a finished deliverable — with every claim traceable.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 mb-12" aria-label="Features">
          {[
            { icon: Layers, label: 'Deliverable Templates' },
            { icon: Folder, label: 'Source Library' },
            { icon: FileText, label: 'Finding Cards' },
            { icon: MessageCircle, label: 'Team Discuss' },
            { icon: Sparkles, label: 'Context Engine' },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 text-slate-600 text-sm font-medium border border-slate-100">
              <Icon className="w-3.5 h-3.5 text-indigo-500" />
              {label}
            </span>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-sm max-w-md mx-auto">
          <form onSubmit={handleSubmit} aria-label="Enter your name">
            <label htmlFor="name-input" className="block text-sm font-semibold text-slate-700 mb-2">
              Your name
            </label>
            <input id="name-input" type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
              autoFocus required aria-required="true" />
            <button type="submit"
              className="w-full mt-5 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold text-base transition-all hover:shadow-lg hover:shadow-indigo-200 active:scale-[0.98]">
              Get Started
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          Inspired by SearchTogether (Morris & Horvitz, UIST 2007)
        </p>
      </div>
    </div>
  );
}

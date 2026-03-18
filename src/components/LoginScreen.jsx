import React, { useState, useEffect } from 'react';
import { Search, Users, Folder, FileText, MessageCircle, Sparkles, ArrowLeft } from 'lucide-react';

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'];

export default function LoginScreen({ onLogin }) {
  const [name, setName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [step, setStep] = useState('name');
  const [inviteCode, setInviteCode] = useState('');

  // Check URL for invite code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('invite');
    if (code) {
      setInviteCode(code);
      fetch(`/api/invite/${code}`).then(r => r.json()).then(data => {
        if (data.sessionId) setSessionId(data.sessionId);
      }).catch(() => {});
    }
  }, []);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) setStep('session');
  };

  const handleSessionSubmit = (e) => {
    e.preventDefault();
    const sid = sessionId.trim() || `research-${Date.now().toString(36)}`;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    onLogin({ id: `u-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, name: name.trim(), color }, sid);
  };

  return (
    <div className="h-screen bg-white flex items-center justify-center p-6" role="main">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Search className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">ResearchTogether</h1>
          <p className="text-slate-500 text-lg max-w-md mx-auto leading-relaxed">
            Search, annotate, and synthesize research findings with your team — together, in real time.
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-12" aria-label="Features">
          {[
            { icon: Users, label: 'Live Cursors' },
            { icon: MessageCircle, label: 'Messages' },
            { icon: Folder, label: 'Smart Folders' },
            { icon: FileText, label: 'Auto Summary' },
            { icon: Sparkles, label: 'Inline Comments' },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 text-slate-600 text-sm font-medium border border-slate-100">
              <Icon className="w-3.5 h-3.5 text-indigo-500" />
              {label}
            </span>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-sm max-w-md mx-auto">
          {step === 'name' ? (
            <form onSubmit={handleNameSubmit} aria-label="Enter your name">
              <label htmlFor="name-input" className="block text-sm font-semibold text-slate-700 mb-2">
                Your name
              </label>
              <input id="name-input" type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                autoFocus required aria-required="true" />
              <button type="submit"
                className="w-full mt-5 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold text-base transition-all hover:shadow-lg hover:shadow-indigo-200 active:scale-[0.98]">
                Continue
              </button>
            </form>
          ) : (
            <form onSubmit={handleSessionSubmit} aria-label="Join or create a session">
              <div className="flex items-center gap-3 mb-6">
                <button type="button" onClick={() => setStep('name')} className="p-1 text-slate-400 hover:text-slate-700 transition-colors" aria-label="Go back">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-slate-500">
                  Welcome, <span className="text-slate-900 font-semibold">{name}</span>
                </span>
              </div>
              <label htmlFor="session-input" className="block text-sm font-semibold text-slate-700 mb-2">
                Session ID
              </label>
              <input id="session-input" type="text" value={sessionId} onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter session ID to join, or leave blank for new..."
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                autoFocus />
              <p className="text-sm text-slate-400 mt-3 mb-5">
                Share this session ID with your research partner to join the same session.
              </p>
              <button type="submit"
                className="w-full px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold text-base transition-all hover:shadow-lg hover:shadow-indigo-200 active:scale-[0.98]">
                {sessionId.trim() ? 'Join Session' : 'Create New Session'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          Inspired by SearchTogether (Morris & Horvitz, UIST 2007)
        </p>
      </div>
    </div>
  );
}

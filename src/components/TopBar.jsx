import React, { useState, useRef } from 'react';
import {
  ArrowLeft, ArrowRight, RotateCw, Search, Globe,
  PanelLeftClose, PanelRightClose, FileText,
  Wifi, WifiOff, PersonStanding, UserPlus, Copy, Check, BookOpen
} from 'lucide-react';

export default function TopBar({
  currentUrl, isLoading, connected, sessionId,
  participants, activeView, onViewChange,
  onNavigate, onSearch, onBack, onForward,
  canGoBack, canGoForward, onToggleSidebar,
  onToggleRightPanel, onToggleAccessibility,
  user, navigations, socket
}) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = input.trim();
    if (!val) return;
    if (val.includes('.') && !val.includes(' ')) onNavigate(val);
    else onSearch(val);
  };

  const generateInvite = async () => {
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      const link = `${window.location.origin}?invite=${data.code}`;
      setInviteLink(link);
      setShowInvite(true);
    } catch (e) {
      console.error(e);
    }
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink || `Session ID: ${sessionId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onlineParticipants = participants.filter(p => p.online && p.id !== user?.id);

  return (
    <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-100" role="banner">
      {/* Sidebar toggle */}
      <button onClick={onToggleSidebar}
        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
        aria-label="Toggle sidebar" data-tooltip="Toggle sidebar">
        <PanelLeftClose className="w-5 h-5" />
      </button>

      {/* Nav buttons */}
      <div className="flex items-center gap-1" role="navigation" aria-label="Browser navigation">
        <button onClick={onBack} disabled={!canGoBack}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button onClick={onForward} disabled={!canGoForward}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          aria-label="Go forward">
          <ArrowRight className="w-5 h-5" />
        </button>
        {isLoading && (
          <div className="p-2" aria-label="Loading">
            <RotateCw className="w-5 h-5 text-indigo-500 animate-spin" />
          </div>
        )}
      </div>

      {/* URL / Search Bar - large, prominent Dia-style */}
      <form onSubmit={handleSubmit}
        className={`flex-1 flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all ${
          isFocused
            ? 'bg-white border-indigo-300 ring-2 ring-indigo-100 shadow-sm'
            : 'bg-slate-50 border-slate-100 hover:border-slate-200'
        }`}
        role="search" aria-label="Search or enter URL">
        {currentUrl ? (
          <Globe className="w-5 h-5 text-slate-400 flex-shrink-0" />
        ) : (
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
        )}
        <input ref={inputRef} type="text" value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
          placeholder="Search the web or enter a URL..."
          className="flex-1 bg-transparent text-base text-slate-800 placeholder-slate-400 focus:outline-none"
          aria-label="Search or URL input" />
        {input && (
          <button type="submit"
            className="px-5 py-1.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all active:scale-95">
            Go
          </button>
        )}
      </form>

      {/* View switcher - larger CTAs */}
      <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-100 p-1" role="tablist" aria-label="View mode">
        <button role="tab" aria-selected={activeView === 'browser'} onClick={() => onViewChange('browser')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeView === 'browser' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}>
          <Globe className="w-4 h-4" /> Browse
        </button>
        <button role="tab" aria-selected={activeView === 'document'} onClick={() => onViewChange('document')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeView === 'document' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}>
          <BookOpen className="w-4 h-4" /> Summary
        </button>
      </div>

      {/* Online collaborators */}
      <div className="flex items-center gap-1.5" aria-label={`${onlineParticipants.length} collaborators online`}>
        {onlineParticipants.slice(0, 3).map((p) => (
          <div key={p.id} className="relative" data-tooltip={`${p.name}`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-sm"
              style={{ backgroundColor: p.color }} aria-label={`${p.name} is online`}>
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
          </div>
        ))}
        {onlineParticipants.length > 3 && (
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500 border-2 border-white">
            +{onlineParticipants.length - 3}
          </div>
        )}
      </div>

      {/* Invite team */}
      <div className="relative">
        <button onClick={generateInvite}
          className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
          aria-label="Invite team member" data-tooltip="Invite">
          <UserPlus className="w-5 h-5" />
        </button>
        {showInvite && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-5" role="dialog">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Invite to Session</h3>
            <p className="text-xs text-slate-500 mb-3">Share this link or session ID with your research partner</p>
            <div className="flex gap-2 mb-3">
              <input type="text" readOnly value={inviteLink || sessionId}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono" />
              <button onClick={copyInvite}
                className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 transition-all flex items-center gap-1">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="text-xs text-slate-400 mb-3">
              <span className="font-mono bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{sessionId}</span>
            </div>
            <button onClick={() => setShowInvite(false)} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
          </div>
        )}
      </div>

      {/* Connection status */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
        {connected ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-red-400" />}
        <span className="text-xs text-slate-400 font-mono max-w-[60px] truncate">{sessionId?.slice(0, 8)}</span>
      </div>

      {/* Accessibility */}
      <button onClick={onToggleAccessibility}
        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
        aria-label="Accessibility settings" data-tooltip="Accessibility">
        <PersonStanding className="w-5 h-5" />
      </button>

      {/* Right panel toggle */}
      <button onClick={onToggleRightPanel}
        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
        aria-label="Toggle right panel" data-tooltip="Panel">
        <PanelRightClose className="w-5 h-5" />
      </button>
    </header>
  );
}

import React, { useState, useRef } from 'react';
import {
  ArrowLeft, ArrowRight, RotateCw, Search, Globe,
  PanelLeftClose, PanelRightClose, FileText,
  Wifi, WifiOff, PersonStanding, UserPlus, Copy, Check,
  BookOpen, Layers, Download, Settings, Lightbulb, Sparkles,
  Folder, Video, MessageCircle, ChevronLeft
} from 'lucide-react';
import { getTemplate } from '../data/templates';

export default function TopBar({
  currentUrl, isLoading, connected, project,
  participants, activeView, onViewChange,
  onNavigate, onSearch, onBack, onForward,
  canGoBack, canGoForward, onToggleSidebar,
  onToggleRightPanel, onToggleAccessibility,
  onExport, onAdmin, onBackToDashboard,
  user, navigations, socket,
  rightPanel, onRightPanelChange,
  sidebarTab, onSidebarTabChange,
}) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  const template = getTemplate(project?.deliverableType);

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
        body: JSON.stringify({ sessionId: project.id }),
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
    navigator.clipboard.writeText(inviteLink || `Project ID: ${project.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onlineParticipants = participants.filter(p => p.online && p.id !== user?.id);

  return (
    <header className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-100" role="banner">
      <button onClick={onBackToDashboard}
        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
        aria-label="Back to projects" data-tooltip="Projects">
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button onClick={onToggleSidebar}
        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
        aria-label="Toggle sidebar">
        <PanelLeftClose className="w-5 h-5" />
      </button>

      {/* Sidebar tab switcher */}
      <div className="flex items-center bg-slate-50 rounded-xl border border-slate-100 p-0.5">
        {[
          { id: 'library', icon: Folder, label: 'Library' },
          { id: 'folders', icon: FileText, label: 'Folders' },
          { id: 'sessions', icon: Video, label: 'Sessions' },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => onSidebarTabChange(id)}
            className={`p-1.5 rounded-lg transition-all ${sidebarTab === id ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
            aria-label={label} data-tooltip={label}>
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button onClick={onBack} disabled={!canGoBack}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-20"
          aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button onClick={onForward} disabled={!canGoForward}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-20"
          aria-label="Go forward">
          <ArrowRight className="w-5 h-5" />
        </button>
        {isLoading && <RotateCw className="w-5 h-5 text-indigo-500 animate-spin mx-1" />}
      </div>

      <form onSubmit={handleSubmit}
        className={`flex-1 flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all ${
          isFocused ? 'bg-white border-indigo-300 ring-2 ring-indigo-100 shadow-sm' : 'bg-slate-50 border-slate-100'
        }`}
        role="search">
        {currentUrl ? <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />}
        <input ref={inputRef} type="text" value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
          placeholder="Search the web or enter a URL..."
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none" />
        {input && (
          <button type="submit" className="px-4 py-1 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500">
            Go
          </button>
        )}
      </form>

      {/* Main view switcher */}
      <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-100 p-1" role="tablist">
        {[
          { id: 'browser', icon: Globe, label: 'Browse' },
          { id: 'deliverable', icon: Layers, label: 'Deliverable' },
          { id: 'summary', icon: BookOpen, label: 'Summary' },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} role="tab" aria-selected={activeView === id} onClick={() => onViewChange(id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeView === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Right panel tabs */}
      <div className="flex items-center bg-slate-50 rounded-xl border border-slate-100 p-0.5">
        {[
          { id: 'comments', icon: MessageCircle },
          { id: 'findings', icon: Lightbulb },
          { id: 'context', icon: Sparkles },
        ].map(({ id, icon: Icon }) => (
          <button key={id} onClick={() => onRightPanelChange(id)}
            className={`p-1.5 rounded-lg transition-all ${rightPanel === id ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
            aria-label={id}>
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Collaborators */}
      <div className="flex items-center gap-1">
        {onlineParticipants.slice(0, 3).map((p) => (
          <div key={p.id} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white shadow-sm"
            style={{ backgroundColor: p.color }} data-tooltip={p.name}>
            {p.name.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>

      <button onClick={onExport}
        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
        aria-label="Export" data-tooltip="Export">
        <Download className="w-5 h-5" />
      </button>

      <div className="relative">
        <button onClick={generateInvite}
          className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
          aria-label="Invite">
          <UserPlus className="w-5 h-5" />
        </button>
        {showInvite && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Invite to Project</h3>
            <div className="flex gap-2 mb-2">
              <input type="text" readOnly value={inviteLink || project.id}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono" />
              <button onClick={copyInvite} className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button onClick={() => setShowInvite(false)} className="text-xs text-slate-400">Close</button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-50 border border-slate-100">
        {connected ? <Wifi className="w-3.5 h-3.5 text-emerald-500" /> : <WifiOff className="w-3.5 h-3.5 text-red-400" />}
        <span className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]">{project.name}</span>
      </div>

      <button onClick={onToggleAccessibility}
        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
        aria-label="Accessibility">
        <PersonStanding className="w-5 h-5" />
      </button>

      <button onClick={onAdmin}
        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
        aria-label="Admin" data-tooltip="Admin">
        <Settings className="w-5 h-5" />
      </button>

      <button onClick={onToggleRightPanel}
        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
        aria-label="Toggle right panel">
        <PanelRightClose className="w-5 h-5" />
      </button>
    </header>
  );
}

import React, { useState } from 'react';
import {
  Calendar, Video, Users, Clock, Plus, Play, CheckCircle, Globe
} from 'lucide-react';

export default function ResearchSessionsPanel({ sessions, socket, user, projectId, onJoinSession }) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [newSession, setNewSession] = useState({ title: '', date: '', time: '', duration: 60 });

  const handleSchedule = (e) => {
    e.preventDefault();
    if (!newSession.title.trim() || !newSession.date) return;
    const session = {
      id: `rs-${Date.now()}`,
      title: newSession.title.trim(),
      scheduledAt: new Date(`${newSession.date}T${newSession.time || '10:00'}`).getTime(),
      duration: newSession.duration,
      status: 'scheduled',
      createdBy: user.name,
      participants: [user.id],
    };
    socket?.emit('schedule-research-session', { session });
    setNewSession({ title: '', date: '', time: '', duration: 60 });
    setShowSchedule(false);
  };

  const upcoming = (sessions || []).filter(s => s.status === 'scheduled' && s.scheduledAt > Date.now());
  const past = (sessions || []).filter(s => s.status === 'completed' || s.scheduledAt <= Date.now());

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-bold text-slate-800">Research Sessions</h2>
          </div>
          <button onClick={() => setShowSchedule(!showSchedule)}
            className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Schedule live co-browsing sessions within this project</p>
      </div>

      {showSchedule && (
        <form onSubmit={handleSchedule} className="px-4 py-3 border-b border-slate-100 bg-violet-50/30 animate-fadeIn">
          <input type="text" value={newSession.title} onChange={e => setNewSession(p => ({ ...p, title: e.target.value }))}
            placeholder="Session title..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          <div className="flex gap-2 mb-2">
            <input type="date" value={newSession.date} onChange={e => setNewSession(p => ({ ...p, date: e.target.value }))}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" required />
            <input type="time" value={newSession.time} onChange={e => setNewSession(p => ({ ...p, time: e.target.value }))}
              className="w-28 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm" />
          </div>
          <button type="submit" className="w-full py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-500">
            Schedule Session
          </button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {upcoming.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider px-1 mb-2">Upcoming</p>
            {upcoming.map(session => (
              <SessionCard key={session.id} session={session} onJoin={onJoinSession} />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">Past Sessions</p>
            {past.map(session => (
              <SessionCard key={session.id} session={session} past />
            ))}
          </div>
        )}

        {(sessions || []).length === 0 && (
          <div className="text-center py-8 px-4">
            <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No research sessions scheduled yet.</p>
            <p className="text-xs text-slate-300 mt-1">Book a live session for shared browsing and capture.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session, onJoin, past }) {
  const date = new Date(session.scheduledAt);
  const isLive = !past && Math.abs(Date.now() - session.scheduledAt) < (session.duration || 60) * 60 * 1000;

  return (
    <div className={`p-3 mb-1.5 rounded-xl border transition-all ${
      isLive ? 'border-violet-200 bg-violet-50/50' : 'border-slate-100 bg-white'
    }`}>
      <div className="flex items-start gap-2">
        {past ? <CheckCircle className="w-4 h-4 text-slate-300 mt-0.5" /> : <Video className="w-4 h-4 text-violet-500 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700">{session.title}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-300">
            <Users className="w-3 h-3" /> {session.participants?.length || 1} participants
          </div>
        </div>
        {isLive && onJoin && (
          <button onClick={() => onJoin(session)}
            className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-xl hover:bg-violet-500">
            <Play className="w-3 h-3" /> Join
          </button>
        )}
      </div>
      {session.capturedSources?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-50 flex items-center gap-1 text-[10px] text-slate-400">
          <Globe className="w-3 h-3" /> {session.capturedSources.length} sources captured
        </div>
      )}
    </div>
  );
}

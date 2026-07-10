import React, { useState, useEffect } from 'react';
import {
  Plus, FolderOpen, BookOpen, Presentation, Newspaper, BarChart3,
  ArrowRight, Clock, Users, Sparkles
} from 'lucide-react';
import { DELIVERABLE_TYPES } from '../data/templates';

const ICONS = { BookOpen, Presentation, Newspaper, BarChart3 };

export default function ProjectDashboard({ user, onSelectProject, onCreateProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedType, setSelectedType] = useState('analysis_brief');

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => { setProjects(data.projects || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        deliverableType: selectedType,
        ownerId: user.id,
        ownerName: user.name,
      }),
    });
    const project = await res.json();
    onCreateProject(project);
  };

  const typeIcon = (type) => {
    const template = DELIVERABLE_TYPES[type];
    const Icon = ICONS[template?.icon] || FolderOpen;
    return <Icon className="w-5 h-5" style={{ color: template?.color }} />;
  };

  return (
    <div className="h-screen bg-white flex items-center justify-center p-6" role="main">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Your Projects</h1>
          <p className="text-slate-500">
            Welcome back, <span className="font-semibold text-slate-700">{user.name}</span>
          </p>
        </div>

        {loading ? (
          <div className="text-center text-slate-400 py-12">Loading projects...</div>
        ) : (
          <>
            <div className="grid gap-3 mb-8">
              {projects.map(project => {
                const template = DELIVERABLE_TYPES[project.deliverableType];
                return (
                  <button key={project.id} onClick={() => onSelectProject(project)}
                    className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all text-left group">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: `${template?.color}15` }}>
                      {typeIcon(project.deliverableType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{project.name}</h3>
                      <p className="text-sm text-slate-400">{template?.name || project.deliverableType}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-300">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />
                          {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />
                          {(project.sources || []).length} sources
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </button>
                );
              })}
            </div>

            {!showCreate ? (
              <button onClick={() => setShowCreate(true)}
                className="w-full flex items-center justify-center gap-2 p-5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all">
                <Plus className="w-5 h-5" />
                <span className="font-semibold">New Project</span>
              </button>
            ) : (
              <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-1">Create a project</h2>
                <p className="text-sm text-slate-400 mb-6 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Your deliverable type shapes the entire workspace
                </p>

                <label className="block text-sm font-semibold text-slate-700 mb-2">Project name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Q3 User Research, Climate Policy Brief..."
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
                  autoFocus required />

                <label className="block text-sm font-semibold text-slate-700 mb-3">Deliverable type</label>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {Object.values(DELIVERABLE_TYPES).map(t => {
                    const Icon = ICONS[t.icon] || FolderOpen;
                    return (
                      <button key={t.id} type="button" onClick={() => setSelectedType(t.id)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          selectedType === t.id
                            ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Icon className="w-4 h-4" style={{ color: t.color }} />
                          <span className="text-sm font-semibold text-slate-800">{t.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{t.description}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="flex-1 px-5 py-3.5 border border-slate-200 rounded-2xl text-slate-600 font-semibold hover:bg-slate-50 transition-all">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold transition-all hover:shadow-lg hover:shadow-indigo-200">
                    Create Project
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

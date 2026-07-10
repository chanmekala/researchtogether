import React, { useState, useRef } from 'react';
import { Upload, FileText, Image, Globe, Link, Plus, X, Search } from 'lucide-react';

const TYPE_ICONS = { url: Globe, pdf: FileText, image: Image, link: Link };

export default function SourceLibrary({ sources, socket, user, projectId, onOpenSource, deliverableType }) {
  const [showAdd, setShowAdd] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const [filter, setFilter] = useState('');
  const fileInputRef = useRef(null);

  const filtered = (sources || []).filter(s => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (s.title || '').toLowerCase().includes(q) ||
      (s.url || '').toLowerCase().includes(q) ||
      s.type?.toLowerCase().includes(q);
  });

  const handleAddUrl = (e) => {
    e.preventDefault();
    if (!addUrl.trim()) return;
    let url = addUrl.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    socket?.emit('add-source', {
      type: url.endsWith('.pdf') ? 'pdf' : 'url',
      url,
      title: url,
      addedBy: user.name,
      addedById: user.id,
    });
    setAddUrl('');
    setShowAdd(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    formData.append('addedBy', user.name);
    formData.append('addedById', user.id);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.source) socket?.emit('source-added', { source: data.source });
    } catch (err) {
      console.error('Upload failed:', err);
    }
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800">Source Library</h2>
          <button onClick={() => setShowAdd(!showAdd)}
            className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-all" aria-label="Add source">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
          <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Search sources..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      {showAdd && (
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 animate-fadeIn">
          <form onSubmit={handleAddUrl} className="mb-2">
            <input type="text" value={addUrl} onChange={e => setAddUrl(e.target.value)}
              placeholder="Paste URL..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button type="submit" className="mt-2 w-full py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500">
              Add URL
            </button>
          </form>
          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-white transition-all">
              <Upload className="w-3.5 h-3.5" /> PDF / Image
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp" className="hidden" onChange={handleFileUpload} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8 px-4">
            No sources yet. Add URLs, PDFs, or images to build your library.
          </p>
        ) : (
          filtered.map(source => {
            const Icon = TYPE_ICONS[source.type] || Globe;
            return (
              <button key={source.id} onClick={() => onOpenSource(source)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all text-left group mb-0.5">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 font-medium truncate">{source.title || source.url}</p>
                  <p className="text-[11px] text-slate-300">{source.type} · {source.addedBy}</p>
                </div>
                {source.annotations?.length > 0 && (
                  <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {source.annotations.length}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

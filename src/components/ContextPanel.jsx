import React, { useState } from 'react';
import { Search, Sparkles, Loader2, BookOpen, MessageCircle, ChevronRight } from 'lucide-react';
import { searchLibrary, summarizeSource } from '../lib/contextEngine';

export default function ContextPanel({ sources, findingCards, annotations, project }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/context/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          projectId: project.id,
        }),
      });
      const data = await res.json();
      setResults(data);
    } catch {
      const local = searchLibrary(query, sources, findingCards, annotations);
      setResults(local);
    }
    setLoading(false);
  };

  const handleSummarize = (source) => {
    const summary = summarizeSource(source, annotations);
    setResults({ type: 'summary', source, ...summary });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-bold text-slate-800">Context Engine</h2>
        </div>
        <div className="flex gap-1 bg-slate-50 rounded-xl p-1">
          {['search', 'sources'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
              }`}>
              {tab === 'search' ? 'Q&A' : 'Summarize'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'search' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <form onSubmit={handleSearch} className="px-4 py-3 border-b border-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Ask about your sources..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </form>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {loading && (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Searching library...
              </div>
            )}

            {results?.answer && !loading && (
              <div className="mb-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl animate-fadeIn">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-semibold text-indigo-600 uppercase">Answer</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    results.answer.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
                    results.answer.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>{results.answer.confidence} confidence</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{results.answer.text}</p>
                {results.answer.citations?.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-indigo-100">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Citations</p>
                    {results.answer.citations.map(c => (
                      <p key={c.id} className="text-xs text-indigo-600 truncate">{c.title}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {results?.results?.length > 0 && !loading && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">
                  {results.results.length} matching sources
                </p>
                {results.results.map(r => (
                  <div key={r.id} className="flex items-start gap-2 p-3 mb-1.5 bg-white border border-slate-100 rounded-xl">
                    <BookOpen className="w-3.5 h-3.5 text-slate-300 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{r.title}</p>
                      {r.snippet && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{r.snippet}</p>}
                    </div>
                    <ChevronRight className="w-3 h-3 text-slate-200" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sources' && (
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {(sources || []).map(source => (
            <button key={source.id} onClick={() => handleSummarize(source)}
              className="w-full flex items-center gap-3 p-3 mb-1 rounded-xl hover:bg-slate-50 transition-all text-left">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{source.title || source.url}</p>
                <p className="text-xs text-slate-400">{source.type}</p>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-slate-300" />
            </button>
          ))}
          {results?.type === 'summary' && (
            <div className="mt-3 p-4 bg-slate-50 rounded-2xl animate-fadeIn">
              <p className="text-sm text-slate-700 leading-relaxed">{results.summary}</p>
              {results.keyPoints?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {results.keyPoints.map(kp => (
                    <li key={kp.id} className="text-xs text-slate-500 pl-3 border-l-2 border-amber-300">{kp.text}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

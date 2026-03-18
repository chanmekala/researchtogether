import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  MessageSquare, FileText, Bookmark, Search, ExternalLink, Globe, BookmarkPlus
} from 'lucide-react';

export default function BrowserView({
  currentUrl, isLoading, searchResults, onNavigate, onLoadComplete,
  iframeRef, comments, participants, user, onComment, onAddToDoc,
  onSaveToFolder, folders, socket, currentTitle, setCurrentTitle
}) {
  const [selectedText, setSelectedText] = useState('');
  const [selectionPos, setSelectionPos] = useState(null);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const containerRef = useRef(null);

  // Listen for text selection from iframe
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === 'RT_TEXT_SELECTED') {
        setSelectedText(e.data.text);
        // Position the popup relative to the iframe container
        const iframe = iframeRef.current;
        if (iframe) {
          const iframeRect = iframe.getBoundingClientRect();
          setSelectionPos({
            x: iframeRect.left + e.data.position.x,
            y: iframeRect.top + e.data.position.y - 8
          });
        }
      } else if (e.data?.type === 'RT_SELECTION_CLEARED') {
        // Delay so button clicks register
        setTimeout(() => { setSelectedText(''); setSelectionPos(null); }, 200);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [iframeRef]);

  const handleCommentClick = () => {
    const text = selectedText;
    const comment = prompt('Leave a comment for your team:');
    if (comment) {
      onComment(comment, text);
    }
    setSelectedText('');
    setSelectionPos(null);
  };

  const handleAddToDocClick = () => {
    onAddToDoc('', selectedText);
    // Highlight the text in the iframe
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'RT_HIGHLIGHT_TEXT' }, '*');
    }
    setSelectedText('');
    setSelectionPos(null);
  };

  // Search results view
  if (searchResults.length > 0 && !currentUrl) {
    return (
      <div className="flex-1 overflow-y-auto bg-white p-8" role="main" aria-label="Search results">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-slate-400 mb-6 font-medium">{searchResults.length} results found</p>
          <div className="space-y-5">
            {searchResults.map((result, i) => (
              <article key={i}
                className="group cursor-pointer p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                onClick={() => onNavigate(result.url)} tabIndex={0} role="link"
                onKeyDown={(e) => e.key === 'Enter' && onNavigate(result.url)} aria-label={result.title}>
                <p className="text-xs text-slate-400 truncate mb-1">{result.url}</p>
                <h3 className="text-base text-indigo-600 group-hover:text-indigo-500 font-semibold mb-1.5 transition-colors">
                  {result.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">{result.snippet}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!currentUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white" role="main">
        <div className="text-center max-w-lg">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100/50 flex items-center justify-center">
            <Search className="w-10 h-10 text-indigo-300" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Start Researching Together</h2>
          <p className="text-base text-slate-400 mb-8 leading-relaxed">
            Search for a topic or enter a URL above. Highlight text to leave comments or add findings to your research summary.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Climate change solutions', 'AI in healthcare', 'Market trends 2026'].map(q => (
              <button key={q} onClick={() => onNavigate(`search:${q}`)}
                className="px-5 py-2.5 text-sm bg-slate-50 text-slate-600 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100 hover:border-indigo-100 transition-all font-medium">
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Browser view with iframe
  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" ref={containerRef} role="main" aria-label="Web page viewer">
      {/* Page toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-100">
        <Globe className="w-4 h-4 text-slate-300" />
        <span className="text-sm text-slate-500 truncate flex-1">{currentUrl}</span>

        {/* Save to folder - big CTA */}
        <div className="relative">
          <button onClick={() => setShowSaveMenu(!showSaveMenu)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all flex items-center gap-2"
            aria-label="Save to folder" data-tooltip="Save to folder">
            <BookmarkPlus className="w-4 h-4" /> Save
          </button>
          {showSaveMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2" role="menu">
              {folders.map(f => (
                <button key={f.id}
                  onClick={() => { onSaveToFolder(f.id); setShowSaveMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-all" role="menuitem">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color }} />
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <a href={currentUrl} target="_blank" rel="noopener noreferrer"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
          aria-label="Open in new tab" data-tooltip="Open externally">
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Iframe */}
      <div className="flex-1 relative bg-white">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading page...</p>
            </div>
          </div>
        )}
        <iframe ref={iframeRef}
          src={`/proxy?url=${encodeURIComponent(currentUrl)}`}
          className="w-full h-full border-0"
          title="Web page"
          onLoad={() => onLoadComplete()}
          aria-label={`Web page: ${currentUrl}`} />
      </div>

      {/* Figma-like selection popup */}
      {selectedText && selectionPos && (
        <div className="selection-popup fixed z-50" style={{ left: selectionPos.x, top: selectionPos.y - 52, transform: 'translateX(-50%)' }}>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5">
            <button onClick={handleCommentClick}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              aria-label="Add comment">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              Comment
            </button>
            <div className="w-px h-6 bg-slate-100" />
            <button onClick={handleAddToDocClick}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              aria-label="Add to document">
              <FileText className="w-4 h-4 text-emerald-500" />
              Add to Summary
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

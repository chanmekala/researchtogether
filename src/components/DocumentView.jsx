import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  FileText, Presentation, ChevronLeft, ChevronRight,
  Globe, Edit3, Trash2, BookOpen, Quote,
  Search, GripVertical, Sparkles, Loader2, Plus, X,
  Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';

export default function DocumentView({ document, docItems, socket, user, onNavigate }) {
  const [mode, setMode] = useState('document');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(document.title || 'Research Summary');
  const [snippetSearch, setSnippetSearch] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPres, setIsGeneratingPres] = useState(false);

  // Multi-tab drafts
  const [drafts, setDrafts] = useState([
    { id: 'draft-1', name: 'Draft 1', content: '' }
  ]);
  const [activeDraftId, setActiveDraftId] = useState('draft-1');
  const [editingDraftName, setEditingDraftName] = useState(null);
  const editorRef = useRef(null);

  // AI presentation slides (separate from manual slides)
  const [aiSlides, setAiSlides] = useState(null);

  const activeDraft = drafts.find(d => d.id === activeDraftId) || drafts[0];

  const groupedItems = useMemo(() => {
    const groups = {};
    (docItems || []).forEach(item => {
      const key = item.url || 'notes';
      if (!groups[key]) groups[key] = { url: item.url, pageTitle: item.pageTitle, items: [] };
      groups[key].items.push(item);
    });
    return Object.values(groups);
  }, [docItems]);

  const filteredSnippets = useMemo(() => {
    const all = (docItems || []).map((item, idx) => ({ ...item, originalIndex: idx }));
    if (!snippetSearch.trim()) return all;
    const q = snippetSearch.toLowerCase();
    return all.filter(item =>
      (item.highlightText || '').toLowerCase().includes(q) ||
      (item.text || '').toLowerCase().includes(q) ||
      (item.pageTitle || '').toLowerCase().includes(q)
    );
  }, [docItems, snippetSearch]);

  // Default slides (non-AI)
  const defaultSlides = useMemo(() => {
    const s = [{ type: 'title', title, count: docItems?.length || 0, sources: groupedItems.length }];
    groupedItems.forEach(group => { s.push({ type: 'source', ...group }); });
    s.push({ type: 'summary', items: docItems || [], sources: groupedItems });
    return s;
  }, [title, groupedItems, docItems]);

  const slides = aiSlides || defaultSlides;

  const updateTitle = (e) => {
    e.preventDefault();
    setEditingTitle(false);
    socket?.emit('update-document', { document: { ...document, title } });
  };

  const removeItem = (itemId) => {
    socket?.emit('remove-doc-item', { itemId });
  };

  // Drag handlers
  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem(index);
  };
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === dropIndex) return;
    socket?.emit('reorder-doc-items', { fromIndex: draggedItem, toIndex: dropIndex });
    setDraggedItem(null);
    setDragOverItem(null);
  };
  const handleDragEnd = () => { setDraggedItem(null); setDragOverItem(null); };

  const execCommand = (cmd, value = null) => {
    window.document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  // Save current draft content before switching
  const saveDraftContent = useCallback(() => {
    if (editorRef.current && activeDraftId) {
      setDrafts(prev => prev.map(d =>
        d.id === activeDraftId ? { ...d, content: editorRef.current.innerHTML } : d
      ));
    }
  }, [activeDraftId]);

  const switchDraft = (draftId) => {
    saveDraftContent();
    setActiveDraftId(draftId);
    // Load content after state update
    setTimeout(() => {
      const draft = drafts.find(d => d.id === draftId);
      if (editorRef.current && draft) {
        editorRef.current.innerHTML = draft.content || '';
      }
    }, 0);
  };

  const addDraft = () => {
    saveDraftContent();
    const newId = `draft-${Date.now()}`;
    const newDraft = { id: newId, name: `Draft ${drafts.length + 1}`, content: '' };
    setDrafts(prev => [...prev, newDraft]);
    setActiveDraftId(newId);
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = '';
    }, 0);
  };

  const removeDraft = (draftId) => {
    if (drafts.length <= 1) return;
    const remaining = drafts.filter(d => d.id !== draftId);
    setDrafts(remaining);
    if (activeDraftId === draftId) {
      setActiveDraftId(remaining[0].id);
      setTimeout(() => {
        if (editorRef.current) editorRef.current.innerHTML = remaining[0].content || '';
      }, 0);
    }
  };

  const renameDraft = (draftId, newName) => {
    setDrafts(prev => prev.map(d => d.id === draftId ? { ...d, name: newName || d.name } : d));
    setEditingDraftName(null);
  };

  // AI Summary for editor
  const generateAiSummary = useCallback(() => {
    if (!docItems || docItems.length === 0) return;
    setIsGenerating(true);
    setTimeout(() => {
      const sources = [...new Set(docItems.map(item => item.pageTitle).filter(Boolean))];
      let html = `<h1 style="font-size:1.6em;font-weight:bold;color:#1e293b;margin-bottom:0.5em;">${title}</h1>`;
      html += `<p style="color:#64748b;margin-bottom:1.5em;">Research compilation from ${sources.length} source${sources.length !== 1 ? 's' : ''} with ${docItems.length} key finding${docItems.length !== 1 ? 's' : ''}.</p>`;
      html += `<h2 style="font-size:1.2em;font-weight:bold;color:#334155;margin-bottom:0.5em;">Key Findings</h2>`;
      groupedItems.forEach((group, i) => {
        const name = group.pageTitle || (() => { try { return new URL(group.url).hostname; } catch { return 'Source'; } })();
        html += `<h3 style="font-size:1em;font-weight:600;color:#475569;margin-top:1em;">${i + 1}. ${name}</h3>`;
        html += '<ul style="margin-left:1.2em;margin-bottom:0.5em;">';
        group.items.forEach(item => {
          if (item.highlightText) html += `<li style="color:#92400e;font-style:italic;margin-bottom:0.3em;">&ldquo;${item.highlightText}&rdquo;</li>`;
          if (item.text) html += `<li style="color:#475569;margin-bottom:0.3em;">${item.text}</li>`;
        });
        html += '</ul>';
      });
      html += `<h2 style="font-size:1.2em;font-weight:bold;color:#334155;margin-top:1.5em;margin-bottom:0.5em;">Sources</h2><ol style="margin-left:1.2em;">`;
      groupedItems.forEach((group) => {
        html += `<li style="color:#4f46e5;margin-bottom:0.2em;">${group.pageTitle || group.url}</li>`;
      });
      html += '</ol>';
      if (editorRef.current) editorRef.current.innerHTML = html;
      setIsGenerating(false);
    }, 1200);
  }, [docItems, title, groupedItems]);

  // AI Presentation generator
  const generateAiPresentation = useCallback(() => {
    if (!docItems || docItems.length === 0) return;
    setIsGeneratingPres(true);
    setTimeout(() => {
      const sources = [...new Set(docItems.map(item => item.pageTitle).filter(Boolean))];
      const allHighlights = docItems.filter(d => d.highlightText).map(d => d.highlightText);
      const allNotes = docItems.filter(d => d.text).map(d => d.text);
      const totalFindings = docItems.length;

      const generatedSlides = [];

      // Slide 1: Title
      generatedSlides.push({ type: 'ai-title', title, count: totalFindings, sourceCount: sources.length, date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) });

      // Slide 2: Overview / Executive Summary
      generatedSlides.push({
        type: 'ai-overview',
        title: 'Research Overview',
        points: [
          `Analyzed ${sources.length} source${sources.length !== 1 ? 's' : ''} across the research scope`,
          `Collected ${totalFindings} key finding${totalFindings !== 1 ? 's' : ''} and evidence points`,
          allHighlights.length > 0 ? `${allHighlights.length} direct quotes captured for citation` : 'Primary research notes compiled',
          `Collaborative effort by the research team`
        ]
      });

      // Slide 3+: One per source with key findings
      groupedItems.forEach((group) => {
        const name = group.pageTitle || (() => { try { return new URL(group.url).hostname; } catch { return 'Source'; } })();
        const highlights = group.items.filter(i => i.highlightText).map(i => i.highlightText);
        const notes = group.items.filter(i => i.text).map(i => i.text);
        generatedSlides.push({
          type: 'ai-source',
          title: name,
          url: group.url,
          highlights: highlights.slice(0, 4),
          notes: notes.slice(0, 3),
          findingCount: group.items.length
        });
      });

      // Slide: Key Themes (synthesized)
      if (allHighlights.length >= 2) {
        generatedSlides.push({
          type: 'ai-themes',
          title: 'Key Themes & Patterns',
          themes: [
            { label: 'Primary Evidence', detail: `${allHighlights.length} direct quotes support the research thesis` },
            { label: 'Source Diversity', detail: `Findings drawn from ${sources.length} independent source${sources.length !== 1 ? 's' : ''}` },
            { label: 'Research Notes', detail: allNotes.length > 0 ? `${allNotes.length} analytical notes added by researchers` : 'Focused on primary source extraction' },
          ]
        });
      }

      // Slide: Conclusion
      generatedSlides.push({
        type: 'ai-conclusion',
        title: 'Summary & Next Steps',
        stats: { findings: totalFindings, sources: sources.length, highlights: allHighlights.length },
        nextSteps: [
          'Review and validate key findings with stakeholders',
          'Cross-reference sources for accuracy',
          'Draft final research report from collected evidence',
          'Identify gaps requiring additional research'
        ]
      });

      setAiSlides(generatedSlides);
      setCurrentSlide(0);
      setIsGeneratingPres(false);
    }, 1500);
  }, [docItems, title, groupedItems]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white" role="main" aria-label="Research summary">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-100">
        <BookOpen className="w-5 h-5 text-indigo-500" />
        {editingTitle ? (
          <form onSubmit={updateTitle} className="flex-1">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              autoFocus onBlur={updateTitle} aria-label="Document title" />
          </form>
        ) : (
          <button onClick={() => setEditingTitle(true)}
            className="flex items-center gap-2 text-base font-semibold text-slate-800 hover:text-indigo-600 transition-colors">
            {title} <Edit3 className="w-4 h-4 text-slate-300" />
          </button>
        )}
        <div className="flex-1" />
        <span className="text-sm text-slate-400">
          {docItems?.length || 0} findings &middot; {groupedItems.length} sources
        </span>
        <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-100 p-1" role="tablist">
          <button role="tab" aria-selected={mode === 'document'} onClick={() => setMode('document')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              mode === 'document' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}>
            <FileText className="w-4 h-4" /> Document
          </button>
          <button role="tab" aria-selected={mode === 'presentation'} onClick={() => { setMode('presentation'); setCurrentSlide(0); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              mode === 'presentation' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}>
            <Presentation className="w-4 h-4" /> Presentation
          </button>
        </div>
      </div>

      {/* DOCUMENT MODE - Split View */}
      {mode === 'document' && (
        <div className="flex-1 flex overflow-hidden" role="tabpanel" aria-label="Document view">
          {/* LEFT: Snippets */}
          <div className="w-[380px] flex-shrink-0 border-r border-slate-100 flex flex-col bg-slate-50/50 overflow-hidden">
            <div className="p-3 border-b border-slate-100">
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-indigo-300">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input type="text" value={snippetSearch} onChange={(e) => setSnippetSearch(e.target.value)}
                  placeholder="Search snippets..." className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
                  aria-label="Search text snippets" />
                {snippetSearch && (
                  <button onClick={() => setSnippetSearch('')} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
                )}
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-xs text-slate-400 font-medium">{filteredSnippets.length} snippet{filteredSnippets.length !== 1 ? 's' : ''}</span>
                <button onClick={generateAiSummary} disabled={isGenerating || !docItems?.length}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-semibold rounded-xl hover:from-indigo-600 hover:to-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                  aria-label="Generate AI summary">
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isGenerating ? 'Generating...' : 'AI Summary'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredSnippets.length === 0 ? (
                <div className="text-center py-16">
                  <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">{snippetSearch ? 'No matching snippets' : 'No snippets yet'}</p>
                  <p className="text-xs text-slate-300 mt-1.5 max-w-[240px] mx-auto">
                    {snippetSearch ? 'Try a different keyword' : 'Highlight text on pages and add to Summary. Snippets appear here for reference.'}
                  </p>
                </div>
              ) : (
                filteredSnippets.map((item) => (
                  <div key={item.id} draggable onDragStart={(e) => handleDragStart(e, item.originalIndex)}
                    onDragOver={(e) => handleDragOver(e, item.originalIndex)} onDrop={(e) => handleDrop(e, item.originalIndex)}
                    onDragEnd={handleDragEnd}
                    className={`group relative p-3 bg-white rounded-2xl border transition-all cursor-grab active:cursor-grabbing ${
                      dragOverItem === item.originalIndex ? 'border-indigo-400 bg-indigo-50/50 scale-[1.01]'
                        : draggedItem === item.originalIndex ? 'opacity-40 border-slate-200'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}>
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex-1 min-w-0">
                        {item.highlightText && (
                          <p className="text-xs text-amber-700 italic bg-amber-50 px-2.5 py-1.5 rounded-lg border-l-2 border-amber-300 mb-1.5 line-clamp-3">
                            &ldquo;{item.highlightText}&rdquo;
                          </p>
                        )}
                        {item.text && <p className="text-xs text-slate-600 line-clamp-2">{item.text}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <button onClick={() => onNavigate(item.url)}
                            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-600 transition-colors truncate max-w-[200px]">
                            <Globe className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{item.pageTitle || item.url}</span>
                          </button>
                          <span className="text-[10px] text-slate-300 ml-auto flex-shrink-0">{item.addedBy}</span>
                        </div>
                      </div>
                      <button onClick={() => removeItem(item.id)}
                        className="hidden group-hover:flex p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                        aria-label="Remove snippet">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT: Editor with Draft Tabs */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Draft tabs bar */}
            <div className="flex items-center gap-0.5 px-3 py-1.5 bg-slate-50 border-b border-slate-100 overflow-x-auto">
              {drafts.map(draft => (
                <div key={draft.id}
                  className={`group flex items-center gap-1 px-3 py-1.5 rounded-t-xl text-sm font-medium cursor-pointer transition-all ${
                    activeDraftId === draft.id
                      ? 'bg-white text-slate-800 border border-slate-200 border-b-white -mb-px relative z-10 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                  }`}
                  onClick={() => switchDraft(draft.id)}>
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  {editingDraftName === draft.id ? (
                    <input type="text" defaultValue={draft.name} autoFocus
                      className="w-20 bg-transparent text-sm focus:outline-none border-b border-indigo-300"
                      onBlur={(e) => renameDraft(draft.id, e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') renameDraft(draft.id, e.target.value); }}
                    />
                  ) : (
                    <span onDoubleClick={() => setEditingDraftName(draft.id)} className="truncate max-w-[100px]">
                      {draft.name}
                    </span>
                  )}
                  {drafts.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); removeDraft(draft.id); }}
                      className="hidden group-hover:flex p-0.5 rounded text-slate-300 hover:text-red-500 transition-all ml-0.5"
                      aria-label="Close draft">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addDraft}
                className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all ml-1"
                aria-label="New draft" data-tooltip="New draft">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Editor toolbar */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-100 bg-white">
              <button onClick={() => execCommand('bold')} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all" aria-label="Bold"><Bold className="w-4 h-4" /></button>
              <button onClick={() => execCommand('italic')} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all" aria-label="Italic"><Italic className="w-4 h-4" /></button>
              <button onClick={() => execCommand('underline')} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all" aria-label="Underline"><Underline className="w-4 h-4" /></button>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <button onClick={() => execCommand('insertUnorderedList')} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all" aria-label="Bullet list"><List className="w-4 h-4" /></button>
              <button onClick={() => execCommand('insertOrderedList')} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all" aria-label="Numbered list"><ListOrdered className="w-4 h-4" /></button>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <button onClick={() => execCommand('justifyLeft')} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all" aria-label="Align left"><AlignLeft className="w-4 h-4" /></button>
              <button onClick={() => execCommand('justifyCenter')} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all" aria-label="Align center"><AlignCenter className="w-4 h-4" /></button>
              <button onClick={() => execCommand('justifyRight')} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all" aria-label="Align right"><AlignRight className="w-4 h-4" /></button>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <select onChange={(e) => { if (e.target.value) execCommand('formatBlock', e.target.value); }}
                className="px-2 py-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                aria-label="Text style" defaultValue="">
                <option value="" disabled>Style</option>
                <option value="p">Paragraph</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="blockquote">Quote</option>
              </select>
            </div>

            {/* Editable area */}
            <div className="flex-1 overflow-y-auto bg-white">
              <div className="max-w-3xl mx-auto py-12 px-16">
                <div ref={editorRef} contentEditable suppressContentEditableWarning
                  className="min-h-[600px] text-base text-slate-700 leading-relaxed focus:outline-none editor-area"
                  style={{ fontFamily: 'var(--font-family)', lineHeight: '1.8' }}
                  aria-label="Document editor" role="textbox" aria-multiline="true" />
              </div>
            </div>

            {/* Sources footer */}
            {groupedItems.length > 0 && (
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sources:</span>
                  {groupedItems.map((group, i) => (
                    <button key={i} onClick={() => onNavigate(group.url)}
                      className="text-[11px] text-indigo-500 hover:text-indigo-400 bg-white px-2 py-1 rounded-lg border border-slate-200 hover:border-indigo-200 transition-all">
                      [{i + 1}] {group.pageTitle || (() => { try { return new URL(group.url).hostname; } catch { return 'Source'; } })()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRESENTATION MODE */}
      {mode === 'presentation' && (
        <div className="flex-1 flex flex-col overflow-hidden" role="tabpanel" aria-label="Presentation view">
          {/* AI Generate button bar */}
          <div className="flex items-center justify-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-100">
            <button onClick={generateAiPresentation} disabled={isGeneratingPres || !docItems?.length}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold rounded-xl hover:from-indigo-600 hover:to-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              aria-label="Generate AI presentation">
              {isGeneratingPres ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGeneratingPres ? 'Generating Presentation...' : 'Generate AI Presentation'}
            </button>
            {aiSlides && (
              <button onClick={() => { setAiSlides(null); setCurrentSlide(0); }}
                className="px-3 py-2 text-sm text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white transition-all">
                Reset to Default
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto flex items-center justify-center p-8 bg-gradient-to-b from-slate-50 to-white">
            <div className="w-full max-w-4xl animate-fadeIn">

              {/* DEFAULT SLIDES */}
              {!aiSlides && slides[currentSlide]?.type === 'title' && (
                <div className="slide-card text-center py-20">
                  <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                    <BookOpen className="w-10 h-10 text-white" />
                  </div>
                  <h1 className="text-4xl font-bold text-slate-900 mb-4">{slides[currentSlide].title}</h1>
                  <p className="text-lg text-slate-400 mb-2">Collaborative Research Summary</p>
                  <p className="text-sm text-slate-300">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  <div className="mt-8 inline-flex items-center gap-3 px-6 py-3 bg-indigo-50 rounded-2xl text-sm text-indigo-600 font-semibold border border-indigo-100">
                    {slides[currentSlide].count} findings from {slides[currentSlide].sources} sources
                  </div>
                </div>
              )}
              {!aiSlides && slides[currentSlide]?.type === 'source' && (
                <div className="slide-card">
                  <div className="flex items-center gap-3 mb-8">
                    <Globe className="w-7 h-7 text-indigo-500" />
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">{slides[currentSlide].pageTitle || (() => { try { return new URL(slides[currentSlide].url).hostname; } catch { return 'Source'; } })()}</h2>
                      <p className="text-sm text-slate-400 truncate max-w-lg">{slides[currentSlide].url}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {slides[currentSlide].items.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl">
                        {item.highlightText ? <Quote className="w-5 h-5 text-amber-500 mt-0.5" /> : <FileText className="w-5 h-5 text-indigo-400 mt-0.5" />}
                        <div>
                          {item.highlightText && <p className="text-base text-amber-800 italic mb-1">&ldquo;{item.highlightText}&rdquo;</p>}
                          {item.text && <p className="text-base text-slate-700">{item.text}</p>}
                          <p className="text-sm text-slate-400 mt-1">&mdash; {item.addedBy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!aiSlides && slides[currentSlide]?.type === 'summary' && (
                <div className="slide-card text-center py-16">
                  <h2 className="text-3xl font-bold text-slate-900 mb-8">Summary</h2>
                  <div className="grid grid-cols-2 gap-4 mb-8 max-w-sm mx-auto">
                    <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <p className="text-3xl font-bold text-indigo-600">{slides[currentSlide].items.length}</p>
                      <p className="text-sm text-slate-500 mt-1">Total Findings</p>
                    </div>
                    <div className="p-6 bg-violet-50 rounded-2xl border border-violet-100">
                      <p className="text-3xl font-bold text-violet-600">{slides[currentSlide].sources.length}</p>
                      <p className="text-sm text-slate-500 mt-1">Sources Used</p>
                    </div>
                  </div>
                  <p className="text-base text-slate-400">Research compiled collaboratively using ResearchTogether</p>
                </div>
              )}

              {/* AI SLIDES */}
              {aiSlides && slides[currentSlide]?.type === 'ai-title' && (
                <div className="slide-card text-center py-20">
                  <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <h1 className="text-4xl font-bold text-slate-900 mb-4">{slides[currentSlide].title}</h1>
                  <p className="text-lg text-slate-400 mb-2">AI-Generated Research Presentation</p>
                  <p className="text-sm text-slate-300">{slides[currentSlide].date}</p>
                  <div className="mt-8 flex items-center justify-center gap-4">
                    <div className="px-5 py-3 bg-indigo-50 rounded-2xl text-sm text-indigo-600 font-semibold border border-indigo-100">
                      {slides[currentSlide].count} Findings
                    </div>
                    <div className="px-5 py-3 bg-violet-50 rounded-2xl text-sm text-violet-600 font-semibold border border-violet-100">
                      {slides[currentSlide].sourceCount} Sources
                    </div>
                  </div>
                </div>
              )}

              {aiSlides && slides[currentSlide]?.type === 'ai-overview' && (
                <div className="slide-card py-12">
                  <h2 className="text-3xl font-bold text-slate-900 mb-8">{slides[currentSlide].title}</h2>
                  <div className="space-y-4">
                    {slides[currentSlide].points.map((point, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">{i + 1}</div>
                        <p className="text-base text-slate-700 mt-1">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiSlides && slides[currentSlide]?.type === 'ai-source' && (
                <div className="slide-card py-10">
                  <div className="flex items-center gap-3 mb-2">
                    <Globe className="w-7 h-7 text-indigo-500" />
                    <h2 className="text-2xl font-bold text-slate-900">{slides[currentSlide].title}</h2>
                  </div>
                  <p className="text-sm text-slate-400 mb-6 truncate">{slides[currentSlide].url}</p>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-lg">{slides[currentSlide].findingCount} findings</span>
                    {slides[currentSlide].highlights.length > 0 && <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs font-semibold rounded-lg">{slides[currentSlide].highlights.length} quotes</span>}
                  </div>
                  {slides[currentSlide].highlights.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {slides[currentSlide].highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border-l-3 border-amber-300">
                          <Quote className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-base text-amber-800 italic">&ldquo;{h}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {slides[currentSlide].notes.length > 0 && (
                    <div className="space-y-2">
                      {slides[currentSlide].notes.map((n, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                          <FileText className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-slate-700">{n}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {aiSlides && slides[currentSlide]?.type === 'ai-themes' && (
                <div className="slide-card py-12">
                  <h2 className="text-3xl font-bold text-slate-900 mb-8">{slides[currentSlide].title}</h2>
                  <div className="space-y-5">
                    {slides[currentSlide].themes.map((theme, i) => (
                      <div key={i} className="p-6 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100">
                        <h3 className="text-lg font-bold text-indigo-700 mb-1">{theme.label}</h3>
                        <p className="text-base text-slate-600">{theme.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiSlides && slides[currentSlide]?.type === 'ai-conclusion' && (
                <div className="slide-card py-12">
                  <h2 className="text-3xl font-bold text-slate-900 mb-8">{slides[currentSlide].title}</h2>
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                      <p className="text-2xl font-bold text-indigo-600">{slides[currentSlide].stats.findings}</p>
                      <p className="text-xs text-slate-500 mt-1">Findings</p>
                    </div>
                    <div className="p-5 bg-violet-50 rounded-2xl border border-violet-100 text-center">
                      <p className="text-2xl font-bold text-violet-600">{slides[currentSlide].stats.sources}</p>
                      <p className="text-xs text-slate-500 mt-1">Sources</p>
                    </div>
                    <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                      <p className="text-2xl font-bold text-amber-600">{slides[currentSlide].stats.highlights}</p>
                      <p className="text-xs text-slate-500 mt-1">Key Quotes</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">Recommended Next Steps</h3>
                  <div className="space-y-3">
                    {slides[currentSlide].nextSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                        <p className="text-sm text-slate-700">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Slide nav */}
          <div className="flex items-center justify-center gap-4 px-4 py-4 bg-white border-t border-slate-100">
            <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} disabled={currentSlide === 0}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-20 transition-all" aria-label="Previous slide">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setCurrentSlide(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentSlide ? 'bg-indigo-600 scale-125' : 'bg-slate-200 hover:bg-slate-300'}`}
                  aria-label={`Slide ${i + 1}`} />
              ))}
            </div>
            <span className="text-sm text-slate-400 w-16 text-center font-medium">{currentSlide + 1} / {slides.length}</span>
            <button onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))} disabled={currentSlide === slides.length - 1}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-20 transition-all" aria-label="Next slide">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

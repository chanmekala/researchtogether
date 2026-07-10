import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Highlighter } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function PDFViewer({ source, socket, user, onAnnotate }) {
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!source?.filePath && !source?.url) return;
    setLoading(true);
    const url = source.filePath ? `/api/files/${source.id}` : source.url;
    pdfjsLib.getDocument(url).promise.then(doc => {
      setPdf(doc);
      setNumPages(doc.numPages);
      setPage(1);
      setLoading(false);
    }).catch(err => {
      console.error('PDF load error:', err);
      setLoading(false);
    });
  }, [source]);

  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current) return;
    const pdfPage = await pdf.getPage(page);
    const viewport = pdfPage.getViewport({ scale });
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
  }, [pdf, page, scale]);

  useEffect(() => { renderPage(); }, [renderPage]);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (text && text.length > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      setSelection({
        text,
        position: {
          x: rect.left - (containerRect?.left || 0) + rect.width / 2,
          y: rect.top - (containerRect?.top || 0),
        },
        page,
      });
    }
  };

  const handleHighlight = () => {
    if (!selection) return;
    const annotation = {
      sourceId: source.id,
      type: 'highlight',
      highlightText: selection.text,
      pageNumber: selection.page,
      addedBy: user.name,
      addedById: user.id,
      timestamp: Date.now(),
    };
    socket?.emit('add-annotation', { annotation });
    onAnnotate?.(annotation);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        Loading PDF...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-100">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-slate-600 font-medium">{page} / {numPages}</span>
        <button onClick={() => setPage(p => Math.min(numPages, p + 1))} disabled={page >= numPages}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-400">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto flex justify-center p-6 relative" onMouseUp={handleMouseUp}>
        <canvas ref={canvasRef} className="shadow-lg rounded-lg bg-white" />
        {selection && (
          <div className="absolute z-10 animate-popIn" style={{ left: selection.position.x, top: selection.position.y - 40 }}>
            <button onClick={handleHighlight}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg hover:bg-indigo-500">
              <Highlighter className="w-3.5 h-3.5" /> Highlight
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

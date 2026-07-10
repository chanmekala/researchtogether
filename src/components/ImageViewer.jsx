import React, { useState, useRef } from 'react';
import { Highlighter, MessageSquare, ZoomIn, ZoomOut } from 'lucide-react';

export default function ImageViewer({ source, socket, user, onAnnotate }) {
  const [scale, setScale] = useState(1);
  const [annotations, setAnnotations] = useState(source.annotations || []);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [currentRect, setCurrentRect] = useState(null);
  const [noteText, setNoteText] = useState('');
  const containerRef = useRef(null);
  const imgUrl = source.filePath ? `/api/files/${source.id}` : source.url;

  const handleMouseDown = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setIsDrawing(true);
    setDrawStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !drawStart || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentRect({
      x: Math.min(drawStart.x, x),
      y: Math.min(drawStart.y, y),
      width: Math.abs(x - drawStart.x),
      height: Math.abs(y - drawStart.y),
    });
  };

  const handleMouseUp = () => {
    if (currentRect && currentRect.width > 10 && currentRect.height > 10) {
      setNoteText('');
    } else {
      setCurrentRect(null);
    }
    setIsDrawing(false);
  };

  const saveAnnotation = () => {
    if (!currentRect) return;
    const annotation = {
      sourceId: source.id,
      type: 'region',
      region: currentRect,
      text: noteText,
      addedBy: user.name,
      addedById: user.id,
      timestamp: Date.now(),
    };
    socket?.emit('add-annotation', { annotation });
    setAnnotations(prev => [...prev, annotation]);
    onAnnotate?.(annotation);
    setCurrentRect(null);
    setNoteText('');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-100">
        <Highlighter className="w-4 h-4 text-indigo-500" />
        <span className="text-sm text-slate-600 font-medium">Draw a region to annotate</span>
        <div className="flex-1" />
        <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto flex justify-center p-6">
        <div ref={containerRef} className="relative inline-block cursor-crosshair"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
          <img src={imgUrl} alt={source.title} className="max-w-full shadow-lg rounded-lg" draggable={false} />
          {annotations.map((ann, i) => ann.region && (
            <div key={i} className="absolute border-2 border-amber-400 bg-amber-100/30 rounded"
              style={{ left: ann.region.x, top: ann.region.y, width: ann.region.width, height: ann.region.height }}
              title={ann.text} />
          ))}
          {currentRect && (
            <div className="absolute border-2 border-indigo-500 bg-indigo-100/30 rounded"
              style={{ left: currentRect.x, top: currentRect.y, width: currentRect.width, height: currentRect.height }} />
          )}
        </div>
      </div>

      {currentRect && (
        <div className="px-4 py-3 bg-white border-t border-slate-100 animate-fadeIn">
          <div className="flex gap-2">
            <input type="text" value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Add a note about this region..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={saveAnnotation}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500">
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

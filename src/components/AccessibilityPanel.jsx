import React from 'react';
import { X, Type, PersonStanding, Moon, Sun, Minus, Plus, Maximize, LayoutList } from 'lucide-react';
import { useAccessibility } from '../contexts/AccessibilityContext';

export default function AccessibilityPanel({ onClose }) {
  const {
    fontSize, setFontSize, fontMode, setFontMode,
    darkMode, setDarkMode, highContrast, setHighContrast,
    reducedMotion, setReducedMotion, screenReaderMode, setScreenReaderMode,
    lineSpacing, setLineSpacing,
  } = useAccessibility();

  const fontModes = [
    { id: 'sans', label: 'Sans-serif', preview: 'Inter' },
    { id: 'serif', label: 'Serif', preview: 'Georgia' },
    { id: 'mono', label: 'Monospace', preview: 'Menlo' },
    { id: 'dyslexic', label: 'Dyslexia-friendly', preview: 'Comic Sans' },
  ];

  const Toggle = ({ label, icon, value, onChange }) => (
    <button onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100"
      aria-pressed={value}>
      <span className="flex items-center gap-3 text-sm text-slate-700 font-medium">{icon} {label}</span>
      <div className={`w-12 h-6 rounded-full p-0.5 transition-colors ${value ? 'bg-indigo-600' : 'bg-slate-300'}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-6' : ''}`} />
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-label="Accessibility settings" aria-modal="true">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <PersonStanding className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-800">Accessibility</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Font Size */}
          <div role="group" aria-label="Font size">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">Font Size: {fontSize}px</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setFontSize(Math.max(10, fontSize - 1))}
                className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all border border-slate-100" aria-label="Decrease">
                <Minus className="w-4 h-4" />
              </button>
              <input type="range" min="10" max="24" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}
                className="flex-1 accent-indigo-500" aria-label="Font size slider" />
              <button onClick={() => setFontSize(Math.min(24, fontSize + 1))}
                className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all border border-slate-100" aria-label="Increase">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Font Family */}
          <div role="group" aria-label="Font family">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" /> Font Family
            </label>
            <div className="grid grid-cols-2 gap-2">
              {fontModes.map(({ id, label, preview }) => (
                <button key={id} onClick={() => setFontMode(id)}
                  className={`p-4 rounded-2xl text-left transition-all ${
                    fontMode === id ? 'bg-indigo-50 border-2 border-indigo-400 text-slate-800' : 'bg-slate-50 border-2 border-transparent text-slate-500 hover:bg-slate-100'
                  }`} aria-pressed={fontMode === id}>
                  <span className={`text-sm font-medium block font-mode-${id}`}>{label}</span>
                  <span className={`text-xs text-slate-400 font-mode-${id}`}>{preview}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Line Spacing */}
          <div role="group" aria-label="Line spacing">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block flex items-center gap-1.5">
              <LayoutList className="w-3.5 h-3.5" /> Line Spacing: {lineSpacing}
            </label>
            <div className="flex gap-2">
              {[1.2, 1.5, 1.8, 2.0, 2.5].map(v => (
                <button key={v} onClick={() => setLineSpacing(v)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    lineSpacing === v ? 'bg-indigo-50 text-indigo-600 border-2 border-indigo-200' : 'bg-slate-50 text-slate-400 border-2 border-transparent hover:bg-slate-100'
                  }`} aria-pressed={lineSpacing === v}>
                  {v}x
                </button>
              ))}
            </div>
          </div>

          {/* Display toggles */}
          <div role="group" aria-label="Display" className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">Display</label>
            <Toggle label="Dark Mode" icon={darkMode ? <Moon className="w-4 h-4 text-indigo-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
              value={darkMode} onChange={setDarkMode} />
            <Toggle label="High Contrast" icon={<Maximize className="w-4 h-4 text-slate-500" />}
              value={highContrast} onChange={setHighContrast} />
            <Toggle label="Reduced Motion" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              value={reducedMotion} onChange={setReducedMotion} />
            <Toggle label="Screen Reader Optimized" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 12h.01M18.364 5.636a9 9 0 010 12.728" /></svg>}
              value={screenReaderMode} onChange={setScreenReaderMode} />
          </div>

          {/* Keyboard shortcuts */}
          <div role="group" aria-label="Keyboard shortcuts">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">Keyboard Shortcuts</label>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3 text-sm border border-slate-100">
              {[
                { keys: ['Ctrl', '/'], desc: 'Focus search bar' },
                { keys: ['Ctrl', 'B'], desc: 'Toggle sidebar' },
                { keys: ['Ctrl', 'J'], desc: 'Toggle right panel' },
                { keys: ['Ctrl', 'D'], desc: 'Switch to summary' },
              ].map(({ keys, desc }) => (
                <div key={desc} className="flex items-center justify-between">
                  <span className="text-slate-500">{desc}</span>
                  <div className="flex gap-1">
                    {keys.map(k => (
                      <kbd key={k} className="px-2 py-1 bg-white rounded-lg text-[11px] text-slate-500 font-mono border border-slate-200 shadow-sm">{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

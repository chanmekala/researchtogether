import React, { useState } from 'react';
import {
  Download, CheckCircle, XCircle, AlertTriangle, FileText, FileCode, BookOpen
} from 'lucide-react';
import { getTemplate } from '../data/templates';
import { runPreExportChecks } from '../lib/checks';
import { buildMarkdownExport, buildHtmlExport, buildBibTeXExport, downloadFile } from '../lib/export';

const FORMAT_ICONS = { markdown: FileText, html: FileCode, bibtex: BookOpen };

export default function ExportPanel({ project, findingCards, deliverableContent, onClose }) {
  const template = getTemplate(project.deliverableType);
  const [checkResults, setCheckResults] = useState(null);
  const [ranChecks, setRanChecks] = useState(false);

  const runChecks = () => {
    const results = runPreExportChecks(project, findingCards, deliverableContent);
    setCheckResults(results);
    setRanChecks(true);
  };

  const handleExport = (format) => {
    const slug = project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    switch (format) {
      case 'markdown': {
        const md = buildMarkdownExport(project, findingCards, deliverableContent);
        downloadFile(md, `${slug}.md`, 'text/markdown');
        break;
      }
      case 'html': {
        const html = buildHtmlExport(project, findingCards, deliverableContent);
        downloadFile(html, `${slug}.html`, 'text/html');
        break;
      }
      case 'bibtex': {
        const bib = buildBibTeXExport(findingCards);
        downloadFile(bib, `${slug}.bib`, 'text/plain');
        break;
      }
      default:
        break;
    }
  };

  const statusIcon = (status) => {
    if (status === 'pass') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (status === 'fail') return <XCircle className="w-4 h-4 text-red-500" />;
    return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6" role="dialog" aria-label="Export deliverable">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Export Deliverable</h2>
          <p className="text-sm text-slate-400">{template.name} · {project.name}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-6">
            <button onClick={runChecks}
              className="w-full py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-all">
              Run Pre-Export Checks
            </button>

            {ranChecks && checkResults && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-emerald-600 font-medium">{checkResults.summary.passed} passed</span>
                  <span className="text-red-500 font-medium">{checkResults.summary.failed} failed</span>
                  <span className="text-amber-500 font-medium">{checkResults.summary.warnings} warnings</span>
                </div>
                {checkResults.results.map(r => (
                  <div key={r.id} className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl">
                    {statusIcon(r.status)}
                    <div>
                      <p className="text-sm font-medium text-slate-700">{r.label}</p>
                      <p className="text-xs text-slate-400">{r.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <h3 className="text-sm font-semibold text-slate-700 mb-3">Export Formats</h3>
          <div className="grid grid-cols-2 gap-3">
            {(template.exportFormats || ['markdown']).map(format => {
              const Icon = FORMAT_ICONS[format] || FileText;
              const blocked = ranChecks && checkResults && !checkResults.canExport;
              return (
                <button key={format} onClick={() => handleExport(format)} disabled={blocked}
                  className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left disabled:opacity-40">
                  <Icon className="w-5 h-5 text-indigo-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 uppercase">{format}</p>
                    <p className="text-xs text-slate-400">Download .{format === 'markdown' ? 'md' : format === 'bibtex' ? 'bib' : format}</p>
                  </div>
                  <Download className="w-4 h-4 text-slate-300 ml-auto" />
                </button>
              );
            })}
          </div>

          {ranChecks && checkResults && !checkResults.canExport && (
            <p className="text-xs text-red-500 mt-3 text-center">
              Fix failed checks before exporting, or export anyway by clicking a format.
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100">
          <button onClick={onClose}
            className="w-full py-3 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

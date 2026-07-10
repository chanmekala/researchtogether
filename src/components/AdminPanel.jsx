import React from 'react';
import {
  Shield, Users, FileText, Crown, Building2, Check, X, Settings
} from 'lucide-react';

const TIERS = {
  free: {
    name: 'Free',
    price: '$0',
    features: ['1–2 projects', 'Up to 3 collaborators', 'Basic templates', 'Watermarked exports'],
    limits: { projects: 2, collaborators: 3 },
  },
  pro: {
    name: 'Pro',
    price: '$15/seat/mo',
    features: ['Unlimited projects', 'All templates', 'Full history', 'Clean exports', 'Research Sessions', 'Zotero/Notion integrations'],
    limits: { projects: Infinity, collaborators: Infinity },
  },
  edu: {
    name: 'Education',
    price: 'Site license',
    features: ['SSO', 'Admin console', 'WCAG compliance', 'Plagiarism checking', 'Custom institutional templates'],
    limits: { projects: Infinity, collaborators: Infinity },
  },
};

export default function AdminPanel({ project, user, onClose }) {
  const currentTier = project?.tier || 'free';

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6" role="dialog" aria-label="Admin and licensing">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-slate-400" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">Admin & Licensing</h2>
              <p className="text-sm text-slate-400">Organization settings and plan management</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <section className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" /> Current Plan
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(TIERS).map(([key, tier]) => (
                <div key={key} className={`p-4 rounded-2xl border ${
                  currentTier === key ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200'
                }`}>
                  <p className="text-sm font-bold text-slate-800">{tier.name}</p>
                  <p className="text-lg font-bold text-indigo-600 mt-1">{tier.price}</p>
                  <ul className="mt-3 space-y-1">
                    {tier.features.map(f => (
                      <li key={f} className="text-[11px] text-slate-500 flex items-start gap-1">
                        <Check className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  {currentTier === key && (
                    <span className="inline-block mt-3 text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">CURRENT</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" /> Accessibility (WCAG)
            </h3>
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Keyboard navigation', status: true },
                  { label: 'Screen reader support', status: true },
                  { label: 'High contrast mode', status: true },
                  { label: 'Font size adjustment', status: true },
                  { label: 'Reduced motion', status: true },
                  { label: 'Focus indicators', status: true },
                  { label: 'WCAG 2.1 AA audit', status: false },
                  { label: 'SSO integration', status: false },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    {item.status
                      ? <Check className="w-4 h-4 text-emerald-500" />
                      : <X className="w-4 h-4 text-slate-300" />}
                    <span className={item.status ? 'text-slate-700' : 'text-slate-400'}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" /> Institution Settings
            </h3>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-500">
              <p>Custom institutional templates, SSO, and admin console are available on the Education plan.</p>
              <p className="mt-2 text-xs text-slate-400">Contact sales@researchtogether.app for site licensing.</p>
            </div>
          </section>
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

import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { getTemplate } from '../data/templates';
import { generateDraftFromCards } from '../lib/contextEngine';

export default function DeliverableBuilder({ project, findingCards, socket, deliverableContent }) {
  const template = getTemplate(project.deliverableType);
  const [sections, setSections] = useState(deliverableContent?.sections || []);
  const [expandedSection, setExpandedSection] = useState(template.sections[0]?.id);
  const [generating, setGenerating] = useState(null);

  useEffect(() => {
    if (!deliverableContent?.sections?.length) {
      const initial = template.sections.map(s => ({
        id: s.id,
        title: s.title,
        content: '',
        required: s.required,
      }));
      setSections(initial);
    } else {
      setSections(deliverableContent.sections);
    }
  }, [deliverableContent, template]);

  const updateSection = (sectionId, content) => {
    const updated = sections.map(s => s.id === sectionId ? { ...s, content } : s);
    setSections(updated);
    socket?.emit('update-deliverable', { deliverableContent: { sections: updated } });
  };

  const generateSection = async (sectionId) => {
    setGenerating(sectionId);
    await new Promise(r => setTimeout(r, 800));
    const draft = generateDraftFromCards(findingCards, template, sectionId);
    updateSection(sectionId, draft);
    setGenerating(null);
  };

  const generateAll = async () => {
    setGenerating('all');
    for (const section of template.sections) {
      const draft = generateDraftFromCards(findingCards, template, section.id);
      const updated = sections.map(s => s.id === section.id ? { ...s, content: draft } : s);
      setSections(updated);
    }
    socket?.emit('update-deliverable', {
      deliverableContent: {
        sections: template.sections.map(s => ({
          id: s.id,
          title: s.title,
          content: generateDraftFromCards(findingCards, template, s.id),
          required: s.required,
        })),
      },
    });
    setGenerating(null);
  };

  const sectionCardCount = (sectionId) => (findingCards || []).filter(c => c.sectionId === sectionId).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{project.name}</h2>
          <p className="text-sm text-slate-400">{template.name} · Template-driven builder</p>
        </div>
        <button onClick={generateAll} disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold text-sm transition-all disabled:opacity-50">
          {generating === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generate All Sections
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {template.sections.map(section => {
          const cardCount = sectionCardCount(section.id);
          const isExpanded = expandedSection === section.id;
          const sectionData = sections.find(s => s.id === section.id) || { content: '' };

          return (
            <div key={section.id} className="mb-3 border border-slate-100 rounded-2xl overflow-hidden">
              <button onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-all text-left">
                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-300" /> : <ChevronRight className="w-4 h-4 text-slate-300" />}
                <FileText className="w-4 h-4 text-indigo-500" />
                <div className="flex-1">
                  <span className="font-semibold text-slate-800">{section.title}</span>
                  {section.required && <span className="ml-2 text-[10px] text-red-400 font-semibold">REQUIRED</span>}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  cardCount >= (section.minCards || 1) ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  {cardCount} / {section.minCards || 1} cards
                </span>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 animate-fadeIn">
                  <div className="flex justify-end mb-2">
                    <button onClick={() => generateSection(section.id)} disabled={generating}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                      {generating === section.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Draft from cards
                    </button>
                  </div>
                  <textarea value={sectionData.content || ''}
                    onChange={e => updateSection(section.id, e.target.value)}
                    placeholder={`Write or generate ${section.title}...`}
                    rows={8}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

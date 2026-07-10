import React, { useState } from 'react';
import {
  Lightbulb, Tag, Plus, ArrowUpRight, Trash2, Quote, CheckCircle, AlertCircle
} from 'lucide-react';
import { getTemplate, getCaptureTagsForType } from '../data/templates';

export default function FindingCardsPanel({ findingCards, socket, user, deliverableType, onPromote }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newCard, setNewCard] = useState({ title: '', content: '', tags: [], sectionId: '' });
  const template = getTemplate(deliverableType);
  const captureTags = getCaptureTagsForType(deliverableType);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newCard.title.trim() && !newCard.content.trim()) return;
    socket?.emit('add-finding-card', {
      card: {
        ...newCard,
        addedBy: user.name,
        addedById: user.id,
        timestamp: Date.now(),
      },
    });
    setNewCard({ title: '', content: '', tags: [], sectionId: '' });
    setShowCreate(false);
  };

  const toggleTag = (tag) => {
    setNewCard(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
    }));
  };

  const promoteFromAnnotation = (annotation) => {
    socket?.emit('add-finding-card', {
      card: {
        title: annotation.highlightText?.slice(0, 60) || 'Finding',
        content: annotation.text || '',
        highlightText: annotation.highlightText,
        sourceId: annotation.sourceId,
        url: annotation.url,
        tags: [],
        addedBy: user.name,
        addedById: user.id,
        timestamp: Date.now(),
        promotedFrom: annotation.id,
      },
    });
    onPromote?.(annotation);
  };

  const updateCard = (cardId, updates) => {
    socket?.emit('update-finding-card', { cardId, updates });
  };

  const deleteCard = (cardId) => {
    socket?.emit('delete-finding-card', { cardId });
  };

  const unplaced = (findingCards || []).filter(c => !c.sectionId);
  const placed = (findingCards || []).filter(c => c.sectionId);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-800">Finding Cards</h2>
            <span className="text-xs text-slate-300 font-medium">{(findingCards || []).length}</span>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50" aria-label="Add finding">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">{template.name} · tag and place into sections</p>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 animate-fadeIn">
          <input type="text" value={newCard.title} onChange={e => setNewCard(p => ({ ...p, title: e.target.value }))}
            placeholder="Finding title..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <textarea value={newCard.content} onChange={e => setNewCard(p => ({ ...p, content: e.target.value }))}
            placeholder="Notes or synthesis..."
            rows={2}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          <div className="flex flex-wrap gap-1 mb-2">
            {captureTags.map(tag => (
              <button key={tag} type="button" onClick={() => toggleTag(tag)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                  newCard.tags.includes(tag) ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                }`}>
                {tag}
              </button>
            ))}
          </div>
          <select value={newCard.sectionId} onChange={e => setNewCard(p => ({ ...p, sectionId: e.target.value }))}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm mb-2">
            <option value="">Unplaced</option>
            {template.sections.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          <button type="submit" className="w-full py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500">
            Add Finding
          </button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {unplaced.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider px-1 mb-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Unplaced ({unplaced.length})
            </p>
            {unplaced.map(card => (
              <CardItem key={card.id} card={card} template={template} captureTags={captureTags}
                onUpdate={updateCard} onDelete={deleteCard} />
            ))}
          </div>
        )}

        {template.sections.map(section => {
          const sectionCards = (findingCards || []).filter(c => c.sectionId === section.id);
          if (sectionCards.length === 0) return null;
          return (
            <div key={section.id} className="mb-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1.5">
                {section.title} ({sectionCards.length})
              </p>
              {sectionCards.map(card => (
                <CardItem key={card.id} card={card} template={template} captureTags={captureTags}
                  onUpdate={updateCard} onDelete={deleteCard} />
              ))}
            </div>
          );
        })}

        {(findingCards || []).length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">
            Promote highlights and annotations into finding cards to build your deliverable.
          </p>
        )}
      </div>
    </div>
  );
}

function CardItem({ card, template, captureTags, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-1.5 p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-all group">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{card.title || card.highlightText?.slice(0, 50)}</p>
            {card.highlightText && (
              <p className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1 truncate flex items-center gap-1">
                <Quote className="w-3 h-3 flex-shrink-0" /> {card.highlightText.slice(0, 80)}
              </p>
            )}
            {(card.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {card.tags.map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-medium rounded-full">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
            className="hidden group-hover:block p-1 text-slate-300 hover:text-red-500">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-slate-50 animate-fadeIn">
          {card.content && <p className="text-xs text-slate-500 mb-2">{card.content}</p>}
          <div className="flex flex-wrap gap-1 mb-2">
            {captureTags.map(tag => (
              <button key={tag} onClick={() => {
                const tags = card.tags?.includes(tag) ? card.tags.filter(t => t !== tag) : [...(card.tags || []), tag];
                onUpdate(card.id, { tags });
              }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  card.tags?.includes(tag) ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-400'
                }`}>
                <Tag className="w-2.5 h-2.5 inline mr-0.5" />{tag}
              </button>
            ))}
          </div>
          <select value={card.sectionId || ''} onChange={e => onUpdate(card.id, { sectionId: e.target.value })}
            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs">
            <option value="">Unplaced</option>
            {template.sections.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          {card.verified && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 mt-1">
              <CheckCircle className="w-3 h-3" /> Verified
            </span>
          )}
        </div>
      )}
    </div>
  );
}
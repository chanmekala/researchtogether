import { getTemplate } from '../data/templates';

export function runPreExportChecks(project, findingCards, deliverableContent) {
  const template = getTemplate(project.deliverableType);
  const results = [];

  for (const check of template.checks) {
    const result = runCheck(check, template, findingCards, deliverableContent);
    results.push(result);
  }

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warn').length;

  return {
    results,
    summary: { passed, failed, warnings, total: results.length },
    canExport: failed === 0,
  };
}

function runCheck(check, template, findingCards, deliverableContent) {
  const cards = findingCards || [];

  switch (check.type) {
    case 'citations': {
      const withCitation = cards.filter(c => c.citation?.doi || c.citation?.authors);
      const ratio = cards.length ? withCitation.length / cards.length : 0;
      return {
        id: check.id,
        label: check.label,
        status: ratio >= 0.5 ? 'pass' : ratio >= 0.25 ? 'warn' : 'fail',
        message: `${withCitation.length}/${cards.length} findings have citation metadata`,
        details: cards.filter(c => !c.citation?.doi && !c.citation?.authors).map(c => c.title || c.highlightText?.slice(0, 50)),
      };
    }
    case 'quotes': {
      const quotes = cards.filter(c => c.tags?.includes('quote') || c.type === 'quote');
      const sourced = quotes.filter(c => c.citation || c.url);
      return {
        id: check.id,
        label: check.label,
        status: quotes.length === 0 ? 'warn' : sourced.length === quotes.length ? 'pass' : 'fail',
        message: `${sourced.length}/${quotes.length} quotes are sourced`,
      };
    }
    case 'sections': {
      const missing = template.sections
        .filter(s => s.required)
        .filter(s => {
          const sectionCards = cards.filter(c => c.sectionId === s.id);
          return sectionCards.length < (s.minCards || 1);
        });
      return {
        id: check.id,
        label: check.label,
        status: missing.length === 0 ? 'pass' : 'fail',
        message: missing.length === 0
          ? 'All required sections have sufficient evidence'
          : `Missing evidence in: ${missing.map(s => s.title).join(', ')}`,
        details: missing.map(s => s.title),
      };
    }
    case 'insight_evidence': {
      const insights = cards.filter(c => c.tags?.includes('insight'));
      const minEv = check.minEvidence || 2;
      const weak = insights.filter(insight => {
        const linked = cards.filter(c =>
          c.linkedTo === insight.id || c.tags?.some(t => ['quote', 'pain_point'].includes(t))
        );
        return linked.length < minEv;
      });
      return {
        id: check.id,
        label: check.label,
        status: insights.length === 0 ? 'warn' : weak.length === 0 ? 'pass' : 'fail',
        message: weak.length === 0
          ? `All ${insights.length} insights backed by ≥${minEv} evidence items`
          : `${weak.length} insights lack sufficient evidence`,
      };
    }
    case 'unplaced': {
      const unplaced = cards.filter(c => !c.sectionId && !c.tags?.length);
      return {
        id: check.id,
        label: check.label,
        status: unplaced.length === 0 ? 'pass' : 'warn',
        message: unplaced.length === 0 ? 'No unplaced evidence' : `${unplaced.length} items need tagging or placement`,
        details: unplaced.map(c => c.title || c.highlightText?.slice(0, 40)),
      };
    }
    case 'quote_source': {
      const quotes = cards.filter(c => c.tags?.includes('quote'));
      const unsourced = quotes.filter(c => !c.url && !c.citation);
      return {
        id: check.id,
        label: check.label,
        status: quotes.length === 0 ? 'warn' : unsourced.length === 0 ? 'pass' : 'fail',
        message: unsourced.length === 0 ? 'All quotes sourced' : `${unsourced.length} quotes lack sources`,
      };
    }
    case 'fact_check': {
      const facts = cards.filter(c => c.tags?.includes('fact'));
      const unchecked = facts.filter(c => !c.verified);
      return {
        id: check.id,
        label: check.label,
        status: facts.length === 0 ? 'warn' : unchecked.length === 0 ? 'pass' : 'fail',
        message: unchecked.length === 0 ? 'Fact-check log complete' : `${unchecked.length} facts need verification`,
      };
    }
    case 'attribution': {
      const quotes = cards.filter(c => c.tags?.includes('quote'));
      const unattributed = quotes.filter(c => !c.attribution);
      return {
        id: check.id,
        label: check.label,
        status: quotes.length === 0 ? 'warn' : unattributed.length === 0 ? 'pass' : 'warn',
        message: unattributed.length === 0 ? 'All quotes attributed' : `${unattributed.length} quotes need attribution`,
      };
    }
    case 'recommendation_trace': {
      const recs = cards.filter(c => c.tags?.includes('recommendation'));
      const untraced = recs.filter(c => !c.linkedEvidence?.length);
      return {
        id: check.id,
        label: check.label,
        status: recs.length === 0 ? 'warn' : untraced.length === 0 ? 'pass' : 'fail',
        message: untraced.length === 0 ? 'All recommendations traced to evidence' : `${untraced.length} recommendations lack evidence links`,
      };
    }
    case 'data_backing': {
      const claims = cards.filter(c => c.tags?.includes('claim'));
      const unbacked = claims.filter(c => !c.linkedEvidence?.length && !c.tags?.includes('data'));
      return {
        id: check.id,
        label: check.label,
        status: claims.length === 0 ? 'warn' : unbacked.length === 0 ? 'pass' : 'fail',
        message: unbacked.length === 0 ? 'All claims backed by data' : `${unbacked.length} claims lack data backing`,
      };
    }
    case 'participant_coverage': {
      const participants = new Set(cards.map(c => c.participant).filter(Boolean));
      return {
        id: check.id,
        label: check.label,
        status: participants.size >= 3 ? 'pass' : participants.size >= 1 ? 'warn' : 'fail',
        message: `${participants.size} unique participants represented`,
      };
    }
    default:
      return { id: check.id, label: check.label, status: 'warn', message: 'Check not implemented' };
  }
}

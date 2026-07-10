/**
 * Context engine — search-with-context over the project source library.
 * Uses keyword/TF scoring locally; designed to swap in LLM backend later.
 */

function tokenize(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
}

function scoreDocument(queryTokens, doc) {
  const docText = [
    doc.title, doc.url, doc.highlightText, doc.content, doc.text,
    doc.pageTitle, ...(doc.tags || []),
    doc.citation?.title, doc.citation?.authors,
  ].filter(Boolean).join(' ').toLowerCase();

  const docTokens = tokenize(docText);
  let score = 0;
  for (const qt of queryTokens) {
    if (docText.includes(qt)) score += 2;
    for (const dt of docTokens) {
      if (dt.includes(qt) || qt.includes(dt)) score += 1;
    }
  }
  return score;
}

export function searchLibrary(query, sources, findingCards, annotations) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return { results: [], answer: null };

  const allItems = [
    ...(sources || []).map(s => ({ ...s, itemType: 'source' })),
    ...(findingCards || []).map(c => ({ ...c, itemType: 'finding' })),
    ...(annotations || []).map(a => ({ ...a, itemType: 'annotation' })),
  ];

  const scored = allItems
    .map(item => ({ item, score: scoreDocument(queryTokens, item) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const results = scored.map(({ item, score }) => ({
    id: item.id,
    type: item.itemType,
    title: item.title || item.pageTitle || item.highlightText?.slice(0, 80) || item.url,
    snippet: item.highlightText || item.content || item.text || item.snippet || '',
    url: item.url,
    score,
    addedBy: item.addedBy,
    tags: item.tags,
  }));

  const answer = generateContextAnswer(query, results);

  return { results, answer, query };
}

function generateContextAnswer(query, results) {
  if (results.length === 0) {
    return {
      text: `No sources in your library match "${query}". Try adding more sources or broadening your search.`,
      citations: [],
      confidence: 'low',
    };
  }

  const topResults = results.slice(0, 3);
  const snippets = topResults.map(r => r.snippet).filter(Boolean);
  const summary = snippets.length > 0
    ? `Based on ${results.length} matching item(s) in your library, here's what your sources say about "${query}":\n\n${snippets.map((s, i) => `${i + 1}. "${s.slice(0, 200)}${s.length > 200 ? '...' : ''}"`).join('\n\n')}`
    : `Found ${results.length} relevant items for "${query}" but no text snippets are available yet.`;

  return {
    text: summary,
    citations: topResults.map(r => ({ id: r.id, title: r.title, url: r.url })),
    confidence: results[0].score > 5 ? 'high' : results[0].score > 2 ? 'medium' : 'low',
  };
}

export function summarizeSource(source, annotations) {
  const related = (annotations || []).filter(a => a.sourceId === source.id || a.url === source.url);
  const highlights = related.map(a => a.highlightText || a.text).filter(Boolean);

  if (highlights.length === 0) {
    return {
      summary: `Source: ${source.title || source.url}. No annotations yet — open and highlight key passages.`,
      keyPoints: [],
    };
  }

  return {
    summary: `${source.title || 'Source'}: ${highlights.length} annotation(s) captured. Key passages include themes around ${extractThemes(highlights).join(', ')}.`,
    keyPoints: highlights.slice(0, 5).map((h, i) => ({ id: i, text: h.slice(0, 200) })),
  };
}

function extractThemes(highlights) {
  const words = {};
  for (const h of highlights) {
    for (const w of tokenize(h)) {
      words[w] = (words[w] || 0) + 1;
    }
  }
  return Object.entries(words)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
}

export function generateDraftFromCards(findingCards, template, sectionId) {
  const section = template.sections.find(s => s.id === sectionId);
  if (!section) return '';

  const cards = (findingCards || []).filter(c => c.sectionId === sectionId);
  if (cards.length === 0) return `<!-- No findings placed in ${section.title} yet -->`;

  const paragraphs = cards.map(card => {
    let p = '';
    if (card.highlightText) p += `"${card.highlightText}" `;
    if (card.content) p += card.content;
    else if (card.text) p += card.text;
    if (card.citation) p += ` [${card.citation.authors || 'Source'}, ${card.citation.year || 'n.d.'}]`;
    return p.trim();
  });

  return `## ${section.title}\n\n${paragraphs.join('\n\n')}`;
}

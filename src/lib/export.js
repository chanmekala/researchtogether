import { getTemplate } from '../data/templates';

export function buildMarkdownExport(project, findingCards, deliverableContent) {
  const template = getTemplate(project.deliverableType);
  const lines = [
    `# ${project.name}`,
    '',
    `> Deliverable: ${template.name}`,
    `> Exported: ${new Date().toLocaleDateString()}`,
    '',
  ];

  if (deliverableContent?.sections) {
    for (const section of deliverableContent.sections) {
      lines.push(`## ${section.title}`, '');
      if (section.content) lines.push(section.content, '');
      const cards = (findingCards || []).filter(c => c.sectionId === section.id);
      for (const card of cards) {
        lines.push(`### ${card.title || 'Finding'}`, '');
        if (card.content) lines.push(card.content, '');
        if (card.highlightText) lines.push(`> ${card.highlightText}`, '');
        if (card.citation) {
          const c = card.citation;
          lines.push(`*Source: ${c.authors || 'Unknown'} (${c.year || 'n.d.'})${c.doi ? ` — DOI: ${c.doi}` : ''}*`, '');
        }
      }
      lines.push('');
    }
  } else {
    lines.push('## Findings', '');
    for (const card of findingCards || []) {
      lines.push(`### ${card.title || 'Finding'}`, '');
      if (card.content) lines.push(card.content, '');
      if (card.highlightText) lines.push(`> ${card.highlightText}`, '');
      lines.push('');
    }
  }

  const cited = (findingCards || []).filter(c => c.citation);
  if (cited.length > 0) {
    lines.push('## References', '');
    cited.forEach((card, i) => {
      const c = card.citation;
      lines.push(`${i + 1}. ${c.authors || 'Unknown'} (${c.year || 'n.d.'}). ${c.title || card.pageTitle || 'Untitled'}.${c.doi ? ` https://doi.org/${c.doi}` : ''}`);
    });
  }

  return lines.join('\n');
}

export function buildHtmlExport(project, findingCards, deliverableContent) {
  const md = buildMarkdownExport(project, findingCards, deliverableContent);
  const body = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${project.name} — ResearchTogether Export</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1e293b; line-height: 1.7; }
    h1 { color: #6366f1; } h2 { border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
    blockquote { border-left: 3px solid #f59e0b; background: #fffbeb; padding: 0.75rem 1rem; margin: 1rem 0; }
    em { color: #64748b; }
  </style>
</head>
<body><p>${body}</p></body>
</html>`;
}

export function buildBibTeXExport(findingCards) {
  const cited = (findingCards || []).filter(c => c.citation);
  return cited.map((card, i) => {
    const c = card.citation;
    const key = `ref${i + 1}`;
    const authors = (c.authors || 'Unknown').replace(/, /g, ' and ');
    return `@article{${key},
  author = {${authors}},
  title = {${c.title || card.pageTitle || 'Untitled'}},
  year = {${c.year || ''}},
  doi = {${c.doi || ''}},
  url = {${card.url || ''}}
}`;
  }).join('\n\n');
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

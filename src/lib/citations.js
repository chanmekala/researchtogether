const DOI_REGEX = /\b(10\.\d{4,}(?:\.\d+)*\/[^\s"<>]+)/i;
const YEAR_REGEX = /\b(19|20)\d{2}\b/;

export function extractDoi(text) {
  const match = (text || '').match(DOI_REGEX);
  return match ? match[1].replace(/[.,;]+$/, '') : null;
}

export function extractCitationFromPage(html, url) {
  const citation = { url, doi: null, authors: null, title: null, year: null, publisher: null };

  const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) citation.title = titleMatch[1].trim();

  const authorMatch = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*name=["']citation_author["'][^>]*content=["']([^"']+)["']/i);
  if (authorMatch) citation.authors = authorMatch[1].trim();

  const doiMatch = html.match(/<meta[^>]*name=["']citation_doi["'][^>]*content=["']([^"']+)["']/i);
  if (doiMatch) citation.doi = doiMatch[1].trim();
  else citation.doi = extractDoi(html);

  const dateMatch = html.match(/<meta[^>]*name=["']citation_publication_date["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i);
  if (dateMatch) {
    const yearMatch = dateMatch[1].match(YEAR_REGEX);
    if (yearMatch) citation.year = yearMatch[0];
  }

  const publisherMatch = html.match(/<meta[^>]*name=["']citation_journal_title["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  if (publisherMatch) citation.publisher = publisherMatch[1].trim();

  return citation;
}

export function formatApaCitation(citation) {
  if (!citation) return '';
  const authors = citation.authors || 'Unknown';
  const year = citation.year ? `(${citation.year})` : '(n.d.)';
  const title = citation.title || 'Untitled';
  const doi = citation.doi ? ` https://doi.org/${citation.doi}` : '';
  return `${authors} ${year}. ${title}.${doi}`;
}

export function enrichHighlightWithCitation(highlight, pageHtml, url) {
  const citation = extractCitationFromPage(pageHtml || '', url);
  return { ...highlight, citation, capturedAt: Date.now() };
}

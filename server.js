import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import https from 'https';
import http from 'http';
import { URL, fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import {
  getAllProjects, getProject, saveProject, createDefaultProject,
  persistSessionState, getUploadsDir, saveUser, getUser,
} from './server/storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const inviteLinks = {};
const liveSessions = {};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, getUploadsDir()),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

function getSession(sessionId) {
  if (liveSessions[sessionId]) return liveSessions[sessionId];

  let project = getProject(sessionId);
  if (project) {
    liveSessions[sessionId] = project;
    return project;
  }

  liveSessions[sessionId] = {
    id: sessionId,
    name: 'Research Session',
    deliverableType: 'analysis_brief',
    sources: [],
    findingCards: [],
    annotations: [],
    researchSessions: [],
    deliverableContent: { sections: [] },
    folders: [{ id: 'default', name: 'General', links: [], color: '#6366f1', subfolders: [], queries: [] }],
    messages: [],
    comments: {},
    docItems: [],
    document: { title: 'Research Summary', sections: [], lastUpdated: Date.now() },
    participants: [],
    inviteCodes: [],
    createdAt: Date.now(),
    tier: 'free',
  };
  return liveSessions[sessionId];
}

function persistSession(sessionId) {
  const session = liveSessions[sessionId];
  if (session) {
    saveProject(session);
  }
}

// --- Project APIs ---
app.get('/api/projects', (req, res) => {
  res.json({ projects: getAllProjects() });
});

app.post('/api/projects', (req, res) => {
  const { name, deliverableType, ownerId, ownerName } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const project = createDefaultProject({ name, deliverableType: deliverableType || 'analysis_brief', ownerId, ownerName });
  liveSessions[project.id] = project;
  res.json(project);
});

app.get('/api/projects/:id', (req, res) => {
  const project = getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

// --- Auth (local profiles) ---
app.post('/api/auth/login', (req, res) => {
  const { name, userId } = req.body;
  const user = saveUser({
    id: userId || `u-${Date.now()}`,
    name: name.trim(),
    createdAt: Date.now(),
  });
  res.json(user);
});

// --- File upload ---
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const type = ext === '.pdf' ? 'pdf' : 'image';
  const source = {
    id: `src-${Date.now()}`,
    type,
    title: req.file.originalname,
    filePath: req.file.filename,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    addedBy: req.body.addedBy || 'Unknown',
    addedById: req.body.addedById,
    addedAt: Date.now(),
    annotations: [],
    url: `/api/files/src-${Date.now()}`,
  };
  source.url = `/api/files/${source.id}`;

  const projectId = req.body.projectId;
  if (projectId) {
    const session = getSession(projectId);
    session.sources = session.sources || [];
    session.sources.push(source);
    persistSession(projectId);
    io.to(projectId).emit('sources-updated', session.sources);
  }

  res.json({ source });
});

app.get('/api/files/:sourceId', (req, res) => {
  const projects = getAllProjects();
  for (const project of projects) {
    const source = (project.sources || []).find(s => s.id === req.params.sourceId);
    if (source?.filePath) {
      const filePath = path.join(getUploadsDir(), source.filePath);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }
  }
  const session = Object.values(liveSessions).find(s =>
    (s.sources || []).some(src => src.id === req.params.sourceId)
  );
  if (session) {
    const source = session.sources.find(s => s.id === req.params.sourceId);
    if (source?.filePath) {
      const filePath = path.join(getUploadsDir(), source.filePath);
      if (fs.existsSync(filePath)) return res.sendFile(filePath);
    }
  }
  res.status(404).send('File not found');
});

// --- Context search ---
app.post('/api/context/search', (req, res) => {
  const { query, projectId } = req.body;
  const session = getSession(projectId);
  if (!session) return res.status(404).json({ error: 'Project not found' });

  const tokenize = (text) => (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const queryTokens = tokenize(query);

  const allItems = [
    ...(session.sources || []).map(s => ({ ...s, itemType: 'source' })),
    ...(session.findingCards || []).map(c => ({ ...c, itemType: 'finding' })),
    ...(session.annotations || []).map(a => ({ ...a, itemType: 'annotation' })),
  ];

  const scored = allItems.map(item => {
    const docText = [item.title, item.url, item.highlightText, item.content, item.text, item.pageTitle].filter(Boolean).join(' ').toLowerCase();
    let score = 0;
    for (const qt of queryTokens) {
      if (docText.includes(qt)) score += 2;
    }
    return { item, score };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, 10);

  const results = scored.map(({ item, score }) => ({
    id: item.id, type: item.itemType,
    title: item.title || item.pageTitle || item.highlightText?.slice(0, 80) || item.url,
    snippet: item.highlightText || item.content || item.text || '',
    url: item.url, score, addedBy: item.addedBy, tags: item.tags,
  }));

  const answer = results.length > 0 ? {
    text: `Based on ${results.length} matching item(s): ${results.slice(0, 3).map(r => r.snippet?.slice(0, 150)).filter(Boolean).join(' ... ')}`,
    citations: results.slice(0, 3).map(r => ({ id: r.id, title: r.title, url: r.url })),
    confidence: results[0].score > 3 ? 'high' : 'medium',
  } : { text: `No sources match "${query}"`, citations: [], confidence: 'low' };

  res.json({ results, answer, query });
});

// --- Browser extension capture API ---
app.post('/api/capture', (req, res) => {
  const { projectId, url, title, highlightText, pageTitle, citation } = req.body;
  const session = getSession(projectId);
  if (!session) return res.status(404).json({ error: 'Project not found' });

  let source = (session.sources || []).find(s => s.url === url);
  if (!source) {
    source = { id: `src-${Date.now()}`, type: 'url', url, title: title || url, addedAt: Date.now(), addedBy: 'Extension', annotations: [] };
    session.sources.push(source);
  }

  const annotation = {
    id: `ann-${Date.now()}`, sourceId: source.id, url, type: 'highlight',
    highlightText, pageTitle, citation, timestamp: Date.now(), addedBy: 'Extension',
  };
  session.annotations = session.annotations || [];
  session.annotations.push(annotation);
  source.annotations = source.annotations || [];
  source.annotations.push(annotation);

  persistSession(projectId);
  io.to(projectId).emit('sources-updated', session.sources);
  io.to(projectId).emit('annotations-updated', session.annotations);
  res.json({ source, annotation });
});

// --- Invite API ---
app.post('/api/invite', (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
  const code = Math.random().toString(36).slice(2, 10);
  inviteLinks[code] = sessionId;
  getSession(sessionId).inviteCodes.push(code);
  res.json({ code, link: `/join/${code}` });
});

app.get('/api/invite/:code', (req, res) => {
  const sessionId = inviteLinks[req.params.code];
  if (!sessionId) return res.status(404).json({ error: 'Invalid invite code' });
  res.json({ sessionId });
});

// --- Citation metadata extraction ---
app.get('/api/citation', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'Missing url' });
  try {
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 ResearchTogether/1.0' },
    });
    const html = await response.text();
    const citation = { url: targetUrl };
    const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) citation.title = titleMatch[1].trim();
    const authorMatch = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i);
    if (authorMatch) citation.authors = authorMatch[1].trim();
    const doiMatch = html.match(/<meta[^>]*name=["']citation_doi["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/\b(10\.\d{4,}[^\s"<>]+)/i);
    if (doiMatch) citation.doi = doiMatch[1] || doiMatch[0];
    res.json(citation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Web Proxy (preserved from prototype) ---
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing url parameter');
  try {
    const parsedUrl = new URL(targetUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    const proxyReq = protocol.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
      },
      timeout: 15000,
    }, (proxyRes) => {
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
        let redirectUrl = proxyRes.headers.location;
        if (redirectUrl.startsWith('/')) redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
        return res.redirect(`/proxy?url=${encodeURIComponent(redirectUrl)}`);
      }
      const contentType = proxyRes.headers['content-type'] || 'text/html';
      if (!contentType.includes('text/html')) {
        res.set('Content-Type', contentType);
        proxyRes.pipe(res);
        return;
      }
      let body = '';
      proxyRes.setEncoding('utf8');
      proxyRes.on('data', chunk => { body += chunk; });
      proxyRes.on('end', () => {
        const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
        const selectionScript = `<script id="rt-selection-script">(function(){var rtStyle=document.createElement('style');rtStyle.textContent='.rt-highlight{background-color:#fef3c7;border-bottom:2px solid #f59e0b;padding:1px 0;}';document.head.appendChild(rtStyle);document.addEventListener('mouseup',function(e){var sel=window.getSelection();var text=sel?sel.toString().trim():'';if(text.length>0){var range=sel.getRangeAt(0);var rect=range.getBoundingClientRect();window.parent.postMessage({type:'RT_TEXT_SELECTED',text:text,position:{x:rect.left+rect.width/2,y:rect.top,width:rect.width,height:rect.height}},'*');}});document.addEventListener('mousedown',function(){window.parent.postMessage({type:'RT_SELECTION_CLEARED'},'*');});window.addEventListener('message',function(e){if(e.data&&e.data.type==='RT_HIGHLIGHT_TEXT'){var sel=window.getSelection();if(sel&&sel.rangeCount>0){try{var range=sel.getRangeAt(0);var span=document.createElement('span');span.className='rt-highlight';range.surroundContents(span);sel.removeAllRanges();}catch(err){}}}});})();</script>`;
        body = body
          .replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
          .replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '')
          .replace(/(href|src|action)="\/(?!\/)/gi, `$1="${baseUrl}/`)
          .replace(/<head([^>]*)>/i, `<head$1><base href="${baseUrl}/">${selectionScript}`);
        if (!body.includes('rt-selection-script')) {
          body = body.includes('</body>') ? body.replace('</body>', `${selectionScript}</body>`) : body + selectionScript;
        }
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.removeHeader('X-Frame-Options');
        res.send(body);
      });
    });
    proxyReq.on('error', (err) => res.status(502).send(`<html><body><h2>Could not load page</h2><p>${err.message}</p></body></html>`));
    proxyReq.on('timeout', () => { proxyReq.destroy(); res.status(504).send('Timeout'); });
  } catch (err) {
    res.status(400).send(`Invalid URL: ${err.message}`);
  }
});

// --- Search API ---
app.get('/api/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing query' });
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
    const response = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    const html = await response.text();
    const results = [];
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = resultRegex.exec(html)) !== null && results.length < 15) {
      let url = match[1];
      const uddgMatch = url.match(/uddg=([^&]*)/);
      if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);
      const title = match[2].replace(/<[^>]*>/g, '').trim();
      const snippet = match[3].replace(/<[^>]*>/g, '').trim();
      if (title && url.startsWith('http')) results.push({ title, url, snippet });
    }
    res.json({ results, query: q });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Socket.IO ---
io.on('connection', (socket) => {
  let currentSession = null;
  let currentUser = null;

  socket.on('join-session', ({ sessionId, user }) => {
    currentSession = sessionId;
    currentUser = { ...user, socketId: socket.id, online: true };
    socket.join(sessionId);
    const session = getSession(sessionId);
    const existing = session.participants.findIndex(p => p.id === user.id);
    if (existing >= 0) session.participants[existing] = { ...session.participants[existing], online: true, socketId: socket.id };
    else session.participants.push(currentUser);
    socket.emit('session-state', session);
    socket.to(sessionId).emit('user-joined', currentUser);
    io.to(sessionId).emit('participants-updated', session.participants);
    persistSession(sessionId);
  });

  socket.on('cursor-move', (data) => {
    if (currentSession) socket.to(currentSession).emit('cursor-move', { ...data, userId: currentUser?.id });
  });

  socket.on('send-message', (message) => {
    if (currentSession) {
      const session = getSession(currentSession);
      const msg = { ...message, id: `msg-${Date.now()}`, userId: currentUser?.id, userName: currentUser?.name, userColor: currentUser?.color, timestamp: Date.now() };
      session.messages.push(msg);
      io.to(currentSession).emit('new-message', msg);
      persistSession(currentSession);
    }
  });

  socket.on('typing', ({ isTyping }) => {
    if (currentSession) socket.to(currentSession).emit('user-typing', { userId: currentUser?.id, userName: currentUser?.name, isTyping });
  });

  socket.on('search-query', ({ query, results, folderId }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      const entry = { id: `q-${Date.now()}`, userId: currentUser?.id, userName: currentUser?.name, query, results, folderId: folderId || 'default', timestamp: Date.now() };
      const folder = findFolder(session.folders, folderId || 'default');
      if (folder) { folder.queries = folder.queries || []; folder.queries.push(entry); }
      io.to(currentSession).emit('folders-updated', session.folders);
      persistSession(currentSession);
    }
  });

  socket.on('navigate', ({ url, title }) => {
    if (currentSession) io.to(currentSession).emit('user-navigated', { userId: currentUser?.id, userName: currentUser?.name, url, title, timestamp: Date.now() });
  });

  // --- Source library events ---
  socket.on('add-source', (sourceData) => {
    if (!currentSession) return;
    const session = getSession(currentSession);
    const source = {
      id: `src-${Date.now()}`, ...sourceData,
      addedAt: Date.now(), annotations: [],
    };
    session.sources = session.sources || [];
    session.sources.push(source);
    io.to(currentSession).emit('sources-updated', session.sources);
    persistSession(currentSession);
  });

  socket.on('add-annotation', ({ annotation }) => {
    if (!currentSession) return;
    const session = getSession(currentSession);
    annotation.id = annotation.id || `ann-${Date.now()}`;
    session.annotations = session.annotations || [];
    session.annotations.push(annotation);
    const source = (session.sources || []).find(s => s.id === annotation.sourceId);
    if (source) {
      source.annotations = source.annotations || [];
      source.annotations.push(annotation);
    }
    io.to(currentSession).emit('annotations-updated', session.annotations);
    io.to(currentSession).emit('sources-updated', session.sources);
    persistSession(currentSession);
  });

  // --- Finding cards ---
  socket.on('add-finding-card', ({ card }) => {
    if (!currentSession) return;
    const session = getSession(currentSession);
    const findingCard = { id: `fc-${Date.now()}`, ...card };
    session.findingCards = session.findingCards || [];
    session.findingCards.push(findingCard);
    io.to(currentSession).emit('finding-cards-updated', session.findingCards);
    persistSession(currentSession);
  });

  socket.on('update-finding-card', ({ cardId, updates }) => {
    if (!currentSession) return;
    const session = getSession(currentSession);
    const card = (session.findingCards || []).find(c => c.id === cardId);
    if (card) { Object.assign(card, updates); io.to(currentSession).emit('finding-cards-updated', session.findingCards); persistSession(currentSession); }
  });

  socket.on('delete-finding-card', ({ cardId }) => {
    if (!currentSession) return;
    const session = getSession(currentSession);
    session.findingCards = (session.findingCards || []).filter(c => c.id !== cardId);
    io.to(currentSession).emit('finding-cards-updated', session.findingCards);
    persistSession(currentSession);
  });

  socket.on('update-deliverable', ({ deliverableContent }) => {
    if (!currentSession) return;
    const session = getSession(currentSession);
    session.deliverableContent = deliverableContent;
    io.to(currentSession).emit('deliverable-updated', deliverableContent);
    persistSession(currentSession);
  });

  // --- Research sessions ---
  socket.on('schedule-research-session', ({ session: rs }) => {
    if (!currentSession) return;
    const project = getSession(currentSession);
    project.researchSessions = project.researchSessions || [];
    project.researchSessions.push(rs);
    io.to(currentSession).emit('research-sessions-updated', project.researchSessions);
    persistSession(currentSession);
  });

  // --- Existing events (comments, folders, doc) ---
  socket.on('add-comment', ({ url, text, highlightText, pageTitle }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      if (!session.comments[url]) session.comments[url] = [];
      session.comments[url].push({
        id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: currentUser?.id, userName: currentUser?.name, userColor: currentUser?.color,
        text, highlightText, pageTitle, timestamp: Date.now(), resolved: false, addedToDoc: false, replies: [],
      });
      io.to(currentSession).emit('comments-updated', { url, comments: session.comments[url] });
      persistSession(currentSession);
    }
  });

  socket.on('reply-to-comment', ({ url, commentId, text }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      const comment = (session.comments[url] || []).find(c => c.id === commentId);
      if (comment) {
        comment.replies.push({ id: `r-${Date.now()}`, userId: currentUser?.id, userName: currentUser?.name, userColor: currentUser?.color, text, timestamp: Date.now() });
        io.to(currentSession).emit('comments-updated', { url, comments: session.comments[url] });
        persistSession(currentSession);
      }
    }
  });

  socket.on('resolve-comment', ({ url, commentId }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      const comment = (session.comments[url] || []).find(c => c.id === commentId);
      if (comment) { comment.resolved = !comment.resolved; io.to(currentSession).emit('comments-updated', { url, comments: session.comments[url] }); persistSession(currentSession); }
    }
  });

  socket.on('add-to-doc', ({ url, commentId, text, highlightText, pageTitle }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      session.docItems.push({ id: `doc-${Date.now()}`, commentId, url, pageTitle, text, highlightText, addedBy: currentUser?.name, timestamp: Date.now() });
      const comment = (session.comments[url] || []).find(c => c.id === commentId);
      if (comment) { comment.addedToDoc = true; io.to(currentSession).emit('comments-updated', { url, comments: session.comments[url] }); }
      updateDocument(session, currentSession);
      io.to(currentSession).emit('doc-items-updated', session.docItems);
      persistSession(currentSession);
    }
  });

  socket.on('add-highlight-to-doc', ({ url, text, pageTitle }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      const item = { id: `doc-${Date.now()}`, url, pageTitle, highlightText: text, text: '', addedBy: currentUser?.name, timestamp: Date.now() };
      session.docItems.push(item);
      session.findingCards = session.findingCards || [];
      session.findingCards.push({
        id: `fc-${Date.now()}`, title: text.slice(0, 60), highlightText: text,
        url, pageTitle, addedBy: currentUser?.name, addedById: currentUser?.id, timestamp: Date.now(),
      });
      updateDocument(session, currentSession);
      io.to(currentSession).emit('doc-items-updated', session.docItems);
      io.to(currentSession).emit('finding-cards-updated', session.findingCards);
      persistSession(currentSession);
    }
  });

  socket.on('create-folder', ({ name, color, parentId }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      const folder = { id: `f-${Date.now()}`, name, color: color || '#6366f1', links: [], subfolders: [], queries: [] };
      if (parentId) { const parent = findFolder(session.folders, parentId); if (parent) { parent.subfolders = parent.subfolders || []; parent.subfolders.push(folder); } }
      else session.folders.push(folder);
      io.to(currentSession).emit('folders-updated', session.folders);
      persistSession(currentSession);
    }
  });

  socket.on('add-link-to-folder', ({ folderId, link }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      const folder = findFolder(session.folders, folderId);
      if (folder && !folder.links.some(l => l.url === link.url)) {
        folder.links.push({ ...link, id: `l-${Date.now()}`, addedBy: currentUser?.name, addedAt: Date.now(), starred: false });
        const source = { id: `src-${Date.now()}`, type: 'url', url: link.url, title: link.title || link.url, addedBy: currentUser?.name, addedAt: Date.now(), annotations: [] };
        session.sources = session.sources || [];
        if (!session.sources.some(s => s.url === link.url)) session.sources.push(source);
        io.to(currentSession).emit('folders-updated', session.folders);
        io.to(currentSession).emit('sources-updated', session.sources);
        persistSession(currentSession);
      }
    }
  });

  socket.on('toggle-star-link', ({ folderId, linkId }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      const folder = findFolder(session.folders, folderId);
      if (folder) { const link = folder.links.find(l => l.id === linkId); if (link) { link.starred = !link.starred; io.to(currentSession).emit('folders-updated', session.folders); persistSession(currentSession); } }
    }
  });

  socket.on('remove-link-from-folder', ({ folderId, linkId }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      const folder = findFolder(session.folders, folderId);
      if (folder) { folder.links = folder.links.filter(l => l.id !== linkId); io.to(currentSession).emit('folders-updated', session.folders); persistSession(currentSession); }
    }
  });

  socket.on('delete-folder', ({ folderId }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      session.folders = deleteFolderRecursive(session.folders, folderId);
      io.to(currentSession).emit('folders-updated', session.folders);
      persistSession(currentSession);
    }
  });

  socket.on('update-document', ({ document }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      session.document = { ...document, lastUpdated: Date.now() };
      io.to(currentSession).emit('document-updated', session.document);
      persistSession(currentSession);
    }
  });

  socket.on('reorder-doc-items', ({ fromIndex, toIndex }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      if (fromIndex >= 0 && fromIndex < session.docItems.length) {
        const [item] = session.docItems.splice(fromIndex, 1);
        session.docItems.splice(toIndex, 0, item);
        io.to(currentSession).emit('doc-items-updated', session.docItems);
        persistSession(currentSession);
      }
    }
  });

  socket.on('remove-doc-item', ({ itemId }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      session.docItems = session.docItems.filter(d => d.id !== itemId);
      updateDocument(session, currentSession);
      io.to(currentSession).emit('doc-items-updated', session.docItems);
      persistSession(currentSession);
    }
  });

  socket.on('disconnect', () => {
    if (currentSession && currentUser) {
      const session = getSession(currentSession);
      const p = session.participants.find(p => p.id === currentUser.id);
      if (p) p.online = false;
      io.to(currentSession).emit('participants-updated', session.participants);
      io.to(currentSession).emit('user-left', currentUser);
      persistSession(currentSession);
    }
  });
});

function findFolder(folders, id) {
  for (const f of folders) {
    if (f.id === id) return f;
    if (f.subfolders) { const found = findFolder(f.subfolders, id); if (found) return found; }
  }
  return null;
}

function deleteFolderRecursive(folders, id) {
  return folders.filter(f => { if (f.id === id) return false; if (f.subfolders) f.subfolders = deleteFolderRecursive(f.subfolders, id); return true; });
}

function updateDocument(session, sessionId) {
  session.document.sections = session.docItems.map(item => ({ ...item, type: item.highlightText ? 'highlight' : 'note' }));
  session.document.lastUpdated = Date.now();
  io.to(sessionId).emit('document-updated', session.document);
}

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/proxy') || req.path.startsWith('/socket.io')) return;
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send('Build the frontend first: npm run build');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => { console.log(`\n  ResearchTogether server on http://localhost:${PORT}\n`); });

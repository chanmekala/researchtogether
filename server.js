import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import https from 'https';
import http from 'http';
import { URL, fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

const sessions = {};
const inviteLinks = {};

function getSession(sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      id: sessionId,
      name: 'Research Session',
      folders: [
        { id: 'default', name: 'General', links: [], color: '#6366f1', subfolders: [], queries: [] }
      ],
      messages: [],
      comments: {},
      docItems: [],
      document: { title: 'Research Summary', sections: [], lastUpdated: Date.now() },
      participants: [],
      inviteCodes: [],
      createdAt: Date.now()
    };
  }
  return sessions[sessionId];
}

// Invite API
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

// Web Proxy
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing url parameter');
  try {
    const parsedUrl = new URL(targetUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    const proxyReq = protocol.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
      },
      timeout: 15000
    }, (proxyRes) => {
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
        let redirectUrl = proxyRes.headers.location;
        if (redirectUrl.startsWith('/')) redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
        else if (!redirectUrl.startsWith('http')) redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}/${redirectUrl}`;
        return res.redirect(`/proxy?url=${encodeURIComponent(redirectUrl)}`);
      }
      const contentType = proxyRes.headers['content-type'] || 'text/html';
      if (!contentType.includes('text/html')) {
        res.set('Content-Type', contentType);
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', 'public, max-age=3600');
        proxyRes.pipe(res);
        return;
      }
      let body = '';
      proxyRes.setEncoding('utf8');
      proxyRes.on('data', chunk => { body += chunk; });
      proxyRes.on('end', () => {
        const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
        const selectionScript = `
<script id="rt-selection-script">
(function() {
  var rtStyle = document.createElement('style');
  rtStyle.textContent = '.rt-highlight { background-color: #fef3c7; border-bottom: 2px solid #f59e0b; padding: 1px 0; transition: background-color 0.3s; } .rt-highlight:hover { background-color: #fde68a; }';
  document.head.appendChild(rtStyle);

  document.addEventListener('mouseup', function(e) {
    var sel = window.getSelection();
    var text = sel ? sel.toString().trim() : '';
    if (text.length > 0) {
      var range = sel.getRangeAt(0);
      var rect = range.getBoundingClientRect();
      window.parent.postMessage({
        type: 'RT_TEXT_SELECTED',
        text: text,
        position: { x: rect.left + rect.width / 2, y: rect.top, width: rect.width, height: rect.height }
      }, '*');
    }
  });
  document.addEventListener('mousedown', function(e) {
    window.parent.postMessage({ type: 'RT_SELECTION_CLEARED' }, '*');
  });

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'RT_HIGHLIGHT_TEXT') {
      var sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.toString().trim().length > 0) {
        try {
          var range = sel.getRangeAt(0);
          var span = document.createElement('span');
          span.className = 'rt-highlight';
          span.title = 'Added to research summary';
          range.surroundContents(span);
          sel.removeAllRanges();
        } catch(err) { console.log('Could not highlight:', err); }
      }
    }
  });
})();
</script>`;
        body = body
          .replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
          .replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '')
          .replace(/(href|src|action)="\/(?!\/)/gi, `$1="${baseUrl}/`)
          .replace(/(href|src|action)='\/(?!\/)/gi, `$1='${baseUrl}/`)
          .replace(/url\(\/(?!\/)/gi, `url(${baseUrl}/`)
          .replace(/<head([^>]*)>/i, `<head$1><base href="${baseUrl}/">${selectionScript}`);
        if (!body.includes('rt-selection-script')) {
          body = body.includes('</body>') ? body.replace('</body>', `${selectionScript}</body>`) : body + selectionScript;
        }
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.set('Access-Control-Allow-Origin', '*');
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.removeHeader('X-Content-Type-Options');
        res.send(body);
      });
    });
    proxyReq.on('error', (err) => {
      res.status(502).send(`<html><body style="font-family:Inter,system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#fafafa;color:#64748b;"><div style="text-align:center;max-width:420px;"><h2 style="color:#1e293b;">Could not load page</h2><p>${err.message}</p></div></body></html>`);
    });
    proxyReq.on('timeout', () => { proxyReq.destroy(); res.status(504).send('Timeout'); });
  } catch (err) {
    res.status(400).send(`Invalid URL: ${err.message}`);
  }
});

// Search API
app.get('/api/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing query' });
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
    const response = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
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
    if (results.length === 0) {
      const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      while ((match = linkRegex.exec(html)) !== null && results.length < 15) {
        let url = match[1];
        const uddgMatch = url.match(/uddg=([^&]*)/);
        if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);
        const title = match[2].replace(/<[^>]*>/g, '').trim();
        if (title && url.startsWith('http')) results.push({ title, url, snippet: '' });
      }
    }
    res.json({ results, query: q });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Socket.IO
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
    }
  });

  socket.on('navigate', ({ url, title }) => {
    if (currentSession) io.to(currentSession).emit('user-navigated', { userId: currentUser?.id, userName: currentUser?.name, url, title, timestamp: Date.now() });
  });

  socket.on('add-comment', ({ url, text, highlightText, pageTitle }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      if (!session.comments[url]) session.comments[url] = [];
      session.comments[url].push({
        id: `c-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        userId: currentUser?.id, userName: currentUser?.name, userColor: currentUser?.color,
        text, highlightText, pageTitle, timestamp: Date.now(), resolved: false, addedToDoc: false, replies: []
      });
      io.to(currentSession).emit('comments-updated', { url, comments: session.comments[url] });
    }
  });

  socket.on('reply-to-comment', ({ url, commentId, text }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      const comment = (session.comments[url] || []).find(c => c.id === commentId);
      if (comment) {
        comment.replies.push({
          id: `r-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          userId: currentUser?.id, userName: currentUser?.name, userColor: currentUser?.color, text, timestamp: Date.now()
        });
        io.to(currentSession).emit('comments-updated', { url, comments: session.comments[url] });
      }
    }
  });

  socket.on('resolve-comment', ({ url, commentId }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      const comment = (session.comments[url] || []).find(c => c.id === commentId);
      if (comment) { comment.resolved = !comment.resolved; io.to(currentSession).emit('comments-updated', { url, comments: session.comments[url] }); }
    }
  });

  socket.on('add-to-doc', ({ url, commentId, text, highlightText, pageTitle }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      session.docItems.push({ id: `doc-${Date.now()}`, commentId, url, pageTitle, text, highlightText, addedBy: currentUser?.name, timestamp: Date.now() });
      const comment = (session.comments[url] || []).find(c => c.id === commentId);
      if (comment) { comment.addedToDoc = true; io.to(currentSession).emit('comments-updated', { url, comments: session.comments[url] }); }
      updateDocument(session);
      io.to(currentSession).emit('doc-items-updated', session.docItems);
    }
  });

  socket.on('add-highlight-to-doc', ({ url, text, pageTitle }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      session.docItems.push({ id: `doc-${Date.now()}`, url, pageTitle, highlightText: text, text: '', addedBy: currentUser?.name, timestamp: Date.now() });
      updateDocument(session);
      io.to(currentSession).emit('doc-items-updated', session.docItems);
    }
  });

  socket.on('create-folder', ({ name, color, parentId }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      const folder = { id: `f-${Date.now()}`, name, color: color || '#6366f1', links: [], subfolders: [], queries: [] };
      if (parentId) { const parent = findFolder(session.folders, parentId); if (parent) { parent.subfolders = parent.subfolders || []; parent.subfolders.push(folder); } }
      else session.folders.push(folder);
      io.to(currentSession).emit('folders-updated', session.folders);
    }
  });

  socket.on('add-link-to-folder', ({ folderId, link }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      const folder = findFolder(session.folders, folderId);
      if (folder && !folder.links.some(l => l.url === link.url)) {
        folder.links.push({ ...link, id: `l-${Date.now()}`, addedBy: currentUser?.name, addedAt: Date.now(), starred: false });
        io.to(currentSession).emit('folders-updated', session.folders);
      }
    }
  });

  socket.on('toggle-star-link', ({ folderId, linkId }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      const folder = findFolder(session.folders, folderId);
      if (folder) { const link = folder.links.find(l => l.id === linkId); if (link) { link.starred = !link.starred; io.to(currentSession).emit('folders-updated', session.folders); } }
    }
  });

  socket.on('remove-link-from-folder', ({ folderId, linkId }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      const folder = findFolder(session.folders, folderId);
      if (folder) { folder.links = folder.links.filter(l => l.id !== linkId); io.to(currentSession).emit('folders-updated', session.folders); }
    }
  });

  socket.on('delete-folder', ({ folderId }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      session.folders = deleteFolderRecursive(session.folders, folderId);
      io.to(currentSession).emit('folders-updated', session.folders);
    }
  });

  socket.on('update-document', ({ document }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      session.document = { ...document, lastUpdated: Date.now() };
      io.to(currentSession).emit('document-updated', session.document);
    }
  });

  socket.on('reorder-doc-items', ({ fromIndex, toIndex }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      if (fromIndex >= 0 && fromIndex < session.docItems.length && toIndex >= 0 && toIndex < session.docItems.length) {
        const [item] = session.docItems.splice(fromIndex, 1);
        session.docItems.splice(toIndex, 0, item);
        io.to(currentSession).emit('doc-items-updated', session.docItems);
      }
    }
  });

  socket.on('remove-doc-item', ({ itemId }) => {
    if (currentSession) {
      const session = getSession(currentSession);
      session.docItems = session.docItems.filter(d => d.id !== itemId);
      updateDocument(session);
      io.to(currentSession).emit('doc-items-updated', session.docItems);
    }
  });

  socket.on('disconnect', () => {
    if (currentSession && currentUser) {
      const session = getSession(currentSession);
      const p = session.participants.find(p => p.id === currentUser.id);
      if (p) p.online = false;
      io.to(currentSession).emit('participants-updated', session.participants);
      io.to(currentSession).emit('user-left', currentUser);
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

function updateDocument(session) {
  session.document.sections = session.docItems.map(item => ({ ...item, type: item.highlightText ? 'highlight' : 'note' }));
  session.document.lastUpdated = Date.now();
  io.to(session.id).emit('document-updated', session.document);
}

// Serve built frontend in production
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all: serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => { console.log(`\n  ResearchTogether server on http://localhost:${PORT}\n`); });

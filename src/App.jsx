import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import LoginScreen from './components/LoginScreen';
import ProjectDashboard from './components/ProjectDashboard';
import MainLayout from './components/MainLayout';
import { AccessibilityProvider } from './contexts/AccessibilityContext';

const SOCKET_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : window.location.origin;

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'];

export default function App() {
  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [cursors, setCursors] = useState({});
  const [folders, setFolders] = useState([]);
  const [comments, setComments] = useState({});
  const [docItems, setDocItems] = useState([]);
  const [document, setDocument] = useState({ title: 'Research Summary', sections: [], lastUpdated: Date.now() });
  const [navigations, setNavigations] = useState({});
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [sources, setSources] = useState([]);
  const [findingCards, setFindingCards] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [deliverableContent, setDeliverableContent] = useState({ sections: [] });
  const [researchSessions, setResearchSessions] = useState([]);
  const [screen, setScreen] = useState('login');

  useEffect(() => {
    const saved = localStorage.getItem('rt_user');
    if (saved) {
      try { setUser(JSON.parse(saved)); setScreen('dashboard'); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (!user || !project) return;
    const s = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    s.on('connect', () => { setConnected(true); s.emit('join-session', { sessionId: project.id, user }); });
    s.on('disconnect', () => setConnected(false));

    s.on('session-state', (state) => {
      setParticipants(state.participants || []);
      setMessages(state.messages || []);
      setFolders(state.folders || []);
      setComments(state.comments || {});
      setDocItems(state.docItems || []);
      setDocument(state.document || { title: project.name, sections: [], lastUpdated: Date.now() });
      setSources(state.sources || []);
      setFindingCards(state.findingCards || []);
      setAnnotations(state.annotations || []);
      setDeliverableContent(state.deliverableContent || { sections: [] });
      setResearchSessions(state.researchSessions || []);
    });

    s.on('participants-updated', setParticipants);
    s.on('new-message', (msg) => { setMessages(prev => [...prev, msg]); setUnreadMessages(prev => prev + 1); });
    s.on('folders-updated', setFolders);
    s.on('comments-updated', ({ url, comments: c }) => setComments(prev => ({ ...prev, [url]: c })));
    s.on('document-updated', setDocument);
    s.on('doc-items-updated', setDocItems);
    s.on('sources-updated', setSources);
    s.on('annotations-updated', setAnnotations);
    s.on('finding-cards-updated', setFindingCards);
    s.on('deliverable-updated', setDeliverableContent);
    s.on('research-sessions-updated', setResearchSessions);
    s.on('user-navigated', (nav) => setNavigations(prev => ({ ...prev, [nav.userId]: nav })));
    s.on('cursor-move', (data) => setCursors(prev => ({ ...prev, [data.userId]: data })));
    s.on('user-typing', ({ userId, userName, isTyping }) => {
      setTypingUsers(prev => {
        const next = { ...prev };
        if (isTyping) next[userId] = userName;
        else delete next[userId];
        return next;
      });
    });
    s.on('user-left', (u) => {
      setCursors(prev => { const next = { ...prev }; delete next[u.id]; return next; });
      setTypingUsers(prev => { const next = { ...prev }; delete next[u.id]; return next; });
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [user, project]);

  useEffect(() => {
    if (!socket || !user) return;
    const handleMove = (e) => {
      socket.emit('cursor-move', {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
        userName: user.name, color: user.color,
      });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [socket, user]);

  const handleLogin = useCallback((userData) => {
    const color = userData.color || COLORS[Math.floor(Math.random() * COLORS.length)];
    const fullUser = { ...userData, color };
    localStorage.setItem('rt_user', JSON.stringify(fullUser));
    setUser(fullUser);
    setScreen('dashboard');
  }, []);

  const handleSelectProject = useCallback((proj) => {
    setProject(proj);
    setScreen('workspace');
  }, []);

  const handleCreateProject = useCallback((proj) => {
    setProject(proj);
    setScreen('workspace');
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setProject(null);
    setScreen('dashboard');
    if (socket) { socket.disconnect(); setSocket(null); }
  }, [socket]);

  if (screen === 'login' || !user) {
    return (
      <AccessibilityProvider>
        <LoginScreen onLogin={handleLogin} />
      </AccessibilityProvider>
    );
  }

  if (screen === 'dashboard') {
    return (
      <AccessibilityProvider>
        <ProjectDashboard user={user} onSelectProject={handleSelectProject} onCreateProject={handleCreateProject} />
      </AccessibilityProvider>
    );
  }

  return (
    <AccessibilityProvider>
      <a href="#main-content" className="skip-link" tabIndex={0}>Skip to main content</a>

      {Object.entries(cursors)
        .filter(([id]) => id !== user.id)
        .map(([id, data]) => (
          <div key={id} className="remote-cursor"
            style={{ left: data.x * window.innerWidth, top: data.y * window.innerHeight, '--cursor-color': data.color }}
            aria-hidden="true">
            <div className="remote-cursor-arrow" />
            <div className="remote-cursor-name" style={{ backgroundColor: data.color }}>{data.userName}</div>
          </div>
        ))}

      <MainLayout
        user={user} socket={socket} connected={connected}
        project={project} onBackToDashboard={handleBackToDashboard}
        participants={participants} messages={messages} folders={folders}
        comments={comments} docItems={docItems} document={document}
        navigations={navigations} typingUsers={typingUsers}
        unreadMessages={unreadMessages} setUnreadMessages={setUnreadMessages}
        sources={sources} findingCards={findingCards} annotations={annotations}
        deliverableContent={deliverableContent} researchSessions={researchSessions}
      />
    </AccessibilityProvider>
  );
}

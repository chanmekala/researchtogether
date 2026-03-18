import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import LoginScreen from './components/LoginScreen';
import MainLayout from './components/MainLayout';
import { AccessibilityProvider } from './contexts/AccessibilityContext';

const SOCKET_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : window.location.origin;

export default function App() {
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(null);
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
  const [activeRightTab, setActiveRightTab] = useState('comments');

  useEffect(() => {
    if (!user || !sessionId) return;
    const s = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    s.on('connect', () => { setConnected(true); s.emit('join-session', { sessionId, user }); });
    s.on('disconnect', () => setConnected(false));

    s.on('session-state', (state) => {
      setParticipants(state.participants || []);
      setMessages(state.messages || []);
      setFolders(state.folders || []);
      setComments(state.comments || {});
      setDocItems(state.docItems || []);
      setDocument(state.document || { title: 'Research Summary', sections: [], lastUpdated: Date.now() });
    });

    s.on('participants-updated', setParticipants);
    s.on('new-message', (msg) => {
      setMessages(prev => [...prev, msg]);
      // Increment unread if messages tab is not active
      setUnreadMessages(prev => prev + 1);
    });
    s.on('folders-updated', setFolders);
    s.on('comments-updated', ({ url, comments: c }) => setComments(prev => ({ ...prev, [url]: c })));
    s.on('document-updated', setDocument);
    s.on('doc-items-updated', setDocItems);
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
  }, [user, sessionId]);

  // Track cursor
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

  const handleLogin = useCallback((userData, sid) => {
    setUser(userData);
    setSessionId(sid);
  }, []);

  if (!user) {
    return (
      <AccessibilityProvider>
        <LoginScreen onLogin={handleLogin} />
      </AccessibilityProvider>
    );
  }

  return (
    <AccessibilityProvider>
      <a href="#main-content" className="skip-link" tabIndex={0}>Skip to main content</a>

      {/* Remote cursors - Figma style */}
      {Object.entries(cursors)
        .filter(([id]) => id !== user.id)
        .map(([id, data]) => (
          <div key={id} className="remote-cursor"
            style={{ left: data.x * window.innerWidth, top: data.y * window.innerHeight, '--cursor-color': data.color }}
            aria-hidden="true">
            <div className="remote-cursor-arrow" />
            <div className="remote-cursor-name" style={{ backgroundColor: data.color }}>
              {data.userName}
            </div>
          </div>
        ))}

      <MainLayout
        user={user} socket={socket} connected={connected} sessionId={sessionId}
        participants={participants} messages={messages} folders={folders}
        comments={comments} docItems={docItems} document={document}
        navigations={navigations} typingUsers={typingUsers}
        unreadMessages={unreadMessages} setUnreadMessages={setUnreadMessages}
      />
    </AccessibilityProvider>
  );
}

import React, { useState, useRef, useCallback } from 'react';
import Sidebar from './Sidebar';
import BrowserView from './BrowserView';
import RightPanel from './RightPanel';
import TopBar from './TopBar';
import DocumentView from './DocumentView';
import AccessibilityPanel from './AccessibilityPanel';

export default function MainLayout({
  user, socket, connected, sessionId,
  participants, messages, folders,
  comments, docItems, document, navigations, typingUsers,
  unreadMessages, setUnreadMessages
}) {
  const [currentUrl, setCurrentUrl] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [activeView, setActiveView] = useState('browser');
  const [rightPanel, setRightPanel] = useState('comments');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [browserHistory, setBrowserHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeFolder, setActiveFolder] = useState('default');
  const iframeRef = useRef(null);

  const navigate = useCallback((url) => {
    if (!url) return;
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) finalUrl = 'https://' + url;
    setCurrentUrl(finalUrl);
    setCurrentTitle(finalUrl);
    setIsLoading(true);
    setSearchResults([]);
    setBrowserHistory(prev => {
      const newHistory = [...prev.slice(0, historyIndex + 1), finalUrl];
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
    socket?.emit('navigate', { url: finalUrl, title: finalUrl });
  }, [socket, historyIndex]);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentUrl(browserHistory[newIndex]);
      setIsLoading(true);
    }
  }, [historyIndex, browserHistory]);

  const goForward = useCallback(() => {
    if (historyIndex < browserHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentUrl(browserHistory[newIndex]);
      setIsLoading(true);
    }
  }, [historyIndex, browserHistory]);

  const doSearch = useCallback(async (query) => {
    if (!query.trim()) return;
    setIsLoading(true);
    setCurrentUrl('');
    setSearchResults([]);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
      socket?.emit('search-query', { query, results: data.results || [], folderId: activeFolder });
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [socket, activeFolder]);

  const handleComment = useCallback((text, highlightText) => {
    if (!currentUrl) return;
    socket?.emit('add-comment', { url: currentUrl, text, highlightText, pageTitle: currentTitle });
  }, [socket, currentUrl, currentTitle]);

  const handleAddToDoc = useCallback((text, highlightText, commentId) => {
    if (!currentUrl) return;
    if (commentId) {
      socket?.emit('add-to-doc', { url: currentUrl, commentId, text, highlightText, pageTitle: currentTitle });
    } else {
      socket?.emit('add-highlight-to-doc', { url: currentUrl, text: highlightText || text, pageTitle: currentTitle });
    }
  }, [socket, currentUrl, currentTitle]);

  const handleSaveToFolder = useCallback((folderId) => {
    if (!currentUrl) return;
    socket?.emit('add-link-to-folder', { folderId, link: { url: currentUrl, title: currentTitle || currentUrl } });
  }, [socket, currentUrl, currentTitle]);

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden" id="main-content" role="main">
      <TopBar
        currentUrl={currentUrl} isLoading={isLoading} connected={connected}
        sessionId={sessionId} participants={participants} activeView={activeView}
        onViewChange={setActiveView} onNavigate={navigate} onSearch={doSearch}
        onBack={goBack} onForward={goForward}
        canGoBack={historyIndex > 0} canGoForward={historyIndex < browserHistory.length - 1}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
        onToggleAccessibility={() => setShowAccessibility(!showAccessibility)}
        user={user} navigations={navigations} socket={socket}
      />

      <div className="flex-1 flex overflow-hidden">
        {showSidebar && (
          <Sidebar
            folders={folders} participants={participants} user={user}
            socket={socket} onNavigate={navigate} navigations={navigations}
            currentUrl={currentUrl} activeFolder={activeFolder}
            onActiveFolderChange={setActiveFolder} sessionId={sessionId}
          />
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {activeView === 'browser' ? (
            <BrowserView
              currentUrl={currentUrl} isLoading={isLoading} searchResults={searchResults}
              onNavigate={navigate} onLoadComplete={() => setIsLoading(false)}
              iframeRef={iframeRef} comments={comments} participants={participants}
              user={user} onComment={handleComment} onAddToDoc={handleAddToDoc}
              onSaveToFolder={handleSaveToFolder} folders={folders} socket={socket}
              currentTitle={currentTitle} setCurrentTitle={setCurrentTitle}
            />
          ) : (
            <DocumentView
              document={document} docItems={docItems} socket={socket} user={user}
              onNavigate={(url) => { navigate(url); setActiveView('browser'); }}
            />
          )}
        </div>

        {showRightPanel && (
          <RightPanel
            activeTab={rightPanel} onTabChange={(tab) => { setRightPanel(tab); if (tab === 'messages') setUnreadMessages(0); }}
            messages={messages} comments={comments} participants={participants}
            user={user} socket={socket} currentUrl={currentUrl}
            onNavigate={navigate} typingUsers={typingUsers} onAddToDoc={handleAddToDoc}
            unreadMessages={unreadMessages}
          />
        )}
      </div>

      {showAccessibility && <AccessibilityPanel onClose={() => setShowAccessibility(false)} />}
    </div>
  );
}

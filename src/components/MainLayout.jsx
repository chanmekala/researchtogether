import React, { useState, useRef, useCallback } from 'react';
import Sidebar from './Sidebar';
import BrowserView from './BrowserView';
import RightPanel from './RightPanel';
import TopBar from './TopBar';
import DocumentView from './DocumentView';
import DeliverableBuilder from './DeliverableBuilder';
import SourceLibrary from './SourceLibrary';
import PDFViewer from './PDFViewer';
import ImageViewer from './ImageViewer';
import FindingCardsPanel from './FindingCardsPanel';
import ContextPanel from './ContextPanel';
import ResearchSessionsPanel from './ResearchSessionsPanel';
import ExportPanel from './ExportPanel';
import AdminPanel from './AdminPanel';
import AccessibilityPanel from './AccessibilityPanel';

export default function MainLayout({
  user, socket, connected, project, onBackToDashboard,
  participants, messages, folders,
  comments, docItems, document, navigations, typingUsers,
  unreadMessages, setUnreadMessages,
  sources, findingCards, annotations, deliverableContent, researchSessions,
}) {
  const [currentUrl, setCurrentUrl] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [activeSource, setActiveSource] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [activeView, setActiveView] = useState('browser');
  const [rightPanel, setRightPanel] = useState('comments');
  const [sidebarTab, setSidebarTab] = useState('library');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
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
    setActiveSource(null);
    setIsLoading(true);
    setSearchResults([]);
    setActiveView('browser');
    setBrowserHistory(prev => {
      const newHistory = [...prev.slice(0, historyIndex + 1), finalUrl];
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
    socket?.emit('navigate', { url: finalUrl, title: finalUrl });
  }, [socket, historyIndex]);

  const openSource = useCallback((source) => {
    setActiveSource(source);
    if (source.type === 'url') {
      navigate(source.url);
    } else {
      setActiveView('browser');
      setCurrentUrl('');
    }
  }, [navigate]);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentUrl(browserHistory[newIndex]);
      setActiveSource(null);
      setIsLoading(true);
    }
  }, [historyIndex, browserHistory]);

  const goForward = useCallback(() => {
    if (historyIndex < browserHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentUrl(browserHistory[newIndex]);
      setActiveSource(null);
      setIsLoading(true);
    }
  }, [historyIndex, browserHistory]);

  const doSearch = useCallback(async (query) => {
    if (!query.trim()) return;
    setIsLoading(true);
    setCurrentUrl('');
    setActiveSource(null);
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

  const renderMainContent = () => {
    if (activeView === 'deliverable') {
      return (
        <DeliverableBuilder
          project={project} findingCards={findingCards} socket={socket}
          deliverableContent={deliverableContent}
        />
      );
    }
    if (activeView === 'summary') {
      return (
        <DocumentView
          document={document} docItems={docItems} socket={socket} user={user}
          onNavigate={(url) => { navigate(url); }}
        />
      );
    }
    if (activeSource?.type === 'pdf') {
      return <PDFViewer source={activeSource} socket={socket} user={user} />;
    }
    if (activeSource?.type === 'image') {
      return <ImageViewer source={activeSource} socket={socket} user={user} />;
    }
    return (
      <BrowserView
        currentUrl={currentUrl} isLoading={isLoading} searchResults={searchResults}
        onNavigate={navigate} onLoadComplete={() => setIsLoading(false)}
        iframeRef={iframeRef} comments={comments} participants={participants}
        user={user} onComment={handleComment} onAddToDoc={handleAddToDoc}
        onSaveToFolder={handleSaveToFolder} folders={folders} socket={socket}
        currentTitle={currentTitle} setCurrentTitle={setCurrentTitle}
        deliverableType={project.deliverableType}
      />
    );
  };

  const renderSidebar = () => {
    if (sidebarTab === 'library') {
      return (
        <SourceLibrary
          sources={sources} socket={socket} user={user}
          projectId={project.id} onOpenSource={openSource}
          deliverableType={project.deliverableType}
        />
      );
    }
    if (sidebarTab === 'sessions') {
      return (
        <ResearchSessionsPanel
          sessions={researchSessions} socket={socket} user={user}
          projectId={project.id}
        />
      );
    }
    return (
      <Sidebar
        folders={folders} participants={participants} user={user}
        socket={socket} onNavigate={navigate} navigations={navigations}
        currentUrl={currentUrl} activeFolder={activeFolder}
        onActiveFolderChange={setActiveFolder} sessionId={project.id}
      />
    );
  };

  const renderRightPanel = () => {
    if (rightPanel === 'findings') {
      return (
        <FindingCardsPanel
          findingCards={findingCards} socket={socket} user={user}
          deliverableType={project.deliverableType}
        />
      );
    }
    if (rightPanel === 'context') {
      return (
        <ContextPanel
          sources={sources} findingCards={findingCards} annotations={annotations}
          project={project}
        />
      );
    }
    return (
      <RightPanel
        activeTab={rightPanel === 'comments' ? 'comments' : 'messages'}
        onTabChange={(tab) => { setRightPanel(tab); if (tab === 'messages') setUnreadMessages(0); }}
        messages={messages} comments={comments} participants={participants}
        user={user} socket={socket} currentUrl={currentUrl}
        onNavigate={navigate} typingUsers={typingUsers} onAddToDoc={handleAddToDoc}
        unreadMessages={unreadMessages}
      />
    );
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden" id="main-content" role="main">
      <TopBar
        currentUrl={currentUrl} isLoading={isLoading} connected={connected}
        project={project} participants={participants} activeView={activeView}
        onViewChange={setActiveView} onNavigate={navigate} onSearch={doSearch}
        onBack={goBack} onForward={goForward}
        canGoBack={historyIndex > 0} canGoForward={historyIndex < browserHistory.length - 1}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
        onToggleAccessibility={() => setShowAccessibility(!showAccessibility)}
        onExport={() => setShowExport(true)}
        onAdmin={() => setShowAdmin(true)}
        onBackToDashboard={onBackToDashboard}
        user={user} navigations={navigations} socket={socket}
        rightPanel={rightPanel} onRightPanelChange={setRightPanel}
        sidebarTab={sidebarTab} onSidebarTabChange={setSidebarTab}
      />

      <div className="flex-1 flex overflow-hidden">
        {showSidebar && (
          <aside className="w-72 border-r border-slate-100 flex flex-col flex-shrink-0 bg-white">
            {renderSidebar()}
          </aside>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {renderMainContent()}
        </div>

        {showRightPanel && (
          <aside className="w-80 border-l border-slate-100 flex flex-col flex-shrink-0 bg-white">
            {renderRightPanel()}
          </aside>
        )}
      </div>

      {showAccessibility && <AccessibilityPanel onClose={() => setShowAccessibility(false)} />}
      {showExport && (
        <ExportPanel
          project={project} findingCards={findingCards}
          deliverableContent={deliverableContent}
          onClose={() => setShowExport(false)}
        />
      )}
      {showAdmin && <AdminPanel project={project} user={user} onClose={() => setShowAdmin(false)} />}
    </div>
  );
}

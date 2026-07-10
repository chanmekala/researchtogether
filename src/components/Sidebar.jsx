import React, { useState } from 'react';
import {
  Folder, FolderPlus, ChevronRight, ChevronDown, Globe,
  Trash2, Users, Star, X, Plus, UserPlus, Copy, Check, Search, Clock
} from 'lucide-react';

function FolderItem({ folder, depth = 0, expandedFolders, toggleFolder, onNavigate, currentUrl, socket, user }) {
  const isExpanded = expandedFolders[folder.id];
  const [showQueries, setShowQueries] = useState(false);
  return (
    <div role="treeitem" className="animate-fadeIn">
      <button onClick={() => toggleFolder(folder.id)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all group text-left"
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        aria-expanded={isExpanded}>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-300" /> : <ChevronRight className="w-4 h-4 text-slate-300" />}
        <Folder className="w-4 h-4" style={{ color: folder.color }} />
        <span className="flex-1 text-sm text-slate-700 font-medium truncate">{folder.name}</span>
        <span className="text-xs text-slate-300 font-medium">{folder.links.length}</span>
        {(folder.queries || []).length > 0 && (
          <button onClick={(e) => { e.stopPropagation(); setShowQueries(!showQueries); }}
            className="p-1 rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
            aria-label="Toggle search history" data-tooltip="Search history">
            <Clock className="w-3.5 h-3.5" />
          </button>
        )}
        {folder.id !== 'default' && (
          <button onClick={(e) => { e.stopPropagation(); socket?.emit('delete-folder', { folderId: folder.id }); }}
            className="hidden group-hover:flex p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
            aria-label={`Delete ${folder.name}`}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </button>

      {isExpanded && (
        <div className="ml-4 pl-4 border-l border-slate-100">
          {/* Queries - collapsed behind icon, shown when showQueries is true */}
          {showQueries && (folder.queries || []).length > 0 && (
            <div className="mb-1 animate-fadeIn">
              <div className="flex items-center gap-1.5 px-3 py-1 mb-0.5">
                <Clock className="w-3 h-3 text-slate-300" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Search History</span>
              </div>
              {(folder.queries || []).slice(-5).reverse().map((q, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-indigo-600 cursor-pointer rounded-lg hover:bg-indigo-50/50 transition-all">
                  <Search className="w-3 h-3" />
                  <span className="truncate">"{q.query}"</span>
                  <span className="ml-auto text-[10px] text-slate-300">{q.userName?.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          )}

          {/* Links */}
          {folder.links.map((link) => (
            <div key={link.id}
              className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all ${
                currentUrl === link.url ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'
              }`}
              onClick={() => onNavigate(link.url)} role="link" tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onNavigate(link.url)}>
              {link.starred ? (
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-600 truncate">{link.title || link.url}</p>
                <p className="text-[11px] text-slate-300">{link.addedBy}</p>
              </div>
              <div className="hidden group-hover:flex items-center gap-0.5">
                <button onClick={(e) => { e.stopPropagation(); socket?.emit('toggle-star-link', { folderId: folder.id, linkId: link.id }); }}
                  className="p-1 rounded-lg text-slate-300 hover:text-amber-500 hover:bg-amber-50" aria-label="Star">
                  <Star className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); socket?.emit('remove-link-from-folder', { folderId: folder.id, linkId: link.id }); }}
                  className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50" aria-label="Remove">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {folder.links.length === 0 && !(folder.queries || []).length && (
            <p className="text-xs text-slate-300 px-3 py-2">No links saved yet</p>
          )}

          {/* Subfolders */}
          {(folder.subfolders || []).map(sub => (
            <FolderItem key={sub.id} folder={sub} depth={depth + 1}
              expandedFolders={expandedFolders} toggleFolder={toggleFolder}
              onNavigate={onNavigate} currentUrl={currentUrl} socket={socket} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  folders, participants, user, socket, onNavigate, navigations,
  currentUrl, activeFolder, onActiveFolderChange, sessionId
}) {
  const [expandedFolders, setExpandedFolders] = useState({ default: true });
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#6366f1');
  const [parentFolderId, setParentFolderId] = useState(null);

  const FOLDER_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

  const toggleFolder = (id) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
    onActiveFolderChange(id);
  };

  const createFolder = (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    socket?.emit('create-folder', { name: newFolderName.trim(), color: newFolderColor, parentId: parentFolderId });
    setNewFolderName(''); setShowNewFolder(false); setParentFolderId(null);
  };

  const onlineCount = participants.filter(p => p.online).length;

  return (
    <aside className="w-72 bg-white border-r border-slate-100 flex flex-col overflow-hidden flex-shrink-0"
      role="complementary" aria-label="Research sidebar">

      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-800">Research Folders</h2>
          <button onClick={() => { setShowNewFolder(!showNewFolder); setParentFolderId(null); }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
            aria-label="Create new folder">
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        {/* New folder form */}
        {showNewFolder && (
          <form onSubmit={createFolder} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
            <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..." autoFocus
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 mb-2"
              aria-label="Folder name" />
            <div className="flex items-center gap-1.5 mb-3">
              {FOLDER_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setNewFolderColor(c)}
                  className={`w-6 h-6 rounded-full transition-all ${newFolderColor === c ? 'ring-2 ring-offset-2 ring-indigo-400 scale-110' : ''}`}
                  style={{ backgroundColor: c }} aria-label={`Color`} />
              ))}
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 px-3 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all">Create</button>
              <button type="button" onClick={() => setShowNewFolder(false)} className="px-3 py-2 text-sm text-slate-400 hover:text-slate-600">Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* Folder tree */}
      <div className="flex-1 overflow-y-auto p-3" role="tree">
        {folders.map((folder) => (
          <FolderItem key={folder.id} folder={folder}
            expandedFolders={expandedFolders} toggleFolder={toggleFolder}
            onNavigate={onNavigate} currentUrl={currentUrl} socket={socket} user={user} />
        ))}
      </div>

      {/* Team section at bottom */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Team ({onlineCount} online)</h3>
        </div>
        <div className="space-y-1">
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-50 transition-all">
              <div className="relative">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: p.color }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${p.online ? 'bg-emerald-400' : 'bg-slate-300'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-700 font-medium truncate">
                  {p.name} {p.id === user.id ? '(you)' : ''}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {p.online ? (navigations[p.id] ? `Browsing` : 'Online') : 'Offline'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle, StickyNote, Send, Globe, Check, FileText,
  ChevronDown, ChevronRight, CheckCircle2, Reply, MoreHorizontal
} from 'lucide-react';

export default function RightPanel({
  activeTab, onTabChange, messages, comments, participants,
  user, socket, currentUrl, onNavigate, typingUsers, onAddToDoc,
  unreadMessages = 0
}) {
  const [messageText, setMessageText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [expandedComments, setExpandedComments] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    socket?.emit('send-message', { text: messageText.trim() });
    socket?.emit('typing', { isTyping: false });
    setMessageText('');
  };

  const handleTyping = (val) => {
    setMessageText(val);
    socket?.emit('typing', { isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socket?.emit('typing', { isTyping: false }), 2000);
  };

  const sendReply = (url, commentId) => {
    if (!replyText.trim()) return;
    socket?.emit('reply-to-comment', { url, commentId, text: replyText.trim() });
    setReplyText('');
    setReplyingTo(null);
  };

  const resolveComment = (url, commentId) => {
    socket?.emit('resolve-comment', { url, commentId });
  };

  const addCommentToDoc = (comment, url) => {
    socket?.emit('add-to-doc', {
      url, commentId: comment.id,
      text: comment.text, highlightText: comment.highlightText,
      pageTitle: comment.pageTitle
    });
  };

  // Flatten all comments across all URLs
  const allComments = Object.entries(comments).flatMap(([url, cmts]) =>
    (cmts || []).map(c => ({ ...c, url }))
  ).sort((a, b) => b.timestamp - a.timestamp);

  const unresolvedCount = allComments.filter(c => !c.resolved).length;
  const typingNames = Object.values(typingUsers).filter(n => n !== user.name);

  return (
    <aside className="w-80 bg-white border-l border-slate-100 flex flex-col overflow-hidden flex-shrink-0"
      role="complementary" aria-label="Collaboration panel">
      {/* Tabs */}
      <div className="flex border-b border-slate-100" role="tablist" aria-label="Panel tabs">
        {[
          { id: 'comments', icon: StickyNote, label: 'Notes', count: unresolvedCount },
          { id: 'messages', icon: MessageCircle, label: 'Messages', count: activeTab === 'messages' ? 0 : unreadMessages },
        ].map(({ id, icon: Icon, label, count }) => (
          <button key={id} role="tab" aria-selected={activeTab === id} onClick={() => onTabChange(id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-semibold transition-all relative ${
              activeTab === id
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30'
                : 'text-slate-400 hover:text-slate-600'
            }`}>
            <Icon className="w-4 h-4" />
            {label}
            {count > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* COMMENTS/NOTES TAB */}
        {activeTab === 'comments' && (
          <div className="p-4" role="tabpanel" aria-label="Research notes and comments">
            {allComments.length === 0 ? (
              <div className="text-center py-16">
                <StickyNote className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">No notes yet</p>
                <p className="text-xs text-slate-300 mt-1.5 max-w-[200px] mx-auto">
                  Highlight text on any page to leave comments or add to your research summary.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allComments.map((c) => {
                  const p = participants.find(pp => pp.id === c.userId);
                  const isExpanded = expandedComments[c.id];
                  return (
                    <div key={c.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        c.resolved ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}>
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: c.userColor || p?.color || '#6366f1' }}>
                          {c.userName?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{c.userName}</span>
                        <span className="text-[10px] text-slate-300 ml-auto">
                          {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Highlight text */}
                      {c.highlightText && (
                        <div className="px-3 py-2 bg-amber-50 border-l-2 border-amber-300 rounded-lg mb-2 text-xs text-amber-800 italic">
                          "{c.highlightText}"
                        </div>
                      )}

                      {/* Comment text */}
                      <p className="text-sm text-slate-700 mb-2">{c.text}</p>

                      {/* Source */}
                      <button onClick={() => onNavigate(c.url)}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 transition-colors mb-2">
                        <Globe className="w-3 h-3" />
                        <span className="truncate max-w-[180px]">{c.pageTitle || c.url}</span>
                      </button>

                      {/* Actions */}
                      <div className="flex items-center gap-1 pt-2 border-t border-slate-100">
                        <button onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                          <Reply className="w-3 h-3" /> Reply {c.replies?.length > 0 && `(${c.replies.length})`}
                        </button>
                        <button onClick={() => resolveComment(c.url, c.id)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                            c.resolved ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}>
                          <CheckCircle2 className="w-3 h-3" /> {c.resolved ? 'Resolved' : 'Resolve'}
                        </button>
                        {!c.addedToDoc && (
                          <button onClick={() => addCommentToDoc(c, c.url)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all ml-auto">
                            <FileText className="w-3 h-3" /> To Summary
                          </button>
                        )}
                        {c.addedToDoc && (
                          <span className="text-[10px] text-emerald-500 ml-auto flex items-center gap-1">
                            <Check className="w-3 h-3" /> In Summary
                          </span>
                        )}
                      </div>

                      {/* Replies */}
                      {c.replies?.length > 0 && (
                        <div className="mt-2 pl-4 border-l-2 border-slate-100 space-y-2">
                          {c.replies.map(r => (
                            <div key={r.id} className="flex items-start gap-2">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white mt-0.5"
                                style={{ backgroundColor: r.userColor || '#6366f1' }}>
                                {r.userName?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-[11px] font-semibold text-slate-600">{r.userName}</span>
                                <p className="text-xs text-slate-600">{r.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply form */}
                      {replyingTo === c.id && (
                        <div className="mt-2 flex gap-2">
                          <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            onKeyDown={(e) => e.key === 'Enter' && sendReply(c.url, c.id)} autoFocus />
                          <button onClick={() => sendReply(c.url, c.id)}
                            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MESSAGES TAB (renamed from Chat) */}
        {activeTab === 'messages' && (
          <div className="flex flex-col h-full" role="tabpanel" aria-label="Team messages">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <MessageCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">No messages yet</p>
                  <p className="text-xs text-slate-300 mt-1.5">Send updates to your research team.</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const isMe = msg.userId === user.id;
                const p = participants.find(pp => pp.id === msg.userId);
                return (
                  <div key={i} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
                    role="article" aria-label={`${msg.userName}: ${msg.text}`}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: msg.userColor || p?.color || '#6366f1' }}>
                      {msg.userName?.charAt(0).toUpperCase()}
                    </div>
                    <div className={`max-w-[75%] ${isMe ? 'items-end' : ''}`}>
                      <div className={`px-4 py-2.5 text-sm ${
                        isMe
                          ? 'bg-indigo-600 text-white msg-bubble-mine'
                          : 'bg-slate-100 text-slate-700 msg-bubble-other'
                      }`}>
                        {!isMe && <p className="text-[11px] font-semibold mb-0.5 opacity-70">{msg.userName}</p>}
                        <p>{msg.text}</p>
                      </div>
                      <p className={`text-[10px] text-slate-300 mt-1 ${isMe ? 'text-right' : ''}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {typingNames.length > 0 && (
                <div className="flex items-center gap-2 px-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-slate-400">{typingNames.join(', ')} typing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-slate-100">
              <div className="flex gap-2">
                <input type="text" value={messageText}
                  onChange={(e) => handleTyping(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  aria-label="Message" />
                <button type="submit" disabled={!messageText.trim()}
                  className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  aria-label="Send message">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}

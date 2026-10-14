import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import GroupInfoPanel from '../components/GroupInfoPanel';

const ChatPage = () => {
  const { user } = useAuth();
  const { socket, isOnline } = useSocket();
  const { conversationId: paramConvId } = useParams();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedByThem, setBlockedByThem] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  // ── NEW: per-message delete menu ──
  const [activeMsgMenu, setActiveMsgMenu] = useState(null);
  const [deletingMsgId, setDeletingMsgId] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const msgMenuRef = useRef(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
      .font-bebas { font-family: 'Bebas Neue', cursive !important; }
      @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      @keyframes shimmer { from{background-position:-200% center} to{background-position:200% center} }
      @keyframes msgIn { from{opacity:0;transform:translateY(10px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      @keyframes typingDot { 0%,100%{transform:translateY(0);opacity:0.4} 50%{transform:translateY(-4px);opacity:1} }
      @keyframes blob { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-50px) scale(1.1)} 66%{transform:translate(-20px,20px) scale(0.9)} 100%{transform:translate(0,0) scale(1)} }
      .animate-blob { animation: blob 7s infinite; }
      .animate-fadeUp-1 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.05s forwards; opacity:0; }
      .animate-fadeUp-2 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s forwards; opacity:0; }
      .shimmer-text { background:linear-gradient(90deg,var(--shimmer-color)); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; animation:shimmer 3s linear infinite; }
      .grid-dots { background-image:radial-gradient(circle,var(--glass-05,rgba(255,255,255,0.05)) 1px,transparent 1px); background-size:28px 28px; }

      .conv-item { padding:14px 16px; border-radius:16px; cursor:pointer; transition:all 0.2s; border:1px solid transparent; }
      .conv-item:hover { background:var(--glass-04,rgba(255,255,255,0.04)); border-color:var(--glass-06,rgba(255,255,255,0.06)); }
      .conv-item.active { background:rgba(74,222,128,0.08); border-color:rgba(74,222,128,0.2); }

      .msg-bubble-mine { background:linear-gradient(135deg,#4ade80,#22c55e); color:black; border-radius:18px 18px 4px 18px; padding:10px 14px; font-size:14px; font-weight:500; white-space:pre-wrap; word-break:normal; overflow-wrap:anywhere; line-height:1.5; box-shadow:0 4px 15px rgba(74,222,128,0.25); }
      .msg-bubble-other { background:var(--glass-04,rgba(255,255,255,0.04)); border:1px solid var(--glass-08,rgba(255,255,255,0.08)); color:var(--text-main); border-radius:18px 18px 18px 4px; padding:10px 14px; font-size:14px; white-space:pre-wrap; word-break:normal; overflow-wrap:anywhere; line-height:1.5; }
      .msg-bubble-deleted { font-style:italic; opacity:0.55; }

      .typing-dot { width:6px; height:6px; background:rgba(255,255,255,0.4); border-radius:50%; display:inline-block; }
      .typing-dot:nth-child(1) { animation:typingDot 1.2s ease-in-out 0s infinite; }
      .typing-dot:nth-child(2) { animation:typingDot 1.2s ease-in-out 0.2s infinite; }
      .typing-dot:nth-child(3) { animation:typingDot 1.2s ease-in-out 0.4s infinite; }

      .send-btn { width:44px; height:44px; background:linear-gradient(135deg,#4ade80,#22c55e); border-radius:14px; display:flex; align-items:center; justify-content:center; transition:all 0.2s; flex-shrink:0; border:none; cursor:pointer; }
      .send-btn:hover { transform:scale(1.05); box-shadow:0 4px 15px rgba(74,222,128,0.3); }
      .send-btn:disabled { opacity:0.4; transform:none; cursor:not-allowed; }

      .chat-input { flex:1; background:var(--glass-04,rgba(255,255,255,0.04)); border:1px solid var(--glass-08,rgba(255,255,255,0.08)); border-radius:14px; padding:12px 16px; color:var(--text-main); font-size:14px; outline:none; transition:all 0.3s; resize:none; font-family:'DM Sans',sans-serif; min-height:44px; max-height:120px; }
      .chat-input:focus { border-color:rgba(74,222,128,0.4); background:var(--glass-06,rgba(255,255,255,0.06)); }
      .chat-input::placeholder { color:var(--glass-20,rgba(255,255,255,0.2)); }

      .search-input { width:100%; background:var(--glass-05); border:1px solid var(--glass-06,rgba(255,255,255,0.06)); border-radius:12px; padding:10px 14px; color:var(--text-main); font-size:13px; outline:none; transition:all 0.3s; font-family:'DM Sans',sans-serif; }
      .search-input:focus { border-color:rgba(74,222,128,0.3); }
      .search-input::placeholder { color:var(--glass-20,rgba(255,255,255,0.2)); }

      .online-dot { width:10px; height:10px; background:#4ade80; border-radius:50%; border:2px solid #060606; position:absolute; bottom:0; right:0; }
      .offline-dot { width:10px; height:10px; background:#6b7280; border-radius:50%; border:2px solid #060606; position:absolute; bottom:0; right:0; }

      .avatar-sm { width:42px; height:42px; border-radius:50%; object-fit:cover; flex-shrink:0; }
      .avatar-initial { width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px; flex-shrink:0; background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.2); color:#4ade80; }
      .msg-avatar { width:28px; height:28px; border-radius:50%; object-fit:cover; flex-shrink:0; }
      .msg-avatar-initial { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px; flex-shrink:0; background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.15); color:#4ade80; }

      .messages-container { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:4px; scroll-behavior:smooth; }
      .messages-container::-webkit-scrollbar { width:4px; }
      .messages-container::-webkit-scrollbar-track { background:transparent; }
      .messages-container::-webkit-scrollbar-thumb { background:var(--glass-10,rgba(255,255,255,0.1)); border-radius:2px; }

      .conv-list { overflow-y:auto; flex:1; }
      .conv-list::-webkit-scrollbar { width:4px; }
      .conv-list::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:2px; }

      .unread-badge { background:#4ade80; color:black; font-size:10px; font-weight:700; min-width:18px; height:18px; border-radius:100px; display:flex; align-items:center; justify-content:center; padding:0 5px; }

      .date-divider { display:flex; align-items:center; gap:12px; margin:12px 0; }
      .date-divider::before,.date-divider::after { content:''; flex:1; height:1px; background:var(--glass-06,rgba(255,255,255,0.06)); }

      .empty-chat { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; color:var(--glass-20,rgba(255,255,255,0.2)); }

      .chat-menu { position:absolute; right:0; top:40px; background:#1a1a1a; border:1px solid var(--glass-10,rgba(255,255,255,0.1)); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.5); z-index:50; min-width:170px; overflow:hidden; animation:fadeUp 0.2s ease forwards; }
      .chat-menu button { width:100%; display:flex; align-items:center; gap:10px; padding:11px 16px; font-size:13px; transition:all 0.15s; border:none; background:none; cursor:pointer; }
      .chat-menu button:hover { background:var(--glass-05,rgba(255,255,255,0.05)); }

      .blocked-banner { display:flex; align-items:center; justify-content:center; gap:12px; padding:16px 20px; border-top:1px solid var(--glass-06,rgba(255,255,255,0.06)); background:rgba(0,0,0,0.1); }
      .unblock-btn { font-size:12px; color:#4ade80; border:1px solid rgba(74,222,128,0.3); padding:5px 14px; border-radius:8px; background:none; cursor:pointer; transition:all 0.2s; }
      .unblock-btn:hover { background:rgba(74,222,128,0.1); }

      .group-info-btn { display:flex; align-items:center; gap:4px; border-radius:12px; padding:6px 10px; cursor:pointer; transition:all 0.2s; border:1px solid transparent; background:none; }
      .group-info-btn:hover { background:rgba(74,222,128,0.06); border-color:rgba(74,222,128,0.15); }
      .group-info-btn.active { background:rgba(74,222,128,0.08); border-color:rgba(74,222,128,0.2); }

      /* ── NEW: pinned Global Chat entry ── */
      .global-chat-item { padding:14px 16px; border-radius:16px; cursor:pointer; transition:all 0.2s; border:1px solid rgba(74,222,128,0.18); background:rgba(74,222,128,0.05); margin-bottom:8px; }
      .global-chat-item:hover { background:rgba(74,222,128,0.09); border-color:rgba(74,222,128,0.3); }
      .global-chat-item.active { background:rgba(74,222,128,0.14); border-color:rgba(74,222,128,0.4); }
      .pin-badge { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; padding:2px 7px; border-radius:100px; background:rgba(74,222,128,0.15); color:#4ade80; border:1px solid rgba(74,222,128,0.25); display:inline-flex; align-items:center; gap:3px; }

      /* ── NEW: per-message delete controls ── */
      .msg-row { position:relative; }
      .msg-actions-btn { opacity:0; width:24px; height:24px; border-radius:7px; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; color:var(--text-muted,rgba(120,120,120,0.6)); transition:all 0.15s; flex-shrink:0; font-size:16px; line-height:1; padding-bottom:6px; }
      .msg-row:hover .msg-actions-btn, .msg-actions-btn.open { opacity:1; }
      .msg-actions-btn:hover { background:var(--glass-08,rgba(255,255,255,0.08)); color:var(--text-main); }
      .msg-menu { position:absolute; top:0; z-index:60; background:#1a1a1a; border:1px solid var(--glass-10,rgba(255,255,255,0.1)); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.5); min-width:190px; overflow:hidden; animation:fadeUp 0.15s ease forwards; }
      .msg-menu button { width:100%; text-align:left; display:flex; align-items:center; gap:10px; padding:11px 16px; font-size:13px; background:none; border:none; cursor:pointer; color:var(--text-main); transition:all 0.15s; }
      .msg-menu button:hover { background:var(--glass-05,rgba(255,255,255,0.05)); }
      .msg-menu button.danger { color:#f87171; }

      /* ── NEW: full-bleed, WhatsApp-style shell ── */
      .chat-shell { border-right:1px solid var(--glass-06,rgba(255,255,255,0.06)); }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await API.get('/chat/conversations');
      setConversations(data);
    } catch { setConversations([]); }
  }, []);

  useEffect(() => { fetchConversations(); }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (msgMenuRef.current && !msgMenuRef.current.contains(e.target)) setActiveMsgMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!activeConv || activeConv.type !== 'direct') {
      setIsBlocked(false); setBlockedByThem(false); return;
    }
    setShowGroupInfo(false); // ← reset panel on conv change
    const checkBlock = async () => {
      try {
        const other = getOtherUser(activeConv);
        if (!other) return;
        const { data } = await API.get('/users/blocked');
        setIsBlocked(data.some(u => u._id === other._id));
        setBlockedByThem(false);
      } catch { setIsBlocked(false); setBlockedByThem(false); }
    };
    checkBlock();
    setMenuOpen(false);
  }, [activeConv?._id]);

  useEffect(() => {
    if (!activeConv) return;
    loadMessages(activeConv._id);
    if (socket) {
      socket.emit('join_conversation', activeConv._id);
      socket.emit('mark_read', { conversationId: activeConv._id });
    }
    setShowGroupInfo(false); // ← close panel when switching chats
    setActiveMsgMenu(null);
    return () => { if (socket) socket.emit('leave_conversation', activeConv._id); };
  }, [activeConv?._id, socket]);

  useEffect(() => {
    if (paramConvId && conversations.length > 0) {
      const conv = conversations.find(c => c._id === paramConvId);
      if (conv) setActiveConv(conv);
    }
  }, [paramConvId, conversations]);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_message', (message) => {
      if (message.conversation === activeConv?._id) {
        setMessages(prev => [...prev, message]);
        socket.emit('mark_read', { conversationId: activeConv._id });
      }
      fetchConversations();
    });
    socket.on('user_typing', ({ userId: uid, name, conversationId }) => {
      if (conversationId === activeConv?._id && uid !== user._id)
        setTypingUsers(prev => [...new Set([...prev, name])]);
    });
    socket.on('user_stopped_typing', ({ conversationId }) => {
      if (conversationId === activeConv?._id) setTypingUsers([]);
    });
    // ── NEW: real-time "deleted for everyone" updates ──
    socket.on('message_deleted', ({ messageId, conversationId, forEveryone }) => {
      if (conversationId === activeConv?._id && forEveryone) {
        setMessages(prev => prev.map(m =>
          m._id === messageId ? { ...m, deletedForEveryone: true, text: 'This message was deleted' } : m
        ));
      }
    });
    return () => {
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
      socket.off('message_deleted');
    };
  }, [socket, activeConv?._id, user._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const loadMessages = async (conversationId) => {
    setLoading(true);
    try { const { data } = await API.get(`/chat/${conversationId}/messages`); setMessages(data); }
    catch { setMessages([]); }
    finally { setLoading(false); }
  };

  const handleBlock = async () => {
    const other = getOtherUser(activeConv);
    if (!other || !window.confirm(`Block ${other.name}?`)) return;
    setBlockLoading(true);
    try { await API.post(`/users/block/${other._id}`); setIsBlocked(true); setMenuOpen(false); }
    catch { alert('Failed'); }
    setBlockLoading(false);
  };

  const handleUnblock = async () => {
    const other = getOtherUser(activeConv);
    if (!other) return;
    setBlockLoading(true);
    try { await API.post(`/users/unblock/${other._id}`); setIsBlocked(false); }
    catch { alert('Failed'); }
    setBlockLoading(false);
  };

  const handleSend = () => {
    if (!text.trim() || !activeConv || !socket || isBlocked || blockedByThem) return;
    socket.emit('send_message', { conversationId: activeConv._id, text: text.trim() });
    setText('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('typing_stop', { conversationId: activeConv._id });
    inputRef.current?.focus();
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!socket || !activeConv) return;
    socket.emit('typing_start', { conversationId: activeConv._id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { conversationId: activeConv._id });
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── NEW: delete a message ("for me" hides locally, "for everyone" replaces for all) ──
  const handleDeleteMessage = async (msg, forEveryone) => {
    setDeletingMsgId(msg._id);
    try {
      await API.delete(`/chat/message/${msg._id}`, { data: { forEveryone } });
      if (forEveryone) {
        setMessages(prev => prev.map(m =>
          m._id === msg._id ? { ...m, deletedForEveryone: true, text: 'This message was deleted' } : m
        ));
      } else {
        setMessages(prev => prev.filter(m => m._id !== msg._id));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete message');
    } finally {
      setDeletingMsgId(null);
      setActiveMsgMenu(null);
    }
  };

  /* ── helpers ── */
  const getConvName = (conv) => {
    if (conv.type === 'global') return 'Global Chat';
    if (conv.type === 'group') return conv.group?.name || 'Group Chat';
    return conv.participants?.find(p => p._id !== user._id)?.name || 'Unknown';
  };
  const getConvAvatar = (conv) => {
    if (conv.type === 'group' || conv.type === 'global') return null;
    return conv.participants?.find(p => p._id !== user._id)?.avatar || null;
  };
  const getConvInitial = (conv) => getConvName(conv)?.charAt(0)?.toUpperCase();
  const getOtherUser = (conv) => {
    if (conv?.type === 'group') return null;
    return conv?.participants?.find(p => p._id !== user._id);
  };
  const getUnread = (conv) =>
    conv.unreadCount?.get ? conv.unreadCount.get(user._id) || 0 : conv.unreadCount?.[user._id] || 0;
  const getSportEmoji = (sport) => {
    const map = { football:'⚽', cricket:'🏏', basketball:'🏀', tennis:'🎾', badminton:'🏸', volleyball:'🏐', boxing:'🥊', hockey:'🏑', kabaddi:'🤼', Kabbadi:'🤼', 'kho kho':'🏃', pickleball:'🏓', 'table tennis':'🏓', squash:'🎾', handball:'🤾', futsal:'⚽', rugby:'🏉', athletics:'🏃', wrestling:'🤼', weightlifting:'🏋️', yoga:'🧘', skating:'⛸️', chess:'♟️', carrom:'🎯', archery:'🏹', shooting:'🎯', cycling:'🚴', 'box cricket':'🏏', 'box football':'⚽', esports:'🎮' };
    return map[sport] || map[sport?.toLowerCase?.()] || '🏆';
  };
  const formatTime = (date) =>
    new Date(date).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true });
  const formatDate = (date) => {
    const d = new Date(date), today = new Date(), yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
  };
  const groupMessagesByDate = (msgs) => {
    const groups = []; let currentDate = null;
    msgs.forEach(msg => {
      const d = formatDate(msg.createdAt);
      if (d !== currentDate) { groups.push({ type:'date', date:d }); currentDate = d; }
      groups.push({ type:'message', data:msg });
    });
    return groups;
  };

  // Deduplicate participants for display
  const getUniqueParticipants = (conv) => {
    if (!conv?.participants) return [];
    const seen = new Set();
    return conv.participants.filter(p => {
      const id = p._id?.toString();
      if (seen.has(id)) return false;
      seen.add(id); return true;
    });
  };

  const globalConv = conversations.find(c => c.type === 'global');
  const filteredConversations = conversations
    .filter(conv => conv.type !== 'global')
    .filter(conv => getConvName(conv).toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white flex flex-col relative overflow-hidden" style={{ fontFamily:'DM Sans, sans-serif' }}>
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-20" />
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-green-500/20 rounded-full blur-[100px] animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-blob" style={{ animationDelay:'2s', animationDuration:'8s' }} />
        <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] bg-emerald-500/10 rounded-full blur-[100px] animate-blob" style={{ animationDelay:'4s', animationDuration:'10s' }} />
      </div>

      <Navbar />

      {/* ── Full-bleed chat shell — fills the entire screen below the navbar ── */}
      <div className="flex flex-1 overflow-hidden relative z-10 w-full animate-fadeUp-1">
        <div className="flex flex-1 w-full h-full overflow-hidden bg-white/40 dark:bg-black/40 backdrop-blur-3xl">

          {/* ── Sidebar ── */}
          <div className={`chat-shell flex flex-col bg-black/2 dark:bg-white/2 ${activeConv ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] flex-shrink-0`}>
            <div className="p-4 border-b border-black/6 dark:border-white/6">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search conversations..." className="search-input" />
            </div>

            <div className="conv-list p-2">
              {/* ── Pinned Global Chat — everyone on the platform, one shared room ── */}
              {globalConv && (
                <div
                  onClick={() => { setActiveConv(globalConv); navigate(`/chat/${globalConv._id}`); }}
                  className={`global-chat-item animate-fadeUp-1 ${activeConv?._id === globalConv._id ? 'active' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="avatar-initial" style={{ background:'rgba(74,222,128,0.12)', borderColor:'rgba(74,222,128,0.3)', color:'#4ade80' }}>🌍</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Global Chat</p>
                        <span className="pin-badge">📌 Pinned</span>
                      </div>
                      <p className="text-gray-600 text-xs truncate mt-0.5">
                        {globalConv.lastMessage?.text || 'Say hello to everyone on spotNplay'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
                  <span className="text-4xl">💬</span>
                  <p className="text-gray-500 text-sm">No other conversations yet</p>
                  <p className="text-gray-700 text-xs">Message someone from their profile, or say hello in Global Chat</p>
                </div>
              ) : filteredConversations.map((conv, i) => {
                  const unread = getUnread(conv);
                  const otherUser = getOtherUser(conv);
                  const online = otherUser ? isOnline(otherUser._id) : false;
                  const isActive = activeConv?._id === conv._id;
                  return (
                    <div key={conv._id} onClick={() => { setActiveConv(conv); navigate(`/chat/${conv._id}`); }}
                      className={`conv-item animate-fadeUp-1 ${isActive ? 'active' : ''}`}
                      style={{ animationDelay:`${i * 0.04}s` }}>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          {conv.type === 'group' ? (
                            <div className="avatar-initial" style={{ background:'rgba(59,130,246,0.1)', borderColor:'rgba(59,130,246,0.2)', color:'#60a5fa' }}>
                              {getSportEmoji(conv.group?.sport)}
                            </div>
                          ) : getConvAvatar(conv) ? (
                            <img src={getConvAvatar(conv)} alt="" className="avatar-sm" />
                          ) : (
                            <div className="avatar-initial">{getConvInitial(conv)}</div>
                          )}
                          {conv.type === 'direct' && <div className={online ? 'online-dot' : 'offline-dot'} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-semibold truncate ${isActive ? 'text-green-400' : 'text-gray-900 dark:text-white'}`}>
                              {getConvName(conv)}
                            </p>
                            {conv.lastMessageAt && <span className="text-gray-700 text-xs flex-shrink-0">{formatTime(conv.lastMessageAt)}</span>}
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-gray-600 text-xs truncate">
                              {conv.lastMessage?.text || (conv.type === 'group' ? `${getSportEmoji(conv.group?.sport)} Group Chat` : 'Start chatting')}
                            </p>
                            {unread > 0 && <span className="unread-badge">{unread}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* ── Chat Window ── */}
          <div className={`flex flex-col flex-1 relative ${!activeConv ? 'hidden md:flex' : 'flex'}`}>
            {!activeConv ? (
              <div className="empty-chat">
                <span className="text-6xl">💬</span>
                <p className="text-lg font-semibold">Select a conversation</p>
                <p className="text-sm text-center px-8">Pick a chat, or say hello in the pinned Global Chat</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-black/6 dark:border-white/6 bg-white/10 dark:bg-black/10 backdrop-blur-sm flex-shrink-0">
                  <button onClick={() => { setActiveConv(null); navigate('/chat'); }} className="md:hidden text-gray-500 hover:text-gray-900 dark:text-white transition-colors mr-1">←</button>

                  <div className="relative flex-shrink-0">
                    {activeConv.type === 'global' ? (
                      <div className="avatar-initial" style={{ background:'rgba(74,222,128,0.12)', borderColor:'rgba(74,222,128,0.3)', color:'#4ade80' }}>🌍</div>
                    ) : activeConv.type === 'group' ? (
                      <div className="avatar-initial" style={{ background:'rgba(59,130,246,0.1)', borderColor:'rgba(59,130,246,0.2)', color:'#60a5fa' }}>
                        {getSportEmoji(activeConv.group?.sport)}
                      </div>
                    ) : getConvAvatar(activeConv) ? (
                      <img src={getConvAvatar(activeConv)} alt="" className="avatar-sm" />
                    ) : (
                      <div className="avatar-initial">{getConvInitial(activeConv)}</div>
                    )}
                    {activeConv.type === 'direct' && (
                      <div className={isOnline(getOtherUser(activeConv)?._id) ? 'online-dot' : 'offline-dot'} />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white font-semibold text-sm">{getConvName(activeConv)}</p>
                    <p className="text-xs">
                      {activeConv.type === 'global' ? (
                        <span className="text-green-400">📌 Everyone on spotNplay — be kind</span>
                      ) : activeConv.type === 'group' ? (
                        <span className="text-gray-500">{getUniqueParticipants(activeConv).length} members</span>
                      ) : isBlocked ? (
                        <span className="text-red-400">🚫 Blocked</span>
                      ) : blockedByThem ? (
                        <span className="text-red-400">⛔ You are blocked</span>
                      ) : isOnline(getOtherUser(activeConv)?._id) ? (
                        <span className="text-green-400">● Online</span>
                      ) : (
                        <span className="text-gray-600">● Offline</span>
                      )}
                    </p>
                  </div>

                  {/* ── Group: clickable member avatars → opens info panel ── */}
                  {activeConv.type === 'global' ? null : activeConv.type === 'group' ? (
                    <button
                      onClick={() => setShowGroupInfo(s => !s)}
                      className={`group-info-btn ${showGroupInfo ? 'active' : ''}`}
                      title="View group members"
                    >
                      <div style={{ display:'flex' }}>
                        {getUniqueParticipants(activeConv).slice(0, 4).map((p, i) => (
                          p.avatar ? (
                            <img key={p._id} src={p.avatar} alt=""
                              style={{ width:28, height:28, borderRadius:'50%', border:'2px solid #060606', objectFit:'cover', marginLeft: i===0?0:-8, zIndex:i }} />
                          ) : (
                            <div key={p._id}
                              style={{ width:28, height:28, borderRadius:'50%', border:'2px solid #060606', background:'rgba(74,222,128,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#4ade80', fontWeight:700, marginLeft:i===0?0:-8, zIndex:i }}>
                              {p.name?.charAt(0)}
                            </div>
                          )
                        ))}
                      </div>
                      {getUniqueParticipants(activeConv).length > 4 && (
                        <span style={{ fontSize:11, color:'#6b7280', marginLeft:6 }}>
                          +{getUniqueParticipants(activeConv).length - 4}
                        </span>
                      )}
                      <span style={{ fontSize:13, color: showGroupInfo ? '#4ade80' : '#6b7280', marginLeft:6, transition:'color 0.2s' }}>
                        {showGroupInfo ? '✕' : 'ℹ'}
                      </span>
                    </button>
                  ) : (
                    /* ── Direct: block menu ── */
                    <div className="relative" ref={menuRef}>
                      <button onClick={() => setMenuOpen(!menuOpen)}
                        style={{ padding:'6px 10px', borderRadius:'10px', background:'none', border:'none', cursor:'pointer', fontSize:'18px', color:'rgba(255,255,255,0.4)', transition:'all 0.2s' }}
                        onMouseEnter={e => { e.target.style.background='rgba(255,255,255,0.06)'; e.target.style.color='white'; }}
                        onMouseLeave={e => { e.target.style.background='none'; e.target.style.color='rgba(255,255,255,0.4)'; }}
                      >⋮</button>
                      {menuOpen && (
                        <div className="chat-menu">
                          <button onClick={isBlocked ? handleUnblock : handleBlock} disabled={blockLoading}
                            style={{ color: isBlocked ? '#4ade80' : '#f87171' }}>
                            {blockLoading ? '⏳ Loading...' : isBlocked ? '✅ Unblock' : '🚫 Block'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="messages-container">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                      <span className="text-4xl">👋</span>
                      <p className="text-gray-500 text-sm">No messages yet — say hello!</p>
                    </div>
                  ) : (
                    groupMessagesByDate(messages).map((item, i) => {
                      if (item.type === 'date') {
                        return (
                          <div key={`date-${i}`} className="date-divider">
                            <span className="text-gray-700 text-xs">{item.date}</span>
                          </div>
                        );
                      }
                      const msg = item.data;
                      const isMine = msg.sender?._id === user._id;
                      const isDeleted = !!msg.deletedForEveryone;
                      const menuIsOpen = activeMsgMenu === msg._id;
                      return (
                        <div key={msg._id} className={`msg-row flex items-end gap-2 mb-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                          {!isMine && (
                            msg.sender?.avatar
                              ? <img src={msg.sender.avatar} alt="" className="msg-avatar mb-1" />
                              : <div className="msg-avatar-initial mb-1">{msg.sender?.name?.charAt(0)}</div>
                          )}
                          <div className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'} max-w-[80%]`}>
                            {(activeConv.type === 'group' || activeConv.type === 'global') && !isMine && (
                              <span className="text-gray-600 text-xs ml-1">{msg.sender?.name}</span>
                            )}
                            <div className="flex items-end gap-1">
                              {isMine && !isDeleted && (
                                <div className="relative" ref={menuIsOpen ? msgMenuRef : null}>
                                  <button
                                    className={`msg-actions-btn ${menuIsOpen ? 'open' : ''}`}
                                    onClick={() => setActiveMsgMenu(menuIsOpen ? null : msg._id)}
                                    disabled={deletingMsgId === msg._id}
                                    title="Message options"
                                  >⋮</button>
                                  {menuIsOpen && (
                                    <div className="msg-menu" style={{ right: 0 }}>
                                      <button onClick={() => handleDeleteMessage(msg, false)}>🗑️ Delete for me</button>
                                      <button className="danger" onClick={() => handleDeleteMessage(msg, true)}>🚫 Delete for everyone</button>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className={`${isMine ? 'msg-bubble-mine' : 'msg-bubble-other'} ${isDeleted ? 'msg-bubble-deleted' : ''}`}>
                                {isDeleted ? '🚫 This message was deleted' : msg.text}
                              </div>
                              {!isMine && !isDeleted && (
                                <div className="relative" ref={menuIsOpen ? msgMenuRef : null}>
                                  <button
                                    className={`msg-actions-btn ${menuIsOpen ? 'open' : ''}`}
                                    onClick={() => setActiveMsgMenu(menuIsOpen ? null : msg._id)}
                                    disabled={deletingMsgId === msg._id}
                                    title="Message options"
                                  >⋮</button>
                                  {menuIsOpen && (
                                    <div className="msg-menu" style={{ left: 0 }}>
                                      <button onClick={() => handleDeleteMessage(msg, false)}>🗑️ Delete for me</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="text-gray-700 text-xs mx-1">{formatTime(msg.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {typingUsers.length > 0 && (
                    <div className="flex items-end gap-2 mb-1">
                      <div className="msg-avatar-initial">{typingUsers[0]?.charAt(0)}</div>
                      <div className="msg-bubble-other flex items-center gap-1 py-3">
                        <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input / Blocked */}
                {isBlocked ? (
                  <div className="blocked-banner">
                    <span style={{ color:'var(--text-muted)', fontSize:13 }}>🚫 You blocked this user</span>
                    <button onClick={handleUnblock} disabled={blockLoading} className="unblock-btn">
                      {blockLoading ? '...' : 'Unblock'}
                    </button>
                  </div>
                ) : blockedByThem ? (
                  <div className="blocked-banner">
                    <span style={{ color:'var(--text-muted)', fontSize:13 }}>⛔ You cannot message this user</span>
                  </div>
                ) : (
                  <div className="px-4 py-4 border-t border-black/6 dark:border-white/6 bg-white/10 dark:bg-black/10 backdrop-blur-sm flex-shrink-0">
                    <div className="flex items-end gap-3">
                      <textarea ref={inputRef} value={text} onChange={handleTyping} onKeyDown={handleKeyDown}
                        placeholder="Type a message... (Enter to send)" rows={1} className="chat-input" />
                      <button onClick={handleSend} disabled={!text.trim()} className="send-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M22 2L11 13" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-gray-700 text-xs mt-2 ml-1">Enter to send · Shift+Enter for new line</p>
                  </div>
                )}

                {/* ── Group Info Panel ── slides in from right */}
                {showGroupInfo && activeConv.type === 'group' && (
                  <GroupInfoPanel
                    conv={activeConv}
                    currentUser={user}
                    onClose={() => setShowGroupInfo(false)}
                    onMemberRemoved={fetchConversations}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

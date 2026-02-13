import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Info, ChevronLeft, MessageCircle, User as UserIcon, Check, CheckCheck } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import UserDetailModal from './UserDetailModal';
import { toast } from 'react-hot-toast';

const Chats = ({ initialUserId }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const socket = useRef(null);
  const scrollRef = useRef();

  const activeChatRef = useRef(null);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const fetchConversations = async () => {
    try {
      const res = await api.get('/users/matches');
      const unreadList = JSON.parse(localStorage.getItem('unread_users') || '[]');
      const enriched = res.data.map(c => ({
        ...c,
        unread: unreadList.includes(c.user_id),
        lastMessage: c.last_message || "No messages yet"
      }));
      setConversations(enriched);
      
      if (initialUserId) {
        const target = enriched.find(c => c.user_id === initialUserId);
        if (target) setActiveChat(target);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const markAsRead = async (senderId) => {
    try {
      await api.post(`/chat/mark-read/${senderId}`);
    } catch (err) {
      console.error("Failed to mark messages as read", err);
    }
  };

  useEffect(() => {
    fetchConversations();
    window.addEventListener('unreadUpdated', fetchConversations);
    
    const handleRelationUpdate = (e) => {
      const blockedId = e.detail.blockedId;
      if (activeChatRef.current?.user_id === blockedId) {
        setActiveChat(null);
        setMessages([]);
        toast.error("Conversation no longer available");
      }
      setConversations(prev => prev.filter(c => c.user_id !== blockedId));
    };

    window.addEventListener('relationUpdated', handleRelationUpdate);
    return () => {
      window.removeEventListener('unreadUpdated', fetchConversations);
      window.removeEventListener('relationUpdated', handleRelationUpdate);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const wsUrl = `ws://localhost:8080/chat/ws/${user.id}`;
    socket.current = new WebSocket(wsUrl);
    
    socket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const currentActive = activeChatRef.current;
      
      if (data.type === 'messages_read') {
        setMessages(prev => prev.map(m => 
          m.sender_id === user.id ? { ...m, is_read: true } : m
        ));
        return;
      }

      if (data.type === 'user_blocked') return;
      
      setConversations(prev => prev.map(conv => {
        if (conv.user_id === data.sender_id) {
          const isUnread = currentActive?.user_id !== data.sender_id;
          if (isUnread) {
            const currentUnread = JSON.parse(localStorage.getItem('unread_users') || '[]');
            if (!currentUnread.includes(data.sender_id)) {
              localStorage.setItem('unread_users', JSON.stringify([...currentUnread, data.sender_id]));
            }
          } else {
            markAsRead(data.sender_id);
          }
          return { ...conv, lastMessage: data.content, unread: isUnread };
        }
        return conv;
      }));

      if (currentActive && data.sender_id === currentActive.user_id) {
        setMessages(prev => [...prev, data]);
      }
    };

    return () => { if (socket.current) socket.current.close(); };
  }, [user?.id]);

  useEffect(() => {
    if (!activeChat) return;
    
    const currentUnread = JSON.parse(localStorage.getItem('unread_users') || '[]');
    const filtered = currentUnread.filter(id => id !== activeChat.user_id);
    localStorage.setItem('unread_users', JSON.stringify(filtered));
    setConversations(prev => prev.map(c => c.user_id === activeChat.user_id ? { ...c, unread: false } : c));
    
    markAsRead(activeChat.user_id);

    const fetchHistory = async () => {
      try {
        const res = await api.get(`/chat/conversation/${activeChat.user_id}`);
        setMessages(res.data);
      } catch (err) { console.error(err); }
    };
    fetchHistory();
  }, [activeChat?.user_id]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = () => {
    if (!inputValue.trim() || !socket.current || socket.current.readyState !== WebSocket.OPEN) return;
    const now = new Date().toISOString();
    const payload = { receiver_id: activeChat.user_id, content: inputValue };
    socket.current.send(JSON.stringify(payload));
    
    const newMsg = { 
      sender_id: user.id, 
      content: inputValue, 
      timestamp: now,
      is_read: false 
    };
    setMessages(prev => [...prev, newMsg]);
    setConversations(prev => prev.map(c => c.user_id === activeChat.user_id ? { ...c, lastMessage: inputValue } : c));
    setInputValue("");
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-spark-accent" /></div>;

  return (
    <div className="flex h-full bg-white/5 overflow-hidden">
      <div className={`w-full md:w-80 border-r border-white/5 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-white/5 font-black text-xl text-white">Chats</div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <div key={conv.user_id} onClick={() => setActiveChat(conv)} className={`flex items-center gap-4 p-4 cursor-pointer transition-all relative ${activeChat?.user_id === conv.user_id ? 'bg-spark-accent/20 border-r-4 border-spark-accent' : 'hover:bg-white/5'}`}>
              {conv.image ? (
                <img src={conv.image} className="w-12 h-12 rounded-xl object-cover shrink-0" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-white/5">
                  <UserIcon size={20} className="text-slate-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className={`truncate transition-all ${conv.unread ? 'text-white font-black' : 'text-slate-300 font-bold'}`}>{conv.full_name}</h3>
                <p className={`text-sm truncate ${conv.unread ? 'text-spark-accent font-bold' : 'text-slate-500'}`}>{conv.lastMessage}</p>
              </div>
              {conv.unread && <div className="w-2.5 h-2.5 bg-violet-500 rounded-full shadow-[0_0_8px_#8b5cf6] animate-pulse" />}
            </div>
          ))}
        </div>
      </div>

      <div className={`flex-1 flex flex-col ${!activeChat ? 'hidden md:flex items-center justify-center text-slate-500 italic' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-spark-dark/30">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setIsProfileOpen(true)}>
                <button className="md:hidden mr-2" onClick={() => setActiveChat(null)}><ChevronLeft /></button>
                {activeChat.image ? (
                  <img src={activeChat.image} className="w-10 h-10 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border border-white/10">
                    <UserIcon size={18} className="text-slate-400" />
                  </div>
                )}
                <div>
                  <h3 className="text-white font-bold group-hover:text-spark-accent transition-colors">{activeChat.full_name}</h3>
                  <span className="text-xs text-green-500 font-medium">Online</span>
                </div>
              </div>
              <button onClick={() => setIsProfileOpen(true)} className="p-2 text-slate-500 hover:text-white"><Info /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, i) => {
                const isLastMessage = i === messages.length - 1;
                const isMyMessage = msg.sender_id === user.id;

                const isLastSeen = isMyMessage && msg.is_read && 
                  !messages.slice(i + 1).some(m => m.sender_id === user.id && m.is_read);

                const isLastSent = isMyMessage && !msg.is_read && 
                  !messages.slice(i + 1).some(m => m.sender_id === user.id);

                return (
                  <div key={i} className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[75%] p-4 rounded-2xl ${
                      isMyMessage ? 'bg-spark-accent text-white rounded-tr-none' : 'bg-white/10 text-slate-100 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      {isLastMessage && <span className="text-[10px] text-slate-500">{formatTime(msg.timestamp)}</span>}
                      
                      {isLastSeen && (
                        <div className="flex items-center text-violet-400">
                          <CheckCheck size={14} />
                          <span className="text-[10px] ml-0.5 font-bold uppercase tracking-tight">Seen</span>
                        </div>
                      )}
                      
                      {isLastSent && (
                        <div className="flex items-center text-slate-600">
                          <Check size={14} />
                          <span className="text-[10px] ml-0.5 font-bold uppercase tracking-tight">Sent</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
            
            <div className="p-4 bg-spark-dark/50 border-t border-white/5 flex gap-2">
              <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Send a spark..." className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-white focus:outline-none focus:border-spark-accent" />
              <button onClick={sendMessage} className="p-4 bg-spark-accent rounded-2xl text-white shadow-lg shadow-spark-accent/20 transition-transform active:scale-95"><Send size={20} /></button>
            </div>
          </>
        ) : (
          <div className="text-center"><MessageCircle size={64} className="mx-auto opacity-10 mb-4" /><p>Select a match to start a chat</p></div>
        )}
      </div>
      {activeChat && <UserDetailModal userId={activeChat.user_id} isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />}
    </div>
  );
};

export default Chats;
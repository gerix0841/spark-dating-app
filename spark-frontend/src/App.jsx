import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Heart, Zap, Search, LogOut, MessageCircle, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import api from './api/axios';
import Login from './components/Login';
import Register from './components/Register';
import ProfileSetup from './components/ProfileSetup';
import Discovery from './components/Discovery';
import Matches from './components/Matches';
import Chats from './components/Chats';

function App() {
  const { user, logout, loading: authLoading } = useAuth();
  const [view, setView] = useState('hero');
  const [activeTab, setActiveTab] = useState('discovery');
  const [hasNewMatch, setHasNewMatch] = useState(false);
  const [selectedChatUserId, setSelectedChatUserId] = useState(null);

  useEffect(() => {
    if (!user?.id) return;

    const socket = new WebSocket(`ws://localhost:8080/chat/ws/${user.id}`);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'user_blocked') {
        window.dispatchEvent(new CustomEvent('relationUpdated', { detail: { blockedId: data.blocked_by } }));
        return;
      }

      if (data.type === 'new_message') {
        const currentUnread = JSON.parse(localStorage.getItem('unread_users') || '[]');
        if (!currentUnread.includes(data.sender_id)) {
          localStorage.setItem('unread_users', JSON.stringify([...currentUnread, data.sender_id]));
          window.dispatchEvent(new Event('unreadUpdated'));
        }

        if (activeTab !== 'chats') {
          toast.custom((t) => (
            <div
              className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-[#1e1b4b] border border-violet-500/50 shadow-2xl rounded-2xl pointer-events-auto flex p-4 ring-1 ring-black ring-opacity-5 cursor-pointer`}
              onClick={() => { setActiveTab('chats'); toast.dismiss(t.id); }}
            >
              <div className="flex-1 w-0 p-1">
                <p className="text-sm font-bold text-white">New message from: {data.sender_name}</p>
                <p className="mt-1 text-sm text-slate-400 truncate">{data.content}</p>
              </div>
              <div className="ml-4 flex-shrink-0 flex items-center">
                <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse shadow-[0_0_8px_#8b5cf6]" />
              </div>
            </div>
          ), { duration: 4000 });
        }
      }

      if (data.type === 'new_match') {
        if (activeTab !== 'matches') {
          setHasNewMatch(true);
          toast('New Match! 🔥 Check your matches!', {
            icon: '💜',
            style: { borderRadius: '16px', background: '#1e1b4b', color: '#fff', border: '1px solid rgba(139, 92, 246, 0.5)' },
          });
        }
      }
    };

    return () => socket.close();
  }, [user?.id, activeTab]);

  const checkNewMatches = async () => {
    if (!user) return;
    try {
      const res = await api.get('/users/matches');
      const lastView = localStorage.getItem('lastMatchesView');
      if (!lastView) {
        setHasNewMatch(res.data.length > 0);
        return;
      }
      const hasUnseen = res.data.some(match => new Date(match.created_at) > new Date(lastView));
      setHasNewMatch(hasUnseen);
    } catch (err) { console.error("Error checking matches:", err); }
  };

  useEffect(() => {
    checkNewMatches();
    if (activeTab === 'matches') {
      setHasNewMatch(false);
      localStorage.setItem('lastMatchesView', new Date().toISOString());
    }
  }, [user, activeTab]);

  const openChatWithUser = (userId) => {
    setSelectedChatUserId(userId);
    setActiveTab('chats');
  };

  if (authLoading) return (
    <div className="h-screen bg-spark-dark flex items-center justify-center italic text-spark-accent">
      <Zap className="animate-pulse" size={48} />
    </div>
  );

  return (
    <div className="h-screen bg-spark-dark text-spark-text flex overflow-hidden relative font-sans">
      <Toaster position="top-right" />
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-spark-accent/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none z-0" />

      {user ? (
        <>
          <nav className="w-20 md:w-64 border-r border-white/5 bg-spark-dark/50 backdrop-blur-xl flex flex-col p-4 z-20 h-full shrink-0">
            <div className="flex items-center gap-3 px-2 mb-10 shrink-0">
              <div className="p-2 bg-spark-accent rounded-lg shadow-lg shadow-spark-accent/20">
                <Sparkles size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold hidden md:block tracking-tight">Spark</span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto">
              <NavItem icon={<Search />} label="Discovery" active={activeTab === 'discovery'} onClick={() => setActiveTab('discovery')} />
              <NavItem icon={<Heart />} label="Matches" active={activeTab === 'matches'} onClick={() => setActiveTab('matches')} showDot={hasNewMatch} />
              <NavItem icon={<MessageCircle />} label="Chats" active={activeTab === 'chats'} onClick={() => { setActiveTab('chats'); setSelectedChatUserId(null); }} />
              <NavItem icon={<UserIcon />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
            </div>

            <button onClick={logout} className="flex items-center gap-3 p-3 text-slate-400 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all mt-auto group shrink-0">
              <LogOut size={22} className="group-hover:translate-x-1 transition-transform" />
              <span className="hidden md:block font-medium">Logout</span>
            </button>
          </nav>

          <main className="flex-1 h-full overflow-hidden z-10 relative">
            <AnimatePresence mode="wait">
              {activeTab === 'discovery' && (
                <motion.div key="discovery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto py-8">
                  <Discovery />
                </motion.div>
              )}
              {activeTab === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto py-8">
                  <ProfileSetup />
                </motion.div>
              )}
              {activeTab === 'matches' && (
                <motion.div key="matches" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto py-8">
                  <Matches onChatOpen={openChatWithUser} />
                </motion.div>
              )}
              {activeTab === 'chats' && (
                <motion.div key="chats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                  <Chats initialUserId={selectedChatUserId} />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center p-4 z-10 overflow-y-auto">
          <AnimatePresence mode="wait">
            {view === 'hero' && <HeroView onRegister={() => setView('register')} onLogin={() => setView('login')} />}
            {view === 'login' && <Login onBack={() => setView('hero')} />}
            {view === 'register' && <Register onBack={() => setView('hero')} onSuccess={() => setView('login')} />}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

const NavItem = ({ icon, label, active, onClick, showDot }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 relative ${active ? 'bg-spark-accent text-white shadow-lg shadow-spark-accent/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
    <div className="relative shrink-0">{React.cloneElement(icon, { size: 22, strokeWidth: active ? 2.5 : 2 })}</div>
    <span className="hidden md:block font-medium tracking-wide truncate">{label}</span>
    {showDot && !active && <span className="absolute right-4 w-2 h-2 bg-spark-accent rounded-full animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.8)]" />}
  </button>
);

const HeroView = ({ onRegister, onLogin }) => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl text-center">
    <div className="flex justify-center mb-8"><div className="p-4 bg-spark-accent rounded-3xl rotate-12"><Sparkles size={40} className="text-white" /></div></div>
    <h1 className="text-5xl font-black mb-3 text-white">Spark</h1>
    <p className="text-slate-400 mb-10 text-lg">Find the one who truly inspires you.</p>
    <div className="space-y-4">
      <button onClick={onRegister} className="w-full py-4 bg-spark-accent rounded-2xl font-bold text-white flex items-center justify-center gap-2 active:scale-95 shadow-lg">Get Started <ArrowRight size={20} /></button>
      <button onClick={onLogin} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white active:scale-95">I already have an account</button>
    </div>
  </motion.div>
);

export default App;
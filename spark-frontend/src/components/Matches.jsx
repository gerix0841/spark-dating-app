import React, { useState, useEffect } from 'react';
import { MessageCircle, Heart, Loader2, User, UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/axios';
import UserDetailModal from './UserDetailModal';

const Matches = ({ onChatOpen }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await api.get('/users/matches');
        setMatches(res.data);
        localStorage.setItem('lastMatchesView', new Date().toISOString());
        window.dispatchEvent(new Event('matchesViewed'));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchMatches();

    const handleRelationUpdate = (e) => {
      const blockedId = e.detail.blockedId;
      setMatches(prev => prev.filter(m => m.user_id !== blockedId));
    };

    window.addEventListener('relationUpdated', handleRelationUpdate);
    return () => window.removeEventListener('relationUpdated', handleRelationUpdate);
  }, []);

  const openProfile = (userId) => { setSelectedUserId(userId); setIsModalOpen(true); };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-spark-accent" size={32} /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-spark-accent/20 rounded-lg"><Heart className="text-spark-accent" fill="currentColor" size={24} /></div>
        <h1 className="text-3xl font-black text-white tracking-tight">Your Sparks</h1>
      </div>

      {matches.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-12 text-center text-slate-400"><User className="mx-auto mb-4 opacity-20" size={48} /><p>No matches yet. Keep swiping!</p></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {matches.map((match, index) => (
            <motion.div 
              key={match.match_id} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: index * 0.05 }} 
              onClick={() => openProfile(match.user_id)} 
              className="group relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/5 bg-slate-900 shadow-xl cursor-pointer"
            >
              {match.image ? (
                <img src={match.image} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                  <UserIcon size={48} className="text-slate-700" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent flex flex-col justify-end p-4">
                <div className="flex justify-between items-center min-w-0">
                  <div className="truncate pr-2">
                    <h3 className="text-white font-bold text-lg leading-tight truncate">{match.full_name.split(' ')[0]}</h3>
                    <p className="text-slate-400 text-sm">{match.age} yrs</p>
                  </div>
                  <button 
                    className="shrink-0 p-3 bg-spark-accent rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-all active:scale-90" 
                    onClick={(e) => { e.stopPropagation(); onChatOpen(match.user_id); }}
                  >
                    <MessageCircle size={20} fill="currentColor" />
                  </button>
                </div>
              </div>
              {new Date(match.created_at) > new Date(Date.now() - 24*60*60*1000) && (
                <div className="absolute top-3 right-3 px-2 py-1 bg-spark-accent text-[10px] font-black text-white rounded-lg uppercase">New</div>
              )}
            </motion.div>
          ))}
        </div>
      )}
      <UserDetailModal userId={selectedUserId} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSendMessage={(id) => { setIsModalOpen(false); onChatOpen(id); }} />
    </div>
  );
};

export default Matches;
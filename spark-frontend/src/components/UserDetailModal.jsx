import React, { useState, useEffect } from 'react';
import { X, MapPin, Loader2, MessageCircle, ShieldAlert, Trash2, User as UserIcon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/axios';

const UserDetailModal = ({ userId, isOpen, onClose, onSendMessage }) => {
  const [userData, setUserData] = useState(null);
  const [imgIndex, setImgIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      const fetchUserData = async () => {
        setLoading(true);
        try {
          const res = await api.get(`/users/${userId}/profile`);
          setUserData(res.data);
          setImgIndex(0);
          setShowBlockConfirm(false);
        } catch (err) {
          console.error("Error fetching user profile:", err);
          toast.error("Could not load profile");
        } finally {
          setLoading(false);
        }
      };
      fetchUserData();
    }
  }, [isOpen, userId]);

  const handleBlock = async () => {
    setBlocking(true);
    try {
      await api.post(`/users/${userId}/block`);
    
      const currentUnread = JSON.parse(localStorage.getItem('unread_users') || '[]');
      const filtered = currentUnread.filter(id => id !== userId);
      localStorage.setItem('unread_users', JSON.stringify(filtered));

      toast.success("User blocked and data cleared.");
      onClose();

      if (window.location.pathname.includes('/chats')) {
        window.location.href = '/chats';
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error("Block failed:", err);
      toast.error("Failed to block user.");
    } finally {
      setBlocking(false);
    }
  };

  if (!isOpen) return null;

  const handleImageClick = (e) => {
    if (loading || !userData?.images?.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > rect.width / 2) {
      if (imgIndex < userData.images.length - 1) setImgIndex(prev => prev + 1);
    } else {
      if (imgIndex > 0) setImgIndex(prev => prev - 1);
    }
  };

  // Segédfüggvény az ikonokhoz (ugyanaz, mint a Setup-nál)
  const getInterestIcon = (id) => {
    const icons = {
      'Gaming': '🎮', 'Pizza': '🍕', 'Hiking': '🏔️', 'Cooking': '👨‍🍳',
      'Travel': '✈️', 'Music': '🎵', 'Gym': '💪', 'Art': '🎨',
      'Coffee': '☕', 'Movies': '🍿', 'Photography': '📸', 'Coding': '💻',
      'Yoga': '🧘', 'Wine': '🍷', 'Dancing': '💃'
    };
    return icons[id] || '✨';
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }} 
          animate={{ scale: 1, y: 0 }} 
          exit={{ scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {loading ? (
            <div className="h-[500px] flex items-center justify-center">
              <Loader2 className="animate-spin text-spark-accent" size={40} />
            </div>
          ) : userData && (
            <div className="overflow-y-auto custom-scrollbar">
              {/* Image Section */}
              <div className="relative aspect-[3/4] bg-slate-800 shrink-0">
                {userData.images && userData.images.length > 0 ? (
                  <img 
                    src={userData.images[imgIndex]?.url} 
                    className="w-full h-full object-cover cursor-pointer select-none"
                    onClick={handleImageClick}
                    alt={userData.full_name}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    <UserIcon size={120} className="text-slate-700" />
                  </div>
                )}
                
                <button 
                  onClick={onClose} 
                  className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all z-20"
                >
                  <X size={24} />
                </button>
                
                {userData.images?.length > 1 && (
                  <div className="absolute top-5 left-6 right-6 flex gap-1.5 z-10">
                    {userData.images.map((_, idx) => (
                      <div 
                        key={idx} 
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${idx === imgIndex ? 'bg-white shadow-md' : 'bg-white/30'}`} 
                      />
                    ))}
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 via-black/20 to-transparent text-white pointer-events-none">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-black tracking-tight">{userData.full_name}</h2>
                    <span className="text-2xl font-light opacity-80">{userData.age}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-spark-accent mt-1">
                    <MapPin size={16} fill="currentColor" fillOpacity={0.2} />
                    <span className="text-sm font-bold tracking-wide">{userData.distance} km away</span>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className="p-8 bg-slate-900">
                <div className="mb-8">
                  <h4 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-black mb-3 text-left flex items-center gap-2">
                    About
                  </h4>
                  <p className="text-slate-200 leading-relaxed text-left font-medium">
                    {userData.bio || "This user hasn't written a bio yet."}
                  </p>
                </div>

                {/* INTERESTS SECTION */}
                {userData.interests && userData.interests.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-black mb-4 text-left flex items-center gap-2">
                      Interests
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(userData.interests || []).map((interest) => {
                        const isCommon = (userData.common_interests || []).includes(interest);
                        return (
                          <span 
                            key={interest}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-2 ${
                              isCommon 
                              ? 'bg-spark-accent/20 border-spark-accent text-white shadow-[0_0_15px_rgba(139,92,246,0.15)]' 
                              : 'bg-white/5 border-white/10 text-slate-400'
                            }`}
                          >
                            <span>{getInterestIcon(interest)}</span>
                            {interest}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="space-y-3">
                  {!showBlockConfirm ? (
                    <>
                      <button 
                        onClick={() => { onClose(); onSendMessage(userData.id); }}
                        className="w-full py-4 bg-spark-accent hover:bg-violet-500 rounded-2xl text-white font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-spark-accent/20 active:scale-95"
                      >
                        <MessageCircle size={22} fill="currentColor" />
                        <span className="tracking-wide text-lg">Send Message</span>
                      </button>
                      
                      <button 
                        onClick={() => setShowBlockConfirm(true)}
                        className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border border-red-500/20"
                      >
                        <ShieldAlert size={18} />
                        <span>Block User</span>
                      </button>
                    </>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-500/5 border border-red-500/20 p-5 rounded-3xl"
                    >
                      <p className="text-red-400 text-sm font-bold mb-4">Are you sure you want to block this user?</p>
                      <div className="flex gap-3">
                        <button 
                          disabled={blocking}
                          onClick={handleBlock}
                          className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                        >
                          {blocking ? <Loader2 className="animate-spin" size={16}/> : <Trash2 size={16} />}
                          Yes, Block
                        </button>
                        <button 
                          onClick={() => setShowBlockConfirm(false)}
                          className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-all border border-white/5"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UserDetailModal;
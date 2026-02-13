import React, { useState, useEffect } from 'react';
import { Heart, X, MapPin, Loader2, Sparkles, MessageCircle, User as UserIcon, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { getInterestIcon } from '../constants/interests';

const Discovery = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imgIndex, setImgIndex] = useState(0);
  const [matchData, setMatchData] = useState(null);
  const [canUndo, setCanUndo] = useState(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 0, 150], [-20, 0, 20]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);
  
  const likeOpacity = useTransform(x, [50, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, -50], [1, 0]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/discovery');
      setUsers(res.data);
      setCurrentIndex(0);
      setImgIndex(0);
      setCanUndo(false);
    } catch (err) {
      console.error("Discovery error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSwipe = async (isLike) => {
    const targetUser = users[currentIndex];
    if (!targetUser) return;

    x.set(0); 
    try {
      const res = await api.post('/users/swipe', {
        liked_id: targetUser.id,
        is_like: isLike
      });

      if (res.data.is_match) {
        setMatchData(targetUser);
        setTimeout(() => {
          setMatchData(null);
          setImgIndex(0);
          setCurrentIndex(prev => prev + 1);
          setCanUndo(true);
        }, 3000);
      } else {
        setImgIndex(0);
        setCurrentIndex(prev => prev + 1);
        setCanUndo(true);
      }
    } catch (err) {
      console.error("Swipe failed:", err);
    }
  };

  const handleUndo = async () => {
    if (!canUndo || currentIndex <= 0) return;

    try {
      await api.post('/users/swipe/undo');
      setCurrentIndex(prev => prev - 1);
      setImgIndex(0);
      setCanUndo(false);
      toast.success("Swipe undone", { icon: '↩️' });
    } catch (err) {
      console.error("Undo error:", err);
      toast.error("Could not undo swipe");
    }
  };

  const handleDragEnd = (event, info) => {
    if (info.offset.x > 100) {
      handleSwipe(true);
    } else if (info.offset.x < -100) {
      handleSwipe(false);
    }
  };

  const handleImageClick = (e) => {
    if (Math.abs(x.get()) > 5) return;
    if (matchData) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPos = e.clientX - rect.left;
    const userImages = users[currentIndex]?.images || [];

    if (userImages.length <= 1) return;

    if (xPos > rect.width / 2) {
      if (imgIndex < userImages.length - 1) setImgIndex(imgIndex + 1);
    } else {
      if (imgIndex > 0) setImgIndex(imgIndex - 1);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 text-white italic">
      <Loader2 className="animate-spin mb-4 text-spark-accent" size={40} />
      <p className="animate-pulse">Finding your next spark...</p>
    </div>
  );

  if (currentIndex >= users.length && !matchData) return (
    <div className="max-w-sm mx-auto mt-20 p-10 text-center bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl">
      <div className="w-20 h-20 bg-spark-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <Sparkles className="text-spark-accent" size={40} />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">That's everyone!</h3>
      <p className="text-slate-400 mb-8 leading-relaxed">No more profiles nearby. Try again later!</p>
      <div className="flex flex-col gap-3">
        <button onClick={fetchUsers} className="w-full py-4 bg-spark-accent rounded-2xl text-white font-bold transition-all active:scale-95">
          Refresh Discovery
        </button>
        {canUndo && (
          <button onClick={handleUndo} className="w-full py-3 bg-white/5 text-orange-400 font-bold rounded-2xl border border-white/10 flex items-center justify-center gap-2">
            <RotateCcw size={18} /> Undo Last Swipe
          </button>
        )}
      </div>
    </div>
  );

  const user = users[currentIndex];
  const hasImages = user.images && user.images.length > 0;

  return (
    <div className="max-w-md mx-auto mt-6 px-4 mb-20">
      <div className="relative aspect-[3/4] overflow-visible">
        <AnimatePresence mode="wait">
          {!matchData ? (
            <motion.div 
              key={user.id}
              style={{ x, rotate, opacity }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="w-full h-full relative touch-none cursor-grab active:cursor-grabbing rounded-[2.5rem] shadow-2xl bg-slate-900 border border-white/10 overflow-hidden"
              onClick={handleImageClick}
            >
              <motion.div style={{ opacity: likeOpacity }} className="absolute top-10 left-8 z-30 border-4 border-green-500 text-green-500 font-black text-4xl px-4 py-2 rounded-xl rotate-[-20deg] pointer-events-none">LIKE</motion.div>
              <motion.div style={{ opacity: nopeOpacity }} className="absolute top-10 right-8 z-30 border-4 border-red-500 text-red-500 font-black text-4xl px-4 py-2 rounded-xl rotate-[20deg] pointer-events-none">NOPE</motion.div>

              {hasImages ? (
                <img src={user.images[imgIndex].url} alt={user.full_name} className="w-full h-full object-cover select-none" draggable="false" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                  <UserIcon size={120} className="text-slate-700" />
                </div>
              )}

              {hasImages && user.images.length > 1 && (
                <div className="absolute top-5 left-6 right-6 flex gap-1.5 z-10 pointer-events-none">
                  {user.images.map((_, idx) => (
                    <div key={idx} className={`h-1 flex-1 rounded-full ${idx === imgIndex ? 'bg-white shadow-md' : 'bg-white/30'}`} />
                  ))}
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-white pointer-events-none">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-black tracking-tight">{user.full_name}</h2>
                  <span className="text-2xl font-light opacity-80">{user.age}</span>
                </div>
                
                {/* Interests Tags Bar with Shared Icons */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(user.interests || []).slice(0, 3).map((interest, idx) => (
                    <span 
                      key={idx} 
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-wider border border-white/5 text-white/90"
                    >
                      <span className="text-xs">{getInterestIcon(interest)}</span>
                      {interest}
                    </span>
                  ))}
                  {(user.interests || []).length > 3 && (
                    <span className="text-[10px] text-slate-400 font-bold self-center ml-1">
                      +{(user.interests || []).length - 3}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-spark-accent mt-3">
                  <MapPin size={16} fill="currentColor" fillOpacity={0.2} />
                  <span className="text-sm font-bold tracking-wide">{user.distance} km away</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="match" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.1, opacity: 0 }} className="w-full h-full bg-spark-accent flex flex-col items-center justify-center p-8 text-center rounded-[2.5rem] shadow-2xl">
              <div className="relative mb-6">
                 <Sparkles className="text-white absolute -top-8 -right-8 animate-bounce" size={40} />
                 <Heart className="text-white fill-current animate-pulse" size={80} />
              </div>
              <h2 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase italic">It's a Match!</h2>
              <p className="text-white/90 text-lg mb-8">You and <span className="font-bold">{matchData.full_name}</span> liked each other!</p>
              <div className="flex gap-4 items-center justify-center">
                 <div className="p-3 bg-white/20 rounded-full text-white backdrop-blur-md"><MessageCircle size={24} /></div>
                 <span className="text-white/80 text-sm font-medium">Getting next spark...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!matchData && (
        <div className="flex justify-center items-center gap-6 mt-10">
          <button onClick={() => handleSwipe(false)} className="p-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-red-500 hover:scale-110 active:scale-90 transition-all">
            <X size={32} strokeWidth={3} />
          </button>

          <button 
            onClick={handleUndo} 
            disabled={!canUndo}
            className={`p-4 rounded-full border transition-all ${
              canUndo 
              ? 'bg-white/5 border-orange-500/50 text-orange-500 hover:scale-110 active:scale-90 shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
              : 'bg-white/5 border-white/5 text-slate-600 opacity-30 cursor-not-allowed'
            }`}
          >
            <RotateCcw size={22} />
          </button>

          <button onClick={() => handleSwipe(true)} className="p-6 bg-spark-accent rounded-full text-white hover:scale-110 active:scale-90 transition-all shadow-xl shadow-spark-accent/30">
            <Heart size={36} fill="white" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Discovery;
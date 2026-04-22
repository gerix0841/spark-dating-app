import React, { useState, useEffect } from 'react';
import { X, MapPin, Loader2, MessageCircle, ShieldAlert, Trash2, Flag, CheckCircle, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { getInterestIcon } from '../constants/interests';

const REPORT_REASONS = ['Spam', 'Fake Profile', 'Harassment', 'Inappropriate Content', 'Other'];

const UserDetailModal = ({ userId, isOpen, onClose, onSendMessage }) => {
  const [userData, setUserData] = useState(null);
  const [imgIndex, setImgIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDesc, setReportDesc] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/users/${userId}/profile`);
        setUserData(res.data);
        setImgIndex(0);
        setShowBlockConfirm(false);
      } catch {
        toast.error('Could not load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [isOpen, userId]);

  const handleReport = async () => {
    if (!reportDesc.trim() || reporting) return;
    setReporting(true);
    try {
      await api.post('/contact/report', {
        reported_user_id: userId,
        reason: reportReason,
        description: reportDesc.trim(),
      });
      setReportSent(true);
    } catch {
      toast.error('Report failed. Please try again.');
    } finally {
      setReporting(false);
    }
  };

  const handleBlock = async () => {
    setBlocking(true);
    try {
      await api.post(`/users/${userId}/block`);
      const currentUnread = JSON.parse(localStorage.getItem('unread_users') || '[]');
      localStorage.setItem('unread_users', JSON.stringify(currentUnread.filter(id => id !== userId)));
      toast.success('User blocked and data cleared.');
      onClose();
      window.location.reload();
    } catch {
      toast.error('Failed to block user.');
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
              <div className="relative aspect-[3/4] bg-slate-800 shrink-0">
                {userData.images?.length > 0 ? (
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

              <div className="p-8 bg-slate-900">
                <div className="mb-8">
                  <h4 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-black mb-3 text-left">About</h4>
                  <p className="text-slate-200 leading-relaxed text-left font-medium">
                    {userData.bio || "This user hasn't written a bio yet."}
                  </p>
                </div>

                {userData.interests?.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-black mb-4 text-left">Interests</h4>
                    <div className="flex flex-wrap gap-2">
                      {userData.interests.map((interest) => {
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

                <div className="space-y-3">
                  {!showBlockConfirm && !showReportForm && (
                    <>
                      <button
                        onClick={() => { onClose(); onSendMessage(userData.id); }}
                        className="w-full py-4 bg-spark-accent hover:bg-violet-500 rounded-2xl text-white font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-spark-accent/20 active:scale-95"
                      >
                        <MessageCircle size={22} fill="currentColor" />
                        <span className="tracking-wide text-lg">Send Message</span>
                      </button>
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setShowReportForm(true); setReportSent(false); setReportDesc(''); setReportReason('Spam'); }}
                          className="flex-1 py-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border border-orange-500/20 text-sm"
                        >
                          <Flag size={16} /> Report
                        </button>
                        <button
                          onClick={() => setShowBlockConfirm(true)}
                          className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border border-red-500/20 text-sm"
                        >
                          <ShieldAlert size={16} /> Block
                        </button>
                      </div>
                    </>
                  )}

                  {showBlockConfirm && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-500/5 border border-red-500/20 p-5 rounded-3xl">
                      <p className="text-red-400 text-sm font-bold mb-4">Are you sure you want to block this user?</p>
                      <div className="flex gap-3">
                        <button
                          disabled={blocking}
                          onClick={handleBlock}
                          className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                        >
                          {blocking ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                          Yes, Block
                        </button>
                        <button onClick={() => setShowBlockConfirm(false)} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-all border border-white/5">
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {showReportForm && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-orange-500/5 border border-orange-500/20 p-5 rounded-3xl space-y-4">
                      {reportSent ? (
                        <div className="flex flex-col items-center py-4 gap-3 text-center">
                          <CheckCircle size={36} className="text-green-400" />
                          <p className="text-white font-bold">Report sent!</p>
                          <p className="text-slate-400 text-sm">Thank you for helping keep Spark safe.</p>
                          <button onClick={() => setShowReportForm(false)} className="px-5 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-semibold hover:bg-white/10 transition-colors">
                            Close
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-orange-400 text-sm font-bold">Report {userData.full_name}</p>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Reason</p>
                            <div className="flex flex-wrap gap-2">
                              {REPORT_REASONS.map((r) => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setReportReason(r)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${reportReason === r ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Description</p>
                            <textarea
                              value={reportDesc}
                              onChange={(e) => setReportDesc(e.target.value)}
                              placeholder="Please describe what happened..."
                              rows={3}
                              maxLength={2000}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-orange-500/40 resize-none transition-colors"
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              disabled={!reportDesc.trim() || reporting}
                              onClick={handleReport}
                              className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                            >
                              {reporting ? <Loader2 className="animate-spin" size={15} /> : <Flag size={15} />}
                              Send Report
                            </button>
                            <button onClick={() => setShowReportForm(false)} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-all border border-white/5">
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
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

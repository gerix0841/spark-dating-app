import React, { useState, useEffect } from 'react';
import { User, Save, Loader2, CheckCircle2, Plus, X, Image as ImageIcon, Lock, Sparkles, Hash } from 'lucide-react';
import api from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { INTEREST_OPTIONS } from '../constants/interests';

const ProfileSetup = () => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');
  const [uploadingPos, setUploadingPos] = useState(null);
  const [images, setImages] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    birthdate: '',
    gender: 'male',
    interests: 'both',
    age_min: 18,
    age_max: 100,
    interests_tags: [] // Új mező a tageknek
  });

  const [pwdData, setPwdData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');

  const fetchProfileData = async () => {
    try {
      const response = await api.get('/users/me/profile');
      if (response.data) {
        setFormData({
          full_name: response.data.full_name || '',
          bio: response.data.bio || '',
          birthdate: response.data.birthdate || '',
          gender: response.data.gender || 'male',
          interests: response.data.interests || 'both',
          age_min: response.data.age_min ?? 18,
          age_max: response.data.age_max ?? 100,
          interests_tags: response.data.interests_tags || []
        });
        setImages(response.data.images || []);
      }
    } catch (err) {
      console.error("Could not fetch profile data", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const toggleInterest = (interestId) => {
    const current = formData.interests_tags || [];
    if (current.includes(interestId)) {
      setFormData({ ...formData, interests_tags: current.filter(id => id !== interestId) });
    } else if (current.length < 6) {
      setFormData({ ...formData, interests_tags: [...current, interestId] });
    }
  };

  const handleImageUpload = async (e, position) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('position', position);

    setUploadingPos(position);
    try {
      await api.post('/users/me/images/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchProfileData();
      setStatusMsg('Photo uploaded!');
      setTimeout(() => setStatusMsg(''), 2000);
    } catch (err) {
      console.error("Upload error", err);
      setStatusMsg('Upload failed.');
    } finally {
      setUploadingPos(null);
    }
  };

  const handleImageDelete = async (imageId) => {
    try {
      await api.delete(`/users/me/images/${imageId}`);
      setImages(prev => prev.filter(img => img.id !== imageId));
      setStatusMsg('Photo removed');
      setTimeout(() => setStatusMsg(''), 2000);
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg('');
    try {
      await api.patch('/users/me/profile', formData);
      setStatusMsg('Profile updated successfully!');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setStatusMsg('Error updating profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdError('');
    if (pwdData.new_password !== pwdData.confirm_password) {
      setPwdError("New passwords do not match!");
      return;
    }
    setPwdLoading(true);
    try {
      await api.put('/users/me/change-password', {
        old_password: pwdData.old_password,
        new_password: pwdData.new_password
      });
      setStatusMsg('Password changed successfully!');
      setShowPasswordModal(false);
      setPwdData({ old_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      setPwdError(err.response?.data?.detail || "Failed to update password.");
    } finally {
      setPwdLoading(false);
    }
  };

  if (fetching) return (
    <div className="flex items-center justify-center h-64 text-slate-500 italic">
      <Loader2 className="animate-spin mr-2" /> Loading your settings...
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto bg-spark-soft/30 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden mb-20">
      
      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-900 border border-white/10 p-8 rounded-[2rem] w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Lock className="text-spark-accent" size={20} /> Change Password</h3>
                <button onClick={() => setShowPasswordModal(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <input type="password" required placeholder="Current Password" lg className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-spark-accent" value={pwdData.old_password} onChange={(e) => setPwdData({...pwdData, old_password: e.target.value})} />
                <input type="password" required placeholder="New Password" lg className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-spark-accent" value={pwdData.new_password} onChange={(e) => setPwdData({...pwdData, new_password: e.target.value})} />
                <input type="password" required placeholder="Confirm New Password" lg className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-spark-accent" value={pwdData.confirm_password} onChange={(e) => setPwdData({...pwdData, confirm_password: e.target.value})} />
                {pwdError && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-xl border border-red-400/20">{pwdError}</div>}
                <button disabled={pwdLoading} className="w-full py-4 bg-spark-accent hover:bg-violet-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                  {pwdLoading ? <Loader2 className="animate-spin" /> : "Update Password"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interests Selection Modal */}
      <AnimatePresence>
        {showInterestsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles className="text-spark-accent" size={22} /> Interests</h3>
                  <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider">Select up to 6 interests</p>
                </div>
                <button onClick={() => setShowInterestsModal(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8 overflow-y-auto max-h-[50vh] pr-2 custom-scrollbar">
                {INTEREST_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleInterest(opt.id)}
                    className={`flex items-center gap-2 p-3 rounded-2xl border font-bold text-sm transition-all active:scale-95 ${
                      formData.interests_tags?.includes(opt.id)
                      ? 'bg-spark-accent border-spark-accent text-white shadow-lg shadow-spark-accent/20'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span> {opt.id}
                  </button>
                ))}
              </div>

              <button onClick={() => setShowInterestsModal(false)} className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all">
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {statusMsg && (
        <div className="absolute top-4 right-8 flex items-center gap-2 text-spark-accent animate-bounce z-30 bg-spark-dark/80 px-4 py-2 rounded-full border border-spark-accent/30">
          <CheckCircle2 size={16} /> <span className="text-sm font-medium">{statusMsg}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 tracking-tight text-white"><ImageIcon className="text-spark-accent" /> Photos</h2>
        <button onClick={() => setShowPasswordModal(true)} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5 transition-all"><Lock size={14} /> Change Password</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-10">
        {[1, 2, 3, 4, 5, 6].map((pos) => {
          const img = images.find(i => i.position === pos);
          const isUploading = uploadingPos === pos;
          return (
            <div key={pos} className="relative aspect-[3/4] bg-white/5 border-2 border-dashed border-white/10 rounded-2xl overflow-hidden group transition-all hover:border-spark-accent/40">
              {img ? (
                <>
                  <img src={img.url} className="w-full h-full object-cover" alt="Profile" />
                  <button type="button" onClick={() => handleImageDelete(img.id)} className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full text-white shadow-xl backdrop-blur-sm transition-transform hover:scale-110"><X size={14} /></button>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-white/5 transition-colors">
                  {isUploading ? <Loader2 className="animate-spin text-spark-accent" /> : <Plus className="text-slate-500 group-hover:text-spark-accent transition-colors" size={28} />}
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, pos)} disabled={isUploading} />
                </label>
              )}
              <div className="absolute bottom-2 left-2 text-[9px] text-white/20 font-black italic select-none">0{pos}</div>
            </div>
          );
        })}
      </div>

      {/* INTERESTS TAGS SECTION */}
      <div className="mb-10 pt-8 border-t border-white/5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2 tracking-tight text-white"><Hash className="text-spark-accent" /> Interests</h2>
          <button onClick={() => setShowInterestsModal(true)} className="text-xs font-bold text-spark-accent hover:text-violet-400 flex items-center gap-1 transition-colors">
            <Plus size={14} /> Edit
          </button>
        </div>
        <div className="flex flex-wrap gap-2 min-h-[40px]">
          {formData.interests_tags && formData.interests_tags.length > 0 ? (
            formData.interests_tags.map(tag => (
              <span key={tag} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold flex items-center gap-2">
                {INTEREST_OPTIONS.find(o => o.id === tag)?.icon} {tag}
              </span>
            ))
          ) : (
            <p className="text-slate-500 italic text-sm">No interests selected yet. Add some to find better matches!</p>
          )}
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 tracking-tight text-white border-t border-white/5 pt-8"><User className="text-spark-accent" /> About Me</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input type="text" placeholder="Full Name" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 outline-none focus:border-spark-accent/50 text-white" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
          <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 outline-none focus:border-spark-accent/50 text-white [color-scheme:dark]" value={formData.birthdate} onChange={(e) => setFormData({...formData, birthdate: e.target.value})} />
        </div>
        <textarea className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 outline-none focus:border-spark-accent/50 h-28 text-white resize-none" placeholder="Bio..." value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <select className="w-full bg-[#0f172a] border border-white/10 rounded-xl py-4 px-4 text-white outline-none focus:border-spark-accent/50" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
            <option value="male">Man</option>
            <option value="female">Woman</option>
          </select>
          <select className="w-full bg-[#0f172a] border border-white/10 rounded-xl py-4 px-4 text-white outline-none focus:border-spark-accent/50" value={formData.interests} onChange={(e) => setFormData({...formData, interests: e.target.value})}>
            <option value="male">Looking for Men</option>
            <option value="female">Looking for Women</option>
            <option value="both">Open to Everyone</option>
          </select>
        </div>

        <div className="group bg-white/5 p-4 rounded-2xl border border-white/5">
          <label className="block text-sm text-slate-500 mb-4 ml-1">Discovery Age Range</label>
          <div className="flex items-center gap-4">
            <input type="number" min="18" max={formData.age_max} className="w-full bg-[#0f172a]/50 border border-white/10 rounded-xl py-3 px-4 text-white text-center" value={formData.age_min} onChange={(e) => setFormData({...formData, age_min: parseInt(e.target.value)})} />
            <span className="text-slate-500">-</span>
            <input type="number" min={formData.age_min} max="100" className="w-full bg-[#0f172a]/50 border border-white/10 rounded-xl py-3 px-4 text-white text-center" value={formData.age_max} onChange={(e) => setFormData({...formData, age_max: parseInt(e.target.value)})} />
          </div>
        </div>

        <button disabled={loading} className="w-full py-4 bg-spark-accent hover:bg-violet-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Save All Changes</>}
        </button>
      </form>
    </div>
  );
};

export default ProfileSetup;
import React, { useState } from 'react';
import { User, Mail, Lock, ArrowLeft, Sparkles, Loader2, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Register = ({ onBack, onSuccess }) => {
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);
  const maxDateString = maxDate.toISOString().split("T")[0];

  const [formData, setFormData] = useState({ 
    full_name: '', 
    email: '', 
    password: '',
    birthdate: '',
    gender: 'male'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await register(
        formData.full_name, 
        formData.email, 
        formData.password, 
        formData.birthdate,
        formData.gender
      );
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="max-w-md w-full bg-spark-soft/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl z-10"
    >
      <button onClick={onBack} className="text-slate-400 hover:text-white mb-6 flex items-center gap-2 transition-colors">
        <ArrowLeft size={18} /> Back
      </button>

      <h2 className="text-3xl font-bold mb-2 text-white">Create Account</h2>
      <p className="text-slate-400 mb-8 font-medium">Join Spark and find your inspiration.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">
            {error}
          </div>
        )}
        
        {/* Full Name */}
        <div className="relative group">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-spark-accent transition-colors" size={20} />
          <input 
            type="text" placeholder="Full Name" required
            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-spark-accent/50 transition-all text-white"
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
          />
        </div>

        {/* Birthdate & Gender Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Birthdate */}
          <div className="relative group">
            <div 
              onClick={(e) => {
                const input = e.currentTarget.nextElementSibling;
                if (input.showPicker) input.showPicker();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-spark-accent transition-colors z-20 cursor-pointer hover:scale-110 active:scale-95"
            >
              <Calendar size={18} />
            </div>
            <input 
              type="date" 
              max={maxDateString}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-11 pr-2 outline-none focus:border-spark-accent/50 transition-all text-white [color-scheme:dark] relative z-10 text-sm"
              value={formData.birthdate}
              onChange={(e) => setFormData({...formData, birthdate: e.target.value})}
            />
          </div>

          {/* Gender Select */}
          <div className="relative group">
            <select 
              required
              className="w-full bg-spark-dark border border-white/10 rounded-xl py-4 px-4 text-white outline-none focus:border-spark-accent/50 appearance-none cursor-pointer text-sm"
              value={formData.gender}
              onChange={(e) => setFormData({...formData, gender: e.target.value})}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-focus-within:text-spark-accent">
              {/* Kis nyíl jelzés a selecthez */}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-spark-accent transition-colors" size={20} />
          <input 
            type="email" placeholder="Email Address" required
            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-spark-accent/50 transition-all text-white"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>

        {/* Password */}
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-spark-accent transition-colors" size={20} />
          <input 
            type="password" placeholder="Password (min. 8 characters)" required
            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-spark-accent/50 transition-all text-white"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
        </div>

        <button 
          disabled={loading}
          className="w-full py-4 mt-2 bg-spark-accent hover:bg-violet-500 disabled:opacity-50 transition-all rounded-xl font-semibold shadow-lg shadow-spark-accent/20 flex items-center justify-center gap-2 text-white active:scale-[0.98]"
        >
          {loading ? <Loader2 className="animate-spin" /> : <>Create Account <Sparkles size={18} /></>}
        </button>
      </form>
    </motion.div>
  );
};

export default Register;
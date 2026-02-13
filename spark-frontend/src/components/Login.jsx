import React, { useState } from 'react';
import { Mail, Lock, ArrowLeft, Zap, Loader2, Key, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const Login = ({ onBack }) => {
  const { login } = useAuth();
  const [step, setStep] = useState('login'); // login, forgot, reset
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setStep('reset');
      toast.success("Code generated! Check the server console.");
    } catch (err) {
      setError("Failed to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { 
        token: token, 
        new_password: newPassword 
      });
      toast.success("Password updated! Please log in.");
      setStep('login');
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className="max-w-md w-full bg-spark-soft/50 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl z-10 relative overflow-hidden"
    >
      {/* Back Button */}
      <button 
        onClick={step === 'login' ? onBack : () => setStep('login')} 
        className="absolute top-8 left-8 text-slate-500 hover:text-white transition-colors"
      >
        <ChevronLeft size={24} />
      </button>

      <AnimatePresence mode="wait">
        {step === 'login' && (
          <motion.div 
            key="login"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
          >
            <h2 className="text-3xl font-black mb-2 mt-4">Welcome Back</h2>
            <p className="text-slate-400 mb-8 font-medium">Ready to find your match?</p>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && <div className="bg-red-500/10 border border-red-400/20 text-red-400 p-3 rounded-xl text-sm font-medium">{error}</div>}

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-spark-accent transition-colors" size={20} />
                <input 
                  type="email" placeholder="Email Address" required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-spark-accent/50 transition-all text-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-spark-accent transition-colors" size={20} />
                <input 
                  type="password" placeholder="Password" required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-spark-accent/50 transition-all text-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="text-right mt-[-10px]">
                <button 
                  type="button"
                  onClick={() => setStep('forgot')}
                  className="text-sm font-bold text-spark-accent hover:text-violet-400 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button 
                disabled={loading}
                className="w-full py-4 bg-spark-accent hover:bg-violet-500 disabled:opacity-50 transition-all rounded-2xl font-bold shadow-lg shadow-spark-accent/20 flex items-center justify-center gap-2 active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" /> : <>Sign In <Zap size={18} /></>}
              </button>
            </form>
          </motion.div>
        )}

        {step === 'forgot' && (
          <motion.div 
            key="forgot"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
          >
            <h2 className="text-3xl font-black mb-2 mt-4">Recovery</h2>
            <p className="text-slate-400 mb-8 font-medium">Enter your email and check your terminal for the 10-digit code.</p>
            
            <form onSubmit={handleRequestCode} className="space-y-5">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-spark-accent transition-colors" size={20} />
                <input 
                  type="email" placeholder="Email Address" required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-spark-accent/50 transition-all text-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button 
                disabled={loading}
                className="w-full py-4 bg-spark-accent rounded-2xl font-bold text-white shadow-lg active:scale-95 flex items-center justify-center gap-2 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Request Code"}
              </button>
            </form>
          </motion.div>
        )}

        {step === 'reset' && (
          <motion.div 
            key="reset"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
          >
            <h2 className="text-3xl font-black mb-2 mt-4">Reset Password</h2>
            <p className="text-slate-400 mb-8 font-medium">Check the console and enter the code with your new password.</p>
            
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="relative group">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-spark-accent transition-colors" size={20} />
                <input 
                  type="text" placeholder="10-digit Code" required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-spark-accent/50 transition-all text-white"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-spark-accent transition-colors" size={20} />
                <input 
                  type="password" placeholder="New Password" required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-spark-accent/50 transition-all text-white"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              {error && <div className="text-red-400 text-sm text-center font-bold bg-red-400/10 p-3 rounded-xl border border-red-400/20">{error}</div>}

              <button 
                disabled={loading}
                className="w-full py-4 bg-spark-accent rounded-2xl font-bold text-white shadow-lg active:scale-95 flex items-center justify-center gap-2 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Update Password"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Login;
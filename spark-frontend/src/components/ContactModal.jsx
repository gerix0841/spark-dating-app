import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

const CATEGORIES = ['Bug Report', 'Account Issue', 'Feature Request', 'Other'];

export default function ContactModal({ isOpen, onClose }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setCategory(CATEGORIES[0]);
      setMessage('');
      setSent(false);
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || loading) return;
    setLoading(true);
    try {
      await api.post('/contact/send', { category, message: message.trim() });
      setSent(true);
    } catch {
      toast.error('Failed to send. Please try again!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="w-full max-w-md bg-[#0f0c1a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <div>
                <h2 className="text-white font-bold text-lg">Contact Support</h2>
                <p className="text-slate-500 text-sm mt-0.5">We're here to help!</p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {sent ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center py-8 text-center gap-4"
                  >
                    <div className="p-4 bg-green-500/10 rounded-full">
                      <CheckCircle size={40} className="text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg">Message sent!</p>
                      <p className="text-slate-400 text-sm mt-1">We'll get back to you soon. Thanks!</p>
                    </div>
                    <button
                      onClick={handleClose}
                      className="mt-2 px-6 py-2.5 bg-spark-accent rounded-xl text-white font-semibold text-sm hover:bg-violet-500 transition-colors"
                    >
                      Close
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleSubmit}
                    className="space-y-4"
                  >
                    {/* Category */}
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">
                        Category
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategory(cat)}
                            className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-all border ${
                              category === cat
                                ? 'bg-spark-accent border-spark-accent text-white shadow-lg shadow-spark-accent/20'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">
                        Message
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe your issue or request in detail..."
                        rows={5}
                        maxLength={2000}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-spark-accent/50 resize-none transition-colors leading-relaxed"
                      />
                      <p className="text-right text-xs text-slate-600 mt-1">{message.length}/2000</p>
                    </div>

                    <button
                      type="submit"
                      disabled={!message.trim() || loading}
                      className="w-full py-3.5 bg-spark-accent hover:bg-violet-500 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-spark-accent/20 active:scale-95"
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      {loading ? 'Sending...' : 'Send Message'}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

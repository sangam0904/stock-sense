import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import InputField from '../components/InputField';
import toast from 'react-hot-toast';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await signup(name, email, password);
      navigate('/');
    } catch (error) {
      // Error is handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-600 to-pink-600 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-400 rounded-full blur-3xl opacity-20 animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-pink-400 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="relative z-10 w-full max-w-md p-[1px] rounded-3xl bg-gradient-to-b from-white/40 to-white/10 shadow-2xl"
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-pink-400 blur-md opacity-50 rounded-2xl group-hover:opacity-75 transition-opacity" />
              <Package size={32} className="relative z-10" />
            </div>
            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">StockSense</h2>
            <p className="text-gray-500 text-sm mt-2 font-medium">Create Account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField label="Full Name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
            <InputField label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" required />
            <InputField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            <InputField label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required />

            <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-medium py-3 rounded-xl hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 flex justify-center items-center mt-6">
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600 font-bold hover:brightness-110">Sign In</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

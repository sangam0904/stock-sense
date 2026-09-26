import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Loader2, Mail, Lock, KeyRound, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import InputField from '../components/InputField';
import toast from 'react-hot-toast';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

export default function Login() {
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, setSession } = useAuth();
  const navigate = useNavigate();

  // Password Login
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      // toast is handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  // Request OTP via Resend
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/auth/login-otp-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send login code');

      toast.success(data.message);
      if (data.otp) {
        toast(`Dev Mode OTP: ${data.otp}`, { duration: 6000, icon: '🔑' });
      }
      setOtpSent(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify OTP and Sign In
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/auth/login-otp-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed');

      setSession(data.token, data.user);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative gradient glowing spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400 rounded-full blur-3xl opacity-25 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-400 rounded-full blur-3xl opacity-25 animate-pulse" style={{ animationDelay: '1s' }} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, type: 'spring' }}
        className="relative z-10 w-full max-w-md p-[1px] rounded-3xl bg-gradient-to-b from-white/40 to-white/10 shadow-2xl"
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 blur-md opacity-50 rounded-2xl group-hover:opacity-75 transition-opacity" />
              <Package size={32} className="relative z-10" />
            </div>
            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 bg-clip-text text-transparent">StockSense</h2>
            <p className="text-gray-500 text-sm mt-1 font-medium">Modular Inventory Management</p>
          </div>

          {/* Toggle between Password & Email OTP */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200/80">
            <button
              type="button"
              onClick={() => { setLoginMethod('password'); setOtpSent(false); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                loginMethod === 'password'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Lock size={13} />
              Password
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('otp')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                loginMethod === 'otp'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Mail size={13} />
              Email OTP
              <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded-full font-bold ml-1">NEW</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {loginMethod === 'password' ? (
              <motion.form 
                key="password-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handlePasswordSubmit} 
                className="space-y-4"
              >
                <InputField 
                  label="Email Address" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="admin@stocksense.com" 
                  required 
                />
                
                <div className="space-y-1.5">
                  <InputField 
                    label="Password" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="••••••••" 
                    required 
                  />
                  <div className="flex justify-end">
                    <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-purple-600 font-semibold transition-colors">
                      Forgot Password?
                    </Link>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-medium py-3 rounded-xl hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 flex justify-center items-center mt-6"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Sign In with Password'}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="otp-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                {!otpSent ? (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <p className="text-xs text-gray-500 text-center">
                      We'll send a 6-digit verification code to your email. No password needed!
                    </p>
                    
                    <InputField 
                      label="Email Address" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="your.email@example.com" 
                      required 
                    />

                    <button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-medium py-3 rounded-xl hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 flex justify-center items-center mt-6"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Send 6-Digit Code'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                      <p className="text-xs text-blue-800">
                        Code sent to <strong>{email}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-[11px] text-blue-600 underline font-semibold mt-1"
                      >
                        Change Email
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        6-Digit Verification Code
                      </label>
                      <input 
                        type="text" 
                        maxLength={6}
                        value={otp} 
                        onChange={(e) => setOtp(e.target.value.trim())} 
                        placeholder="123456" 
                        className="w-full text-center tracking-[8px] text-2xl font-mono font-bold py-2.5 px-4 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
                        required 
                        autoFocus
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white font-medium py-3 rounded-xl hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 flex justify-center items-center mt-4"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Verify Code & Sign In'}
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 font-bold hover:brightness-110">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Warehouse, Loader2, CheckCircle2 } from 'lucide-react';
import InputField from '../components/InputField';
import toast from 'react-hot-toast';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      
      toast.success(data.message || 'OTP sent successfully');
      if (data.otp) {
        toast('Demo OTP: ' + data.otp, { duration: 5000, icon: '🔑' });
      }
      setStep(2);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword: password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      
      toast.success('Password reset successful');
      setStep(3);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md overflow-hidden relative"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600">
            <Warehouse size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form 
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSendOtp} 
              className="space-y-5"
            >
              <p className="text-sm text-gray-500 text-center mb-6">
                Enter your email address and we'll send you an OTP to reset your password.
              </p>
              
              <InputField
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium py-2.5 rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-70 flex justify-center items-center h-11"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Send OTP'}
              </button>
            </motion.form>
          )}

          {step === 2 && (
            <motion.form 
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleResetPassword} 
              className="space-y-4"
            >
              <InputField
                label="OTP Code"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                required
              />
              
              <InputField
                label="New Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <InputField
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium py-2.5 rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-70 flex justify-center items-center h-11 mt-4"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Reset Password'}
              </button>
            </motion.form>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-6 text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Password Updated!</h3>
              <p className="text-gray-500 mb-8">
                Your password has been changed successfully. You can now log in with your new password.
              </p>
              
              <Link
                to="/login"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium py-2.5 rounded-xl hover:shadow-lg transition-all duration-200 flex justify-center items-center h-11"
              >
                Back to Login
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {step !== 3 && (
          <div className="mt-8 text-center">
            <Link to="/login" className="text-sm text-blue-600 font-semibold hover:text-blue-700">
              Back to Login
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}

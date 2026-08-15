import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { FloatingHearts } from '../common/FloatingHearts';
import {
  Heart,
  Lock,
  Mail,
  User,
  AtSign,
  Eye,
  EyeOff,
  Camera,
  ArrowRight,
  Sparkles,
  ArrowLeft,
  KeyRound,
  RotateCw,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    initiateLogin,
    completeLoginWithOtp,
    initiateRegister,
    completeRegisterWithOtp,
    sendOtp,
    isOtpStep,
    otpPendingEmail,
    otpPurpose,
    cancelOtp,
    clearError,
    isLoading,
    error,
  } = useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);

  // Sign In State
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [about, setAbout] = useState('Hey there! I am using mChat 💖');
  const [profilePicture, setProfilePicture] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // 6-Digit OTP State
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(60);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Resend Timer Countdown
  useEffect(() => {
    let timer: any;
    if (isOtpStep && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpStep, resendCooldown]);

  // Focus first OTP digit when entering OTP step
  useEffect(() => {
    if (isOtpStep) {
      setOtpDigits(['', '', '', '', '', '']);
      setResendCooldown(60);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOtpStep]);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInIdentifier.trim() || !signInPassword) return;
    try {
      await initiateLogin(signInIdentifier, signInPassword);
    } catch (e) {}
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim() || !signUpPassword) return;
    try {
      await initiateRegister({
        name,
        username,
        email,
        password: signUpPassword,
        profilePicture,
        about,
      });
    } catch (e) {}
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    const numeric = val.replace(/[^0-9]/g, '');
    if (!numeric) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    // Handle full 6-digit paste
    if (numeric.length > 1) {
      const pasted = numeric.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      pasted.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const nextIdx = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = numeric;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (index < 5 && numeric) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) return;

    try {
      if (otpPurpose === 'login' && otpPendingEmail) {
        await completeLoginWithOtp(otpPendingEmail, fullOtp);
      } else if (otpPurpose === 'register') {
        await completeRegisterWithOtp(fullOtp);
      }
    } catch (e) {}
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !otpPendingEmail) return;
    try {
      await sendOtp(otpPendingEmail, otpPurpose || 'register', name);
      setResendCooldown(60);
      alert(`New 6-digit verification code sent to ${otpPendingEmail}! 📧`);
    } catch (e) {}
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setProfilePicture(res.data.data.url);
      }
    } catch (e) {
      alert('Failed to upload profile photo');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-pink-100 via-rose-50 via-purple-50 to-blue-100 text-slate-800 overflow-y-auto">
      {/* Floating Animated Hearts Background */}
      <FloatingHearts />

      <div className="relative z-10 w-full max-w-md p-8 bg-white/95 backdrop-blur-xl border border-white/90 rounded-[32px] shadow-2xl shadow-pink-500/15 space-y-6">
        
        {/* ================= STEP 2: 6-DIGIT OTP VERIFICATION SCREEN ================= */}
        {isOtpStep ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3.5 rounded-full bg-gradient-to-tr from-[#FF758C] to-[#FF7EB3] text-white shadow-lg shadow-pink-500/25 mb-1 animate-gentle-bounce">
                <KeyRound className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center justify-center gap-1.5">
                Verify Your Gmail
                <Sparkles className="w-5 h-5 text-pink-500" />
              </h2>
              <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
                We sent a 6-digit verification code to:
                <br />
                <span className="font-bold text-pink-600 font-mono text-sm">{otpPendingEmail}</span>
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 text-xs font-bold text-center animate-in fade-in">
                {error}
              </div>
            )}

            {/* 6-Digit Code Input Form */}
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div className="flex items-center justify-between gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-12 h-14 text-center text-xl font-bold font-mono bg-[#FFF0F5] text-slate-800 rounded-2xl border-2 border-pink-200 focus:border-pink-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-pink-200/50 shadow-sm transition-all"
                    required
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading || otpDigits.join('').length !== 6}
                className="w-full py-3.5 bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] text-white font-bold text-xs rounded-full shadow-lg shadow-pink-500/25 hover:scale-102 active:scale-98 transition-all disabled:opacity-50"
              >
                {isLoading
                  ? 'Verifying Code... ✨'
                  : otpPurpose === 'register'
                  ? 'Verify & Create Account 🌸'
                  : 'Verify & Sign In 💖'}
              </button>
            </form>

            {/* Resend Code & Back Buttons */}
            <div className="space-y-2 text-center text-xs">
              <div>
                {resendCooldown > 0 ? (
                  <span className="text-slate-400 font-medium">
                    Resend code in <strong className="text-pink-500 font-mono">{resendCooldown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="text-pink-600 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Resend Verification Code
                  </button>
                )}
              </div>

              <div className="pt-2 border-t border-pink-100">
                <button
                  type="button"
                  onClick={cancelOtp}
                  className="text-slate-400 hover:text-slate-600 font-semibold inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back / Change Details
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= STEP 1: INITIAL SIGN IN / SIGN UP FORM ================= */
          <div className="space-y-6">
            {/* App Branding & Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-gradient-to-tr from-[#FF758C] to-[#FF7EB3] text-white shadow-lg shadow-pink-500/25 mb-1 animate-gentle-bounce">
                <Heart className="w-8 h-8 fill-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center justify-center gap-1.5">
                mChat
                <Sparkles className="w-5 h-5 text-pink-500" />
              </h2>
              <p className="text-xs text-pink-400 font-semibold max-w-xs mx-auto">
                Cute Animated Messenger with Gmail OTP Verification.
              </p>
            </div>

            {/* Tab Switcher: Sign In vs Sign Up */}
            <div className="flex items-center p-1 bg-pink-50/80 rounded-full border border-pink-100">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  clearError();
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${
                  mode === 'signin'
                    ? 'bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] text-white shadow-md shadow-pink-500/20'
                    : 'text-slate-500 hover:text-pink-600'
                }`}
              >
                Sign In 💖
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  clearError();
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${
                  mode === 'signup'
                    ? 'bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] text-white shadow-md shadow-pink-500/20'
                    : 'text-slate-500 hover:text-pink-600'
                }`}
              >
                Create Account 🌸
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 text-xs font-bold text-center animate-in fade-in">
                {error}
              </div>
            )}

            {/* MODE 1: SIGN IN FORM */}
            {mode === 'signin' && (
              <form onSubmit={handleSignInSubmit} className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Email or Username
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 w-4 h-4 text-pink-400 pointer-events-none" />
                    <input
                      type="text"
                      value={signInIdentifier}
                      onChange={(e) => setSignInIdentifier(e.target.value)}
                      placeholder="name@gmail.com or username"
                      className="w-full pl-10 pr-4 py-3 bg-[#FFF0F5] text-xs font-medium text-slate-800 placeholder-pink-300 rounded-2xl border border-pink-200 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Password</label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 w-4 h-4 text-pink-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 bg-[#FFF0F5] text-xs text-slate-800 placeholder-pink-300 rounded-2xl border border-pink-200 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-pink-400 hover:text-pink-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] text-white font-bold text-xs rounded-full shadow-lg shadow-pink-500/25 hover:scale-102 active:scale-98 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Sending Verification Code... ✨' : 'Sign In to mChat 💖'}
                </button>
              </form>
            )}

            {/* MODE 2: SIGN UP FORM */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-3.5 animate-in fade-in duration-200">
                {/* Avatar Photo Picker */}
                <div className="flex items-center justify-center">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-16 h-16 rounded-full overflow-hidden bg-pink-50 border-2 border-dashed border-pink-300 hover:border-pink-500 cursor-pointer flex items-center justify-center group"
                  >
                    {profilePicture ? (
                      <img src={profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-pink-400 group-hover:text-pink-500" />
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Full Name
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3 w-3.5 h-3.5 text-pink-400 pointer-events-none" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Bubu Panda"
                        className="w-full pl-8 pr-3 py-2 bg-[#FFF0F5] text-xs text-slate-800 placeholder-pink-300 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Username
                    </label>
                    <div className="relative flex items-center">
                      <AtSign className="absolute left-3 w-3.5 h-3.5 text-pink-400 pointer-events-none" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="bubu_panda"
                        className="w-full pl-8 pr-3 py-2 bg-[#FFF0F5] text-xs text-slate-800 placeholder-pink-300 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Gmail Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 w-3.5 h-3.5 text-pink-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full pl-9 pr-3 py-2 bg-[#FFF0F5] text-xs text-slate-800 placeholder-pink-300 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Password (min 6 chars)
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 w-3.5 h-3.5 text-pink-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full pl-9 pr-9 py-2 bg-[#FFF0F5] text-xs text-slate-800 placeholder-pink-300 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-pink-400 hover:text-pink-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isUploadingAvatar}
                  className="w-full py-3.5 bg-gradient-to-r from-[#FF758C] to-[#FF7EB3] text-white font-bold text-xs rounded-full shadow-lg shadow-pink-500/25 hover:scale-102 active:scale-98 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Sending Code... 🌸' : 'Send Verification Code 📧'}
                </button>
              </form>
            )}

            {/* Footer Toggle */}
            <div className="text-center text-xs text-slate-500 pt-2 border-t border-pink-100">
              <p>
                {mode === 'signin' ? "Don't have an account yet?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                    clearError();
                  }}
                  className="text-pink-500 font-bold hover:underline"
                >
                  {mode === 'signin' ? 'Create one here 🌸' : 'Sign In 💖'}
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

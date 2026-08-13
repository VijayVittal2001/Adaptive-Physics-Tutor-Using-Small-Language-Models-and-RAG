import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogIn, Key, Mail, Shield, GraduationCap, Loader, Sparkles, UserPlus, User, Chrome, CheckCircle } from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, googleSignIn, error } = useAuth();
  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  const [role, setRole] = useState('student');
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [infoMessage, setInfoMessage] = useState(searchParams.get('verified') ? 'Email verified successfully. You can login now.' : '');

  const goToDashboard = (user) => user.role === 'admin' ? navigate('/admin/dashboard') : navigate('/student/dashboard');

  useEffect(() => {
    if (mode === 'register' && role === 'admin') setRole('student');
  }, [mode, role]);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;
    const scriptId = 'google-identity-services';
    const loadGoogle = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response.credential) return;
          setIsLoggingIn(true); setValidationError('');
          try {
            const user = await googleSignIn(response.credential);
            goToDashboard(user);
          } catch (err) {
            setValidationError(err.message || 'Google sign-in failed');
          } finally { setIsLoggingIn(false); }
        }
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, { theme: 'outline', size: 'large', width: 360, text: 'continue_with' });
    };
    if (!document.getElementById(scriptId)) {
      const s = document.createElement('script');
      s.id = scriptId;
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = loadGoogle;
      document.body.appendChild(s);
    } else {
      loadGoogle();
    }
  }, [googleClientId]);

  const handleRoleChange = (selectedRole) => {
    if (mode === 'register' && selectedRole === 'admin') {
      setValidationError('Administrator accounts cannot be created publicly. Login with the official admin account or ask existing admin to create one.');
      return;
    }
    setRole(selectedRole);
    setName(''); setEmail(''); setPassword('');
    setValidationError('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!captchaVerified) {
      setValidationError('Please verify that you are not a robot (reCAPTCHA).');
      return;
    }
    setValidationError(''); setInfoMessage(''); setIsLoggingIn(true);
    try {
      if (mode === 'login') {
        const user = await login(email, password);
        goToDashboard(user);
      } else {
        const result = await register({ name, email, password });
        if (result.requiresVerification) {
          setInfoMessage('Account created. Verify your email before login. For local SMTP-free testing, check backend/storage/email_outbox for the verification link.');
          setMode('login');
        } else {
          goToDashboard(result.user);
        }
      }
    } catch (err) {
      setValidationError(err.message || 'Authentication failed');
    } finally { setIsLoggingIn(false); }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight font-display mb-2">{mode === 'login' ? 'Log in' : 'Create account'}</h2>
        <p className="text-sm text-slate-500 font-bold">New to TIM Physics Tutor? <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setRole('student'); }} className="text-emerald-500 hover:text-emerald-600 hover:underline">{mode === 'login' ? 'Sign up' : 'Log in instead'}</button></p>
      </div>

      <div className="flex bg-[#F5F7FA] p-1.5 rounded-2xl mb-8">
        <button type="button" onClick={() => handleRoleChange('student')} className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-black transition-all ${role === 'student' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><GraduationCap size={16} strokeWidth={2.5} /><span>Student</span></button>
        <button type="button" onClick={() => handleRoleChange('admin')} disabled={mode === 'register'} className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-black transition-all ${role === 'admin' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'} ${mode === 'register' ? 'opacity-40 cursor-not-allowed' : ''}`}><Shield size={16} strokeWidth={2.5} /><span>Admin</span></button>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-5">
        {mode === 'register' && (
          <div>
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-2">Full Name</label>
            <div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><User size={18} strokeWidth={2.5} /></div><input required type="text" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-[#F5F7FA] focus:bg-white border-2 border-slate-200 focus:border-emerald-500 w-full rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-semibold focus:shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" placeholder="Your full name" /></div>
          </div>
        )}
        <div>
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-2">Email Address</label>
          <div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Mail size={18} strokeWidth={2.5} /></div><input required type="email" id="email" name="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#F5F7FA] focus:bg-white border-2 border-slate-200 focus:border-emerald-500 w-full rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-semibold focus:shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" placeholder="your@email.com" /></div>
        </div>
        <div>
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-2">Password</label>
          <div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Key size={18} strokeWidth={2.5} /></div><input required type="password" id="password" name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 6 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#F5F7FA] focus:bg-white border-2 border-slate-200 focus:border-emerald-500 w-full rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-semibold focus:shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" placeholder="••••••••" /></div>
        </div>

        {/* reCAPTCHA UI */}
        <div className="flex items-center justify-between bg-[#F5F7FA] border-2 border-slate-200 p-4 rounded-2xl w-full">
          <div className="flex items-center space-x-4">
            <div 
              className={`w-7 h-7 rounded bg-white border-2 flex items-center justify-center cursor-pointer transition-all ${captchaVerified ? 'border-emerald-500' : 'border-slate-300 hover:border-slate-400'}`}
              onClick={() => {
                if(!captchaVerified) {
                  // Simulate captcha verification network delay
                  setTimeout(() => setCaptchaVerified(true), 600);
                }
              }}
            >
              {captchaVerified && <CheckCircle size={16} className="text-emerald-500" strokeWidth={3} />}
            </div>
            <span className="text-sm font-bold text-slate-700">I'm not a robot</span>
          </div>
          <div className="flex flex-col items-center justify-center text-[8px] text-slate-400 font-bold uppercase tracking-wider">
            <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" className="h-6 opacity-70 mb-1" />
            <span>reCAPTCHA</span>
          </div>
        </div>

        {infoMessage && <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border-2 border-emerald-100 px-4 py-3 rounded-2xl font-bold"><CheckCircle size={16} className="mt-0.5 shrink-0" strokeWidth={2.5} />{infoMessage}</div>}
        {(validationError || error) && <div className="text-sm text-rose-600 bg-rose-50 border-2 border-rose-100 px-4 py-3 rounded-2xl font-bold">{validationError || error}</div>}
        
        <button type="submit" disabled={isLoggingIn} className="w-full flex justify-center py-4 px-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl text-sm font-black transition-all shadow-[0_4px_0_rgb(4,120,87)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none items-center space-x-2 disabled:opacity-60 disabled:shadow-none">
          {isLoggingIn ? <><Loader size={16} className="animate-spin" /><span>Processing secure session...</span></> : mode === 'login' ? <><LogIn size={16} strokeWidth={2.5} /><span>{role === 'admin' ? 'Access Admin Dashboard' : 'Log In Securely'}</span></> : <><UserPlus size={16} strokeWidth={2.5} /><span>Create Student Account</span></>}
        </button>
      </form>

      <div className="mt-8 flex items-center justify-center space-x-4">
        <div className="h-px bg-slate-200 w-full"></div>
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Or continue with</span>
        <div className="h-px bg-slate-200 w-full"></div>
      </div>

      <div className="mt-8">
        {googleClientId ? <div ref={googleButtonRef} className="flex justify-center"></div> : <button type="button" onClick={() => setValidationError('Google authentication is not configured. Please login with email.')} className="w-full flex justify-center py-3.5 px-4 bg-white text-slate-700 rounded-2xl text-sm font-black border-2 border-slate-200 items-center space-x-3 hover:bg-[#F5F7FA] transition-all hover:border-slate-300 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"><Chrome size={18} strokeWidth={2.5} className="text-blue-500" /><span>Sign in with Google</span></button>}
      </div>

      <div className="mt-12 bg-[#F5F7FA] p-6 rounded-3xl border-2 border-slate-200">
        <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4"><Sparkles size={12} className="text-emerald-500" strokeWidth={2.5} /><span>Demo Credentials</span></div>
        <div className="space-y-2">
          <button onClick={() => { setEmail('admin@physicsrag.com'); setPassword('admin123'); setRole('admin'); setMode('login'); setValidationError(''); }} className="w-full flex justify-between p-3 bg-white hover:bg-slate-50 rounded-xl border-2 border-slate-100 shadow-sm transition-all text-left">
            <span className="text-xs font-black text-slate-700">Admin Demo</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Auto-fill</span>
          </button>
          <button onClick={() => { setEmail('student@physicsrag.com'); setPassword('student123'); setRole('student'); setMode('login'); setValidationError(''); }} className="w-full flex justify-between p-3 bg-white hover:bg-slate-50 rounded-xl border-2 border-slate-100 shadow-sm transition-all text-left">
            <span className="text-xs font-black text-slate-700">Student Demo</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Auto-fill</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default Login;

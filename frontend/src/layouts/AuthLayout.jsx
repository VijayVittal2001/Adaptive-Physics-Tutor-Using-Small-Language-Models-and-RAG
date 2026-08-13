import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const AuthLayout = () => {
  const { isAuthenticated, user } = useAuth();

  // If already logged in, bypass login screen
  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />;
  }

  return (
    <div className="min-h-screen bg-white flex font-sans tracking-tight">
      {/* Left side brand area - hidden on small screens */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#F5F7FA] border-r-2 border-slate-200 flex-col justify-between p-16 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
        
        <div className="relative z-10 flex items-center space-x-3">
          <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-sm">
            <span className="font-extrabold text-2xl tracking-tight leading-none block">⚛️</span>
          </div>
          <div>
            <span className="font-black text-2xl text-slate-900 tracking-tight block font-display">TIM Physics Tutor</span>
            <span className="text-sm text-slate-500 font-bold uppercase tracking-widest block mt-0.5">Brilliant Learning</span>
          </div>
        </div>

        <div className="relative z-10 max-w-2xl mt-12">
          <h1 className="text-6xl xl:text-7xl font-black text-slate-900 leading-tight mb-8">
            Master physics <br/>with interactive <span className="text-emerald-500">AI</span>.
          </h1>
          <p className="text-xl xl:text-2xl font-bold text-slate-500 leading-relaxed mb-12">
            Your personal AI Physics Tutor. Chat directly with your NCERT textbooks, explore interactive simulations, and evaluate your answers securely offline.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="bg-emerald-100 text-emerald-600 p-2 rounded-full"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
              <span className="font-bold text-slate-700 text-xl">100% Offline RAG AI Tutor</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-emerald-100 text-emerald-600 p-2 rounded-full"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
              <span className="font-bold text-slate-700 text-xl">Interactive Learning Modules</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-emerald-100 text-emerald-600 p-2 rounded-full"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
              <span className="font-bold text-slate-700 text-xl">Real-time Exam Evaluation</span>
            </div>
          </div>
        </div>
        
        <div className="relative z-10">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">© 2026 TIM Physics Tutor AI Learning Platform</p>
        </div>
      </div>
      
      {/* Right side form area */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 xl:px-32 bg-white relative">
        <Outlet />
      </div>
    </div>
  );
};

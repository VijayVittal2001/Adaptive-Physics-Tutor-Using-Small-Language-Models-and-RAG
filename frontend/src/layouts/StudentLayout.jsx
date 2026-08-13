import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  BookOpen, 
  Search, 
  Play, 
  PenTool, 
  BarChart2, 
  Sparkles, 
  LogOut, 
  Menu, 
  X,
  User,
  GraduationCap,
  Sparkle
} from 'lucide-react';

export const StudentLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Study Dashboard', path: '/student/dashboard', icon: GraduationCap },
    { name: 'Physics Chapters', path: '/student/learn', icon: BookOpen },
    { name: 'Interactive Modules', path: '/student/interactive', icon: Sparkles },
    { name: 'PDF Textbook & RAG', path: '/student/pdf-viewer', icon: Search },
    { name: 'Video Learning Videos', path: '/student/videos', icon: Play },
    { name: 'Practice Center', path: '/student/practice', icon: PenTool },
    { name: 'My Performance', path: '/student/analytics', icon: BarChart2 },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex text-slate-900 font-sans tracking-tight">
      {/* Sidebar navigation */}
      <div className={`fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-200 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        {/* Brand logo header */}
        <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500 text-white p-2.5 rounded-xl shadow-sm">
              <span className="font-extrabold text-base">⚛️</span>
            </div>
            <div>
              <span className="font-black text-sm text-slate-900 tracking-tight block font-display">TIM Physics Tutor</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block -mt-1">Brilliant Learning</span>
            </div>
          </div>
          <button className="lg:hidden p-1 text-slate-400 hover:text-slate-900" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-140px)]">
          {navItems.map(item => {
            const Icon = item.icon;
            // Handle active checks for exact paths, and make sub-video routes look fine
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : 'text-slate-500 hover:bg-[#F5F7FA] hover:text-slate-900 hover:scale-[1.02]'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-emerald-500' : 'text-slate-400'} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer profile & logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                VK
              </div>
              <div className="max-w-[140px] truncate">
                <span className="text-xs font-bold text-slate-900 block truncate">{user?.name}</span>
                <span className="text-[10px] text-slate-500 font-bold block -mt-0.5">12th Standard</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all hover:scale-110"
              title="Logout session"
            >
              <LogOut size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Main container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center space-x-4">
            <button 
              className="lg:hidden p-2 text-slate-400 hover:text-slate-900 hover:bg-[#F5F7FA] rounded-lg transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center space-x-2 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-[pulse_2s_ease-in-out_infinite]"></span>
              <span className="font-bold text-slate-500 tracking-wide uppercase text-[10px]">Live Session</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Target Boards</span>
              <span className="text-xs font-bold text-slate-900 block -mt-1">Class XII Physics Exam</span>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <div className="flex items-center space-x-2 bg-[#F5F7FA] px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer">
              <User size={14} className="text-slate-500" strokeWidth={2.5} />
              <span className="text-xs font-bold text-slate-700">{user?.email}</span>
            </div>
          </div>
        </header>

        {/* Content body wrapper */}
        <main className="flex-1 p-4 md:p-6 max-w-full w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
export default StudentLayout;

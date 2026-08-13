import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import { mockAdminAnalytics } from '../../data/mockAnalytics';

export const AdminAnalyticsChart = ({ type = 'students' }) => {
  if (type === 'students') {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft h-[320px]">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-800 font-display">Active Student Engagement</h3>
          <p className="text-[11px] text-slate-400 font-medium">Daily interactive logins & RAG query attempts</p>
        </div>
        
        <div className="h-[210px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockAdminAnalytics.activeStudentsTrend} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.01}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  borderRadius: '12px', 
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)'
                }} 
              />
              <Area type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorStudents)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft h-[320px]">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800 font-display">Bloom Taxonomy Mastery</h3>
        <p className="text-[11px] text-slate-400 font-medium">Average question submissions sorted by cognitive depths</p>
      </div>
      
      <div className="h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mockAdminAnalytics.classBloomPerformance} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="level" stroke="#94a3b8" fontSize={10} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                borderRadius: '12px', 
                border: '1px solid #f1f5f9',
                boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)'
              }} 
            />
            <Bar dataKey="count" fill="#818cf8" radius={[6, 6, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
export default AdminAnalyticsChart;

import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { dashboardService } from '../../services/dashboardService';
import { Award, BarChart2, Brain, CheckCircle, Target, Clock, ChevronDown, ChevronUp, BookOpen, Lightbulb, Zap, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100 text-xs">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="font-medium">
            {entry.name === 'score' ? 'Score' : entry.name}: {entry.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const StatCard = ({ title, value, icon: Icon, description, colorClass }) => (
  <div className="bg-white rounded-2xl p-5 shadow-soft border border-slate-100 relative overflow-hidden group h-full flex flex-col justify-between">
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-125 ${colorClass}`}></div>
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{value}</h3>
      </div>
      <div className={`p-2 rounded-xl bg-white shadow-sm border border-slate-50 ${colorClass.replace('bg-', 'text-')}`}>
        <Icon size={20} />
      </div>
    </div>
    <p className="text-xs text-slate-500 font-medium">{description}</p>
  </div>
);

export const ProgressAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    dashboardService.getStudentStats().then(res => setData(res.data)).finally(() => setLoading(false));
  }, []);

  const bloomData = (data?.bloomLevelPerformance || []).map(x => ({ subject: x.level, score: x.score, attempts: x.attempts }));
  const marksData = (data?.marksWisePerformance || []).map(x => ({ name: x.marks, score: x.score, attempts: x.attempts }));
  const topicData = (data?.topicWiseScore || []).map(x => ({ name: x.topic?.length > 18 ? `${x.topic.slice(0, 18)}...` : x.topic, fullTopic: x.topic, score: x.score, attempts: x.attempts }));
  const masteredTopics = topicData.filter(t => t.score >= 80).length;

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
        activeTab === id 
          ? 'bg-indigo-600 text-white shadow-md' 
          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Performance Dashboard" subtitle="Analyze your strengths and plan your practice." badge="Student Metrics" />
      
      {loading ? (
        <div className="py-20 text-center text-xs font-bold text-slate-400 flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          Loading your metrics...
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 border-b border-slate-100 pb-4">
            <TabButton id="overview" label="Overview" icon={BarChart2} />
            <TabButton id="mastery" label="Topic Mastery" icon={Target} />
            <TabButton id="activity" label="Recent Activity" icon={Clock} />
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard title="Accuracy" value={`${data?.averagePercentage || 0}%`} icon={Target} description="Overall correct percentage" colorClass="bg-indigo-500" />
                <StatCard title="Total Score" value={`${data?.totalMarksScored || 0}/${data?.totalMaxMarks || 0}`} icon={Award} description="Accumulated marks" colorClass="bg-emerald-500" />
                <StatCard title="Attempted" value={data?.totalQuestionsAttempted || 0} icon={CheckCircle} description="Questions answered" colorClass="bg-sky-500" />
                <StatCard title="Mastered" value={masteredTopics} icon={Brain} description="Topics scoring > 80%" colorClass="bg-amber-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft h-[360px] flex flex-col">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">Cognitive Skills (Bloom's)</h3>
                    <p className="text-[11px] text-slate-400 font-medium mb-4">Your performance across learning levels</p>
                  </div>
                  <div className="flex-1 relative">
                    {bloomData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={bloomData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                          <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#818cf8" fillOpacity={0.4} />
                          <RechartsTooltip content={<CustomTooltip />} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-400">No Bloom data yet</div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft h-[360px] flex flex-col">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">Performance by Question Value</h3>
                    <p className="text-[11px] text-slate-400 font-medium mb-4">How well you do on 1M vs 5M questions</p>
                  </div>
                  <div className="flex-1 relative">
                    {marksData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={marksData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorMarks" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#34d399" stopOpacity={0.2}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} dy={10} />
                          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                          <Bar dataKey="score" fill="url(#colorMarks)" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-400">No marks data yet</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mastery' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
                <h3 className="text-sm font-extrabold text-slate-800">Topic-wise Score</h3>
                <p className="text-[11px] text-slate-400 font-medium mb-6">Average percentage scored across all topics</p>
                <div className="h-[280px] w-full">
                  {topicData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topicData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <defs>
                          <linearGradient id="colorTopic" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0.2}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} dy={10} interval={0} angle={-25} textAnchor="end" />
                        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="score" fill="url(#colorTopic)" radius={[6, 6, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">No submissions yet</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopicAccordionList title="Areas for Improvement" topics={data?.weakTopics || []} type="weak" />
                <TopicAccordionList title="Your Strengths" topics={data?.strengthTopics || []} type="strength" />
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-sm font-extrabold text-slate-800 mb-6">Submission History</h3>
              <div className="space-y-6">
                {(data?.recentSubmissions || []).length ? data.recentSubmissions.map((r, i) => (
                  <ActivityItem key={i} item={r} />
                )) : (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                    <BookOpen size={32} className="mb-3 opacity-20" />
                    <p className="text-xs font-bold">No recent activity found.</p>
                    <p className="text-[10px]">Head over to the Practice Center to get started.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const TopicAccordionList = ({ title, topics, type }) => {
  const isWeak = type === 'weak';
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
      <div className="flex items-center gap-2 mb-5">
        {isWeak ? <Target size={18} className="text-rose-500" /> : <Zap size={18} className="text-amber-500" />}
        <h3 className="text-sm font-extrabold text-slate-800">{title}</h3>
      </div>
      <div className="space-y-3">
        {topics.length ? topics.map((t, i) => (
          <TopicAccordion key={i} topic={t} isWeak={isWeak} />
        )) : (
          <p className="text-xs text-slate-400 font-semibold py-4 text-center border border-dashed border-slate-200 rounded-xl">Not enough data to determine.</p>
        )}
      </div>
    </div>
  );
};

const TopicAccordion = ({ topic, isWeak }) => {
  const [isOpen, setIsOpen] = useState(false);
  const colorClass = isWeak ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100';
  const progressColor = isWeak ? 'bg-rose-500' : 'bg-amber-500';

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left outline-none"
      >
        <div className="flex-1 pr-4">
          <b className="text-sm text-slate-800 block mb-1">{topic.topic || topic.fullTopic}</b>
          <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500">
            <span>Score: <span className={isWeak ? 'text-rose-600' : 'text-amber-600'}>{topic.score}%</span></span>
            <span>Attempts: {topic.attempts}</span>
          </div>
        </div>
        <div className={`p-1.5 rounded-lg border ${colorClass}`}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      
      {isOpen && (
        <div className="p-4 bg-white border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
          <div className="mb-4">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1.5">
              <span>Mastery Progress</span>
              <span>{topic.score}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${progressColor}`} style={{ width: `${topic.score}%` }}></div>
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex gap-3 items-start">
            <Lightbulb size={16} className={isWeak ? 'text-rose-500 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} />
            <div>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                {isWeak 
                  ? "This topic needs more attention. We recommend heading to the Practice Center to watch the concept video and attempt more questions." 
                  : "Great job! You have a strong grasp of this topic. Try tackling harder Application-level questions to solidify your knowledge."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActivityItem = ({ item }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const date = new Date(item.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const isGood = item.percentage >= 70;
  
  return (
    <div className="relative pl-6 border-l-2 border-slate-100 pb-2 last:border-0 last:pb-0 group">
      <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white ${isGood ? 'bg-emerald-400' : 'bg-amber-400'} shadow-sm`}></div>
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full">{item.topic}</span>
            <span className="text-[10px] font-bold text-slate-400">{date}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm shrink-0 w-fit">
            <TrendingUp size={12} className={isGood ? 'text-emerald-500' : 'text-amber-500'} />
            <span className="text-xs font-extrabold text-slate-700">{item.marksObtained}/{item.maxMarks}</span>
            <span className={`text-[10px] font-bold ${isGood ? 'text-emerald-600' : 'text-amber-600'}`}>({item.percentage}%)</span>
          </div>
        </div>
        
        <div className="text-sm text-slate-700 font-medium leading-relaxed">
          <b className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Question</b>
          <p className={isExpanded ? '' : 'line-clamp-2'}>{item.question}</p>
        </div>
        
        {isExpanded && item.feedback && (
          <div className="mt-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm animate-in fade-in duration-300">
            <b className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">AI Feedback</b>
            <p className="text-xs text-slate-600 leading-relaxed">{item.feedback}</p>
          </div>
        )}
        
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors w-full sm:w-auto"
        >
          {isExpanded ? 'Show Less' : 'Read Full Question & Feedback'}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
    </div>
  );
};

export default ProgressAnalytics;

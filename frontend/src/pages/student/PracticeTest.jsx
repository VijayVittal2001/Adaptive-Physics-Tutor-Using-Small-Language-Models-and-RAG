import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { questionService } from '../../services/questionService';
import { pdfService } from '../../services/pdfService';
import { videoService } from '../../services/videoService';
import { API_ORIGIN } from '../../services/api';
import { AlertCircle, CheckCircle, Layers, Send, SlidersHorizontal, PlayCircle, ArrowDownCircle, ShieldAlert, Award, Mic, MicOff } from 'lucide-react';
import { VideoPlayerCard } from '../../components/student/VideoPlayerCard';

const marksGroups = [1, 2, 3, 5];

export const PracticeTest = () => {
  const navigate = useNavigate();
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [chapterId, setChapterId] = useState('all');
  const [topicId, setTopicId] = useState('all');
  const [bloomLevel, setBloomLevel] = useState('all');
  const [marks, setMarks] = useState('all');
  
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});
  const [telemetry, setTelemetry] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);
  const [topicVideos, setTopicVideos] = useState([]);
  const [error, setError] = useState('');
  
  // Navigation State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef(null);
  const activeQuestionIdRef = useRef(null);

  const grouped = useMemo(() => {
    const out = { 1: [], 2: [], 3: [], 5: [] };
    questions.forEach(q => {
      const m = Number(q.marks || 0);
      if (!out[m]) out[m] = [];
      out[m].push(q);
    });
    return out;
  }, [questions]);

  // Flattened questions for pagination
  const sortedQuestions = useMemo(() => {
    const sorted = [];
    marksGroups.forEach(m => {
      if (grouped[m]) sorted.push(...grouped[m]);
    });
    return sorted;
  }, [grouped]);

  const loadChapters = async () => {
    try { const res = await pdfService.getChapters(); setChapters(res.data || []); } catch { setChapters([]); }
  };
  const loadTopics = async (ch = 'all') => {
    try { const res = await pdfService.getTopics(ch || 'all'); setTopics(res.data || []); } catch { setTopics([]); }
  };
  
  const fetchQuestions = async () => {
    setLoading(true); setError(''); setIsTestSubmitted(false); setResults({}); setAnswers({}); setCurrentQuestionIndex(0);
    if (topicId !== 'all') {
      try { const vRes = await videoService.getVideos(topicId, chapterId); setTopicVideos(vRes.data || []); }
      catch { setTopicVideos([]); }
    } else {
      setTopicVideos([]);
    }
    try {
      const res = await questionService.getQuestions({ chapter_id: chapterId, topic_id: topicId, bloom_level: bloomLevel, marks });
      setQuestions(res.data || []);
    } catch (e) {
      setQuestions([]);
      setError(e.message || 'Could not load questions. Ask admin to add questions.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadChapters(); loadTopics('all'); }, []);
  useEffect(() => { loadTopics(chapterId); setTopicId('all'); }, [chapterId]);
  useEffect(() => { fetchQuestions(); }, [chapterId, topicId, bloomLevel, marks]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        let finalStr = '';
        let interimStr = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript;
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }
        if (finalStr) {
          setAnswers(prev => {
            const qid = activeQuestionIdRef.current;
            const currentAns = prev[qid] || '';
            return { ...prev, [qid]: (currentAns + ' ' + finalStr).trim() };
          });
        }
        setInterimText(interimStr);
      };
      
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  // Stop listening if user navigates away from the question
  useEffect(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText('');
    }
  }, [currentQuestionIndex]);

  const toggleListening = (qid) => {
    if (!recognitionRef.current) {
      setError("Voice typing is not supported in your browser. Please use Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText('');
    } else {
      activeQuestionIdRef.current = qid;
      setInterimText('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const setAnswer = (qid, value) => setAnswers(prev => ({ ...prev, [qid]: value }));
  const blockPaste = (qid, e) => {
    e.preventDefault();
    setTelemetry(prev => ({ ...prev, [qid]: { ...(prev[qid] || {}), pasteAttempts: ((prev[qid]?.pasteAttempts || 0) + 1) } }));
    setError('Copy-paste is disabled in descriptive answer boxes. Please type your own answer.');
  };

  const submitAll = async () => {
    // Stop listening if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText('');
    }

    const unanswered = sortedQuestions.filter(q => !String(answers[q.id] || '').trim());
    if (unanswered.length > 0) {
      const confirmSubmit = window.confirm(`You have unanswered questions (${unanswered.length} left). Are you sure you want to submit?`);
      if (!confirmSubmit) return;
    }
    
    setIsSubmittingTest(true);
    setError('');
    const newResults = { ...results };
    let hasError = false;
    for (const q of sortedQuestions) {
      try {
        const payload = q.questionType === 'mcq'
          ? { questionId: q.id, selectedOption: answers[q.id] || '', telemetryData: telemetry[q.id] || {} }
          : { questionId: q.id, studentAnswer: answers[q.id] || '', telemetryData: telemetry[q.id] || {} };
        const res = await questionService.submitAnswer(payload);
        newResults[q.id] = res.data;
      } catch (e) {
        hasError = true;
        setError(`Failed to evaluate question. Error: ${e.message}`);
        break;
      }
    }
    if (!hasError) {
      setResults(newResults);
      setIsTestSubmitted(true);
      setCurrentQuestionIndex(0); // reset to first to review
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsSubmittingTest(false);
  };


  const totalMaxMarks = sortedQuestions.reduce((sum, q) => sum + Number(q.marks || 0), 0);
  const totalObtained = isTestSubmitted ? sortedQuestions.reduce((sum, q) => {
    const r = results[q.id] || q.lastResult;
    return sum + Number(r?.marksObtained ?? r?.score ?? 0);
  }, 0) : 0;
  const avgPercentage = isTestSubmitted && sortedQuestions.length > 0 ? Math.round(sortedQuestions.reduce((sum, q) => sum + Number((results[q.id] || q.lastResult)?.percentage ?? 0), 0) / sortedQuestions.length) : 0;

  return (
    <div className="space-y-8">
      <PageHeader title="Topic-wise Practice Center" subtitle="Attempt admin-uploaded MCQ and descriptive questions. After submission, the correct/model answer and related topic video option will appear." badge="Student Practice" />
      {error && <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl px-5 py-3 text-xs font-bold flex gap-2 items-center"><AlertCircle size={15}/>{error}</div>}
      
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4"><div className="flex items-center gap-2 text-slate-800 border-b border-slate-50 pb-3"><SlidersHorizontal size={16} className="text-indigo-600"/><h3 className="text-xs font-extrabold uppercase tracking-wider">Choose Chapter, Topic and Question Type</h3></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"><label className="space-y-1"><span className="text-[10px] font-bold text-slate-400 uppercase">Chapter</span><select value={chapterId} onChange={e => setChapterId(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none"><option value="all">All Chapters</option>{chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}</select></label><label className="space-y-1"><span className="text-[10px] font-bold text-slate-400 uppercase">Topic</span><select value={topicId} onChange={e => setTopicId(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none"><option value="all">All Topics</option>{topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label><label className="space-y-1"><span className="text-[10px] font-bold text-slate-400 uppercase">Bloom Level</span><select value={bloomLevel} onChange={e => setBloomLevel(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none"><option value="all">All Bloom Levels</option><option value="Remembering">Remembering</option><option value="Understanding">Understanding</option><option value="Application">Application</option></select></label><label className="space-y-1"><span className="text-[10px] font-bold text-slate-400 uppercase">Marks</span><select value={marks} onChange={e => setMarks(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none"><option value="all">All Marks</option><option value="1">1 Mark MCQ</option><option value="2">2 Marks</option><option value="3">3 Marks</option><option value="5">5 Marks</option></select></label></div></div>

      {topicVideos.length > 0 && !isTestSubmitted && (
        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 space-y-4">
          <div className="flex items-center gap-2 text-indigo-800"><PlayCircle size={18}/><h3 className="text-sm font-extrabold uppercase tracking-wider">Before answering, watch topic videos</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topicVideos.map(v => <VideoPlayerCard key={v.id} video={v} />)}
          </div>
        </div>
      )}

      {isTestSubmitted && sortedQuestions.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center space-y-3">
          <Award className="mx-auto text-emerald-600" size={32} />
          <h2 className="text-lg font-extrabold text-slate-800">Test Evaluation Complete</h2>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm mt-4">
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-emerald-100">Total Score: <b className="text-emerald-700">{totalObtained} / {totalMaxMarks}</b></div>
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-emerald-100">Average Percentage: <b className="text-emerald-700">{avgPercentage}%</b></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Use the Question Navigator to review detailed feedback, semantic scores, and expected answers for each question.</p>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs font-bold text-slate-400">Loading questions...</div>
      ) : sortedQuestions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-12 text-center"><Layers className="mx-auto text-slate-300 mb-3"/><h3 className="font-extrabold text-slate-800">No questions available</h3><p className="text-xs text-slate-500 mt-2">Admin must add questions from Question Bank Management.</p></div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-1/4 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-5 sticky top-6">
              <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-50 pb-3 mb-4">Question Navigator</h3>
              <div className="space-y-5">
                {marksGroups.map(m => grouped[m]?.length > 0 && (
                  <div key={m}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">{m === 1 ? '1 Mark MCQ' : `${m} Marks`}</div>
                    <div className="grid grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                      {grouped[m].map((q) => {
                        const absoluteIndex = sortedQuestions.findIndex(sq => sq.id === q.id);
                        const isCurrent = absoluteIndex === currentQuestionIndex;
                        const isAnswered = !!String(answers[q.id] || '').trim();
                        const result = results[q.id];
                        
                        let btnClass = "w-full aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all border outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-300 ";
                        
                        if (isTestSubmitted && result) {
                          if (result.percentage >= 80) btnClass += "bg-emerald-50 text-emerald-700 border-emerald-200";
                          else if (result.percentage >= 50) btnClass += "bg-amber-50 text-amber-700 border-amber-200";
                          else btnClass += "bg-rose-50 text-rose-700 border-rose-200";
                          
                          if (isCurrent) btnClass += " ring-2 ring-slate-800 ring-offset-2";
                        } else {
                          if (isCurrent) btnClass += "bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-600 ring-offset-2";
                          else if (isAnswered) btnClass += "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100";
                          else btnClass += "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100";
                        }
                        
                        return (
                          <button key={q.id} onClick={() => setCurrentQuestionIndex(absoluteIndex)} className={btnClass}>
                            {absoluteIndex + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              {!isTestSubmitted && (
                <div className="mt-6 pt-5 border-t border-slate-50">
                  <button disabled={isSubmittingTest} onClick={submitAll} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-3 text-sm font-bold shadow-soft flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                    <Send size={16} />
                    {isSubmittingTest ? 'Evaluating...' : 'Submit Full Test'}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Main Content Area */}
          <div className="w-full lg:w-3/4 space-y-4">
            <QuestionBox 
              q={sortedQuestions[currentQuestionIndex]} 
              index={currentQuestionIndex + 1} 
              isTestSubmitted={isTestSubmitted}
              results={results}
              answers={answers}
              setAnswer={setAnswer}
              blockPaste={blockPaste}
              isListening={isListening}
              activeQuestionId={activeQuestionIdRef.current}
              toggleListening={toggleListening}
              interimText={interimText}
              telemetry={telemetry}
              navigate={navigate}
            />
            
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-soft p-4">
              <button 
                disabled={currentQuestionIndex === 0} 
                onClick={() => setCurrentQuestionIndex(c => Math.max(0, c - 1))}
                className="px-5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-slate-400">
                {currentQuestionIndex + 1} of {sortedQuestions.length}
              </span>
              <button 
                disabled={currentQuestionIndex === sortedQuestions.length - 1} 
                onClick={() => setCurrentQuestionIndex(c => Math.min(sortedQuestions.length - 1, c + 1))}
                className="px-5 py-2.5 text-xs font-bold rounded-xl border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 transition-all"
              >
                Next Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PracticeTest;

const QuestionBox = ({
  q,
  index,
  isTestSubmitted,
  results,
  answers,
  setAnswer,
  blockPaste,
  isListening,
  activeQuestionId,
  toggleListening,
  interimText,
  telemetry,
  navigate
}) => {
  if (!q) return null;
  const result = isTestSubmitted ? (results[q.id] || q.lastResult) : null;
  const isMcq = q.questionType === 'mcq';
  const isRememberingOrUnderstanding = q.bloomLevel === 'Remembering' || q.bloomLevel === 'Understanding';
  const expected = result?.modelAnswer || result?.improvedAnswer || '';
  
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 border-b border-slate-50 pb-4">
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full">Question {index}</span>
            <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{q.marks} Mark</span>
            <span className="text-[10px] font-extrabold uppercase bg-sky-50 text-sky-600 border border-sky-100 px-2 py-0.5 rounded-full">{q.bloomLevel}</span>
          </div>
          <h4 className="font-extrabold text-slate-800 text-lg leading-relaxed">{q.text}</h4>
        </div>
        {result && <div className="text-right shrink-0"><span className="text-[10px] uppercase font-bold text-slate-400 block">Score</span><span className="text-2xl font-extrabold text-indigo-600">{result.marksObtained ?? result.score}/{result.maxMarks}</span></div>}
      </div>

      {q.imageUrl && <div className="bg-slate-50 border border-slate-100 rounded-xl p-3"><img src={`${API_ORIGIN}${q.imageUrl}?t=${Date.now()}`} alt="Question diagram" className="max-h-80 rounded-xl border border-slate-100 object-contain mx-auto" /></div>}

      <div className="pt-2">
        {isMcq ? (
          <div className="grid grid-cols-1 gap-3">
            {(q.options || []).map(opt => (
              <label key={opt.key} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer text-sm transition-all ${answers[q.id] === opt.key ? 'border-indigo-400 bg-indigo-50/50 shadow-sm' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'}`}>
                <input type="radio" name={q.id} value={opt.key} checked={answers[q.id] === opt.key} onChange={() => setAnswer(q.id, opt.key)} className="mt-1 w-4 h-4 text-indigo-600"/>
                <span className="leading-relaxed"><b>{opt.key}.</b> {opt.text}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <textarea 
                value={answers[q.id] || ''} 
                onChange={e => setAnswer(q.id, e.target.value)} 
                onPaste={(e) => blockPaste(q.id, e)} 
                rows={6} 
                disabled={isTestSubmitted}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm leading-relaxed outline-none focus:border-indigo-400 focus:bg-white transition-all resize-y disabled:opacity-75 disabled:bg-slate-100" 
                placeholder={isTestSubmitted ? "Your answer" : "Write your answer here. Copy-paste is disabled."} 
              />
              
              {isRememberingOrUnderstanding && !isTestSubmitted && (
                <button 
                  onClick={() => toggleListening(q.id)}
                  title="Voice Typing"
                  className={`absolute bottom-4 right-4 p-2 rounded-full shadow-sm transition-all ${isListening && activeQuestionId === q.id ? 'bg-rose-100 text-rose-600 animate-pulse border border-rose-200' : 'bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200'}`}
                >
                  {isListening && activeQuestionId === q.id ? <Mic size={18} /> : <MicOff size={18} />}
                </button>
              )}
            </div>
            
            {isListening && activeQuestionId === q.id && interimText && (
              <div className="text-xs text-indigo-500 font-medium px-2 animate-pulse">
                Listening: "{interimText}"
              </div>
            )}
            
            {telemetry[q.id]?.pasteAttempts > 0 && <div className="flex items-center gap-2 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2"><ShieldAlert size={13}/>Paste attempt blocked: {telemetry[q.id].pasteAttempts}</div>}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
        <span className="text-[11px] text-slate-400 font-semibold">{isTestSubmitted ? 'Evaluation completed.' : 'Answer/model answer unlocks only after test submission.'}</span>
      </div>

      {result && <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 space-y-4 mt-6">
        <div className="flex items-center gap-2 text-emerald-700 text-xs font-extrabold"><CheckCircle size={15}/>Evaluation Result</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs"><div className="bg-white rounded-xl p-3"><span className="text-slate-400 font-bold block uppercase">Rubric</span><b>{result.rubricScore ?? result.percentage}%</b></div><div className="bg-white rounded-xl p-3"><span className="text-slate-400 font-bold block uppercase">Similarity</span><b>{result.similarityScore ?? result.semanticScore}%</b></div><div className="bg-white rounded-xl p-3"><span className="text-slate-400 font-bold block uppercase">Keywords</span><b>{result.keywordScore ?? 0}%</b></div><div className="bg-white rounded-xl p-3"><span className="text-slate-400 font-bold block uppercase">Final</span><b>{result.percentage}%</b></div></div>
        <p className="text-sm text-slate-700 font-medium leading-relaxed"><b>Feedback:</b> {result.feedback}</p>
        {q.solutionVideoUrl && <div className="bg-white rounded-xl p-3 border border-emerald-100"><b className="block text-slate-800 text-sm mb-2">Admin solution video</b><video src={`${API_ORIGIN}${q.solutionVideoUrl}`} controls className="w-full rounded-xl border border-slate-100" /></div>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-3 text-sm text-slate-700 border border-emerald-100"><b className="block text-slate-800 mb-1">{isMcq ? 'Correct Answer' : 'Expected / Model Answer'}</b>{isMcq ? <span>Correct option: <b>{result.correctOption}</b>{expected ? ` — ${expected}` : ''}</span> : <span className="whitespace-pre-line">{expected || 'Model answer was not stored by admin.'}</span>}{result.explanation && <p className="mt-2 text-xs text-slate-500"><b>Explanation:</b> {result.explanation}</p>}</div>
          <div className="bg-white rounded-xl p-3 border border-indigo-100 space-y-3"><b className="block text-slate-800 text-sm">Next Improvement Step</b><button disabled={!q.topicId || q.topicId === 'unmapped-topic'} onClick={() => navigate(`/student/video/${q.topicId}`)} className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-100 rounded-xl px-3 py-2 text-xs font-bold transition-all disabled:opacity-50"><PlayCircle size={14}/>Watch topic video if uploaded</button></div>
        </div>
      </div>}
    </div>
  );
};

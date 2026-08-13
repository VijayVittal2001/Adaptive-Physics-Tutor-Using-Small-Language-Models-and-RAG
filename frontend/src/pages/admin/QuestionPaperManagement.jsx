import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { questionService } from '../../services/questionService';
import { pdfService } from '../../services/pdfService';
import { Brain, CheckCircle, Edit3, FileQuestion, Image, ListChecks, Plus, RefreshCw, Save, Trash2, Video } from 'lucide-react';
import { API_ORIGIN } from '../../services/api';

const blankForm = {
  chapterId: 'all',
  topicId: '',
  questionType: 'mcq',
  marks: 1,
  bloomLevel: 'Remembering',
  difficulty: 'Easy',
  questionText: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctOption: 'A',
  explanation: '',
  modelAnswer: '',
  rubric: '',
  keywords: '',
  questionImage: null,
  solutionVideo: null
};

export const QuestionPaperManagement = () => {
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState({ chapter_id: 'all', topic_id: 'all', marks: 'all', bloom_level: 'all' });

  const selectedTopic = useMemo(() => topics.find(t => t.id === form.topicId), [topics, form.topicId]);

  const loadChapters = async () => {
    try {
      const res = await pdfService.getChapters();
      setChapters(res.data || []);
    } catch {
      setChapters([]);
    }
  };

  const loadTopics = async (chapterId = 'all') => {
    try {
      const res = await pdfService.getTopics(chapterId || 'all');
      setTopics(res.data || []);
      if ((res.data || []).length && (!form.topicId || chapterId !== form.chapterId)) {
        setForm(prev => ({ ...prev, topicId: res.data[0].id, chapterId: res.data[0].chapterId || chapterId }));
      }
    } catch {
      setTopics([]);
    }
  };

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const res = await questionService.getAdminQuestions(filter);
      setQuestions(res.data || []);
    } catch (e) {
      setMessage(e.message || 'Could not load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadChapters(); loadTopics('all'); }, []);
  useEffect(() => { loadQuestions(); }, [filter.chapter_id, filter.topic_id, filter.marks, filter.bloom_level]);

  const update = (key, value) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'questionType') next.marks = value === 'mcq' ? 1 : 2;
      if (key === 'topicId') {
        const t = topics.find(x => x.id === value);
        if (t) next.chapterId = t.chapterId;
      }
      return next;
    });
  };

  const handleChapterChange = async (value) => {
    setForm(prev => ({ ...prev, chapterId: value, topicId: '' }));
    await loadTopics(value);
  };

  const reset = () => {
    setEditingId(null);
    setForm({ ...blankForm, chapterId: chapters[0]?.id || 'all', topicId: topics[0]?.id || '' });
  };

  const saveQuestion = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    const payload = {
      chapterId: form.chapterId === 'all' ? selectedTopic?.chapterId : form.chapterId,
      topicId: form.topicId,
      questionType: form.questionType,
      marks: form.questionType === 'mcq' ? 1 : Number(form.marks),
      bloomLevel: form.bloomLevel,
      difficulty: form.difficulty,
      questionText: form.questionText,
      optionA: form.optionA,
      optionB: form.optionB,
      optionC: form.optionC,
      optionD: form.optionD,
      correctOption: form.correctOption,
      explanation: form.explanation,
      modelAnswer: form.modelAnswer,
      rubric: form.rubric,
      keywords: form.keywords
    };
    try {
      const saved = editingId ? await questionService.updateQuestion(editingId, payload) : await questionService.createQuestion(payload);
      const savedId = saved?.data?.id || editingId;
      if (savedId && (form.questionImage || form.solutionVideo)) {
        await questionService.uploadQuestionMedia(savedId, { image: form.questionImage, solutionVideo: form.solutionVideo });
      }
      setMessage(editingId ? 'Question updated successfully.' : 'Question added successfully.');
      reset();
      await loadQuestions();
    } catch (e2) {
      setMessage(e2.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const editQuestion = (q) => {
    setEditingId(q.id);
    setForm({
      chapterId: q.chapterId || 'all',
      topicId: q.topicId || '',
      questionType: q.questionType || 'descriptive',
      marks: q.marks || 2,
      bloomLevel: q.bloomLevel || 'Remembering',
      difficulty: q.difficulty || 'Easy',
      questionText: q.text || q.questionText || '',
      optionA: q.options?.find(o => o.key === 'A')?.text || '',
      optionB: q.options?.find(o => o.key === 'B')?.text || '',
      optionC: q.options?.find(o => o.key === 'C')?.text || '',
      optionD: q.options?.find(o => o.key === 'D')?.text || '',
      correctOption: q.correctOption || 'A',
      explanation: q.explanation || '',
      modelAnswer: q.modelAnswer || '',
      rubric: q.rubricText || q.rubric?.rubric || '',
      keywords: q.keywords || (q.rubric?.keywords || []).join(', '),
      questionImage: null,
      solutionVideo: null
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeQuestion = async (id) => {
    if (!confirm('Delete this question?')) return;
    try {
      await questionService.deleteQuestion(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
      setMessage('Question deleted.');
    } catch (e) {
      setMessage(e.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Question Bank Management" subtitle="Admin manually adds topic-wise 1M MCQ and 2M/3M/5M descriptive questions. Students cannot see answers before submission." badge="Manual Question Upload" />

      {message && <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl px-5 py-3 text-xs font-bold">{message}</div>}

      <form onSubmit={saveQuestion} className="bg-white rounded-2xl border border-slate-100 shadow-soft p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-50 pb-4">
          <div className="flex items-center gap-2 text-slate-800"><FileQuestion size={18} className="text-indigo-600" /><h3 className="font-extrabold text-sm">{editingId ? 'Edit Question' : 'Add New Question'}</h3></div>
          <button type="button" onClick={reset} className="text-[11px] font-bold text-slate-500 hover:text-indigo-600">Clear Form</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-400">Chapter</span><select value={form.chapterId} onChange={e => handleChapterChange(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold outline-none"><option value="all">All / Auto from topic</option>{chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}</select></label>
          <label className="space-y-1 md:col-span-2"><span className="text-[10px] font-bold uppercase text-slate-400">Topic</span><select required value={form.topicId} onChange={e => update('topicId', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold outline-none"><option value="">Select processed PDF topic</option>{topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
          <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-400">Question Type</span><select value={form.questionType} onChange={e => update('questionType', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold outline-none"><option value="mcq">1 Mark MCQ</option><option value="descriptive">Descriptive</option></select></label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-400">Marks</span><select disabled={form.questionType === 'mcq'} value={form.marks} onChange={e => update('marks', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold outline-none disabled:opacity-60"><option value="1">1 Mark</option><option value="2">2 Marks</option><option value="3">3 Marks</option><option value="5">5 Marks</option></select></label>
          <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-400">Bloom Level</span><select value={form.bloomLevel} onChange={e => update('bloomLevel', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold outline-none"><option>Remembering</option><option>Understanding</option><option>Application</option></select></label>
          <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-400">Difficulty</span><select value={form.difficulty} onChange={e => update('difficulty', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold outline-none"><option>Easy</option><option>Medium</option><option>Hard</option></select></label>
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] text-slate-500 font-semibold flex items-center">Answers are hidden from students until submission.</div>
        </div>

        <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400">Question</span><textarea required value={form.questionText} onChange={e => update('questionText', e.target.value)} rows={3} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm outline-none" placeholder="Enter your question here" /></label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1 block bg-slate-50 border border-slate-100 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1"><Image size={12}/>Optional question photo / diagram</span>
            <input type="file" accept="image/*" onChange={e => update('questionImage', e.target.files?.[0] || null)} className="mt-2 w-full text-xs" />
            <p className="text-[10px] text-slate-400 mt-1">Use this for “Explain the given diagram” questions.</p>
          </label>
          <label className="space-y-1 block bg-slate-50 border border-slate-100 rounded-xl p-3">
            <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1"><Video size={12}/>Optional solution video</span>
            <input type="file" accept="video/*" onChange={e => update('solutionVideo', e.target.files?.[0] || null)} className="mt-2 w-full text-xs" />
            <p className="text-[10px] text-slate-400 mt-1">Upload only when this question needs a video solution.</p>
          </label>
        </div>

        {form.questionType === 'mcq' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['A','B','C','D'].map(opt => <label key={opt} className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-400">Option {opt}</span><input required value={form[`option${opt}`]} onChange={e => update(`option${opt}`, e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm outline-none" /></label>)}
            <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-400">Correct Option</span><select value={form.correctOption} onChange={e => update('correctOption', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold outline-none"><option>A</option><option>B</option><option>C</option><option>D</option></select></label>
            <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-400">Explanation optional</span><input value={form.explanation} onChange={e => update('explanation', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm outline-none" /></label>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400">Model / Expected Answer</span><textarea required value={form.modelAnswer} onChange={e => update('modelAnswer', e.target.value)} rows={5} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm outline-none" placeholder="This is used only for backend evaluation" /></label>
            <div className="space-y-4"><label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400">Rubric / Evaluation Criteria</span><textarea value={form.rubric} onChange={e => update('rubric', e.target.value)} rows={3} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm outline-none" placeholder="Example: definition, formula, diagram point, conclusion" /></label><label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400">Keywords optional</span><input value={form.keywords} onChange={e => update('keywords', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm outline-none" placeholder="comma separated keywords" /></label></div>
          </div>
        )}

        <button disabled={saving || !form.topicId} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-xs font-bold shadow-soft"><Save size={14}/>{saving ? 'Saving...' : editingId ? 'Update Question' : 'Add Question'}</button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-50 pb-4">
          <div className="flex items-center gap-2 text-slate-800"><ListChecks size={18} className="text-indigo-600"/><h3 className="font-extrabold text-sm">Saved Questions</h3></div>
          <div className="flex flex-wrap gap-3">
            <select value={filter.chapter_id} onChange={e => setFilter(f => ({...f, chapter_id: e.target.value, topic_id: 'all'}))} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold"><option value="all">All Chapters</option>{chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}</select>
            <select value={filter.topic_id} onChange={e => setFilter(f => ({...f, topic_id: e.target.value}))} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold"><option value="all">All Topics</option>{topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
            <select value={filter.marks} onChange={e => setFilter(f => ({...f, marks: e.target.value}))} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold"><option value="all">All Marks</option><option value="1">1M</option><option value="2">2M</option><option value="3">3M</option><option value="5">5M</option></select>
            <button onClick={loadQuestions} className="bg-indigo-50 text-indigo-600 rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1"><RefreshCw size={12}/>Refresh</button>
          </div>
        </div>

        {loading ? <div className="py-10 text-center text-xs font-bold text-slate-400">Loading questions...</div> : questions.length === 0 ? <div className="py-10 text-center text-xs font-bold text-slate-400">No questions added yet. Add your own content using the form above.</div> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-slate-400 uppercase tracking-wider border-b border-slate-100"><th className="pb-3">Question</th><th className="pb-3">Type</th><th className="pb-3">Bloom</th><th className="pb-3">Marks</th><th className="pb-3">Answer Stored</th><th className="pb-3">Media</th><th className="pb-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-50">{questions.map(q => <tr key={q.id} className="hover:bg-slate-50"><td className="py-4 max-w-md font-bold text-slate-800 pr-4">{q.text}</td><td className="py-4 uppercase font-bold text-indigo-600">{q.questionType}</td><td className="py-4"><span className="inline-flex items-center gap-1 bg-sky-50 text-sky-600 border border-sky-100 px-2 py-1 rounded-full font-bold"><Brain size={10}/>{q.bloomLevel}</span></td><td className="py-4 font-extrabold">{q.marks}M</td><td className="py-4"><span className="inline-flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle size={12}/>Hidden from student</span></td><td className="py-4"><div className="flex gap-2 items-center">{q.imageUrl && <img src={`${API_ORIGIN}${q.imageUrl}?t=${Date.now()}`} alt="Attached diagram" className="h-8 w-8 object-cover rounded border border-slate-200" title="Diagram/photo attached" />}{q.solutionVideoUrl && <span title="Solution video attached" className="inline-flex items-center text-emerald-600 bg-emerald-50 rounded-full px-2 py-1"><Video size={12}/></span>}{!q.imageUrl && !q.solutionVideoUrl && <span className="text-slate-300">—</span>}</div></td><td className="py-4 text-right"><button onClick={() => editQuestion(q)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit3 size={14}/></button><button onClick={() => removeQuestion(q.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={14}/></button></td></tr>)}</tbody></table></div>
        )}
      </div>
    </div>
  );
};
export default QuestionPaperManagement;

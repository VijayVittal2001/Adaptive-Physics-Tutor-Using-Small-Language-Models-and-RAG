import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { AnswerEditor } from '../../components/student/AnswerEditor';
import { FeedbackCard } from '../../components/student/FeedbackCard';
import { mockQuestions } from '../../data/mockQuestions';
import { evaluationService } from '../../services/evaluationService';
import { HelpCircle, ChevronLeft, Award } from 'lucide-react';

export const AnswerEvaluation = () => {
  const { questionId } = useParams();
  const navigate = useNavigate();
  
  const [question, setQuestion] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);

  useEffect(() => {
    const found = mockQuestions.find(q => q.id === questionId) || mockQuestions[0];
    setQuestion(found);
    // Reset state when question changes
    setEvaluationResult(null);
  }, [questionId]);

  const handleAnswerSubmit = async (studentAnswer, telemetryData) => {
    setIsEvaluating(true);
    setEvaluationResult(null);
    
    try {
      const response = await evaluationService.evaluateAnswer(question.id, studentAnswer, telemetryData);
      setEvaluationResult(response.data);
    } catch (e) {
      console.error(e);
      alert('AI Evaluation error: ' + e.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleWatchVideo = (videoId) => {
    navigate(`/student/video/top-101`);
  };

  const handlePracticeMore = () => {
    navigate('/student/practice');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-2">
        <button 
          onClick={() => navigate('/student/practice')}
          className="p-2 hover:bg-white text-slate-400 hover:text-slate-700 border border-transparent hover:border-slate-100 rounded-xl transition-all shadow-sm shrink-0"
        >
          <ChevronLeft size={16} />
        </button>
        <PageHeader 
          title="Board descriptive answer studio" 
          subtitle="Submit detailed physics calculations and obtain instant structural critiques matching keyword rubrics."
          badge="descriptive Studio"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side Question Details */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
          <div className="flex items-center space-x-1 text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded font-bold uppercase tracking-wider w-fit">
            <HelpCircle size={10} />
            <span>Target Question</span>
          </div>

          {question && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 font-display leading-relaxed">
                {question.text}
              </h3>
              
              <div className="grid grid-cols-2 gap-4 pt-3.5 border-t border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <div>
                  <span>Cognitive Level</span>
                  <span className="text-slate-700 block mt-0.5 font-extrabold">{question.bloomLevel}</span>
                </div>
                <div>
                  <span>Marks Weight</span>
                  <span className="text-slate-700 block mt-0.5 font-extrabold">{question.marks} Marks</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center/Right Answer Editor & AI Feedback */}
        <div className="lg:col-span-2 space-y-6">
          {!evaluationResult ? (
            <AnswerEditor 
              question={question} 
              onSubmit={handleAnswerSubmit} 
              isSubmitting={isEvaluating}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight font-display uppercase">AI assessment report</h3>
                <button
                  onClick={() => setEvaluationResult(null)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Resubmit new answer draft
                </button>
              </div>
              <FeedbackCard 
                feedback={evaluationResult} 
                onWatchVideo={handleWatchVideo}
                onPracticeTest={handlePracticeMore}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
export default AnswerEvaluation;

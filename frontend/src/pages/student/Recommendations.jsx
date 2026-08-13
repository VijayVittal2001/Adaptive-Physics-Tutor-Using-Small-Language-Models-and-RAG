import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { RecommendationCard } from '../../components/student/RecommendationCard';
import { Sparkles, HelpCircle, Compass } from 'lucide-react';

export const Recommendations = () => {
  const navigate = useNavigate();

  const mockRecList = [
    {
      title: 'Study Kirchhoff\'s Loop Rule in PDF',
      description: 'The local Phi-3 assessment flags KVL as your lowest conceptual block. Read NCERT pages 42-45 side-by-side with the doubt solver.',
      type: 'revision',
      difficulty: 'High',
      actionLabel: 'Read Section',
      action: () => navigate('/student/pdf-viewer')
    },
    {
      title: 'Watch Coulomb\'s Law animations',
      description: 'Observe structural 3D vector distributions and superposition coordinate vectors using Manim animations.',
      type: 'video',
      difficulty: 'Medium',
      actionLabel: 'Watch Lecture',
      action: () => navigate('/student/video/top-101')
    },
    {
      title: 'Practice 2-Mark Electric Field Questions',
      description: 'Solve questions on field line intersections and non-crossing constraints to consolidate Remembering scores.',
      type: 'practice',
      difficulty: 'Low',
      actionLabel: 'Solve question',
      action: () => navigate('/student/practice')
    }
  ];

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Personalized Study Plan" 
        subtitle="Review custom conceptual adjustments prepared by our offline RAG diagnostics model to help you ace your Board exam."
        badge="AI Study Plan"
      />

      <div className="bg-indigo-50/50 border border-indigo-150 rounded-2xl p-5 flex items-start space-x-3.5 max-w-4xl text-xs">
        <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-800">Local Diagnostics Active</span>
          <p className="text-slate-500 font-medium leading-relaxed">
            The Phi-3 SLM evaluates your historical descriptive worksheet submissions. It compiles these suggestions to balance your scores across the Remembering, Understanding and Application quadrants.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockRecList.map((rec, idx) => (
          <RecommendationCard 
            key={idx} 
            recommendation={rec} 
            onAction={rec.action}
          />
        ))}
      </div>
    </div>
  );
};
export default Recommendations;

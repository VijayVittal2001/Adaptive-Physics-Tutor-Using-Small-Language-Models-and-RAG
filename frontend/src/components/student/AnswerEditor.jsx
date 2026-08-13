import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Sparkles, Mic, Clock, Loader } from 'lucide-react';

export const AnswerEditor = ({ question, onSubmit, isSubmitting }) => {
  const [answer, setAnswer] = useState('');
  
  // Anti-cheat Telemetry Refs & States
  const keystrokeCount = useRef(0);
  const pasteAttempts = useRef(0);
  const lastKeyTime = useRef(null);
  const totalPauseCount = useRef(0);
  const totalTypingTime = useRef(0);
  
  const [typingMetrics, setTypingMetrics] = useState({
    keystrokes: 0,
    pasteAttempts: 0,
    keyHesitations: 0,
    typingSeconds: 0
  });

  const handleKeyPress = (e) => {
    keystrokeCount.current += 1;
    const now = Date.now();
    
    if (lastKeyTime.current) {
      const delta = now - lastKeyTime.current;
      totalTypingTime.current += delta;
      
      // If student pauses for more than 1.5 seconds, record as hesitation
      if (delta > 1500) {
        totalPauseCount.current += 1;
      }
    }
    lastKeyTime.current = now;

    // Update telemetry state values for mock presentation
    setTypingMetrics({
      keystrokes: keystrokeCount.current,
      pasteAttempts: pasteAttempts.current,
      keyHesitations: totalPauseCount.current,
      typingSeconds: Math.round(totalTypingTime.current / 1000)
    });
  };

  const handlePaste = (e) => {
    e.preventDefault();
    pasteAttempts.current += 1;
    setTypingMetrics(prev => ({
      ...prev,
      pasteAttempts: pasteAttempts.current
    }));
    alert("Exam Security Active: Copy-paste is disabled on Board Exam practice worksheets.");
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    alert("Exam Security Active: Right-click context menus are disabled.");
  };

  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef(null);

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
          setAnswer(prev => (prev + ' ' + finalStr).trim());
        }
        setInterimText(interimStr);
      };
      
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice typing is not supported in your browser. Please use Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText('');
    } else {
      setInterimText('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer.trim()) return;
    
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText('');
    }
    
    onSubmit(answer, typingMetrics);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
      {/* Top security banner */}
      <div className="flex items-center space-x-2 text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-150 px-3.5 py-1.5 rounded-xl font-bold uppercase tracking-wider mb-5">
        <ShieldAlert size={14} className="text-indigo-500 shrink-0" />
        <span>Strict SLM Proctoring: Copy-Paste Locked | typing analytics active</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Descriptive Answer Studio</label>
          <textarea
            required
            rows={8}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={handleKeyPress}
            onPaste={handlePaste}
            onContextMenu={handleContextMenu}
            placeholder="Type your detailed Physics answer here... Make sure to reference the mathematical constants and formulas (e.g. F = k * q1 * q2 / r^2)."
            className="w-full bg-slate-50 focus:bg-white border border-slate-100 hover:border-slate-200 focus:border-indigo-400 rounded-2xl p-4 text-xs font-semibold outline-none transition-all leading-relaxed font-sans selection:bg-indigo-100"
          ></textarea>
          {isListening && interimText && (
            <div className="text-xs text-indigo-500 font-medium px-2 animate-pulse mt-1">
              Listening: "{interimText}"
            </div>
          )}
        </div>

        {/* Telemetry live mock visualization */}
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/60 flex flex-wrap gap-4 items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <span>Keystrokes:</span>
              <span className="text-slate-600 font-extrabold">{typingMetrics.keystrokes}</span>
            </span>
            <span className="flex items-center space-x-1">
              <span>Pauses:</span>
              <span className="text-slate-600 font-extrabold">{typingMetrics.keyHesitations}</span>
            </span>
            <span className="flex items-center space-x-1">
              <span>Paste Warns:</span>
              <span className={`font-extrabold ${typingMetrics.pasteAttempts > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-600'}`}>{typingMetrics.pasteAttempts}</span>
            </span>
          </div>

          <div className="flex items-center space-x-2 text-slate-500 font-semibold text-[10px]">
            <Clock size={12} />
            <span>Time active: {typingMetrics.typingSeconds}s</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={toggleListening}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-sm border ${isListening ? 'bg-rose-100 text-rose-600 animate-pulse border-rose-250' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'}`}
          >
            <Mic size={14} className={isListening ? "text-rose-600" : "text-slate-500"} />
            <span>{isListening ? "Listening..." : "Voice Answer Mode"}</span>
          </button>
          
          <button
            type="submit"
            disabled={!answer.trim() || isSubmitting}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-soft flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader size={14} className="animate-spin" />
                <span>Running SLM Evaluator...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Submit & Run AI Evaluation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
export default AnswerEditor;

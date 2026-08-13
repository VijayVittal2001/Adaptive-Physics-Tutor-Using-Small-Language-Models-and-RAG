import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Camera, Square, Undo, Save, CheckCircle, RefreshCcw, Hand, X, Check } from 'lucide-react';
import { diagramService } from '../../services/diagramService';
import { API_BASE } from '../../services/api';

export const AirDiagramCanvas = ({ topic, activeTask, onBack }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cursorCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const streamRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  
  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const isActiveRef = useRef(false);
  const [error, setError] = useState(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [isMouseDrawing, setIsMouseDrawing] = useState(false);
  const lastPointRef = useRef(null);
  const lastMousePointRef = useRef(null);
  const pathsRef = useRef([]);
  const currentPathRef = useRef([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Setup MediaPipe
  useEffect(() => {
    const initVision = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
        );
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.6
        });
        handLandmarkerRef.current = handLandmarker;
        setIsReady(true);
      } catch (err) {
        console.error("Vision Init Error:", err);
        setError("Failed to initialize hand tracking.");
      }
    };
    initVision();
    return () => {
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: "user" } 
      });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play();
        setIsActive(true);
        isActiveRef.current = true;
        setError(null);
        requestAnimationFrame(predictWebcam);
      };
    } catch (err) {
      console.error(err);
      setError("Webcam access denied or unavailable.");
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    isActiveRef.current = false;
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const calculateDistance = (p1, p2) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  const isFist = (landmarks) => {
    const tips = [8, 12, 16, 20];
    const bases = [5, 9, 13, 17];
    let foldedCount = 0;
    for (let i = 0; i < tips.length; i++) {
      if (landmarks[tips[i]].y > landmarks[bases[i]].y) foldedCount++;
    }
    return foldedCount === 4; // All 4 fingers must be folded to be a fist
  };

  const predictWebcam = () => {
    if (!videoRef.current || !isActiveRef.current || !handLandmarkerRef.current) return;
    
    const startTimeMs = performance.now();
    const results = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
    
    const cursorCtx = cursorCanvasRef.current?.getContext('2d');
    if (cursorCtx && cursorCanvasRef.current) {
      cursorCtx.clearRect(0, 0, cursorCanvasRef.current.width, cursorCanvasRef.current.height);
      
      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];
        const middleTip = landmarks[12];
        const middleBase = landmarks[9];
        
        const cWidth = cursorCanvasRef.current.width;
        const cHeight = cursorCanvasRef.current.height;
        
        // Mirror coordinates
        const x = (1 - indexTip.x) * cWidth;
        const y = indexTip.y * cHeight;
        
        const pinchDist = calculateDistance(indexTip, thumbTip);
        const fist = isFist(landmarks);
        
        // Erase gesture: Index and Middle up, others folded
        const indexUp = indexTip.y < landmarks[5].y;
        const middleUp = middleTip.y < middleBase.y;
        const ringFolded = landmarks[16].y > landmarks[13].y;
        const pinkyFolded = landmarks[20].y > landmarks[17].y;
        
        const erasing = indexUp && middleUp && !fist;
        
        // Drawing gesture: Index up, middle folded
        const drawing = indexUp && !middleUp && !fist;
        
        if (fist) {
          setIsDrawing(false);
          setIsErasing(false);
          lastPointRef.current = null;
          cursorCtx.fillStyle = 'rgba(239, 68, 68, 0.8)'; // Red fist indicator
          cursorCtx.beginPath(); cursorCtx.arc(x, y, 12, 0, 2 * Math.PI); cursorCtx.fill();
        } else if (erasing) {
          setIsDrawing(false);
          setIsErasing(true);
          lastPointRef.current = null;
          cursorCtx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // White eraser
          cursorCtx.strokeStyle = 'rgba(0,0,0,0.2)';
          cursorCtx.beginPath(); cursorCtx.arc(x, y, 20, 0, 2 * Math.PI); cursorCtx.fill(); cursorCtx.stroke();
          eraseAt(x, y);
        } else if (drawing) {
          // Point to draw
          setIsDrawing(true);
          setIsErasing(false);
          cursorCtx.fillStyle = '#0f172a'; // Dark slate/black pen tip
          cursorCtx.beginPath(); cursorCtx.arc(x, y, 4, 0, 2 * Math.PI); cursorCtx.fill();
          
          if (!lastPointRef.current) {
            currentPathRef.current = [{x, y}];
            lastPointRef.current = {x, y};
          } else {
            currentPathRef.current.push({x, y});
            drawStroke(lastPointRef.current, {x, y});
            lastPointRef.current = {x, y};
          }
        } else {
          // Hover
          if (isDrawing && currentPathRef.current.length > 0) {
            pathsRef.current.push([...currentPathRef.current]);
            currentPathRef.current = [];
          }
          setIsDrawing(false);
          setIsErasing(false);
          lastPointRef.current = null;
          cursorCtx.fillStyle = 'rgba(15, 23, 42, 0.2)'; // Faint black hover dot
          cursorCtx.beginPath(); cursorCtx.arc(x, y, 4, 0, 2 * Math.PI); cursorCtx.fill();
        }
      } else {
        if (isDrawing && currentPathRef.current.length > 0) {
          pathsRef.current.push([...currentPathRef.current]);
          currentPathRef.current = [];
        }
        setIsDrawing(false);
        lastPointRef.current = null;
      }
    }
    
    if (isActiveRef.current) {
      requestAnimationFrame(predictWebcam);
    }
  };

  const drawStroke = (start, end) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#0f172a'; // Very dark slate (almost black)
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  };

  const eraseAt = (x, y) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  };

  // Mouse fallback handlers
  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    if (!canvasRef.current) return;
    const pos = getMousePos(e);
    setIsMouseDrawing(true);
    lastMousePointRef.current = pos;
    currentPathRef.current = [pos];
  };

  const handleMouseMove = (e) => {
    if (!isMouseDrawing || !canvasRef.current || !lastMousePointRef.current) return;
    const pos = getMousePos(e);
    
    currentPathRef.current.push(pos);
    drawStroke(lastMousePointRef.current, pos);
    lastMousePointRef.current = pos;
  };

  const handleMouseUpOrLeave = () => {
    if (isMouseDrawing && currentPathRef.current.length > 0) {
      pathsRef.current.push([...currentPathRef.current]);
      currentPathRef.current = [];
    }
    setIsMouseDrawing(false);
    lastMousePointRef.current = null;
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      pathsRef.current = [];
      currentPathRef.current = [];
    }
  };

  const undo = () => {
    if (pathsRef.current.length === 0) return;
    pathsRef.current.pop();
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      pathsRef.current.forEach(path => {
        for (let i = 1; i < path.length; i++) {
          drawStroke(path[i-1], path[i]);
        }
      });
    }
  };

  const submitCanvas = async () => {
    if (!canvasRef.current || !activeTask) return;
    setSubmitting(true);
    setSuccessMsg('');
    setError('');
    
    // Create a white background canvas for saving
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasRef.current.width;
    exportCanvas.height = canvasRef.current.height;
    const ctx = exportCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvasRef.current, 0, 0);
    
    const base64 = exportCanvas.toDataURL('image/png');
    
    try {
      await diagramService.submitDiagram(topic?.id || '', activeTask.id, base64);
      setSuccessMsg('Diagram submitted successfully!');
    } catch (e) {
      setError('Submission failed: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col h-[520px]">
      <div className="bg-slate-50 p-4 flex items-center justify-between shrink-0 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Hand size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">{activeTask?.task_description || 'Air Diagram Practice'}</h3>
            <p className="text-[10px] text-slate-500">☝️ Point to draw. ✌️ Erase. ✊ Pause.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isActive ? (
            <button 
              onClick={startCamera} 
              disabled={!isReady}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <Camera size={14} /> {isReady ? 'Start Camera' : 'Loading AI...'}
            </button>
          ) : (
            <button 
              onClick={stopCamera} 
              className="px-3 py-1.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
            >
              <Square size={14} /> Stop
            </button>
          )}
          <button onClick={toggleFullScreen} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 text-xs font-bold transition-colors">
            Fullscreen
          </button>
          <button onClick={onBack} className="p-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
      
      {error && <div className="bg-rose-500/10 border-b border-rose-500/20 p-2 text-center text-xs font-bold text-rose-400">{error}</div>}
      {successMsg && <div className="bg-emerald-500/10 border-b border-emerald-500/20 p-2 text-center text-xs font-bold text-emerald-400">{successMsg}</div>}

      <div className="flex-1 flex relative bg-slate-100" ref={containerRef}>
        {/* Reference Image Sidebar */}
        {activeTask?.reference_image_path && (
          <div className="w-1/4 min-w-[150px] border-r border-slate-200 bg-white p-3 overflow-y-auto hidden md:block z-40 relative">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Reference</h4>
            <img src={`${API_BASE}/diagrams/tasks/${activeTask.id}/reference`} alt="Reference" className="w-full rounded-lg border border-slate-200" />
          </div>
        )}
        
        {/* Main Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-white shadow-inner flex flex-col">
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/80 backdrop-blur-sm">
              <p className="text-slate-600 text-sm font-medium flex flex-col items-center gap-3">
                <Camera size={24} className="opacity-50" /> 
                <span>Click Start Camera to begin hand tracking</span>
                <span className="text-xs text-slate-400 mt-2">Or just use your mouse/trackpad to draw on the whiteboard!</span>
              </p>
            </div>
          )}
          
          <div className="relative w-full h-full flex items-center justify-center">
            {/* The actual drawing canvas */}
            <canvas 
              ref={canvasRef} 
              width={800} 
              height={600} 
              className="absolute w-full h-full object-contain z-10 cursor-crosshair touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              onTouchStart={(e) => {
                e.preventDefault();
                handleMouseDown(e.touches[0]);
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                handleMouseMove(e.touches[0]);
              }}
              onTouchEnd={handleMouseUpOrLeave}
            />
            
            {/* Cursor overlay for hand tracking */}
            <canvas 
              ref={cursorCanvasRef} 
              width={800} 
              height={600} 
              className="absolute w-full h-full object-contain z-20 pointer-events-none"
            />
            
            {/* Mini PIP Video in Corner */}
            <div className="absolute bottom-4 right-4 w-48 h-36 bg-black rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl z-30 transition-opacity" style={{ opacity: isActive ? 1 : 0 }}>
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover transform -scale-x-100" 
                playsInline 
                muted 
              />
              <div className="absolute bottom-1 left-1 bg-black/50 px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase">AI Camera View</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-3 flex items-center justify-between shrink-0 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <button onClick={undo} className="p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors shadow-sm" title="Undo">
            <Undo size={16} />
          </button>
          <button onClick={clearCanvas} className="p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors shadow-sm" title="Clear All">
            <RefreshCcw size={16} />
          </button>
        </div>
        <div>
          <button 
            onClick={submitCanvas} 
            disabled={submitting || !activeTask}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50"
          >
            {submitting ? <RefreshCcw size={14} className="animate-spin" /> : <Check size={14} />} 
            {submitting ? 'Submitting...' : 'Submit Diagram'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const mockBackendModules = [
  {
    id: 'mod-1',
    name: 'OCR & PDF Extractor',
    type: 'Ingestion',
    status: 'Online',
    version: 'v2.1-offline',
    latency: '450ms',
    utilization: '18%',
    description: 'Extracts structural texts and filters image matrices directly from uploaded PDF streams.'
  },
  {
    id: 'mod-2',
    name: 'Recursive Text Splitter',
    type: 'Ingestion',
    status: 'Online',
    version: 'v1.4',
    latency: '15ms',
    utilization: '2%',
    description: 'Splits raw textual segments into overlapping semantic units of 1000 characters.'
  },
  {
    id: 'mod-3',
    name: 'All-MiniLM-L6-v2 Embedder',
    type: 'RAG Pipeline',
    status: 'Online',
    version: 'v2.0-quantized',
    latency: '45ms',
    utilization: '25%',
    description: 'Generates 384-dimensional dense vectors representing local semantic context.'
  },
  {
    id: 'mod-4',
    name: 'FAISS Vector Database',
    type: 'Storage',
    status: 'Online',
    version: 'v1.8.0',
    latency: '2ms',
    utilization: '5%',
    description: 'Executes rapid similarity searches based on Euclidean or cosine metrics.'
  },
  {
    id: 'mod-5',
    name: 'Phi-3-Mini SLM (3.8B)',
    type: 'LLM / Inference',
    status: 'Online',
    version: 'v3.1.2-GGUF',
    latency: '180ms/token',
    utilization: '82%',
    description: 'Local quantized small language model for answer synthesis and evaluation.'
  },
  {
    id: 'mod-6',
    name: 'Hybrid Evaluation Engine',
    type: 'Evaluation',
    status: 'Online',
    version: 'v1.0',
    latency: '820ms',
    utilization: '12%',
    description: 'Checks descriptives submissions using keyword vectors, regex formulas and semantic ratings.'
  },
  {
    id: 'mod-7',
    name: 'Manim & TTS Generator',
    type: 'Video Generation',
    status: 'Idle',
    version: 'v0.9.1',
    latency: '12.4s',
    utilization: '0%',
    description: 'Constructs mathematical micro-lectures using Python script compilations.'
  }
];

export const mockSystemSettings = {
  offlineMode: true,
  slmModel: 'Phi-3-Mini-3.8B-Instruct-Q4.gguf',
  embeddingModel: 'all-MiniLM-L6-v2-quantized',
  faissIndexPath: './backend/storage/vector_store/faiss_index',
  sqliteDbPath: './backend/storage/metadata.db',
  antiCheat: {
    disableCopyPaste: true,
    disableRightClick: true,
    disableTextSelection: true,
    captureTypingMetrics: true,
    trackingHesitation: true,
    voiceInputEnabled: false
  },
  videoGeneration: {
    resolution: '1080p',
    fps: 30,
    voiceTheme: 'Male - Clear Academic',
    renderEngine: 'Manim Community Edition v0.18.1',
    editorEngine: 'MoviePy v1.0.3'
  }
};

export const mockUploadedFiles = [
  {
    id: 'file-01',
    name: '12th_Physics_NCERT_Part_1.pdf',
    size: '14.2 MB',
    type: 'Knowledge PDF',
    uploadedAt: '2026-05-20 14:32',
    status: 'Ready',
    progress: 100,
    extractedChapters: ['Electrostatics', 'Current Electricity', 'Magnetic Effects']
  },
  {
    id: 'file-02',
    name: 'Board_Exam_Sample_Paper_2025.pdf',
    size: '2.1 MB',
    type: 'Question Paper PDF',
    uploadedAt: '2026-05-25 10:15',
    status: 'Ready',
    progress: 100,
    extractedChapters: ['Electrostatics', 'Current Electricity']
  }
];

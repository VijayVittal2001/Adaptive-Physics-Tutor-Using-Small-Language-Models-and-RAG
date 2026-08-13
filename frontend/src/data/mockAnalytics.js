export const mockStudentPerformance = {
  chapterWise: [
    { name: 'Electrostatics', score: 78, average: 72 },
    { name: 'Current Electricity', score: 65, average: 68 },
    { name: 'Magnetic Effects', score: 45, average: 60 },
    { name: 'EM Induction', score: 0, average: 55 }
  ],
  topicMastery: [
    { topic: 'Coulomb\'s Law', mastery: 85 },
    { topic: 'Electric Fields', mastery: 72 },
    { topic: 'Electric Dipoles', mastery: 60 },
    { topic: 'Ohm\'s Law', mastery: 90 },
    { topic: 'Kirchhoff\'s Rules', mastery: 55 }
  ],
  weakAreas: [
    { topic: 'Kirchhoff\'s Rules', score: 55, suggestion: 'Review Loop Rule sign conventions and solve Wheatstone bridge exercises.' },
    { topic: 'Electric Dipoles', score: 60, suggestion: 'Re-derive electric fields on equatorial and axial lines.' },
    { topic: 'Magnetic Effects', score: 45, suggestion: 'Study Biot-Savart law calculations and thumb rules.' }
  ],
  timeSpentTrend: [
    { date: 'May 20', learnMinutes: 30, practiceMinutes: 15 },
    { date: 'May 21', learnMinutes: 45, practiceMinutes: 20 },
    { date: 'May 22', learnMinutes: 25, practiceMinutes: 10 },
    { date: 'May 23', learnMinutes: 50, practiceMinutes: 35 },
    { date: 'May 24', learnMinutes: 60, practiceMinutes: 40 },
    { date: 'May 25', learnMinutes: 40, practiceMinutes: 25 },
    { date: 'May 26', learnMinutes: 80, practiceMinutes: 55 }
  ],
  bloomPerformance: [
    { subject: 'Remembering', A: 92, fullMark: 100 },
    { subject: 'Understanding', A: 78, fullMark: 100 },
    { subject: 'Application', A: 58, fullMark: 100 }
  ],
  scoreHistory: [
    { test: 'Quiz 1 (1M)', score: 90 },
    { test: 'Practice Test 1', score: 72 },
    { test: 'descriptive Quiz', score: 64 },
    { test: 'Quiz 2 (2M/5M)', score: 75 }
  ]
};

export const mockAdminAnalytics = {
  activeStudentsTrend: [
    { name: 'Mon', count: 12 },
    { name: 'Tue', count: 18 },
    { name: 'Wed', count: 24 },
    { name: 'Thu', count: 22 },
    { name: 'Fri', count: 30 },
    { name: 'Sat', count: 35 },
    { name: 'Sun', count: 42 }
  ],
  classBloomPerformance: [
    { level: 'Remembering', count: 45 },
    { level: 'Understanding', count: 32 },
    { level: 'Application', count: 18 }
  ],
  pipelineLatency: [
    { stage: 'PDF Ingestion', timeMs: 1200 },
    { stage: 'OCR/Extract', timeMs: 4500 },
    { stage: 'Chunking', timeMs: 300 },
    { stage: 'Embedding', timeMs: 850 },
    { stage: 'Indexing', timeMs: 250 }
  ],
  systemHealth: {
    cpu: 32,
    memory: 58,
    storage: 42,
    slmTemp: 40
  }
};

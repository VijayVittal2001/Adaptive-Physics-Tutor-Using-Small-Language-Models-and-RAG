export const mockTopics = [
  {
    id: 'top-101',
    chapterId: 'ch-01',
    title: 'Coulomb\'s Law',
    description: 'The mathematical expression for the electrostatic force between two point charges.',
    pageStart: 4,
    pageEnd: 9,
    keyPoints: [
      'Force is directly proportional to product of charges: F ∝ q1 * q2',
      'Force is inversely proportional to square of distance: F ∝ 1 / r^2',
      'Electrostatic constant in vacuum: k = 1 / (4 * π * ε0) ≈ 9 × 10^9 N·m²/C²',
      'Permittivity of free space: ε0 = 8.854 × 10^-12 C²/(N·m²)',
      'Vector form of Coulomb\'s Law indicates the direction along the line joining the charges.'
    ],
    formula: 'F = k * (|q1 * q2|) / r^2',
    videoGenerated: true,
    videoDuration: '4:15',
    questionsCount: 6,
    masteryScore: 85
  },
  {
    id: 'top-102',
    chapterId: 'ch-01',
    title: 'Electric Field & Field Lines',
    description: 'Force experienced by a unit positive test charge and its visual representation.',
    pageStart: 10,
    pageEnd: 15,
    keyPoints: [
      'Electric field intensity: E = F / q',
      'Point charge electric field: E = k * q / r^2',
      'Electric field lines start on positive charges and end on negative charges.',
      'Field lines never intersect each other.',
      'The density of field lines represents the strength of the field.'
    ],
    formula: 'E = F / q = k * q / r^2',
    videoGenerated: true,
    videoDuration: '5:32',
    questionsCount: 5,
    masteryScore: 72
  },
  {
    id: 'top-103',
    chapterId: 'ch-01',
    title: 'Electric Dipole & Dipole Moment',
    description: 'A system of two equal and opposite charges separated by a small distance.',
    pageStart: 16,
    pageEnd: 22,
    keyPoints: [
      'Dipole moment vector: p = q * 2a (directed from negative to positive charge)',
      'Axial field of a dipole: E ≈ 2kp / r³ (for r >> a)',
      'Equatorial field of a dipole: E ≈ -kp / r³ (for r >> a)',
      'Torque on a dipole in a uniform electric field: τ = p × E = pE sin(θ)'
    ],
    formula: 'p = q * 2a, \\tau = p \\times E',
    videoGenerated: false,
    videoDuration: '6:10',
    questionsCount: 4,
    masteryScore: 60
  },
  {
    id: 'top-201',
    chapterId: 'ch-02',
    title: 'Ohm\'s Law & Electrical Resistance',
    description: 'Relationship between voltage, current, and resistance in ohmic conductors.',
    pageStart: 32,
    pageEnd: 37,
    keyPoints: [
      'Voltage is directly proportional to current: V = I * R',
      'Resistance is a material property: R = ρ * l / A',
      'Resistivity (ρ) depends on the nature of the material and temperature.',
      'Conductance (G) is reciprocal of resistance: G = 1 / R',
      'Conductivity (σ) is reciprocal of resistivity: σ = 1 / ρ'
    ],
    formula: 'V = I * R, R = \\rho * \\frac{l}{A}',
    videoGenerated: true,
    videoDuration: '3:45',
    questionsCount: 5,
    masteryScore: 90
  },
  {
    id: 'top-202',
    chapterId: 'ch-02',
    title: 'Kirchhoff\'s Rules',
    description: 'Fundamental rules for circuit analysis based on charge and energy conservation.',
    pageStart: 42,
    pageEnd: 48,
    keyPoints: [
      'Junction Rule (KCL): Sum of currents entering a junction equals sum of currents leaving (Charge Conservation).',
      'Loop Rule (KVL): Sum of changes in potential around any closed loop is zero (Energy Conservation).',
      'Crucial for solving complex networks that cannot be simplified by series/parallel rules.'
    ],
    formula: '\\sum I = 0 \\text{ (Junction)}, \\sum \\Delta V = 0 \\text{ (Loop)}',
    videoGenerated: true,
    videoDuration: '8:24',
    questionsCount: 6,
    masteryScore: 55
  }
];

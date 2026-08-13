export const mockQuestions = [
  {
    id: 'q-101',
    topicId: 'top-101',
    chapterId: 'ch-01',
    text: 'State Coulomb\'s Law and write its mathematical vector expression. Explain each term and define the permittivity of free space.',
    marks: 5,
    difficulty: 'Medium',
    bloomLevel: 'Understanding',
    mappedTopic: 'Coulomb\'s Law',
    modelAnswer: 'Coulomb\'s Law states that the electrostatic force between two stationary point charges is directly proportional to the product of the magnitudes of the charges and inversely proportional to the square of the distance between them. In vector form: F = (1 / (4 * pi * epsilon0)) * (q1 * q2 / r^2) * r_hat. Here, F is the force vector, q1 and q2 are the charges, r is the distance, and epsilon0 is the permittivity of free space (8.854 x 10^-12 C^2/N.m^2).',
    rubric: {
      keywords: ['electrostatic force', 'point charges', 'product of charges', 'inverse square', 'vector form', 'permittivity of free space'],
      formulas: ['F = k * q1 * q2 / r^2', '1 / (4 * \\pi * \\epsilon_0)'],
      numericalCheck: null
    }
  },
  {
    id: 'q-102',
    topicId: 'top-101',
    chapterId: 'ch-01',
    text: 'Two point charges q1 = +3 μC and q2 = -3 μC are separated by a distance of 20 cm in vacuum. Calculate the magnitude of the electrostatic force between them.',
    marks: 2,
    difficulty: 'Easy',
    bloomLevel: 'Application',
    mappedTopic: 'Coulomb\'s Law',
    modelAnswer: 'Given: q1 = 3 x 10^-6 C, q2 = -3 x 10^-6 C, r = 0.2 m. Using Coulomb\'s law: F = k * |q1 * q2| / r^2. F = (9 x 10^9) * (3 x 10^-6 * 3 x 10^-6) / (0.2)^2. F = (9 x 10^9) * (9 x 10^-12) / 0.04 = 0.081 / 0.04 = 2.025 N. The force is attractive in nature.',
    rubric: {
      keywords: ['attractive', 'Coulomb\'s law', 'magnitude', 'vacuum'],
      formulas: ['F = k * |q1 * q2| / r^2'],
      numericalCheck: {
        expectedValue: 2.025,
        tolerance: 0.01,
        unit: 'N'
      }
    }
  },
  {
    id: 'q-103',
    topicId: 'top-102',
    chapterId: 'ch-01',
    text: 'Why do electric field lines never cross each other? Explain with a short diagrammatic explanation in text.',
    marks: 2,
    difficulty: 'Easy',
    bloomLevel: 'Remembering',
    mappedTopic: 'Electric Field & Field Lines',
    modelAnswer: 'Electric field lines represent the direction of the net electric field vector at any point (tangent to the field line). If two electric field lines crossed each other, it would mean that at the point of intersection, there are two tangents. This implies two different directions of the electric field at that single point, which is physically impossible.',
    rubric: {
      keywords: ['intersection', 'tangent', 'direction of electric field', 'physically impossible', 'single point'],
      formulas: [],
      numericalCheck: null
    }
  },
  {
    id: 'q-104',
    topicId: 'top-103',
    chapterId: 'ch-01',
    text: 'Derive the expression for the electric field intensity E at a point on the equatorial line of an electric dipole of length 2a.',
    marks: 5,
    difficulty: 'Hard',
    bloomLevel: 'Application',
    mappedTopic: 'Electric Dipole & Dipole Moment',
    modelAnswer: 'For an equatorial point at distance r from dipole center: E_eq = -p / (4 * pi * epsilon0 * (r^2 + a^2)^(3/2)). If r >> a, the expression simplifies to E_eq ≈ -kp / r^3. The negative sign represents that the direction of the electric field on the equatorial line is opposite to the direction of the dipole moment vector (p) which points from -q to +q.',
    rubric: {
      keywords: ['equatorial line', 'dipole moment', 'vector summation', 'opposite direction', 'cos theta components'],
      formulas: ['E = -p / (4 * \\pi * \\epsilon_0 * r^3)', 'E = k * p / r^3'],
      numericalCheck: null
    }
  },
  {
    id: 'q-201',
    topicId: 'top-201',
    chapterId: 'ch-02',
    text: 'State Ohm\'s Law and discuss its limitations. Define resistivity and its temperature dependency.',
    marks: 5,
    difficulty: 'Medium',
    bloomLevel: 'Understanding',
    mappedTopic: 'Ohm\'s Law & Electrical Resistance',
    modelAnswer: 'Ohm\'s Law states that at constant temperature and physical conditions, the electric current (I) flowing through a metallic conductor is directly proportional to the potential difference (V) across its ends: V = IR. Limitations: 1) Does not apply to non-ohmic conductors like vacuum tubes, diodes, transistors. 2) Does not apply under high temperature because resistance increases with temperature. Resistivity is the resistance of a conductor of unit length and unit cross-sectional area: rho = R * A / l. Its temperature dependence is given by rho(T) = rho0 * [1 + alpha * (T - T0)].',
    rubric: {
      keywords: ['Ohm\'s law', 'constant temperature', 'non-ohmic', 'diodes', 'resistivity', 'temperature coefficient', 'alpha'],
      formulas: ['V = I * R', '\\rho(T) = \\rho_0(1 + \\alpha(T - T_0))'],
      numericalCheck: null
    }
  },
  {
    id: 'q-202',
    topicId: 'top-202',
    chapterId: 'ch-02',
    text: 'Using Kirchhoff\'s rules, write the loop and junction equations for a Wheatstone bridge network under balanced condition, and prove the ratio balance relation P/Q = R/S.',
    marks: 5,
    difficulty: 'Hard',
    bloomLevel: 'Application',
    mappedTopic: 'Kirchhoff\'s Rules',
    modelAnswer: 'A Wheatstone bridge consists of four resistors P, Q, R, S connected in a loop with a galvanometer G. Under balanced condition, no current flows through the galvanometer, i.e., Ig = 0. Applying Kirchhoff\'s Junction Rule at junction B: I1 = I3. At junction D: I2 = I4. Applying Kirchhoff\'s Loop Rule to loop ABDA: I1*P + Ig*G - I2*R = 0 => I1*P = I2*R (as Ig = 0). Applying to loop BCDB: I3*Q - I4*S - Ig*G = 0 => I1*Q = I2*S. Dividing the two equations: (I1*P) / (I1*Q) = (I2*R) / (I2*S), which gives P/Q = R/S.',
    rubric: {
      keywords: ['Wheatstone bridge', 'galvanometer', 'balanced condition', 'Kirchhoff\'s loop rule', 'no current', 'ratio balance'],
      formulas: ['P/Q = R/S', 'I_g = 0'],
      numericalCheck: null
    }
  }
];

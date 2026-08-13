export const mockRagAnswers = [
  {
    query: "what is coulomb's law",
    answer: "Coulomb's Law is a fundamental law of electrostatics that describes the force between two stationary point charges. It states that the force is directly proportional to the product of the magnitudes of the charges and inversely proportional to the square of the distance between them.",
    topic: "Coulomb's Law",
    sourcePage: 4,
    chapter: "Chapter 1: Electrostatics",
    confidence: 0.98,
    formula: "F = \\frac{1}{4\\pi\\varepsilon_0} \\cdot \\frac{q_1 q_2}{r^2}",
    retrievedChunks: [
      {
        page: 4,
        text: "The electrostatic force between two charges was first mathematically formulated by Charles-Augustin de Coulomb in 1785. The force acts along the line joining the centers of the two charges."
      },
      {
        page: 5,
        text: "In vector notation, the force F12 exerted on charge q1 by q2 is opposite to the force F21 exerted on q2 by q1, satisfying Newton's Third Law."
      }
    ]
  },
  {
    query: "what do you mean by electric field lines",
    answer: "An electric field line is a curve drawn in such a way that the tangent to it at each point is in the direction of the net electric field vector at that point. They provide a visual mapping of the electric field intensity and direction.",
    topic: "Electric Field & Field Lines",
    sourcePage: 11,
    chapter: "Chapter 1: Electrostatics",
    confidence: 0.95,
    formula: "\\vec{E} = \\lim_{q_0 \\to 0} \\frac{\\vec{F}}{q_0}",
    retrievedChunks: [
      {
        page: 11,
        text: "Field lines start on positive charges and terminate on negative charges. They do not form closed loops as electrostatic fields are conservative."
      },
      {
        page: 12,
        text: "The magnitude of the field is represented by the density of the lines. In a uniform field, the lines are parallel, straight, and equally spaced."
      }
    ]
  },
  {
    query: "state ohm's law",
    answer: "Ohm's Law states that the current (I) flowing through a conductor is directly proportional to the potential difference (V) across its ends, provided the physical conditions (such as temperature, tension) remain constant.",
    topic: "Ohm's Law & Electrical Resistance",
    sourcePage: 33,
    chapter: "Chapter 2: Current Electricity",
    confidence: 0.99,
    formula: "V = I \\cdot R",
    retrievedChunks: [
      {
        page: 33,
        text: "Ohmic conductors show a linear V-I relationship passing through the origin. Non-ohmic materials like semiconductors show non-linear conduction."
      }
    ]
  },
  {
    query: "what is kirchhoff's loop rule",
    answer: "Kirchhoff's Second Rule (Loop Rule) states that the algebraic sum of changes in potential around any closed loop in a circuit network must be zero. This is a direct consequence of the law of conservation of energy.",
    topic: "Kirchhoff's Rules",
    sourcePage: 43,
    chapter: "Chapter 2: Current Electricity",
    confidence: 0.94,
    formula: "\\sum \\Delta V = 0",
    retrievedChunks: [
      {
        page: 43,
        text: "The loop rule requires that when traversing a resistor in the direction of current, the potential change is negative (-IR). Traversing an EMF source from negative to positive gives positive potential (+E)."
      }
    ]
  }
];

export const defaultRagAnswer = {
  query: "General query",
  answer: "According to the uploaded 12th Physics NCERT knowledge base, the topic you are asking about is discussed in detail. In offline-first SLM mode, the RAG engine has retrieved top-k semantic chunks from the local vector database (FAISS index). Let me know if you would like me to retrieve formulas or generate a practice question based on this context.",
  topic: "Physics Foundations",
  sourcePage: 1,
  chapter: "12th Physics NCERT",
  confidence: 0.85,
  formula: "E = m \\cdot c^2",
  retrievedChunks: [
    {
      page: 1,
      text: "The physical world is structured by laws of electromagnetism, thermodynamics, mechanics, and quantum theory. The RAG pipeline processes NCERT textbooks to index formulas and conceptual insights."
    }
  ]
};

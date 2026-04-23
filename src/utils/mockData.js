export const mockStats = {
  student: {
    quizzesAttempted: 24,
    avgScore: 76,
    rank: 12,
    streak: 7,
    totalQuestions: 480,
    correctAnswers: 364,
  },
  teacher: {
    totalQuizzes: 18,
    activeStudents: 142,
    avgClassScore: 71,
    pendingGrading: 5,
  },
  school_admin: {
    totalStudents: 856,
    totalTeachers: 42,
    activeQuizzes: 23,
    avgSchoolScore: 68,
  },
};

export const mockScoreHistory = [
  { week: 'W1', score: 62 },
  { week: 'W2', score: 70 },
  { week: 'W3', score: 65 },
  { week: 'W4', score: 78 },
  { week: 'W5', score: 82 },
  { week: 'W6', score: 75 },
  { week: 'W7', score: 88 },
  { week: 'W8', score: 84 },
];

export const mockTopicScores = [
  { topic: 'Sensors', score: 85, fullMark: 100 },
  { topic: 'Programming', score: 78, fullMark: 100 },
  { topic: 'Kinematics', score: 62, fullMark: 100 },
  { topic: 'Electronics', score: 90, fullMark: 100 },
  { topic: 'AI/ML', score: 55, fullMark: 100 },
  { topic: 'Control', score: 72, fullMark: 100 },
];

export const mockParticipation = [
  { month: 'Jan', students: 420, quizzes: 12 },
  { month: 'Feb', students: 580, quizzes: 18 },
  { month: 'Mar', students: 650, quizzes: 22 },
  { month: 'Apr', students: 720, quizzes: 28 },
  { month: 'May', students: 690, quizzes: 25 },
  { month: 'Jun', students: 780, quizzes: 32 },
];

export const mockQuizzes = [
  { id: '1', title: 'Introduction to Robotics', topic: 'Sensors & Actuators', duration: 30, questions: 20, marks: 40, status: 'active', difficulty: 'easy', dueDate: '2026-04-20', attempts: 145 },
  { id: '2', title: 'Programming Logic Quiz', topic: 'Programming Logic', duration: 45, questions: 30, marks: 60, status: 'active', difficulty: 'medium', dueDate: '2026-04-22', attempts: 98 },
  { id: '3', title: 'Robot Kinematics', topic: 'Kinematics', duration: 60, questions: 40, marks: 80, status: 'scheduled', difficulty: 'hard', dueDate: '2026-04-25', attempts: 0 },
  { id: '4', title: 'Electronics Fundamentals', topic: 'Electronics', duration: 30, questions: 25, marks: 50, status: 'closed', difficulty: 'easy', dueDate: '2026-04-10', attempts: 210 },
  { id: '5', title: 'AI in Robotics', topic: 'AI & Machine Learning', duration: 50, questions: 35, marks: 70, status: 'draft', difficulty: 'hard', dueDate: '2026-04-30', attempts: 0 },
  { id: '6', title: 'Computer Vision Basics', topic: 'Computer Vision', duration: 40, questions: 28, marks: 56, status: 'active', difficulty: 'medium', dueDate: '2026-04-24', attempts: 76 },
];

// type: 'mcq' = 4 options, 'true_false' = True/False only
export const mockQuestions = [
  // Sensors & Actuators
  { id: 'q1',  type: 'mcq',        label: 'Sensors & Actuators', text: 'Which sensor measures distance using sound waves?',                           options: ['Infrared sensor', 'Ultrasonic sensor', 'Gyroscope', 'Accelerometer'],                          correct: 1, difficulty: 'easy',   marks: 2 },
  { id: 'q2',  type: 'true_false', label: 'Sensors & Actuators', text: 'An infrared sensor can detect objects in complete darkness.',                  options: ['True', 'False'],                                                                            correct: 0, difficulty: 'easy',   marks: 1 },
  { id: 'q3',  type: 'mcq',        label: 'Sensors & Actuators', text: 'Which sensor measures rotational orientation of a robot?',                     options: ['Ultrasonic sensor', 'Photodiode', 'Gyroscope', 'Thermistor'],                                correct: 2, difficulty: 'medium', marks: 2 },
  { id: 'q4',  type: 'true_false', label: 'Sensors & Actuators', text: 'A servo motor can rotate continuously without stopping.',                      options: ['True', 'False'],                                                                            correct: 1, difficulty: 'easy',   marks: 1 },
  { id: 'q5',  type: 'mcq',        label: 'Sensors & Actuators', text: 'Which component converts electrical energy to mechanical motion?',             options: ['Sensor', 'Actuator', 'Microcontroller', 'Resistor'],                                         correct: 1, difficulty: 'easy',   marks: 2 },

  // Programming Logic
  { id: 'q6',  type: 'mcq',        label: 'Programming Logic',   text: 'Which programming paradigm is best suited for reactive robot behavior?',      options: ['Procedural', 'Functional', 'Event-driven', 'Declarative'],                                   correct: 2, difficulty: 'medium', marks: 3 },
  { id: 'q7',  type: 'true_false', label: 'Programming Logic',   text: 'In a loop, the body executes at least once in a do-while loop.',              options: ['True', 'False'],                                                                            correct: 0, difficulty: 'easy',   marks: 1 },
  { id: 'q8',  type: 'mcq',        label: 'Programming Logic',   text: 'What does "if-else" represent in programming?',                               options: ['Loop', 'Conditional branching', 'Function call', 'Variable declaration'],                    correct: 1, difficulty: 'easy',   marks: 2 },
  { id: 'q9',  type: 'true_false', label: 'Programming Logic',   text: 'A recursive function always requires a base case to avoid infinite loops.',   options: ['True', 'False'],                                                                            correct: 0, difficulty: 'medium', marks: 2 },
  { id: 'q10', type: 'mcq',        label: 'Programming Logic',   text: 'Which data structure follows the Last-In-First-Out (LIFO) principle?',        options: ['Queue', 'Stack', 'Array', 'Linked List'],                                                    correct: 1, difficulty: 'medium', marks: 2 },

  // Electronics
  { id: 'q11', type: 'mcq',        label: 'Electronics',         text: 'What does PWM stand for in motor control?',                                  options: ['Power Width Modulation', 'Pulse Width Modulation', 'Phase Width Mode', 'Pressure Wave Mgmt'], correct: 1, difficulty: 'medium', marks: 2 },
  { id: 'q12', type: 'true_false', label: 'Electronics',         text: 'A capacitor stores electrical energy in an electric field.',                 options: ['True', 'False'],                                                                            correct: 0, difficulty: 'easy',   marks: 1 },
  { id: 'q13', type: 'mcq',        label: 'Electronics',         text: 'What is the unit of electrical resistance?',                                 options: ['Ampere', 'Volt', 'Ohm', 'Watt'],                                                             correct: 2, difficulty: 'easy',   marks: 1 },
  { id: 'q14', type: 'true_false', label: 'Electronics',         text: 'In a series circuit, the current through each component is the same.',       options: ['True', 'False'],                                                                            correct: 0, difficulty: 'medium', marks: 2 },
  { id: 'q15', type: 'mcq',        label: 'Electronics',         text: 'Which component is used to step up or step down voltage?',                   options: ['Transistor', 'Resistor', 'Transformer', 'Diode'],                                            correct: 2, difficulty: 'medium', marks: 2 },

  // Kinematics
  { id: 'q16', type: 'mcq',        label: 'Kinematics',          text: 'Degrees of freedom (DOF) in robotics refers to?',                            options: ['Battery life', 'Number of independent motion axes', 'Sensor accuracy', 'Processing speed'],  correct: 1, difficulty: 'hard',   marks: 3 },
  { id: 'q17', type: 'true_false', label: 'Kinematics',          text: 'Forward kinematics calculates joint positions from the end-effector pose.',  options: ['True', 'False'],                                                                            correct: 1, difficulty: 'hard',   marks: 2 },
  { id: 'q18', type: 'mcq',        label: 'Kinematics',          text: 'Which type of joint allows rotational movement only?',                       options: ['Prismatic', 'Revolute', 'Spherical', 'Planar'],                                              correct: 1, difficulty: 'medium', marks: 2 },
  { id: 'q19', type: 'true_false', label: 'Kinematics',          text: 'A 6-DOF robot arm can reach any position and orientation in 3D space.',      options: ['True', 'False'],                                                                            correct: 0, difficulty: 'hard',   marks: 3 },
  { id: 'q20', type: 'mcq',        label: 'Kinematics',          text: 'The end-effector of a robotic arm is the part that?',                        options: ['Powers the robot', 'Interacts with the environment', 'Controls the CPU', 'Stores energy'],   correct: 1, difficulty: 'easy',   marks: 2 },

  // Control Systems
  { id: 'q21', type: 'mcq',        label: 'Control Systems',     text: 'A PID controller stands for?',                                              options: ['Proportional-Integral-Derivative', 'Phase-Input-Delay', 'Precise-Integrated-Drive', 'Power-Index-Divider'], correct: 0, difficulty: 'hard', marks: 3 },
  { id: 'q22', type: 'true_false', label: 'Control Systems',     text: 'Integral control in PID eliminates steady-state error.',                    options: ['True', 'False'],                                                                            correct: 0, difficulty: 'hard',   marks: 3 },
  { id: 'q23', type: 'mcq',        label: 'Control Systems',     text: 'In a closed-loop control system, the output is?',                           options: ['Ignored', 'Fed back and compared to the input', 'Always constant', 'Stored in memory'],      correct: 1, difficulty: 'medium', marks: 2 },

  // AI & Machine Learning
  { id: 'q24', type: 'mcq',        label: 'AI & Machine Learning', text: 'Which ML algorithm is commonly used for robot path planning?',            options: ['Linear Regression', 'K-Means', 'Reinforcement Learning', 'Naive Bayes'],                    correct: 2, difficulty: 'hard',   marks: 3 },
  { id: 'q25', type: 'true_false', label: 'AI & Machine Learning', text: 'A neural network requires a large dataset to train effectively.',         options: ['True', 'False'],                                                                            correct: 0, difficulty: 'medium', marks: 2 },
];

export const mockActivity = [
  { id: 1, type: 'quiz_completed', text: 'Completed "Introduction to Robotics"', score: '85%', time: '2h ago', icon: 'CheckCircle', color: 'text-green-500' },
  { id: 2, type: 'quiz_assigned', text: 'New quiz assigned: "Programming Logic"', score: null, time: '5h ago', icon: 'Bell', color: 'text-indigo-500' },
  { id: 3, type: 'quiz_completed', text: 'Completed "Electronics Fundamentals"', score: '72%', time: '1d ago', icon: 'CheckCircle', color: 'text-green-500' },
  { id: 4, type: 'leaderboard', text: 'Ranked #5 in school leaderboard', score: null, time: '2d ago', icon: 'Award', color: 'text-yellow-500' },
  { id: 5, type: 'quiz_attempted', text: 'Started "AI in Robotics" quiz', score: null, time: '3d ago', icon: 'Play', color: 'text-blue-500' },
];

export const mockStudents = [
  { id: 's1', name: 'Aarav Sharma', email: 'aarav@school.edu', grade: '10A', avgScore: 88, quizzesDone: 18, status: 'active', lastActive: '2026-04-09' },
  { id: 's2', name: 'Priya Patel', email: 'priya@school.edu', grade: '10B', avgScore: 92, quizzesDone: 22, status: 'active', lastActive: '2026-04-10' },
  { id: 's3', name: 'Rohan Verma', email: 'rohan@school.edu', grade: '10A', avgScore: 64, quizzesDone: 12, status: 'active', lastActive: '2026-04-07' },
  { id: 's4', name: 'Ananya Singh', email: 'ananya@school.edu', grade: '10C', avgScore: 76, quizzesDone: 20, status: 'inactive', lastActive: '2026-03-28' },
  { id: 's5', name: 'Karthik Nair', email: 'karthik@school.edu', grade: '10B', avgScore: 81, quizzesDone: 16, status: 'active', lastActive: '2026-04-09' },
  { id: 's6', name: 'Divya Iyer', email: 'divya@school.edu', grade: '10A', avgScore: 95, quizzesDone: 24, status: 'active', lastActive: '2026-04-10' },
];

export const mockSchools = [
  { id: 'sc1', name: 'Delhi Public School', district: 'New Delhi', students: 1200, teachers: 58, avgScore: 74, status: 'active' },
  { id: 'sc2', name: 'Kendriya Vidyalaya', district: 'Mumbai', students: 980, teachers: 45, avgScore: 69, status: 'active' },
  { id: 'sc3', name: 'Ryan International', district: 'Bengaluru', students: 1450, teachers: 72, avgScore: 78, status: 'active' },
  { id: 'sc4', name: 'Modern School', district: 'Chennai', students: 860, teachers: 40, avgScore: 65, status: 'inactive' },
];

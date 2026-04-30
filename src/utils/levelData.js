// ── Level definitions, content pages & questions ─────────────────────────────

export const LEVELS = [
  {
    id: 1,
    title: 'Level 1',
    subtitle: 'Introduction to Robotics',
    description: 'Learn the basics of robotics, components, and fundamental concepts.',
    color: { from: '#3BC0EF', to: '#1E3A8A' },
    totalQuestions: 20,
  },
  {
    id: 2,
    title: 'Level 2',
    subtitle: 'Sensors & Actuators',
    description: 'Explore how robots perceive and interact with the physical world.',
    color: { from: '#8B5CF6', to: '#6d28d9' },
    totalQuestions: 20,
  },
  {
    id: 3,
    title: 'Level 3',
    subtitle: 'Advanced Robotics & AI',
    description: 'Dive into autonomous systems, machine learning, and robot intelligence.',
    color: { from: '#10B981', to: '#047857' },
    totalQuestions: 20,
  },
];

// ── Level 1 Content Pages ─────────────────────────────────────────────────────

export const LEVEL1_PAGES = [
  {
    page: 1,
    title: 'What is Robotics?',
    sections: [
      {
        heading: 'Definition of a Robot',
        body: `A robot is a programmable machine that can carry out a series of actions automatically. Robots are designed to interact with the physical world — they can sense their environment, process information, and act on it.\n\nThe word "robot" was first coined in 1920 by Czech writer Karel Čapek. Today, robots range from simple automated arms in factories to humanoid machines capable of walking and talking.`,
      },
      {
        heading: 'Core Components of a Robot',
        body: `Every robot — regardless of its complexity — is built from five essential components:\n\n1. **Structure / Body** — The physical frame that holds all components together. Made from materials like aluminium, steel, or plastic depending on the application.\n\n2. **Actuators** — Motors and mechanisms that produce movement. Servo motors, stepper motors, and pneumatic pistons are common actuators.\n\n3. **Sensors** — Devices that allow the robot to perceive its environment. Examples include cameras, infrared sensors, ultrasonic sensors, and touch sensors.\n\n4. **Controller / Brain** — The computing unit (microcontroller or processor) that processes sensor data and decides what actions to take. Common platforms include Arduino and Raspberry Pi.\n\n5. **Power Source** — Batteries, solar panels, or wired power supplies that provide the energy the robot needs to operate.`,
      },
      {
        heading: 'Types of Robots',
        body: `Robots are classified based on their function and design:\n\n• **Industrial Robots** — Fixed-arm robots used in manufacturing for welding, painting, and assembly.\n\n• **Service Robots** — Robots that assist humans in everyday tasks such as vacuuming (Roomba) or delivering packages.\n\n• **Medical Robots** — Surgical robots like the Da Vinci system that help doctors perform precise operations.\n\n• **Educational Robots** — Simple robots used to teach programming and engineering concepts, such as LEGO Mindstorms.\n\n• **Autonomous Mobile Robots (AMRs)** — Robots that navigate freely in their environment, used in warehouses and hospitals.`,
      },
    ],
  },
  {
    page: 2,
    title: 'How Robots Work',
    sections: [
      {
        heading: 'The Sense–Think–Act Cycle',
        body: `All intelligent robots operate on a continuous loop known as the Sense–Think–Act cycle:\n\n1. **Sense** — The robot gathers data about its surroundings using sensors (distance, light, temperature, etc.).\n\n2. **Think** — The controller processes this data using a pre-programmed algorithm or AI model to determine the correct response.\n\n3. **Act** — Actuators execute the decision — a wheel spins, a gripper closes, a light turns on.\n\nThis cycle repeats many times per second, giving the robot the ability to respond in real time to a changing environment.`,
      },
      {
        heading: 'Programming a Robot',
        body: `Robots are programmed using software that tells the controller what to do under specific conditions. Common programming languages used in robotics include:\n\n• **C / C++** — Widely used in embedded systems and microcontrollers due to performance.\n\n• **Python** — Popular for robotics research and AI because of its readability and libraries like ROS (Robot Operating System).\n\n• **Scratch / Blockly** — Block-based languages used in educational robotics for beginners.\n\nThe Robot Operating System (ROS) is an open-source middleware platform that helps developers build complex robot applications by managing communication between different hardware components.`,
      },
      {
        heading: 'Real-World Applications',
        body: `Robotics is transforming industries across the globe:\n\n• **Manufacturing** — Over 3 million industrial robots operate in factories worldwide, increasing productivity and precision.\n\n• **Healthcare** — Surgical robots improve accuracy; rehabilitation robots assist patients in recovery.\n\n• **Agriculture** — Drones and autonomous tractors monitor crops and apply pesticides with minimal waste.\n\n• **Space Exploration** — NASA's Mars rovers (Curiosity, Perseverance) explore the Martian surface autonomously.\n\n• **Education** — Coding robots teach computational thinking to children as young as 5 years old.\n\nUnderstanding the basics of robotics prepares you for a future where humans and robots collaborate in every sector.`,
      },
    ],
  },
];

// ── Level 1 Quiz Questions ────────────────────────────────────────────────────

export const LEVEL1_QUESTIONS = [
  {
    id: 'l1q1', type: 'mcq', difficulty: 'easy',
    text: 'Which of the following is NOT a core component of a robot?',
    options: ['Actuator', 'Sensor', 'Compiler', 'Controller'],
    correct: 2,
  },
  {
    id: 'l1q2', type: 'tf', difficulty: 'easy',
    text: 'The word "robot" was first coined by Czech writer Karel Čapek in 1920.',
    options: ['True', 'False'],
    correct: 0,
  },
  {
    id: 'l1q3', type: 'mcq', difficulty: 'easy',
    text: 'What does the "Think" step in the Sense–Think–Act cycle involve?',
    options: ['Gathering sensor data', 'Processing data and deciding a response', 'Moving actuators', 'Storing energy'],
    correct: 1,
  },
  {
    id: 'l1q4', type: 'tf', difficulty: 'easy',
    text: 'Industrial robots are typically mobile and move freely around a factory floor.',
    options: ['True', 'False'],
    correct: 1,
  },
  {
    id: 'l1q5', type: 'mcq', difficulty: 'medium',
    text: 'Which programming language is most commonly used in embedded systems and microcontrollers for robotics?',
    options: ['Python', 'Scratch', 'C / C++', 'JavaScript'],
    correct: 2,
  },
  {
    id: 'l1q6', type: 'mcq', difficulty: 'medium',
    text: 'What is the primary purpose of an actuator in a robot?',
    options: ['To sense the environment', 'To store power', 'To produce movement', 'To process information'],
    correct: 2,
  },
  {
    id: 'l1q7', type: 'tf', difficulty: 'medium',
    text: 'ROS stands for Robot Operating System and is an open-source middleware platform.',
    options: ['True', 'False'],
    correct: 0,
  },
  {
    id: 'l1q8', type: 'mcq', difficulty: 'medium',
    text: "NASA's Mars rovers Curiosity and Perseverance are examples of which robot type?",
    options: ['Service Robots', 'Autonomous Mobile Robots', 'Industrial Robots', 'Educational Robots'],
    correct: 1,
  },
  {
    id: 'l1q9', type: 'mcq', difficulty: 'hard',
    text: 'Which of the following best describes the Sense–Think–Act cycle?',
    options: [
      'A one-time startup sequence',
      'A continuous real-time loop that allows robots to respond to their environment',
      'A manual control protocol used by operators',
      'A power management routine',
    ],
    correct: 1,
  },
  {
    id: 'l1q10', type: 'tf', difficulty: 'hard',
    text: 'Python is preferred over C/C++ in robotics research primarily because of its execution speed.',
    options: ['True', 'False'],
    correct: 1,
  },
];

// ── Level 2 Content Pages ─────────────────────────────────────────────────────

export const LEVEL2_PAGES = [
  {
    page: 1,
    title: 'Types of Sensors in Robotics',
    sections: [
      {
        heading: 'What Are Sensors and Why They Matter',
        body: `Sensors are the "eyes and ears" of a robot. They allow a robot to perceive its environment by converting physical quantities — such as distance, temperature, light, or orientation — into electrical signals that the controller can process.\n\nWithout sensors, a robot is essentially blind: it cannot respond to changes in its surroundings and can only execute pre-programmed movements. Sensors are what make a robot adaptive and intelligent.\n\nThe quality of a robot's behaviour depends heavily on the quality and variety of sensors it uses. More sensors typically mean better awareness — but also more processing complexity. Engineers must carefully choose sensors based on cost, accuracy, range, and power consumption.`,
      },
      {
        heading: 'Distance and Proximity Sensors',
        body: `Distance sensors help a robot understand how far away objects are. They are essential for obstacle avoidance, navigation, and manipulation.\n\n• **Ultrasonic Sensors (HC-SR04)** — Emit high-frequency sound pulses and measure the time taken for the echo to return. Range: 2 cm–400 cm. Widely used in beginner robotics due to low cost. Limitation: poor with soft or angled surfaces.\n\n• **Infrared (IR) Sensors** — Emit an infrared beam and detect its reflection. Used for short-range proximity detection and line-following robots. Sensitive to ambient light and colour of surfaces.\n\n• **LiDAR (Light Detection and Ranging)** — Fires rapid laser pulses in all directions and measures reflections to build a precise 3D map of the surroundings. Used in self-driving cars (Tesla, Waymo) and robots that require high-precision mapping. Expensive but extremely accurate.\n\n• **Time-of-Flight (ToF) Sensors** — Similar to LiDAR but compact and affordable. Measure distance by calculating the time a photon takes to return. Common in smartphones for portrait mode and in small robots.`,
      },
      {
        heading: 'Environmental and Orientation Sensors',
        body: `Beyond distance, robots often need to know their own orientation, speed, and surrounding environment.\n\n• **Gyroscope** — Measures rotational velocity around one or more axes. Tells the robot how fast it is turning. Essential for drones and balancing robots (like the Segway). Commonly integrated in IMUs (Inertial Measurement Units).\n\n• **Accelerometer** — Measures linear acceleration. Combined with a gyroscope in an IMU, it allows a robot to track its position and detect tilt. Used in humanoid robots to prevent falls.\n\n• **Encoders** — Attached to motor shafts, encoders generate digital pulses as the wheel or joint rotates. By counting pulses, the controller calculates exact position and speed. Essential for precise motion control.\n\n• **Colour and Light Sensors** — Detect the wavelength and intensity of light. Used in line-following robots, sorting machines, and quality control systems.\n\n• **Temperature and Gas Sensors** — Used in specialised robots for hazardous environment exploration — detecting fire, toxic gases, or extreme temperatures.`,
      },
    ],
  },
  {
    page: 2,
    title: 'Actuators and Motion Systems',
    sections: [
      {
        heading: 'What Are Actuators',
        body: `If sensors are a robot's senses, actuators are its muscles. An actuator is any device that converts an electrical signal from the controller into physical movement.\n\nActuators produce the forces and motion that allow a robot to interact with the physical world — spinning wheels, lifting objects, opening grippers, or tilting a camera.\n\nThe choice of actuator depends on the application:\n• How much force is needed?\n• How precise must the movement be?\n• How fast should it move?\n• Is it operating in a harsh environment?\n\nUnderstanding actuators is fundamental to designing robots that can perform real-world tasks effectively.`,
      },
      {
        heading: 'Types of Motors',
        body: `Motors are the most common actuators in robotics. Each type has different characteristics suited to different tasks.\n\n• **DC Motors** — Simple, cheap, and fast. They spin continuously when powered and can be controlled by varying the voltage or using Pulse Width Modulation (PWM). Used in drive wheels and fans. Limitation: no built-in position feedback.\n\n• **Servo Motors** — A DC motor combined with a gearbox and a position sensor (potentiometer). Can rotate to a specific angle and hold that position. Standard servos rotate 0°–180°; continuous servos spin freely like DC motors but with speed control. Widely used in robot arms and RC vehicles.\n\n• **Stepper Motors** — Divide a full rotation into a fixed number of discrete steps (typically 200 steps = 1.8° per step). Provide precise position control without feedback sensors. Used in 3D printers, CNC machines, and medical instruments.\n\n• **Brushless DC Motors (BLDC)** — Extremely efficient and powerful for their size. Used in drones and high-performance robots. Require an Electronic Speed Controller (ESC).\n\n• **Pneumatic and Hydraulic Actuators** — Use compressed air or fluid pressure to generate very high forces. Common in industrial robots for heavy lifting. Not suitable for fine control.`,
      },
      {
        heading: 'Motion Control and Feedback Systems',
        body: `Moving a motor is straightforward — moving it precisely and reliably is the real engineering challenge. Motion control systems use feedback loops to ensure a robot moves exactly as intended.\n\n**PID Control (Proportional–Integral–Derivative)**\nPID is the most widely used control algorithm in robotics. It continuously calculates the difference between a desired position (setpoint) and the actual position (process variable) and adjusts the motor accordingly:\n\n• **Proportional (P)** — Applies correction proportional to the current error. Large error → large correction.\n• **Integral (I)** — Accumulates past errors to eliminate steady-state offset (when the robot is consistently a little off target).\n• **Derivative (D)** — Predicts future error based on the rate of change. Dampens oscillation and improves stability.\n\nTuning PID gains (Kp, Ki, Kd) is a key skill in robotics engineering.\n\n**Closed-Loop vs Open-Loop Control**\n• Open-loop: Commands the actuator without checking the result (stepper motor running a set number of steps).\n• Closed-loop: Continuously checks sensor feedback and corrects. More accurate and reliable.\n\nModern robot arms use closed-loop control with encoder feedback at every joint to achieve millimetre-level precision.`,
      },
    ],
  },
];

// ── Level 2 Quiz Questions ────────────────────────────────────────────────────

export const LEVEL2_QUESTIONS = [
  {
    id: 'l2q1', type: 'mcq', difficulty: 'easy',
    text: 'Which sensor measures the distance to an object using sound waves?',
    options: ['Infrared sensor', 'Ultrasonic sensor', 'Gyroscope', 'Encoder'],
    correct: 1,
  },
  {
    id: 'l2q2', type: 'tf', difficulty: 'easy',
    text: 'A servo motor can rotate to a specific angle and hold that position.',
    options: ['True', 'False'],
    correct: 0,
  },
  {
    id: 'l2q3', type: 'mcq', difficulty: 'easy',
    text: 'What does a gyroscope sensor measure?',
    options: ['Temperature', 'Rotational velocity / orientation', 'Light intensity', 'Magnetic field'],
    correct: 1,
  },
  {
    id: 'l2q4', type: 'tf', difficulty: 'easy',
    text: 'Actuators are input devices that gather information about the environment.',
    options: ['True', 'False'],
    correct: 1,
  },
  {
    id: 'l2q5', type: 'mcq', difficulty: 'medium',
    text: 'Which type of motor is best suited for applications requiring precise position control?',
    options: ['DC motor', 'Stepper motor', 'AC motor', 'Brushless DC motor'],
    correct: 1,
  },
  {
    id: 'l2q6', type: 'mcq', difficulty: 'medium',
    text: 'A PIR sensor detects:',
    options: ['Pressure changes', 'Infrared radiation emitted by warm bodies', 'Proximity via ultrasound', 'Colour and light'],
    correct: 1,
  },
  {
    id: 'l2q7', type: 'tf', difficulty: 'medium',
    text: 'An encoder converts rotary motion into digital pulses to measure speed and position.',
    options: ['True', 'False'],
    correct: 0,
  },
  {
    id: 'l2q8', type: 'mcq', difficulty: 'medium',
    text: 'What is the main advantage of pneumatic actuators over electric motors in industrial robots?',
    options: ['Lower cost', 'High force output with lightweight design', 'Better precision', 'Quieter operation'],
    correct: 1,
  },
  {
    id: 'l2q9', type: 'mcq', difficulty: 'hard',
    text: 'In a PID controller, what does the "D" term respond to?',
    options: ['Accumulated error over time', 'Current error', 'Rate of change of error', 'Predicted future error'],
    correct: 2,
  },
  {
    id: 'l2q10', type: 'tf', difficulty: 'hard',
    text: 'LiDAR sensors work by emitting pulses of laser light and measuring the time for the reflection to return.',
    options: ['True', 'False'],
    correct: 0,
  },
];

// ── Level 3 Content Pages ─────────────────────────────────────────────────────

export const LEVEL3_PAGES = [
  {
    page: 1,
    title: 'Machine Learning in Robotics',
    sections: [
      {
        heading: 'How Artificial Intelligence Powers Modern Robots',
        body: `Traditional robots follow explicit, hand-coded instructions: "if the sensor reads X, do Y." This works well for controlled environments but fails in unpredictable, real-world settings. Artificial Intelligence — particularly machine learning — allows robots to learn from data and adapt to situations that were never explicitly programmed.\n\nInstead of writing rules, engineers provide training data (examples of correct and incorrect behaviour) and a learning algorithm that generalises from those examples.\n\nAI in robotics enables:\n• **Perception** — Understanding camera images to identify objects, people, and obstacles.\n• **Decision Making** — Choosing the best action in complex, dynamic situations.\n• **Adaptation** — Improving performance over time without reprogramming.\n\nThe combination of robotics hardware with AI software is the foundation of modern autonomous systems.`,
      },
      {
        heading: 'Reinforcement Learning and Path Planning',
        body: `**Reinforcement Learning (RL)** is a machine learning paradigm where a robot (the agent) learns by interacting with its environment and receiving rewards or penalties based on its actions.\n\nKey concepts:\n• **Agent** — The robot making decisions.\n• **Environment** — The world the robot interacts with.\n• **State** — The current situation (sensor readings, position, etc.).\n• **Action** — What the robot does (move forward, turn left, etc.).\n• **Reward** — A score that tells the agent how good its action was.\n\nRL is widely used for training robots to walk, manipulate objects, and navigate — tasks too complex to program manually.\n\n**Path Planning Algorithms**\nFor navigation in known environments, classical algorithms are still widely used:\n\n• **Dijkstra's Algorithm** — Finds the shortest path in a weighted graph. Guaranteed to find the optimal path but slow in large spaces.\n\n• **A* (A-Star)** — Improves Dijkstra by adding a heuristic (estimated distance to goal) to guide the search. Much faster while still optimal. The industry standard for robot navigation.\n\n• **SLAM (Simultaneous Localisation and Mapping)** — Allows a robot to build a map of an unknown environment while simultaneously tracking its own position within that map. Used in autonomous vacuum cleaners, warehouse robots, and self-driving vehicles.`,
      },
      {
        heading: 'Computer Vision and Neural Networks',
        body: `Robots that interact with the visual world — identifying objects, reading labels, recognising faces — rely on computer vision and deep learning.\n\n**Convolutional Neural Networks (CNNs)**\nCNNs are the foundation of modern image recognition. They process images through multiple layers of filters that progressively extract features — from edges and textures to complex shapes and objects. Trained on millions of labelled images, a CNN can recognise thousands of object categories with human-level accuracy.\n\nApplications in robotics:\n• **Object Detection** — Identifying and locating objects in real-time (YOLO, SSD algorithms).\n• **Pose Estimation** — Detecting the position and orientation of a human body or robotic arm.\n• **Depth Estimation** — Inferring 3D depth from 2D camera images.\n\n**Sensor Fusion**\nReal-world robots rarely rely on a single sensor. Sensor fusion combines data from multiple sensors (camera + LiDAR + IMU) to create a more accurate and robust understanding of the environment.\n\nThe **Kalman Filter** is the classic tool for sensor fusion: it combines noisy measurements from multiple sources into an optimal estimate of the true state, used in GPS navigation, autonomous cars, and spacecraft attitude control.`,
      },
    ],
  },
  {
    page: 2,
    title: 'Autonomous Systems and the Future of Robotics',
    sections: [
      {
        heading: 'Degrees of Freedom and Robot Kinematics',
        body: `A robot arm's capability is described by its **Degrees of Freedom (DOF)** — the number of independent movements it can perform. Each joint (rotational or linear) adds one DOF.\n\n• A simple 2-DOF arm can move in a plane (left-right, up-down).\n• A 6-DOF arm can position its end-effector at any point in 3D space with any orientation — matching the full dexterity of a human arm.\n• Industrial robots typically use 4–7 DOF for welding, painting, and assembly.\n\n**Forward Kinematics** — Given joint angles, calculate the position and orientation of the end-effector. This is straightforward mathematics.\n\n**Inverse Kinematics (IK)** — Given a desired end-effector position, calculate the required joint angles. This is mathematically complex (often has multiple solutions or no solution) and is a central challenge in robot arm programming.\n\n**Robot Operating System (ROS/ROS 2)**\nROS is an open-source middleware framework that provides tools and libraries for building complex robot applications. Key features:\n• Modular, distributed architecture (nodes communicate via topics and services).\n• ROS 2 adds real-time support, multi-robot coordination, and improved security.\n• Standard in academic and industrial robotics research.`,
      },
      {
        heading: 'Swarm Robotics and Multi-Robot Systems',
        body: `Instead of building one large, complex robot, swarm robotics uses many small, simple robots that collectively achieve complex tasks — inspired by ant colonies, bee swarms, and bird flocks.\n\n**Key principles of swarm robotics:**\n• **Decentralisation** — No single robot is in charge. Collective behaviour emerges from local rules and interactions.\n• **Scalability** — Adding more robots improves performance without redesigning the system.\n• **Robustness** — If one robot fails, the swarm continues functioning.\n\nApplications include:\n• Search and rescue in disaster zones — many small robots explore dangerous areas simultaneously.\n• Precision agriculture — drone swarms monitor crops and apply treatments selectively.\n• Construction — robotic swarms assemble structures autonomously (inspired by termite mounds).\n\n**Transfer Learning**\nTraining robots in the real world is expensive and slow. Simulation training (Sim-to-Real) trains a robot in a virtual environment millions of times faster than reality, then transfers the learned model to the physical robot. Fine-tuning is typically needed to bridge the "reality gap" between simulation and the real world.`,
      },
      {
        heading: 'The Future of Robotics — Human–Robot Collaboration',
        body: `The next frontier in robotics is not replacing humans, but working alongside them — robots that are safe, adaptable, and intuitive to interact with.\n\n**Collaborative Robots (Cobots)**\nUnlike traditional industrial robots that operate in caged-off areas, cobots are designed to work directly with humans. They are:\n• Force-limited (stop immediately if they contact a human).\n• Easy to program (often by physically guiding the robot through a task)\n• Flexible (quickly repurposed for different tasks)\n\nExamples: Universal Robots (UR series), Fanuc CR series.\n\n**Soft Robotics**\nTraditional robots are rigid and potentially dangerous near humans. Soft robots use flexible, compliant materials (silicone, fabric, pneumatic chambers) that are inherently safe and can handle delicate objects. Applications include surgical tools, prosthetic hands, and fruit-picking robots.\n\n**The Road Ahead**\nThe convergence of advances in AI, materials science, manufacturing, and computing is accelerating robotics beyond what was imaginable a decade ago:\n• Humanoid robots (Boston Dynamics Atlas, Tesla Optimus) approaching human-level physical capability.\n• Medical micro-robots navigating through blood vessels to deliver drugs.\n• Autonomous construction robots building entire structures without human intervention.\n\nUnderstanding the principles covered in this programme — sensors, actuators, control theory, and AI — gives you the foundation to participate in and shape this future.`,
      },
    ],
  },
];

// ── Level 3 Quiz Questions ────────────────────────────────────────────────────

export const LEVEL3_QUESTIONS = [
  {
    id: 'l3q1', type: 'mcq', difficulty: 'medium',
    text: 'Which machine learning technique is most commonly used for robot path planning?',
    options: ['Linear regression', 'Reinforcement learning', 'K-means clustering', 'Naive Bayes'],
    correct: 1,
  },
  {
    id: 'l3q2', type: 'tf', difficulty: 'medium',
    text: 'SLAM stands for Simultaneous Localisation and Mapping.',
    options: ['True', 'False'],
    correct: 0,
  },
  {
    id: 'l3q3', type: 'mcq', difficulty: 'medium',
    text: 'What is the primary goal of a convolutional neural network (CNN) in robotics vision?',
    options: ['Motor control', 'Image recognition and object detection', 'Path planning', 'Sensor calibration'],
    correct: 1,
  },
  {
    id: 'l3q4', type: 'tf', difficulty: 'medium',
    text: 'A swarm robot system consists of a single powerful robot controlling many smaller drones.',
    options: ['True', 'False'],
    correct: 1,
  },
  {
    id: 'l3q5', type: 'mcq', difficulty: 'hard',
    text: 'Which algorithm is widely used for autonomous robot navigation in unknown environments?',
    options: ['Dijkstra only', 'A* (A-star)', 'Bubble sort', 'Gradient descent'],
    correct: 1,
  },
  {
    id: 'l3q6', type: 'mcq', difficulty: 'hard',
    text: 'In deep reinforcement learning for robotics, what does the "reward function" define?',
    options: [
      'The physical structure of the robot',
      'The desired behaviour by assigning scores to actions',
      'The sensor calibration parameters',
      'The power consumption profile',
    ],
    correct: 1,
  },
  {
    id: 'l3q7', type: 'tf', difficulty: 'hard',
    text: 'ROS 2 improves on ROS 1 by adding real-time capabilities and better support for multi-robot systems.',
    options: ['True', 'False'],
    correct: 0,
  },
  {
    id: 'l3q8', type: 'mcq', difficulty: 'hard',
    text: 'Which sensor fusion technique combines data from multiple sensors to improve accuracy?',
    options: ['Kalman Filter', 'Binary search', 'Heap sort', 'Fourier Transform'],
    correct: 0,
  },
  {
    id: 'l3q9', type: 'mcq', difficulty: 'hard',
    text: 'What does "degrees of freedom" (DOF) refer to in a robotic arm?',
    options: [
      'Number of sensors attached',
      'Number of independent movements the arm can perform',
      'Maximum payload capacity',
      'Power supply voltage',
    ],
    correct: 1,
  },
  {
    id: 'l3q10', type: 'tf', difficulty: 'hard',
    text: 'Transfer learning allows a robot trained in simulation to perform effectively in the real world without any fine-tuning.',
    options: ['True', 'False'],
    correct: 1,
  },
];

export const LEVEL_QUESTIONS = {
  1: LEVEL1_QUESTIONS,
  2: LEVEL2_QUESTIONS,
  3: LEVEL3_QUESTIONS,
};

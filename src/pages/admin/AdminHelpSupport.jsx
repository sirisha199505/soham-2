import { useState } from 'react';
import { HelpCircle, ChevronDown, BookOpen, Users, Database, Settings, Shield, Mail } from 'lucide-react';

const FAQ_SECTIONS = [
  {
    category: 'Question Bank',
    color: '#4F46E5',
    Icon: Database,
    items: [
      {
        q: 'How do I add questions to the Question Bank?',
        a: 'Go to Question Bank → open a bank → open a level → open a category → click "Add Question". Fill in the question text, type, options, correct answer, difficulty, and the "Applicable For" field (Student / Trainer / Both). Click "Add Question" to save.',
      },
      {
        q: 'What does "Applicable For" mean on a question?',
        a: '"Applicable For" controls which audience sees the question during a quiz. Setting it to "Students Only" means only students get that question. "Trainers Only" means only coaches/trainers see it. "Both" makes it available to everyone.',
      },
      {
        q: 'How do I bulk-import questions using Excel?',
        a: 'Inside any QB level, click "Import Excel". Download the template, fill it with your questions, then upload the file. The system previews the parsed questions before importing — choose or create a category to save them into.',
      },
      {
        q: 'What question types are supported?',
        a: 'Four types are supported: MCQ (4 options, 1 correct), Match the Following (pair matching with drag & drop for students), Label Question (image with draggable label options), and True / False.',
      },
    ],
  },
  {
    category: 'Exam Levels',
    color: '#8B5CF6',
    Icon: BookOpen,
    items: [
      {
        q: 'How do I add a new exam level?',
        a: 'Go to Exam Levels and click "Add Level". Enter the title, subtitle, time limit, question count, and attempt limit. The new level automatically appears on the student dashboard and in all admin reporting screens.',
      },
      {
        q: 'How do I unlock a level for all students at once?',
        a: 'In Exam Levels, find the level you want to open and toggle the "Open" switch. This grants access to every student simultaneously without individual approval.',
      },
      {
        q: 'Why does a level not appear on the student dashboard?',
        a: 'Ensure the level is set to "active" and has at least one question in the Question Bank for its corresponding QB level. The student dashboard refreshes automatically from the database — no page reload is needed.',
      },
    ],
  },
  {
    category: 'Student Management',
    color: '#10B981',
    Icon: Users,
    items: [
      {
        q: 'How do I unlock a level for a specific student?',
        a: 'In User Management, find the student and click "Actions → Unlock Level X". This creates an admin override that bypasses the normal sequential unlock requirement for that student only.',
      },
      {
        q: 'How do I disable or re-enable a student account?',
        a: 'In User Management, find the student, click "Actions → Disable Account". Disabled accounts cannot log in. To re-enable, click "Actions → Enable Account".',
      },
      {
        q: 'What is the difference between Students and Innovation Coaches?',
        a: 'Students (role 0) take quizzes and progress through levels. Innovation Coaches (role 2) are assigned trainers/educators who can view coach-specific quiz content. Both appear in the User Management page on separate tabs.',
      },
    ],
  },
  {
    category: 'System & Settings',
    color: '#F59E0B',
    Icon: Settings,
    items: [
      {
        q: 'How do I change the quiz time limit?',
        a: 'Go to Exam Levels, click "Edit" on the desired level, and update the "Time Limit (minutes)" field. The change takes effect immediately for all future quiz sessions.',
      },
      {
        q: 'How do I limit the number of quiz attempts per student?',
        a: 'Edit the exam level and set the "Attempt Limit" field. Setting it to 0 means unlimited attempts. Students can see their remaining attempts on the dashboard.',
      },
      {
        q: 'Where are uploaded images stored?',
        a: 'Images uploaded through the Question Bank (question images) are stored in the configured AWS S3 bucket. Ensure the AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET) are set in the backend environment variables.',
      },
    ],
  },
  {
    category: 'Access & Permissions',
    color: '#EF4444',
    Icon: Shield,
    items: [
      {
        q: 'How does the level approval flow work?',
        a: 'When a student completes a level, an approval request is automatically created for the next level. Go to Exam Levels → Level Permissions to approve or reject. Approved students instantly gain access. You can also "Open All" to bypass approval for a level.',
      },
      {
        q: 'Can I approve or reject multiple students at once?',
        a: 'Yes. In Level Permissions, use the checkboxes to select multiple students, then click "Approve All" or "Reject All" in the bulk action bar that appears.',
      },
    ],
  },
];

/* ── Single accordion item ── */
function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div
      className={`rounded-xl border transition-colors duration-200 overflow-hidden
        ${isOpen ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-100 bg-white hover:border-slate-200'}`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
      >
        <span className={`text-sm font-semibold leading-snug transition-colors duration-200
          ${isOpen ? 'text-indigo-700' : 'text-slate-800'}`}>
          {item.q}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform duration-300 ease-in-out
            ${isOpen ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`}
        />
      </button>

      {/* Animated body */}
      <div
        style={{
          maxHeight: isOpen ? '400px' : '0px',
          opacity:   isOpen ? 1 : 0,
          overflow:  'hidden',
          transition: 'max-height 0.35s ease, opacity 0.25s ease',
        }}
      >
        <div className="px-5 pb-4 pt-0">
          <div className="h-px bg-indigo-100 mb-3" />
          <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Category section with its own accordion state ── */
function FAQSection({ section }) {
  // Each section has its own open index — only one item open per section
  const [openIndex, setOpenIndex] = useState(null);
  const { Icon } = section;

  const handleToggle = (i) => setOpenIndex(prev => (prev === i ? null : i));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50"
        style={{ background: `${section.color}08` }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${section.color}15`, color: section.color }}>
          <Icon size={17} />
        </div>
        <h2 className="font-bold text-slate-800 text-sm" style={{ fontFamily: 'Space Grotesk' }}>
          {section.category}
        </h2>
        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${section.color}15`, color: section.color }}>
          {section.items.length} questions
        </span>
      </div>

      {/* FAQ items */}
      <div className="p-4 space-y-2">
        {section.items.map((item, i) => (
          <FAQItem
            key={i}
            item={item}
            isOpen={openIndex === i}
            onToggle={() => handleToggle(i)}
          />
        ))}
      </div>
    </div>
  );
}

export default function AdminHelpSupport() {
  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <HelpCircle size={20} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
            Help &amp; Support
          </h1>
          <p className="text-sm text-slate-400">Admin guide — answers to common questions</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FAQ_SECTIONS.map(s => {
          const { Icon } = s;
          return (
            <div key={s.category} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5"
                style={{ background: `${s.color}15`, color: s.color }}>
                <Icon size={15} />
              </div>
              <p className="text-xs font-bold text-slate-700 leading-tight">{s.category}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.items.length} FAQs</p>
            </div>
          );
        })}
      </div>

      {/* FAQ sections */}
      {FAQ_SECTIONS.map((section, i) => (
        <FAQSection key={i} section={section} />
      ))}

      {/* Contact box */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-bold text-slate-800 mb-2" style={{ fontFamily: 'Space Grotesk' }}>
          Need more help?
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          For technical issues, database problems, or deployment questions, contact the system administrator or check the backend logs.
        </p>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Mail size={14} className="text-indigo-500" />
          <span>Reach out to your system administrator</span>
        </div>
      </div>

    </div>
  );
}

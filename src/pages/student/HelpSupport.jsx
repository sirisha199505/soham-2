import { useState, useEffect } from 'react';
import { HelpCircle, Mail, BookOpen, MessageCircle, ChevronDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

const STUDENT_FAQS = [
  {
    q: 'How do I log in to my account?',
    a: 'On the login screen, choose the Student tab and sign in with your registered mobile number, email address, or Student ID, along with your password.',
  },
  {
    q: 'I forgot my password — how do I reset it?',
    a: 'On the login screen tap "Forgot password?". Password resets are handled by your administrator — contact them and they will set a new password for you.',
  },
  {
    q: 'How do I access the Exam Levels?',
    a: 'Go to your Dashboard and click "Start" on any unlocked level card. Level 1 is always available. Higher levels unlock after you complete the previous one and, where required, after administrator approval.',
  },
  {
    q: 'How many times can I retake a level?',
    a: 'Each level can be attempted up to the limit set by your administrator (3 by default). Your best score is kept, and every attempt — including retakes — is recorded in your Quiz History.',
  },
  {
    q: 'How are quiz scores calculated?',
    a: 'Your score is the percentage of correct answers: (Correct answers ÷ Total questions) × 100. Scores are saved automatically when you submit the quiz.',
  },
  {
    q: 'Where can I review my past attempts?',
    a: 'Open the Quiz History page from the sidebar. It lists all your attempts with the score, date, and a question-by-question answer analysis with explanations.',
  },
  {
    q: 'How do I study and download content as a PDF?',
    a: 'Go to the Content page, select a level, and use the "Download PDF" button to save the study material for offline reading.',
  },
  {
    q: 'What happens if I run out of attempts?',
    a: 'Once you have used all attempts for a level, you will see "No Attempts Remaining". Contact your administrator if you need additional attempts.',
  },
  {
    q: 'Why is a level locked?',
    a: 'Levels unlock in order — finish the previous level first. Some levels also require administrator approval. Contact your school administrator if you believe a level should be open for you.',
  },
  {
    q: 'My score was not saved — what should I do?',
    a: 'Make sure you have a stable internet connection while taking the quiz. The app automatically retries saving if the connection drops. If a score is still missing from Quiz History, contact your administrator.',
  },
];

const TRAINER_FAQS = [
  {
    q: 'How do I log in as a trainer?',
    a: 'On the login screen, choose the Trainer tab and sign in with your registered email address (or phone number) and your password.',
  },
  {
    q: 'I forgot my password — how do I reset it?',
    a: 'On the login screen tap "Forgot password?". Password resets are handled by your administrator — contact them and they will set a new password for you.',
  },
  {
    q: 'What can I do in the app as a trainer?',
    a: 'You can view your Dashboard, study the Content, take your trainer-level quizzes, and review your Quiz History. Question banks, exam levels, and study content are configured by your administrator.',
  },
  {
    q: 'How do I take a quiz?',
    a: 'From your Dashboard, click "Start" on an available level. Trainers are served questions from the trainer question set (and shared questions), so your quiz may differ from a student\'s.',
  },
  {
    q: 'How many times can I retake a level?',
    a: 'Each level can be attempted up to the limit set by the administrator (3 by default). Your best score is kept, and every attempt is recorded in your Quiz History.',
  },
  {
    q: 'How are scores calculated?',
    a: 'Your score is the percentage of correct answers: (Correct answers ÷ Total questions) × 100, saved automatically when you submit.',
  },
  {
    q: 'Where can I review my attempts?',
    a: 'Open the Quiz History page from the sidebar to see all your attempts with scores, dates, and a question-by-question answer analysis with explanations.',
  },
  {
    q: 'How do I update my profile or change my password?',
    a: 'Go to the My Profile page from the sidebar to update your details and change your password.',
  },
  {
    q: 'Who do I contact to add levels, questions, or unlock content?',
    a: 'Exam levels, question banks, and content are managed by the administrator. Contact your administrator for any additions or changes.',
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

export default function HelpSupport() {
  const { colors } = useTheme();
  const { user } = useAuth();
  // Trainers (coach role) get trainer FAQs; everyone else gets the student set.
  const isTrainer = user?.role === 'coach';
  const audience  = isTrainer ? 'trainer' : 'student';
  const fallback  = isTrainer ? TRAINER_FAQS : STUDENT_FAQS;

  // FAQs are managed by admins in the DB; the hardcoded set is the fallback
  // shown if the API is empty or unreachable.
  const [faqs, setFaqs] = useState(fallback);

  useEffect(() => {
    let alive = true;
    api.getFaqs(audience)
      .then(rows => {
        if (!alive) return;
        const mapped = (Array.isArray(rows) ? rows : []).map(f => ({ q: f.question, a: f.answer }));
        setFaqs(mapped.length ? mapped : fallback);
      })
      .catch(() => { if (alive) setFaqs(fallback); });
    return () => { alive = false; };
  }, [audience]); // eslint-disable-line react-hooks/exhaustive-deps

  // null = all closed; number = index of the open item
  const [openIndex, setOpenIndex] = useState(null);

  const handleToggle = (i) => setOpenIndex(prev => (prev === i ? null : i));

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: `${colors.primary}15` }}>
          <HelpCircle size={20} style={{ color: colors.primary }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
            Help &amp; Support
          </h1>
          <p className="text-sm text-slate-400">Find answers and get in touch</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <BookOpen size={18} />,      title: 'Study Guide',    desc: 'Browse level content and materials',          color: colors.primary },
          { icon: <MessageCircle size={18} />, title: 'Quiz Tips',      desc: 'Read questions carefully before answering',   color: '#8B5CF6'      },
          { icon: <Mail size={18} />,          title: 'Contact Admin',  desc: 'Reach out to your school administrator',      color: '#10B981'      },
        ].map(item => (
          <div key={item.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `${item.color}15`, color: item.color }}>
              {item.icon}
            </div>
            <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
            <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* FAQ accordion */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-bold text-slate-800 mb-4" style={{ fontFamily: 'Space Grotesk' }}>
          Frequently Asked Questions
        </h2>
        <div className="space-y-2">
          {faqs.map((item, i) => (
            <FAQItem
              key={i}
              item={item}
              isOpen={openIndex === i}
              onToggle={() => handleToggle(i)}
            />
          ))}
        </div>
      </div>

      {/* Contact box */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-bold text-slate-800 mb-2" style={{ fontFamily: 'Space Grotesk' }}>
          Still need help?
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          {isTrainer
            ? 'Contact your administrator for assistance with your account, exam levels, or question banks.'
            : 'Contact your school administrator or Trainer for assistance with your account or exam access.'}
        </p>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {/* <Mail size={14} style={{ color: colors.primary }} /> */}
          <span>Reach out to your assigned administrator</span>
        </div>
      </div>

    </div>
  );
}

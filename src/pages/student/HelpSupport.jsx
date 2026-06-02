import { useState } from 'react';
import { HelpCircle, Mail, BookOpen, MessageCircle, ChevronDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const FAQS = [
  {
    q: 'How do I access the Exam Levels?',
    a: 'Go to your Dashboard and click "Start" on any unlocked level card. Level 1 is always available. Higher levels unlock after completing the previous one.',
  },
  {
    q: 'What is my unique Student ID?',
    a: 'Your Student ID was generated when you registered. It is your only login credential. You can view it in your Profile page. Keep it safe — it cannot be recovered if lost.',
  },
  {
    q: 'How are quiz scores calculated?',
    a: 'Your score is the percentage of correct answers: (Correct answers ÷ Total questions) × 100. Scores are saved automatically after each quiz.',
  },
  {
    q: 'Can I retake a quiz level?',
    a: 'Each level can be attempted multiple times up to the limit set by your administrator. Your best score is shown on the dashboard.',
  },
  {
    q: 'How do I download study content as PDF?',
    a: 'Go to the Study Content page, select a level, and click the "Download PDF" button in the top right corner.',
  },
  {
    q: 'Why is a level locked?',
    a: 'Levels unlock sequentially — complete the previous level first. Some levels may also require administrator approval. Contact your school admin if you believe a level should be unlocked for you.',
  },
  {
    q: 'What happens if I run out of attempts?',
    a: 'Once you have used all attempts for a level, you will see "No Attempts Remaining". Contact your administrator to request additional attempts.',
  },
  {
    q: 'My score was not saved — what should I do?',
    a: 'Ensure you have a stable internet connection during the quiz. If the issue persists, your answers are backed up locally and will retry automatically on next load. Contact your administrator if scores are still missing.',
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
          {FAQS.map((item, i) => (
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
          Contact your school administrator or Trainer for assistance with your account or exam access.
        </p>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Mail size={14} style={{ color: colors.primary }} />
          <span>Reach out to your assigned administrator</span>
        </div>
      </div>

    </div>
  );
}

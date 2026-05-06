import { HelpCircle, Mail, BookOpen, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const FAQS = [
  { q: 'How do I access the Exam Levels?', a: 'Go to your Dashboard and click "Start" on any unlocked level card. Level 1 is always available. Level 2 unlocks after completing Level 1, and Level 3 unlocks after Level 2.' },
  { q: 'What is my unique Student ID?', a: 'Your Student ID was generated when you registered. It is your only login credential. You can view it in your Profile page. Keep it safe — it cannot be recovered if lost.' },
  { q: 'How are quiz scores calculated?', a: 'Your score is the percentage of correct answers: (Correct answers ÷ Total questions) × 100. Scores are saved automatically after each quiz.' },
  { q: 'Can I retake a quiz level?', a: 'Each level can be attempted multiple times. Your latest score is used as your official score for that level.' },
  { q: 'How do I download study content as PDF?', a: 'Go to the Study Content page, select a level, and click the "Download PDF" button in the top right corner.' },
  { q: 'Why is Level 2 or Level 3 locked?', a: 'Levels unlock sequentially. Complete Level 1 first to unlock Level 2, and complete Level 2 to unlock Level 3.' },
];

function FAQ({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-800">{item.q}</span>
        {open ? <ChevronUp size={15} className="text-slate-400 shrink-0" /> : <ChevronDown size={15} className="text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-3">
          {item.a}
        </div>
      )}
    </div>
  );
}

export default function HelpSupport() {
  const { colors } = useTheme();

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${colors.primary}15` }}>
          <HelpCircle size={20} style={{ color: colors.primary }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Help &amp; Support</h1>
          <p className="text-sm text-slate-400">Find answers and get in touch</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <BookOpen size={18} />, title: 'Study Guide', desc: 'Browse level content and materials', color: colors.primary },
          { icon: <MessageCircle size={18} />, title: 'Quiz Tips', desc: 'Read questions carefully before answering', color: '#8B5CF6' },
          { icon: <Mail size={18} />, title: 'Contact Admin', desc: 'Reach out to your school administrator', color: '#10B981' },
        ].map(item => (
          <div key={item.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${item.color}15`, color: item.color }}>
              {item.icon}
            </div>
            <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
            <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* FAQs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-2">
        <h2 className="font-bold text-slate-800 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Frequently Asked Questions</h2>
        {FAQS.map((item, i) => <FAQ key={i} item={item} />)}
      </div>

      {/* Contact box */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-bold text-slate-800 mb-2" style={{ fontFamily: 'Space Grotesk' }}>Still need help?</h2>
        <p className="text-sm text-slate-500 mb-4">Contact your school administrator or teacher for assistance with your account or exam access.</p>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Mail size={14} style={{ color: colors.primary }} />
          <span>Reach out to your assigned administrator</span>
        </div>
      </div>
    </div>
  );
}

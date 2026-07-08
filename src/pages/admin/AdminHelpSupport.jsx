import { useState, useEffect } from 'react';
import {
  HelpCircle, ChevronDown, BookOpen, Users, Database, Settings, Shield, Mail,
  Plus, Pencil, Trash2, Save, X, GraduationCap, Briefcase, Loader2, MessagesSquare,
} from 'lucide-react';
import { api } from '../../utils/api';

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
        a: '"Applicable For" controls which audience sees the question during a quiz. Setting it to "Students Only" means only students get that question. "Trainers Only" means only trainers see it. "Both" makes it available to everyone.',
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
        q: 'What is the difference between Students and Trainers?',
        a: 'Students (role 0) take quizzes and progress through levels. Trainers (role 2) are assigned educators who can view trainer-specific quiz content. Both appear in the User Management page on separate tabs.',
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

/* ── Admin-editable FAQs (shown to students & trainers on their Help page) ── */
const AUDIENCE_META = {
  student: { label: 'Student', color: '#3BC0EF', Icon: GraduationCap },
  trainer: { label: 'Trainer', color: '#FAAB34', Icon: Briefcase },
  both:    { label: 'Both',    color: '#10B981', Icon: Users },
};
const EMPTY_DRAFT = { question: '', answer: '', audience: 'student', active: true };

function AudienceBadge({ audience }) {
  const m = AUDIENCE_META[audience] || AUDIENCE_META.both;
  const { Icon } = m;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${m.color}18`, color: m.color }}>
      <Icon size={11} /> {m.label}
    </span>
  );
}

function FaqForm({ value, onChange, onSubmit, onCancel, saving, submitLabel }) {
  return (
    <div className="space-y-2.5">
      <div>
        <label className="text-xs font-semibold text-slate-500 block mb-1">Question<span className="text-rose-400 ml-0.5">*</span></label>
        <input
          type="text" placeholder="Question"
          value={value.question}
          onChange={e => onChange({ ...value, question: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-400"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 block mb-1">Answer<span className="text-rose-400 ml-0.5">*</span></label>
        <textarea
          placeholder="Answer" rows={3}
          value={value.answer}
          onChange={e => onChange({ ...value, answer: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 leading-relaxed focus:outline-none focus:border-indigo-400 resize-y"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-slate-500">Audience</label>
        <select
          value={value.audience}
          onChange={e => onChange({ ...value, audience: e.target.value })}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-400"
        >
          <option value="student">Student</option>
          <option value="trainer">Trainer</option>
          <option value="both">Both</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 cursor-pointer">
          <input type="checkbox" checked={value.active}
            onChange={e => onChange({ ...value, active: e.target.checked })} />
          Visible
        </label>
        <div className="ml-auto flex items-center gap-2">
          {onCancel && (
            <button onClick={onCancel} disabled={saving}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100">
              <X size={14} /> Cancel
            </button>
          )}
          <button onClick={onSubmit} disabled={saving}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function FaqManager() {
  const [faqs, setFaqs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [filter, setFilter]   = useState('all');
  const [draft, setDraft]     = useState(EMPTY_DRAFT);
  const [editId, setEditId]   = useState(null);
  const [editDraft, setEditDraft] = useState(EMPTY_DRAFT);

  const load = () => {
    setLoading(true);
    api.getAllFaqs()
      .then(rows => setFaqs(Array.isArray(rows) ? rows : []))
      .catch(e => setError(e.message || 'Failed to load FAQs.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const addFaq = async () => {
    if (!draft.question.trim() || !draft.answer.trim()) { setError('Question and answer are required.'); return; }
    setSaving(true); setError('');
    try { await api.createFaq(draft); setDraft(EMPTY_DRAFT); load(); }
    catch (e) { setError(e.message || 'Failed to add FAQ.'); }
    finally { setSaving(false); }
  };

  const saveEdit = async (id) => {
    if (!editDraft.question.trim() || !editDraft.answer.trim()) { setError('Question and answer are required.'); return; }
    setSaving(true); setError('');
    try { await api.updateFaq(id, editDraft); setEditId(null); load(); }
    catch (e) { setError(e.message || 'Failed to update FAQ.'); }
    finally { setSaving(false); }
  };

  const removeFaq = async (id) => {
    if (!window.confirm('Delete this FAQ? This cannot be undone.')) return;
    setError('');
    try { await api.deleteFaq(id); load(); }
    catch (e) { setError(e.message || 'Failed to delete FAQ.'); }
  };

  const shown   = faqs.filter(f => filter === 'all' || f.audience === filter);
  const counts  = faqs.reduce((acc, f) => { acc[f.audience] = (acc[f.audience] || 0) + 1; return acc; }, {});
  const filters = [
    { key: 'all',     label: `All (${faqs.length})` },
    { key: 'student', label: `Student (${counts.student || 0})` },
    { key: 'trainer', label: `Trainer (${counts.trainer || 0})` },
    { key: 'both',    label: `Both (${counts.both || 0})` },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50" style={{ background: '#4F46E508' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600">
          <MessagesSquare size={17} />
        </div>
        <div>
          <h2 className="font-bold text-slate-800 text-sm" style={{ fontFamily: 'Space Grotesk' }}>
            Manage Student &amp; Trainer FAQs
          </h2>
          <p className="text-[11px] text-slate-400">These appear on the student &amp; trainer Help &amp; Support pages.</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
        )}

        {/* Add new */}
        <div className="rounded-xl border border-dashed border-slate-200 p-4 bg-slate-50/50">
          <p className="text-xs font-bold text-slate-600 mb-2.5 flex items-center gap-1.5">
            <Plus size={14} className="text-indigo-600" /> Add a new FAQ
          </p>
          <FaqForm value={draft} onChange={setDraft} onSubmit={addFaq} saving={saving} submitLabel="Add FAQ" />
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-1.5">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                filter === f.key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading FAQs…
          </div>
        ) : shown.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No FAQs yet. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {shown.map(f => (
              <div key={f.id} className="rounded-xl border border-slate-100 p-3.5">
                {editId === f.id ? (
                  <FaqForm value={editDraft} onChange={setEditDraft} onSubmit={() => saveEdit(f.id)}
                    onCancel={() => setEditId(null)} saving={saving} submitLabel="Save" />
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <AudienceBadge audience={f.audience} />
                        {!f.active && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Hidden</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-800 leading-snug">{f.question}</p>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">{f.answer}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { setEditId(f.id); setEditDraft({ question: f.question, answer: f.answer, audience: f.audience, active: f.active }); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => removeFaq(f.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminHelpSupport() {
  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="sticky top-0 z-30 -mt-6 py-4 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100 flex items-center gap-3">
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

      {/* Admin-editable FAQs for students & trainers */}
      <FaqManager />

      {/* Admin guide (static reference for administrators) */}
      <div className="flex items-center gap-2 pt-2">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider" style={{ fontFamily: 'Space Grotesk' }}>
          Admin Guide
        </h2>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
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

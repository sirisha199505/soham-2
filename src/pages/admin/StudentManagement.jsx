import { useState, useMemo, useEffect, useRef } from 'react';
import { scrollToTop } from '../../utils/scroll';
import {
  Users, Search, RefreshCw, CheckCircle,
  ChevronDown, Eye, EyeOff, Unlock, UserX, UserCheck,
  X, AlertTriangle, Zap, Lock, KeyRound, Loader2, Edit2, Save,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLevel } from '../../context/LevelContext';
import { api } from '../../utils/api';
import { compareLevels } from '../../utils/helpers';

const LEVEL_COLORS = ['#3BC0EF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

/* ── LevelBadge ── */
function LevelBadge({ data, levelId, overrideIds }) {
  const isOverride = overrideIds?.includes(levelId);
  if (!data && !isOverride) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-400">Not started</span>;
  }
  if (data?.status === 'completed') {
    const pct = data.score?.pct ?? 0;
    const ok = pct >= 50;
    return (
      <div className="flex items-center gap-1">
        <CheckCircle size={11} className={ok ? 'text-green-500' : 'text-red-400'} />
        <span className={`text-[10px] font-bold ${ok ? 'text-green-700' : 'text-red-500'}`}>{pct}%</span>
      </div>
    );
  }
  if (isOverride) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">Unlocked ★</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600">Unlocked</span>;
}

/* ── Reset Password Modal (admin-only) ── */
function ResetPasswordModal({ student, onClose }) {
  const [pw, setPw]           = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState(null); // { type: 'success' | 'error', text }

  const submit = async () => {
    setMsg(null);
    if (pw.length < 6)  { setMsg({ type: 'error', text: 'Password must be at least 6 characters.' }); return; }
    if (pw !== confirm) { setMsg({ type: 'error', text: 'Passwords do not match.' }); return; }
    setSaving(true);
    try {
      await api.setStudentPassword(student.id, pw);
      setMsg({ type: 'success', text: 'Password updated successfully.' });
      setPw(''); setConfirm('');
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-10 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
            <KeyRound size={16} className="text-indigo-500" /> Reset Password
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-indigo-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">Account</p>
            <p className="font-bold text-slate-800">{student.name || '—'}</p>
            {student.email && student.email !== '—' && <p className="text-xs text-slate-500 mt-0.5">{student.email}</p>}
          </div>
          <div className="space-y-2.5">
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)}
                placeholder="New password" autoComplete="new-password" className={inputCls} />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm password" autoComplete="new-password" className={inputCls} />
            </div>
            {msg && (
              <div className={`flex items-center gap-1.5 text-xs font-medium ${msg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                {msg.type === 'success' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />} {msg.text}
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving || !pw || !confirm}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Update Password
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Detail Modal (with inline Edit) ── */
function StudentModal({ student, levelList, onClose, onSaved }) {
  const isCoach = student.role === 'coach' || student.role === 'teacher';
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [form,    setForm]    = useState({
    name:        student.name || '',
    schoolName:  student.schoolName || '',
    className:   student.className || '',
    phoneNumber: student.phoneNumber || '',
  });

  const levels = levelList.length > 0
    ? levelList.map((lvl, i) => ({ id: lvl.id, label: lvl.title || `Level ${i + 1}`, idx: i }))
    : [1, 2, 3].map((n, i) => ({ id: n, label: `Level ${n}`, idx: i }));

  // Trainers have an organization (no class); students have school + class.
  const detailFields = isCoach
    ? [
        { label: 'Organization', value: student.schoolName },
        { label: 'Status',       value: student.disabled ? 'Disabled' : 'Active' },
      ]
    : [
        { label: 'Institute',     value: student.schoolName },
        { label: 'Class / Course', value: student.className },
        { label: 'Status', value: student.disabled ? 'Disabled' : 'Active' },
      ];

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400';

  const save = async () => {
    setError('');
    if (!form.name.trim()) { setError('Name is required.'); return; }
    const payload = { name: form.name.trim(), phoneNumber: form.phoneNumber.trim() };
    if (isCoach) payload.organizationName = form.schoolName.trim();
    else { payload.schoolName = form.schoolName.trim(); payload.className = form.className.trim(); }
    setSaving(true);
    try {
      await api.updateStudentDetails(student.id, payload);
      onSaved?.(student.id, {
        name: payload.name,
        phoneNumber: payload.phoneNumber,
        schoolName: form.schoolName.trim(),
        ...(isCoach ? {} : { className: form.className.trim() }),
      });
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to update details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>{isCoach ? 'Trainer Details' : 'Student Details'}</h3>
          <div className="flex items-center gap-1">
            {!editing && (
              <button onClick={() => { setEditing(true); setError(''); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors">
                <Edit2 size={13} /> Edit
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
          </div>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {editing ? (
            <div className="space-y-3">
              {error && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                  <AlertTriangle size={12} /> {error}
                </div>
              )}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">{isCoach ? 'Trainer Name' : 'Student Name'}</label>
                <input value={form.name} onChange={set('name')} className={inputCls} placeholder="Full name" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">{isCoach ? 'Organization / Institution' : 'Institute'}</label>
                <input value={form.schoolName} onChange={set('schoolName')} className={inputCls} placeholder={isCoach ? 'Organization / Institution' : 'Institution name'} />
              </div>
              {!isCoach && (
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">Class / Course</label>
                  <input value={form.className} onChange={set('className')} className={inputCls} placeholder="Class / Course" />
                </div>
              )}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">Mobile</label>
                <input value={form.phoneNumber} onChange={set('phoneNumber')} className={inputCls} placeholder="10-digit mobile number" inputMode="numeric" maxLength={10} />
              </div>
              <p className="text-[10px] text-slate-400">Email is not editable here.</p>
            </div>
          ) : (
            <>
              <div className="bg-indigo-50 rounded-2xl p-4">
                <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">{isCoach ? 'Trainer Name' : 'Student Name'}</p>
                <p className="font-bold text-slate-800 text-lg">{student.name || '—'}</p>
                <p className="text-xs text-slate-500 mt-0.5">{(student.email && student.email !== '—') ? student.email : '—'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {detailFields.map(f => (
                  <div key={f.label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">{f.label}</p>
                    <p className="text-sm font-semibold text-slate-700">{f.value || '—'}</p>
                  </div>
                ))}

                {/* Mobile */}
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Mobile</p>
                  <p className="text-sm font-semibold text-slate-700">{student.phoneNumber || '—'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase">Level Progress</p>
                {levels.map(({ id, label, idx }) => {
                  const d = student.levels?.[id];
                  return (
                    <div key={id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ background: LEVEL_COLORS[idx] || '#94a3b8' }}>
                          {idx + 1}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{label}</span>
                      </div>
                      <div className="text-right">
                        {d?.status === 'completed' ? (
                          <div>
                            <div className="flex items-center justify-end gap-1 mb-0.5">
                              <p className={`text-sm font-bold ${(d.score?.pct ?? 0) >= 50 ? 'text-green-600' : 'text-red-500'}`}>{d.score?.pct ?? 0}%</p>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${(d.score?.pct ?? 0) >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                {(d.score?.pct ?? 0) >= 50 ? '✓' : '✗'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">{d.score?.correct}/{d.score?.total} correct</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">{d ? 'Unlocked' : 'Not started'}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {editing && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
            <button onClick={() => { setEditing(false); setError(''); }} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Actions dropdown ── */
function ActionsMenu({ student, onAction }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Position the menu with FIXED coords from the button's rect so it escapes the
  // table's `overflow-x-auto` (which also clips vertically). Without this, with
  // only one row the menu was cut off by the short table card and unreachable.
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const menuW = 192;   // w-48
      const menuH = 180;   // approx content height (View Details + Reset Password + Enable/Disable)
      let left = Math.max(8, r.right - menuW);
      let top  = r.bottom + 6;
      // Flip above the button if it would overflow the viewport bottom.
      if (top + menuH > window.innerHeight && r.top - menuH > 8) top = r.top - menuH - 6;
      setPos({ top, left });
    }
    setOpen(o => !o);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
      >
        Actions <ChevronDown size={11} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 bg-white rounded-xl border border-slate-100 shadow-xl w-48 py-1 overflow-hidden"
            style={{ top: pos.top, left: pos.left }}>
            <button onClick={() => { onAction('view', student); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
              <Eye size={13} /> View Details
            </button>
            <div className="h-px bg-slate-100 my-1" />
            <button onClick={() => { onAction('password', student); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
              <KeyRound size={13} /> Reset Password
            </button>
            <div className="h-px bg-slate-100 my-1" />
            <button onClick={() => { onAction('toggle', student); setOpen(false); }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-red-50 ${student.disabled ? 'text-green-600' : 'text-red-500'}`}>
              {student.disabled ? <UserCheck size={13} /> : <UserX size={13} />}
              {student.disabled ? 'Enable Account' : 'Disable Account'}
            </button>
          </div>
        </>
      )}
    </>
  );
}

/* ── MAIN ── */
export default function StudentManagement() {
  const { user } = useAuth();
  const { setStudentOverride } = useLevel();
  const [data,      setData]      = useState([]);
  const [levelList, setLevelList] = useState([]);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('all');
  const [page,      setPage]      = useState(1);
  const [tab,       setTab]       = useState('students'); // 'students' | 'coaches'
  const [viewStudent, setViewStudent] = useState(null);
  const [resetStudent, setResetStudent] = useState(null);
  const [toast,     setToast]     = useState(null);
  // Tell "still loading the first fetch" apart from "loaded, no users". Without
  // this the table showed "No users found" during the ~20s Render cold start, so
  // freshly-registered students looked like they were missing. `loaded` flips
  // true after the first successful fetch; `error` surfaces only when we have no
  // data to show.
  const [loaded,    setLoaded]    = useState(false);
  const [error,     setError]     = useState(false);
  const PER_PAGE = 10;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // The periodic 30s refresh never flashes the loading/error screens: once
  // `loaded` is true those screens are gated off, and a failed background refresh
  // keeps the last good list on screen.
  const fetchStudents = () => {
    return Promise.all([api.getStudents(), api.getLevelSettings()])
      .then(([students, levelsData]) => {
        const sorted = Array.isArray(levelsData)
          ? levelsData.sort(compareLevels)
          : [];
        setLevelList(sorted);

        setData(students.map(s => ({
          id:          s.id,
          name:        s.name || '—',
          // "{phone}@student.rq" is a synthetic placeholder for phone-only students,
          // not a real email — show a dash instead (backend now nulls it too).
          email:       (s.email && !s.email.endsWith('@student.rq')) ? s.email : '—',
          phoneNumber: s.phoneNumber || s.phone_number || '',
          role:        s.role || 'student',
          uniqueId:    s.uniqueId   || s.unique_id,
          schoolName:  s.schoolName || s.school_name || '—',
          className:   s.className  || s.class_name  || '—',
          // Source of truth is the backend (users.active); the old localStorage
          // overlay was keyed on the empty uniqueId and never worked for trainers.
          disabled:    s.disabled,
          levels:      s.levels || {},
          overrides:   s.overrideIds || s.override_ids || [],
        })));
        setLoaded(true);
        setError(false);
      })
      .catch(() => {
        // api.request already retries network errors/503s; reaching here means the
        // backend is still unreachable. Keep any previously-loaded list on screen
        // and only show the error state when we have nothing to display yet.
        setError(prev => prev || !loaded);
      });
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchStudents();
    const timer = setInterval(fetchStudents, 30_000);
    return () => clearInterval(timer);
  }, [user?.id]);

  const refresh = () => fetchStudents();

  // Build filter options from ALL actual levels (no slice limit)
  const filterOptions = useMemo(() => [
    { id: 'all',      label: 'All',      levelId: null },
    ...levelList.map((l, i) => ({
      id:      `l${l.id}`,
      label:   `${l.title || `L${i + 1}`} Done`,
      levelId: l.id,
    })),
    { id: 'disabled', label: 'Disabled', levelId: null },
  ], [levelList]);

  const filtered = useMemo(() => {
    // Normalise the query once: trim stray spaces, lowercase for text, and reduce
    // to digits for phone matching so "98765 43210" or "+91 98765" still match.
    const q       = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return data.filter(s => {
      const matchTab    = tab === 'coaches' ? s.role === 'coach' : s.role !== 'coach';
      const matchSearch = !q ||
        (s.name        && s.name.toLowerCase().includes(q)) ||
        (s.email       && s.email.toLowerCase().includes(q)) ||
        (qDigits && s.phoneNumber && s.phoneNumber.replace(/\D/g, '').includes(qDigits)) ||
        (s.uniqueId    && s.uniqueId.toLowerCase().includes(q)) ||
        (s.schoolName  && s.schoolName.toLowerCase().includes(q));
      const lf = filterOptions.find(f => f.id === filter && f.levelId != null);
      const matchFilter = filter === 'all'      ? true
        : filter === 'disabled' ? s.disabled
        : lf                    ? s.levels[lf.levelId]?.status === 'completed'
        : true;
      return matchTab && matchSearch && matchFilter;
    });
  }, [data, search, filter, tab, filterOptions]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  // Optimistically mark a level as overridden on the local student row so the ★
  // badge appears immediately, before the next getStudents refetch confirms it.
  const markOverrideLocally = (studentId, levelId) => {
    setData(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const next = Array.isArray(s.overrides) ? [...s.overrides] : [];
      if (!next.includes(levelId)) next.push(levelId);
      return { ...s, overrides: next };
    }));
  };

  const handleBulkUnlock = async (levelId, levelTitle) => {
    if (filtered.length === 0) return;
    // Identify by DB id, not uniqueId: uniqueId is empty for email-registered
    // students (resolve_user_id maps a numeric DB id to itself). Await every
    // override so the follow-up refresh reflects the new state instead of racing
    // the in-flight POSTs.
    await Promise.all(filtered.map(s => {
      markOverrideLocally(s.id, levelId);
      return setStudentOverride(s.id, levelId);
    }));
    showToast(`${levelTitle || `Level ${levelId}`} unlocked for ${filtered.length} student${filtered.length > 1 ? 's' : ''}`);
    refresh();
  };

  const handleAction = async (action, student, lvl) => {
    if (action === 'view') { setViewStudent(student); scrollToTop(); return; }

    if (action === 'password') { setResetStudent(student); return; }

    if (action === 'unlock') {
      // `lvl` is the level's DB id; show its real title in the toast (it was
      // showing the raw id, e.g. "Level 25", instead of "Level 2").
      const lvlMeta  = levelList.find(l => l.id === lvl);
      const lvlTitle = lvlMeta?.title || lvlMeta?.name || `Level ${lvl}`;
      markOverrideLocally(student.id, lvl);
      await setStudentOverride(student.id, lvl);
      showToast(`${lvlTitle} unlocked for ${student.name || student.uniqueId || student.id}`);
      refresh();
    }
    if (action === 'reset') {
      api.resetStudentProgress(student.uniqueId)
        .then(() => { showToast(`Progress reset for ${student.uniqueId}`, 'warning'); fetchStudents(); })
        .catch(() => showToast('Reset failed', 'warning'));
    }
    if (action === 'toggle') {
      // Persist to the backend (users.active) by DB id — the old version only
      // wrote localStorage keyed on uniqueId, so it did nothing for trainers/
      // email students and never actually blocked login. Login filters active:true,
      // so disabling here truly prevents sign-in.
      const enabling = student.disabled;          // currently disabled → we are enabling
      const label    = student.name || student.uniqueId || student.id;
      try {
        await api.setStudentActive(student.id, enabling);
        setData(prev => prev.map(s => s.id === student.id ? { ...s, disabled: !enabling } : s));
        showToast(`Account ${enabling ? 'enabled' : 'disabled'} for ${label}`, enabling ? 'success' : 'warning');
      } catch (e) {
        showToast(e.message || 'Failed to update account status.', 'warning');
      }
    }
  };

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold
          ${toast.type === 'warning' ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
          {toast.type === 'warning' ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 -mt-6 py-4 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>User Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">{data.length} registered users</p>
        </div>
        <button onClick={refresh} className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
          <RefreshCw size={14} /> <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'students', label: 'Students', count: data.filter(s => s.role !== 'coach').length },
          { id: 'coaches',  label: 'Trainers', count: data.filter(s => s.role === 'coach').length },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setPage(1); setSearch(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors
              ${tab === t.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
              ${tab === t.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search by name, mobile, institute…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filterOptions.map(f => (
            <button key={f.id} onClick={() => { setFilter(f.id); setPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                ${filter === f.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions bar — visible whenever a level filter is active */}
      {filterOptions.some(f => f.id === filter && f.levelId != null) && filtered.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Zap size={14} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800">Bulk Unlock</p>
                <p className="text-xs text-amber-600">
                  Applies to all <span className="font-bold">{filtered.length}</span> filtered student{filtered.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {levelList.slice(1).map(lvl => (
                  <button
                    key={lvl.id}
                    onClick={() => handleBulkUnlock(lvl.id, lvl.title || lvl.name)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 active:scale-[0.97] transition-all shadow-sm"
                  >
                    <Unlock size={12} /> Unlock {lvl.title || lvl.name || `Level ${lvl.id}`} for All
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">{filtered.length} {tab === 'coaches' ? 'trainer' : 'student'}{filtered.length !== 1 ? 's' : ''}</p>
          <p className="text-xs text-slate-400">Page {page} of {Math.max(totalPages, 1)}</p>
        </div>
        {!loaded && !error ? (
          <div className="py-16 text-center">
            <RefreshCw size={28} className="mx-auto text-indigo-400 animate-spin mb-3" />
            <p className="text-slate-500 text-sm font-semibold">Loading users…</p>
            <p className="text-slate-400 text-xs mt-1">This can take a few seconds while the server wakes up.</p>
          </div>
        ) : !loaded && error ? (
          <div className="py-16 text-center">
            <AlertTriangle size={32} className="mx-auto text-red-400 mb-3" />
            <p className="text-slate-700 text-sm font-semibold">Couldn't load users</p>
            <p className="text-slate-400 text-xs mt-1 mb-3">The server may be starting up or temporarily unavailable.</p>
            <button onClick={() => { setError(false); fetchStudents(); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={40} className="mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 text-sm">No users found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[
                  '#', 'Name', 'Mobile', tab === 'coaches' ? 'Organization' : 'Institute',
                  ...levelList.map(l => l.title || l.name || `Level ${l.id}`),
                  'Status', 'Actions',
                ].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((s, i) => (
                <tr key={s.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${s.disabled ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3.5 text-xs text-slate-400">{(page - 1) * PER_PAGE + i + 1}</td>
                  {/* Name + Email */}
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="font-semibold text-slate-800 text-xs">{s.name || '—'}</p>
                      <p className="text-[10px] text-slate-400">{s.email !== '—' ? s.email : '—'}</p>
                    </div>
                  </td>
                  {/* Mobile */}
                  <td className="px-4 py-3.5">
                    {s.phoneNumber
                      ? <span className="text-xs font-medium text-slate-700">{s.phoneNumber}</span>
                      : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  {/* School / Org */}
                  <td className="px-4 py-3.5">
                    <p className="text-xs font-medium text-slate-700 truncate max-w-[140px]">{s.schoolName}</p>
                  </td>
                  {levelList.map(lvl => (
                    <td key={lvl.id} className="px-4 py-3.5">
                      <LevelBadge data={s.levels[lvl.id]} levelId={lvl.id} overrideIds={s.overrides} />
                    </td>
                  ))}
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold
                      ${s.disabled ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.disabled ? 'bg-red-400' : 'bg-green-400'}`} />
                      {s.disabled ? 'Disabled' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <ActionsMenu student={s} onAction={handleAction} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors">
              Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors
                    ${page === p ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {p}
                </button>
              ))}
            </div>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors">
              Next
            </button>
          </div>
        )}
      </div>

      {viewStudent && (
        <StudentModal
          student={viewStudent}
          levelList={levelList}
          onClose={() => setViewStudent(null)}
          onSaved={(id, changes) => {
            setData(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s));
            setViewStudent(prev => prev ? { ...prev, ...changes } : prev);
            showToast('Details updated');
          }}
        />
      )}

      {resetStudent && (
        <ResetPasswordModal
          student={resetStudent}
          onClose={() => setResetStudent(null)}
        />
      )}
    </div>
  );
}

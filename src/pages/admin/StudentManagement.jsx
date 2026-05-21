import { useState, useMemo, useEffect } from 'react';
import {
  Users, Search, RefreshCw, CheckCircle,
  ChevronDown, Eye, Unlock, RotateCcw, UserX, UserCheck,
  Hash, X, AlertTriangle, Info, Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLevel } from '../../context/LevelContext';
import { api } from '../../utils/api';

const LEVEL_COLORS = ['#3BC0EF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
const DISABLED_KEY = 'rqa_disabled_students';

function saveDisabled(ids) {
  localStorage.setItem(DISABLED_KEY, JSON.stringify(ids));
}

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

/* ── Detail Modal ── */
function StudentModal({ student, levelList, onClose }) {
  if (!student) return null;
  // Use actual DB levels when available; fall back to generic placeholders
  const levels = levelList.length > 0
    ? levelList.map((lvl, i) => ({ id: lvl.id, label: lvl.title || `Level ${i + 1}`, idx: i }))
    : [1, 2, 3].map((n, i) => ({ id: n, label: `Level ${n}`, idx: i }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Student Details</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-indigo-50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Hash size={20} className="text-indigo-500" />
            </div>
            <div>
              <p className="font-mono font-bold text-slate-800 text-lg tracking-widest">{student.uniqueId}</p>
              <p className="text-xs text-slate-500">{student.schoolName}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'School',  value: student.schoolName },
              { label: 'Class',   value: student.className },
              { label: 'Status',  value: student.disabled ? 'Disabled' : 'Active' },
            ].map(f => (
              <div key={f.label} className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">{f.label}</p>
                <p className="text-sm font-semibold text-slate-700">{f.value}</p>
              </div>
            ))}
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
                        <p className="text-sm font-bold text-green-600">{d.score?.pct}%</p>
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
        </div>
      </div>
    </div>
  );
}

/* ── Actions dropdown ── */
function ActionsMenu({ student, levelList, onAction }) {
  const [open, setOpen] = useState(false);
  // Levels that can be unlocked = all except the first
  const unlockableLevels = levelList.length > 1
    ? levelList.slice(1)
    : [{ id: 2, title: 'Level 2' }, { id: 3, title: 'Level 3' }];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
      >
        Actions <ChevronDown size={11} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white rounded-xl border border-slate-100 shadow-xl w-48 py-1 overflow-hidden">
            <button onClick={() => { onAction('view', student); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
              <Eye size={13} /> View Details
            </button>
            <div className="h-px bg-slate-100 my-1" />
            <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">Unlock Level</p>
            {unlockableLevels.map(lvl => (
              <button key={lvl.id} onClick={() => { onAction('unlock', student, lvl.id); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-amber-50">
                <Unlock size={13} className="text-amber-500" /> Unlock {lvl.title || `Level ${lvl.id}`}
              </button>
            ))}
            <div className="h-px bg-slate-100 my-1" />
            <button onClick={() => { onAction('reset', student); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-orange-600 hover:bg-orange-50">
              <RotateCcw size={13} /> Reset Progress
            </button>
            <button onClick={() => { onAction('toggle', student); setOpen(false); }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-red-50 ${student.disabled ? 'text-green-600' : 'text-red-500'}`}>
              {student.disabled ? <UserCheck size={13} /> : <UserX size={13} />}
              {student.disabled ? 'Enable Account' : 'Disable Account'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── MAIN ── */
export default function StudentManagement() {
  const { user } = useAuth();
  const { setStudentOverride } = useLevel();
  const [data,      setData]      = useState([]);
  const [levelList, setLevelList] = useState([]); // sorted levels from DB
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('all');
  const [page,      setPage]      = useState(1);
  const [viewStudent, setViewStudent] = useState(null);
  const [toast,     setToast]     = useState(null);
  const PER_PAGE = 10;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStudents = async () => {
    try {
      const [students, levelsData] = await Promise.all([api.getStudents(), api.getLevelSettings()]);
      const sorted = Array.isArray(levelsData)
        ? levelsData.sort((a, b) => (a.order || a.id) - (b.order || b.id))
        : [];
      setLevelList(sorted);

      const localDisabled = JSON.parse(localStorage.getItem(DISABLED_KEY) || '[]');
      setData(students.map(s => ({
        uniqueId:   s.uniqueId,
        schoolName: s.schoolName || '—',
        className:  s.className  || '—',
        disabled:   s.disabled || localDisabled.includes(s.uniqueId),
        levels:     s.levels || {}, // all level data keyed by DB level ID
        overrides:  s.overrideIds || [],
      })));
    } catch {}
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchStudents();
    const timer = setInterval(fetchStudents, 30_000);
    return () => clearInterval(timer);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => fetchStudents();

  // Build filter options from actual levels
  const filterOptions = useMemo(() => [
    { id: 'all',      label: 'All',      levelId: null },
    ...levelList.slice(0, 3).map((l, i) => ({
      id:      `l${i + 1}`,
      label:   `${l.title || `L${i + 1}`} Done`,
      levelId: l.id,
    })),
    { id: 'disabled', label: 'Disabled', levelId: null },
  ], [levelList]);

  const filtered = useMemo(() => {
    return data.filter(s => {
      const matchSearch = !search || s.uniqueId.toLowerCase().includes(search.toLowerCase()) ||
        s.schoolName.toLowerCase().includes(search.toLowerCase()) ||
        s.className.toLowerCase().includes(search.toLowerCase());
      const lf = filterOptions.find(f => f.id === filter && f.levelId != null);
      const matchFilter = filter === 'all'      ? true
        : filter === 'disabled' ? s.disabled
        : lf                    ? s.levels[lf.levelId]?.status === 'completed'
        : true;
      return matchSearch && matchFilter;
    });
  }, [data, search, filter, filterOptions]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const handleBulkUnlock = (levelId, levelTitle) => {
    if (filtered.length === 0) return;
    filtered.forEach(s => setStudentOverride(s.uniqueId, levelId));
    showToast(`${levelTitle || `Level ${levelId}`} unlocked for ${filtered.length} student${filtered.length > 1 ? 's' : ''}`);
    refresh();
  };

  const handleAction = (action, student, lvl) => {
    if (action === 'view') { setViewStudent(student); return; }

    if (action === 'unlock') {
      setStudentOverride(student.uniqueId, lvl);
      showToast(`Level ${lvl} unlocked for ${student.uniqueId}`);
      refresh();
    }
    if (action === 'reset') {
      api.resetStudentProgress(student.uniqueId)
        .then(() => { showToast(`Progress reset for ${student.uniqueId}`, 'warning'); fetchStudents(); })
        .catch(() => showToast('Reset failed', 'warning'));
    }
    if (action === 'toggle') {
      const disabled = JSON.parse(localStorage.getItem(DISABLED_KEY) || '[]');
      const newDisabled = student.disabled
        ? disabled.filter(id => id !== student.uniqueId)
        : [...disabled, student.uniqueId];
      saveDisabled(newDisabled);
      showToast(`Account ${student.disabled ? 'enabled' : 'disabled'} for ${student.uniqueId}`, student.disabled ? 'success' : 'warning');
      refresh();
    }
  };

  const totalStudents = data.length;
  // Use actual DB level IDs from levelList for completion stats
  const [lvl1, lvl2, lvl3] = levelList;
  const l1Count = lvl1 ? data.filter(s => s.levels[lvl1.id]?.status === 'completed').length : 0;
  const l2Count = lvl2 ? data.filter(s => s.levels[lvl2.id]?.status === 'completed').length : 0;
  const l3Count = lvl3 ? data.filter(s => s.levels[lvl3.id]?.status === 'completed').length : 0;
  const miniStats = [
    { label: 'Total',                              value: totalStudents, color: '#4F46E5' },
    lvl1 ? { label: `${lvl1.title || 'L1'} Done`, value: l1Count,       color: '#3BC0EF' } : null,
    lvl2 ? { label: `${lvl2.title || 'L2'} Done`, value: l2Count,       color: '#8B5CF6' } : null,
    lvl3 ? { label: `${lvl3.title || 'L3'} Done`, value: l3Count,       color: '#10B981' } : null,
  ].filter(Boolean);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Student Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">{totalStudents} registered students</p>
        </div>
        <button onClick={refresh} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {miniStats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>{s.value}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">{s.label}</p>
            </div>
            <div className="w-2 h-8 rounded-full" style={{ background: s.color }} />
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search by ID or school…"
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

      {/* Info banner */}
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
        <Info size={13} className="text-blue-500 shrink-0" />
        <p className="text-xs text-blue-700">Showing {filtered.length} of {totalStudents} students. Admin overrides are marked with ★</p>
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
              {(levelList.length > 1 ? levelList.slice(1) : [{ id: 2, title: 'Level 2' }, { id: 3, title: 'Level 3' }])
                .map(lvl => (
                  <button
                    key={lvl.id}
                    onClick={() => handleBulkUnlock(lvl.id, lvl.title)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 active:scale-[0.97] transition-all shadow-sm"
                  >
                    <Unlock size={12} /> Unlock {lvl.title || `Level ${lvl.id}`} for All
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">{filtered.length} students</p>
          <p className="text-xs text-slate-400">Page {page} of {Math.max(totalPages, 1)}</p>
        </div>
        {paginated.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={40} className="mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 text-sm">No students found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[
                  '#', 'Student ID', 'School', 'Class',
                  ...(levelList.length > 0
                    ? levelList.slice(0, 3).map(l => l.title || `Level ${l.id}`)
                    : ['Level 1', 'Level 2', 'Level 3']),
                  'Status', 'Actions',
                ].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((s, i) => (
                <tr key={s.uniqueId} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${s.disabled ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3.5 text-xs text-slate-400">{(page - 1) * PER_PAGE + i + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <Hash size={13} className="text-indigo-400" />
                      </div>
                      <span className="font-mono font-bold text-slate-800 text-xs tracking-widest">{s.uniqueId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs font-medium text-slate-700 truncate max-w-[140px]">{s.schoolName}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">{s.className}</span>
                  </td>
                  {(levelList.length > 0
                    ? levelList.slice(0, 3)
                    : [{ id: 1 }, { id: 2 }, { id: 3 }]
                  ).map(lvl => (
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
                    <ActionsMenu student={s} levelList={levelList} onAction={handleAction} />
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

      {viewStudent && <StudentModal student={viewStudent} levelList={levelList} onClose={() => setViewStudent(null)} />}
    </div>
  );
}

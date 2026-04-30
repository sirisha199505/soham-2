import { useState, useMemo } from 'react';
import {
  Users, Search, RefreshCw, CheckCircle,
  ChevronDown, Eye, Unlock, RotateCcw, UserX, UserCheck,
  Hash, X, AlertTriangle, Info, Zap,
} from 'lucide-react';
import { useLevel } from '../../context/LevelContext';

const LEVEL_COLORS = { 1: '#3BC0EF', 2: '#8B5CF6', 3: '#10B981' };
const ADMIN_OVERRIDES_KEY = 'rqa_admin_overrides';
const DISABLED_KEY = 'rqa_disabled_students';

/* ── data helpers ── */
function loadAllData() {
  const students = JSON.parse(localStorage.getItem('rqa_students') || '{}');
  const progress = JSON.parse(localStorage.getItem('rqa_level_progress') || '{}');
  const overrides = JSON.parse(localStorage.getItem(ADMIN_OVERRIDES_KEY) || '{}');
  const disabled = JSON.parse(localStorage.getItem(DISABLED_KEY) || '[]');

  return Object.values(students).map(s => {
    const p = progress[s.uniqueId] || {};
    return {
      uniqueId: s.uniqueId,
      name: s.name || '—',
      rollNo: s.rollNo || '—',
      className: s.className || '—',
      school: s.school || '—',
      disabled: disabled.includes(s.uniqueId),
      levels: {
        1: p[1] || null,
        2: p[2] || null,
        3: p[3] || null,
      },
      overrides: overrides[s.uniqueId] || [],
    };
  });
}

function saveDisabled(ids) {
  localStorage.setItem(DISABLED_KEY, JSON.stringify(ids));
}

function resetStudentProgress(userId) {
  const progress = JSON.parse(localStorage.getItem('rqa_level_progress') || '{}');
  delete progress[userId];
  localStorage.setItem('rqa_level_progress', JSON.stringify(progress));
  const overrides = JSON.parse(localStorage.getItem(ADMIN_OVERRIDES_KEY) || '{}');
  delete overrides[userId];
  localStorage.setItem(ADMIN_OVERRIDES_KEY, JSON.stringify(overrides));
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
function StudentModal({ student, onClose }) {
  if (!student) return null;
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
              <p className="text-xs text-slate-500">{student.name} · Class {student.className}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Name',    value: student.name },
              { label: 'Roll No', value: student.rollNo },
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
            {[1, 2, 3].map(lvl => {
              const d = student.levels[lvl];
              return (
                <div key={lvl} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ background: LEVEL_COLORS[lvl] }}>
                      {lvl}
                    </div>
                    <span className="text-sm font-medium text-slate-700">Level {lvl}</span>
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
function ActionsMenu({ student, onAction }) {
  const [open, setOpen] = useState(false);
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
            {[2, 3].map(lvl => (
              <button key={lvl} onClick={() => { onAction('unlock', student, lvl); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-amber-50">
                <Unlock size={13} className="text-amber-500" /> Unlock Level {lvl}
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
  const { setStudentOverride } = useLevel();
  const [data, setData] = useState(loadAllData);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [viewStudent, setViewStudent] = useState(null);
  const [toast, setToast] = useState(null);
  const PER_PAGE = 10;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const refresh = () => setData(loadAllData());

  const filtered = useMemo(() => {
    return data.filter(s => {
      const matchSearch = !search || s.uniqueId.toLowerCase().includes(search.toLowerCase()) ||
        s.school.toLowerCase().includes(search.toLowerCase()) ||
        s.className.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' ? true
        : filter === 'l1' ? s.levels[1]?.status === 'completed'
        : filter === 'l2' ? s.levels[2]?.status === 'completed'
        : filter === 'l3' ? s.levels[3]?.status === 'completed'
        : filter === 'disabled' ? s.disabled
        : true;
      return matchSearch && matchFilter;
    });
  }, [data, search, filter]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const handleBulkUnlock = (lvl) => {
    if (filtered.length === 0) return;
    filtered.forEach(s => setStudentOverride(s.uniqueId, lvl));
    showToast(`Level ${lvl} unlocked for ${filtered.length} student${filtered.length > 1 ? 's' : ''}`);
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
      resetStudentProgress(student.uniqueId);
      showToast(`Progress reset for ${student.uniqueId}`, 'warning');
      refresh();
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
  const l1Count = data.filter(s => s.levels[1]?.status === 'completed').length;
  const l2Count = data.filter(s => s.levels[2]?.status === 'completed').length;
  const l3Count = data.filter(s => s.levels[3]?.status === 'completed').length;

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
        {[
          { label: 'Total',      value: totalStudents, color: '#4F46E5' },
          { label: 'L1 Passed',  value: l1Count,       color: '#3BC0EF' },
          { label: 'L2 Passed',  value: l2Count,       color: '#8B5CF6' },
          { label: 'L3 Passed',  value: l3Count,       color: '#10B981' },
        ].map(s => (
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
            placeholder="Search by ID, name, class…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all',      label: 'All' },
            { id: 'l1',       label: 'L1 Done' },
            { id: 'l2',       label: 'L2 Done' },
            { id: 'l3',       label: 'L3 Done' },
            { id: 'disabled', label: 'Disabled' },
          ].map(f => (
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
      {['l1', 'l2', 'l3'].includes(filter) && filtered.length > 0 && (
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
              {[2, 3].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => handleBulkUnlock(lvl)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 active:scale-[0.97] transition-all shadow-sm"
                >
                  <Unlock size={12} /> Unlock Level {lvl} for All
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
                {['#', 'Student ID', 'Name / Class', 'Level 1', 'Level 2', 'Level 3', 'Status', 'Actions'].map(h => (
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
                    <p className="text-xs font-medium text-slate-700 truncate max-w-[120px]">{s.name}</p>
                    <p className="text-[10px] text-slate-400">Class {s.className}</p>
                  </td>
                  {[1, 2, 3].map(lvl => (
                    <td key={lvl} className="px-4 py-3.5">
                      <LevelBadge data={s.levels[lvl]} levelId={lvl} overrideIds={s.overrides} />
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

      {viewStudent && <StudentModal student={viewStudent} onClose={() => setViewStudent(null)} />}
    </div>
  );
}

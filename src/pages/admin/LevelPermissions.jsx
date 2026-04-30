import { useState, useMemo } from 'react';
import {
  ShieldCheck, Search, CheckCircle, XCircle, Clock,
  ChevronDown, Users, Filter, RefreshCw, CheckSquare,
  Square, Trophy, Calendar, Hourglass, AlertCircle,
  UserCheck, UserX, ToggleLeft, ToggleRight, ChevronRight,
} from 'lucide-react';
import { loadApprovals, saveApprovals } from '../../context/LevelContext';
import { LEVELS } from '../../utils/levelData';

const PROGRESS_KEY  = 'rqa_level_progress';
const STUDENTS_KEY  = 'rqa_students';
const SETTINGS_KEY  = 'rqa_level_settings';
const GLOBAL_KEY    = 'rqa_global_level_access';

/* ── Helpers ─────────────────────────────────────────────────── */
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); }
  catch { return {}; }
}
function loadStudents() {
  try { return JSON.parse(localStorage.getItem(STUDENTS_KEY) || '{}'); }
  catch { return {}; }
}
function loadLevelSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }
  catch { return {}; }
}
function loadGlobal() {
  try { return JSON.parse(localStorage.getItem(GLOBAL_KEY) || '{}'); }
  catch { return {}; }
}
function saveGlobal(g) { localStorage.setItem(GLOBAL_KEY, JSON.stringify(g)); }

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ── Build the student rows for a given target level (2 or 3) ── */
function buildRows(targetLevel) {
  const prevLevel  = targetLevel - 1;
  const students   = loadStudents();
  const progress   = loadProgress();
  const approvals  = loadApprovals();

  const rows = [];

  // All student IDs who completed the previous level
  const allIds = new Set([
    ...Object.keys(students),
    ...Object.keys(progress),
  ]);

  allIds.forEach(id => {
    const prev = progress[id]?.[prevLevel];
    if (prev?.status !== 'completed') return; // hasn't completed prev level yet

    const student    = students[id] || {};
    const approval   = approvals[id]?.[targetLevel] ?? 'pending';
    const targetData = progress[id]?.[targetLevel];

    rows.push({
      id,
      name:      student.name      || id,
      rollNo:    student.rollNo    || '—',
      className: student.className || '—',
      prevScore:      prev.score?.pct  ?? null,
      prevCorrect:    prev.score?.correct ?? null,
      prevTotal:      prev.score?.total ?? null,
      prevCompletedAt: prev.completedAt ?? null,
      approval,
      targetStatus: targetData?.status ?? null,
      targetScore:  targetData?.score?.pct ?? null,
    });
  });

  return rows;
}

/* ── Status badge ── */
function ApprovalBadge({ status }) {
  const map = {
    pending:  { label: 'Pending',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', Icon: Hourglass  },
    approved: { label: 'Approved', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200', Icon: CheckCircle },
    rejected: { label: 'Rejected', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',   Icon: XCircle    },
  };
  const m = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${m.bg} ${m.text} ${m.border}`}>
      <m.Icon size={11} /> {m.label}
    </span>
  );
}

/* ── Global Access Toggle Banner ── */
function GlobalToggle({ targetLevel, global: globalAccess, onToggle }) {
  const isOpen = globalAccess[targetLevel] === true;
  return (
    <div className={`flex items-center justify-between rounded-2xl px-5 py-4 border transition-all
      ${isOpen ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center
          ${isOpen ? 'bg-amber-100' : 'bg-slate-200'}`}>
          <ShieldCheck size={16} className={isOpen ? 'text-amber-600' : 'text-slate-500'} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">
            Open Level {targetLevel} for ALL Students
          </p>
          <p className={`text-xs mt-0.5 ${isOpen ? 'text-amber-700 font-semibold' : 'text-slate-400'}`}>
            {isOpen
              ? '⚡ Active — all students can access Level ' + targetLevel + ' regardless of approval'
              : 'Off — individual approval required to access this level'}
          </p>
        </div>
      </div>
      <button onClick={onToggle} className={`transition-colors ${isOpen ? 'text-amber-500' : 'text-slate-300'}`}>
        {isOpen ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
      </button>
    </div>
  );
}

/* ── Level Tab Button ── */
function TabButton({ levelId, active, onClick, pendingCount }) {
  const level = LEVELS.find(l => l.id === levelId);
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all
        ${active
          ? 'text-white shadow-sm'
          : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
      style={active ? { background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` } : {}}
    >
      Level {levelId} Approvals
      {pendingCount > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
          ${active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
          {pendingCount}
        </span>
      )}
    </button>
  );
}

/* ── Stats Row ── */
function StatsRow({ rows }) {
  const total    = rows.length;
  const pending  = rows.filter(r => r.approval === 'pending').length;
  const approved = rows.filter(r => r.approval === 'approved').length;
  const rejected = rows.filter(r => r.approval === 'rejected').length;

  const stats = [
    { label: 'Total Requests', value: total,    color: '#3B82F6', bg: '#eff6ff', Icon: Users        },
    { label: 'Pending',        value: pending,   color: '#D97706', bg: '#fffbeb', Icon: Hourglass    },
    { label: 'Approved',       value: approved,  color: '#16A34A', bg: '#f0fdf4', Icon: UserCheck    },
    { label: 'Rejected',       value: rejected,  color: '#DC2626', bg: '#fef2f2', Icon: UserX        },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="rounded-2xl px-4 py-3 flex items-center gap-3 border"
          style={{ background: s.bg, borderColor: s.color + '30' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: s.color + '18' }}>
            <s.Icon size={16} style={{ color: s.color }} />
          </div>
          <div>
            <p className="text-xl font-bold leading-none" style={{ color: s.color, fontFamily: 'Space Grotesk' }}>
              {s.value}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main Page ── */
export default function LevelPermissions() {
  const [activeTab,  setActiveTab]  = useState(2);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('all'); // all | pending | approved | rejected
  const [selected,   setSelected]   = useState(new Set());
  const [approvals,  setApprovals]  = useState(loadApprovals);
  const [global,     setGlobal]     = useState(loadGlobal);
  const [toast,      setToast]      = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  /* rebuild rows whenever tab or approvals change */
  const allRows = useMemo(() => buildRows(activeTab), [activeTab, approvals]);

  const filtered = useMemo(() => {
    let rows = allRows;
    if (filter !== 'all') rows = rows.filter(r => r.approval === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.rollNo.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [allRows, filter, search]);

  /* Counts for tabs */
  const level2Pending = useMemo(() => buildRows(2).filter(r => r.approval === 'pending').length, [approvals]);
  const level3Pending = useMemo(() => buildRows(3).filter(r => r.approval === 'pending').length, [approvals]);

  /* Write approval change */
  function applyApproval(ids, status) {
    const raw = loadApprovals();
    ids.forEach(id => {
      if (!raw[id]) raw[id] = {};
      raw[id][activeTab] = status;
    });
    saveApprovals(raw);
    setApprovals({ ...raw });
    setSelected(new Set());
    showToast(
      `${status === 'approved' ? 'Approved' : 'Rejected'} ${ids.length} student${ids.length > 1 ? 's' : ''}`,
      status === 'approved' ? 'success' : 'error'
    );
  }

  /* Global toggle */
  function handleGlobalToggle() {
    const next = { ...global, [activeTab]: !global[activeTab] };
    setGlobal(next);
    saveGlobal(next);
    showToast(
      next[activeTab]
        ? `Level ${activeTab} opened globally for all students`
        : `Level ${activeTab} global override removed`,
      next[activeTab] ? 'success' : 'warn'
    );
  }

  /* Selection helpers */
  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id));
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(r => r.id)));
  }
  function toggleRow(id) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  const pendingSelected  = filtered.filter(r => selected.has(r.id) && r.approval === 'pending');
  const approvedSelected = filtered.filter(r => selected.has(r.id) && r.approval === 'approved');

  const level = LEVELS.find(l => l.id === activeTab);

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg border
          ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800'
          : toast.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800'
          :                            'bg-amber-50 border-amber-200 text-amber-800'}`}>
          {toast.type === 'success' ? <CheckCircle size={14} />
          : toast.type === 'error'  ? <XCircle     size={14} />
          :                           <AlertCircle  size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
            Level Permission Management
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Approve or reject student access to Level 2 and Level 3
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-xl px-4 py-2">
          <ShieldCheck size={14} className="text-indigo-500" /> Admin Access Control
        </div>
      </div>

      {/* Flow info */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="font-semibold text-indigo-700 flex items-center gap-1.5">
            <CheckCircle size={14} className="text-green-500" /> Student completes Level 1
          </span>
          <ChevronRight size={14} className="text-indigo-300" />
          <span className="text-indigo-600 flex items-center gap-1.5">
            <Hourglass size={13} className="text-amber-500" /> Pending approval request created
          </span>
          <ChevronRight size={14} className="text-indigo-300" />
          <span className="text-indigo-600 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-indigo-500" /> Admin approves
          </span>
          <ChevronRight size={14} className="text-indigo-300" />
          <span className="text-indigo-600 flex items-center gap-1.5">
            <CheckCircle size={13} className="text-green-500" /> Level 2 unlocked
          </span>
        </div>
      </div>

      {/* Global toggle */}
      <GlobalToggle targetLevel={activeTab} global={global} onToggle={handleGlobalToggle} />

      {/* Tab switcher */}
      <div className="flex items-center gap-2">
        <TabButton levelId={2} active={activeTab === 2} onClick={() => { setActiveTab(2); setSelected(new Set()); setFilter('all'); }} pendingCount={level2Pending} />
        <TabButton levelId={3} active={activeTab === 3} onClick={() => { setActiveTab(3); setSelected(new Set()); setFilter('all'); }} pendingCount={level3Pending} />
      </div>

      {/* Stats */}
      <StatsRow rows={allRows} />

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-4 border-b border-slate-100">

          {/* Left: search + filter */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, ID or roll no…"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>

            <div className="flex items-center gap-1">
              {['all', 'pending', 'approved', 'rejected'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all
                    ${filter === f
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Right: bulk actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">{selected.size} selected</span>
              {pendingSelected.length > 0 && (
                <button
                  onClick={() => applyApproval([...pendingSelected.map(r => r.id)], 'approved')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors">
                  <CheckCircle size={12} /> Approve All
                </button>
              )}
              {pendingSelected.length > 0 && (
                <button
                  onClick={() => applyApproval([...pendingSelected.map(r => r.id)], 'rejected')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors">
                  <XCircle size={12} /> Reject All
                </button>
              )}
              {approvedSelected.length > 0 && (
                <button
                  onClick={() => applyApproval([...approvedSelected.map(r => r.id)], 'rejected')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-600 text-white text-xs font-bold hover:bg-slate-700 transition-colors">
                  <UserX size={12} /> Revoke Access
                </button>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Users size={40} className="mb-3 opacity-30" />
            <p className="font-semibold text-sm">No students found</p>
            <p className="text-xs mt-1">
              {allRows.length === 0
                ? `No students have completed Level ${activeTab - 1} yet`
                : 'Try adjusting your search or filter'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left">
                    <button onClick={toggleAll} className="flex items-center text-slate-400 hover:text-slate-600">
                      {allSelected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Student Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Student ID</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Class</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Level {activeTab - 1} Score</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Completed On</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Level {activeTab} Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(row => (
                  <tr key={row.id}
                    className={`hover:bg-slate-50/60 transition-colors ${selected.has(row.id) ? 'bg-indigo-50/30' : ''}`}>

                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <button onClick={() => toggleRow(row.id)} className="text-slate-400 hover:text-indigo-600">
                        {selected.has(row.id) ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                      </button>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
                          {row.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{row.name}</p>
                          <p className="text-[10px] text-slate-400">Roll: {row.rollNo}</p>
                        </div>
                      </div>
                    </td>

                    {/* ID */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">{row.id}</span>
                    </td>

                    {/* Class */}
                    <td className="px-4 py-3 text-slate-600 text-sm">{row.className}</td>

                    {/* Score */}
                    <td className="px-4 py-3">
                      {row.prevScore !== null ? (
                        <div className="flex items-center gap-1.5">
                          <Trophy size={13} className={row.prevScore >= 50 ? 'text-green-500' : 'text-red-400'} />
                          <span className={`font-bold text-sm ${row.prevScore >= 50 ? 'text-green-700' : 'text-red-600'}`}>
                            {row.prevScore}%
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({row.prevCorrect}/{row.prevTotal})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Completed date */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar size={11} /> {formatDate(row.prevCompletedAt)}
                      </span>
                    </td>

                    {/* Approval status */}
                    <td className="px-4 py-3">
                      {row.targetStatus === 'completed'
                        ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle size={11} /> Completed
                          </span>
                        : <ApprovalBadge status={row.approval} />
                      }
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {row.targetStatus === 'completed' ? (
                        <span className="text-xs text-slate-400 italic">—</span>
                      ) : row.approval === 'pending' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => applyApproval([row.id], 'approved')}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors">
                            <UserCheck size={12} /> Approve
                          </button>
                          <button
                            onClick={() => applyApproval([row.id], 'rejected')}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition-colors">
                            <UserX size={12} /> Reject
                          </button>
                        </div>
                      ) : row.approval === 'approved' ? (
                        <button
                          onClick={() => applyApproval([row.id], 'rejected')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-red-100 hover:text-red-700 transition-colors">
                          <UserX size={12} /> Revoke
                        </button>
                      ) : (
                        /* rejected */
                        <button
                          onClick={() => applyApproval([row.id], 'approved')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-bold hover:bg-green-600 hover:text-white transition-colors">
                          <UserCheck size={12} /> Re-Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {filtered.length} of {allRows.length} students</span>
            <span>Level {activeTab} Approval Queue</span>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  Users, Building2, Globe, Search, Plus, Edit2, Trash2,
  ToggleLeft, ToggleRight, Shield, Hash, CheckCircle, RefreshCw,
} from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input, { Select } from '../../components/ui/Input';
import { mockSchools } from '../../utils/mockData';
import { ROLES, ROLE_LABELS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatUniqueId } from '../../utils/uniqueId';

// Staff accounts only (teachers, admins) — NO student personal data here
const STAFF_USERS = [
  { id: 'u1', name: 'Ms. Priya Gupta', email: 'priya@school.edu',    role: ROLES.TEACHER,        school: 'Delhi Public School', status: 'active' },
  { id: 'u2', name: 'Mr. Rahul Mehta', email: 'rahul@school.edu',    role: ROLES.SCHOOL_ADMIN,   school: 'Delhi Public School', status: 'active' },
  { id: 'u3', name: 'Dr. Anjali Rao',  email: 'anjali@district.edu', role: ROLES.DISTRICT_ADMIN, school: '—',                    status: 'active' },
];

export default function AdminPanel() {
  const { user, getStudentList } = useAuth();
  const toast = useToast();

  const isSuperAdmin   = user?.role === ROLES.SUPER_ADMIN;
  const isSchoolOrAbove = [ROLES.SCHOOL_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);

  const [tab, setTab]             = useState('students');
  const [search, setSearch]       = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [roleFilter, setRoleFilter]   = useState('all');
  const [staff, setStaff]         = useState(STAFF_USERS);
  const [showAdd, setShowAdd]     = useState(false);
  const [showDelete, setShowDelete] = useState(null);
  const [form, setForm]           = useState({ name: '', email: '', role: ROLES.TEACHER, school: '' });

  // Live student list — only unique IDs, no personal details
  const [studentList, setStudentList] = useState(() => getStudentList());
  const refreshStudents = () => setStudentList(getStudentList());

  const filteredStudents = studentList.filter(s =>
    s.uniqueId.includes(search.replace(/\s/g, ''))
  );

  const filteredStaff = staff.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(staffSearch.toLowerCase()) || u.email.toLowerCase().includes(staffSearch.toLowerCase());
    const matchRole   = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const toggleStatus = (id) => {
    setStaff(p => p.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u));
    toast.info('User status updated');
  };

  const handleAdd = () => {
    if (!form.name || !form.email) { toast.error('Please fill all required fields'); return; }
    setStaff(p => [...p, { ...form, id: 'u' + Date.now(), status: 'active' }]);
    toast.success('Staff member added successfully!');
    setShowAdd(false);
    setForm({ name: '', email: '', role: ROLES.TEACHER, school: '' });
  };

  const handleDelete = (id) => {
    setStaff(p => p.filter(u => u.id !== id));
    toast.success('User removed');
    setShowDelete(null);
  };

  const TABS = [
    ...(isSchoolOrAbove ? [{ id: 'students', label: 'Registered Students', icon: <Hash size={15} /> }] : []),
    { id: 'staff',    label: 'Staff',    icon: <Users size={15} /> },
    { id: 'schools',  label: 'Schools',  icon: <Building2 size={15} /> },
    ...(isSuperAdmin ? [{ id: 'districts', label: 'Districts', icon: <Globe size={15} /> }] : []),
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Panel</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage students, staff, schools and settings</p>
        </div>
        {tab === 'staff' && (
          <Button size="sm" icon={<Plus size={15} />} onClick={() => setShowAdd(true)}>Add Staff</Button>
        )}
        {tab === 'students' && (
          <button
            onClick={refreshStudents}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap
              ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── REGISTERED STUDENTS TAB ── */}
      {tab === 'students' && isSchoolOrAbove && (
        <div className="space-y-4">
          {/* Info banner */}
          <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
            <Shield size={16} className="text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-sm text-indigo-700">
              <span className="font-semibold">Privacy protected:</span> Only student unique IDs are visible here. Names, roll numbers, and class details are never exposed to any admin.
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search by ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none font-mono"
            />
          </div>

          {studentList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
              <Hash size={40} className="mx-auto mb-3 text-slate-200" />
              <p className="font-semibold text-slate-500">No students registered yet</p>
              <p className="text-sm text-slate-400 mt-1">Students who register through the app will appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  {filteredStudents.length} of {studentList.length} students
                </p>
                <span className="text-xs text-slate-400">Showing Unique IDs only</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['#', 'Student Unique ID', 'Quizzes Completed', 'Status'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, i) => (
                    <tr key={s.uniqueId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-slate-400 text-xs font-medium">{i + 1}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {/* Anonymous avatar — shows only initials from ID, no name */}
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                            <Hash size={14} className="text-indigo-400" />
                          </div>
                          <span className="font-mono font-bold text-slate-800 tracking-widest text-sm">
                            {formatUniqueId(s.uniqueId)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className={s.quizzesCompleted > 0 ? 'text-green-500' : 'text-slate-300'} />
                          <span className={`font-semibold ${s.quizzesCompleted > 0 ? 'text-green-700' : 'text-slate-400'}`}>
                            {s.quizzesCompleted}
                          </span>
                          <span className="text-xs text-slate-400">quiz{s.quizzesCompleted !== 1 ? 'zes' : ''}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={s.quizzesCompleted > 0 ? 'success' : 'inactive'} dot>
                          {s.quizzesCompleted > 0 ? 'participated' : 'not started'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── STAFF TAB ── */}
      {tab === 'staff' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search staff..."
                value={staffSearch}
                onChange={e => setStaffSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
            >
              <option value="all">All Roles</option>
              {Object.entries(ROLE_LABELS)
                .filter(([k]) => k !== ROLES.STUDENT)
                .map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Staff Member', 'Email', 'Role', 'School', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map(u => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                          {u.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800 whitespace-nowrap">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="primary" className="flex items-center gap-1 w-fit">
                        <Shield size={10} /> {ROLE_LABELS[u.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.school}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.status === 'active' ? 'success' : 'inactive'} dot>{u.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleStatus(u.id)}
                          title={u.status === 'active' ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition-colors ${u.status === 'active' ? 'text-green-500 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                          {u.status === 'active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setShowDelete(u.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SCHOOLS TAB ── */}
      {tab === 'schools' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['School Name', 'District', 'Students', 'Teachers', 'Avg Score', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockSchools.map(s => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 text-slate-500">{s.district}</td>
                  <td className="px-4 py-3">{s.students.toLocaleString()}</td>
                  <td className="px-4 py-3">{s.teachers}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${s.avgScore >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>{s.avgScore}%</span>
                  </td>
                  <td className="px-4 py-3"><Badge variant={s.status} dot>{s.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"><Edit2 size={14} /></button>
                      <button className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── DISTRICTS TAB ── */}
      {tab === 'districts' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {['New Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Kolkata', 'Pune'].map((d, i) => (
            <Card key={d} hover>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Globe size={18} />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{d}</p>
                  <p className="text-xs text-slate-400">{2 + i} schools</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-50 rounded-xl p-2">
                  <p className="font-bold text-slate-800">{(800 + i * 120).toLocaleString()}</p>
                  <p className="text-xs text-slate-400">Students</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2">
                  <p className="font-bold text-slate-800">{65 + i * 2}%</p>
                  <p className="text-xs text-slate-400">Avg Score</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Staff modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Staff Member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} icon={<Plus size={14} />}>Add Staff</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Full Name" required placeholder="e.g. Priya Sharma" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <Input label="Email Address" required type="email" placeholder="user@school.edu" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          <Select label="Role" required value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
            {Object.entries(ROLE_LABELS)
              .filter(([k]) => k !== ROLES.STUDENT)
              .map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Input label="School / Institution" placeholder="Delhi Public School" value={form.school} onChange={e => setForm(p => ({ ...p, school: e.target.value }))} />
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Remove Staff Member?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete(showDelete)}>Remove</Button>
          </>
        }
      >
        <p className="text-slate-600 text-sm">This staff member will lose access to the platform.</p>
      </Modal>
    </div>
  );
}

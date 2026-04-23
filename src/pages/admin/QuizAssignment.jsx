import { useState } from 'react';
import {
  Users, Building2, Calendar, RotateCcw, CheckCircle,
  Search, Globe, Eye, EyeOff, Send, School,
} from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input, { Select } from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { mockQuizzes, mockStudents, mockSchools } from '../../utils/mockData';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';

const CLASSES = ['10A', '10B', '10C', '11A', '11B', '12A'];

export default function QuizAssignment() {
  const toast = useToast();
  const { colors } = useTheme();

  const [assignTo, setAssignTo] = useState('students');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');

  const [form, setForm] = useState({
    quizId: '', startDate: '', endDate: '', startTime: '', endTime: '',
    attemptsAllowed: 1, retake: false, retakeAfterDays: 0,
    sendNotification: true, published: false,
  });

  const toggle = (id, list, setList) => {
    setList(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const handleAssign = () => {
    if (!form.quizId) { toast.error('Please select a quiz'); return; }
    if (assignTo === 'students'  && selectedStudents.length === 0) { toast.error('Select at least one student'); return; }
    if (assignTo === 'classes'   && selectedClasses.length  === 0) { toast.error('Select at least one class');   return; }
    if (assignTo === 'schools'   && selectedSchools.length  === 0) { toast.error('Select at least one school');  return; }
    const target =
      assignTo === 'students' ? `${selectedStudents.length} student(s)` :
      assignTo === 'classes'  ? `${selectedClasses.length} class(es)` :
      `${selectedSchools.length} school(s)`;
    toast.success(`Quiz assigned to ${target}`, 'Assignment Successful');
  };

  const handlePublishToggle = () => {
    if (!form.quizId) { toast.error('Please select a quiz first'); return; }
    setForm(p => ({ ...p, published: !p.published }));
    toast.success(form.published ? 'Quiz unpublished — hidden from students' : 'Quiz published — students can now attempt it');
  };

  const selectedQuiz = mockQuizzes.find(q => q.id === form.quizId);
  const filteredStudents = mockStudents.filter(s =>
    !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Quiz Assignment</h1>
        <p className="text-slate-500 text-sm mt-0.5">Schedule and distribute quizzes to students, classes, or schools</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Left column ── */}
        <div className="space-y-4">

          {/* Select quiz */}
          <Card>
            <CardHeader title="Select Quiz" icon={<CheckCircle size={17} />} />
            <Select value={form.quizId}
              onChange={e => setForm(p => ({ ...p, quizId: e.target.value, published: false }))}
              required label="Quiz">
              <option value="">— Select a quiz —</option>
              {mockQuizzes.filter(q => q.status !== 'closed').map(q => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </Select>
            {selectedQuiz && (
              <div className="mt-3 p-3 bg-indigo-50 rounded-xl flex flex-wrap gap-2">
                <Badge variant="primary">{selectedQuiz.topic}</Badge>
                <Badge variant={selectedQuiz.difficulty}>{selectedQuiz.difficulty}</Badge>
                <Badge variant="default">{selectedQuiz.questions}Q · {selectedQuiz.duration}min · {selectedQuiz.marks}m</Badge>
              </div>
            )}
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader title="Schedule" icon={<Calendar size={17} />} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date" type="date" value={form.startDate}
                onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
              <Input label="Start Time" type="time" value={form.startTime}
                onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} />
              <Input label="End Date" type="date" value={form.endDate}
                onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
              <Input label="End Time" type="time" value={form.endTime}
                onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} />
            </div>
          </Card>

          {/* Attempt & retake rules */}
          <Card>
            <CardHeader title="Attempt & Retake Rules" icon={<RotateCcw size={17} />} />
            <div className="space-y-4">
              <Input label="Attempts Allowed" type="number" value={form.attemptsAllowed} min={1} max={10}
                onChange={e => setForm(p => ({ ...p, attemptsAllowed: +e.target.value }))}
                hint="How many times each student can attempt this quiz" />

              {/* Retake toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Allow Retake</p>
                  <p className="text-xs text-slate-400 mt-0.5">Students can retry after completing</p>
                </div>
                <button onClick={() => setForm(p => ({ ...p, retake: !p.retake }))}
                  className={`w-11 h-6 rounded-full relative transition-all ${form.retake ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.retake ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {form.retake && (
                <Input label="Retake after (days)" type="number" value={form.retakeAfterDays} min={0} max={30}
                  onChange={e => setForm(p => ({ ...p, retakeAfterDays: +e.target.value }))}
                  hint="Set 0 for immediate retake availability" />
              )}

              {/* Notification toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Send Notification</p>
                  <p className="text-xs text-slate-400 mt-0.5">Alert students when quiz is assigned</p>
                </div>
                <button onClick={() => setForm(p => ({ ...p, sendNotification: !p.sendNotification }))}
                  className={`w-11 h-6 rounded-full relative transition-all ${form.sendNotification ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.sendNotification ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          </Card>

          {/* Publish / Unpublish */}
          <Card>
            <CardHeader title="Publish Settings" icon={form.published ? <Eye size={17} /> : <EyeOff size={17} />} />
            <div className="flex items-center justify-between p-4 rounded-xl border-2 transition-all"
              style={{ borderColor: form.published ? '#bbf7d0' : '#e2e8f0', background: form.published ? '#f0fdf4' : '#f8fafc' }}>
              <div>
                <p className="text-sm font-semibold text-slate-800">Quiz Status</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {form.published ? 'Visible to assigned students — they can attempt it now' : 'Hidden from students — publish to make it live'}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${form.published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {form.published ? 'Published' : 'Unpublished'}
                </span>
                <button onClick={handlePublishToggle}
                  className={`w-11 h-6 rounded-full relative transition-all ${form.published ? 'bg-green-500' : 'bg-slate-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.published ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">

          {/* Assign-to section */}
          <Card>
            <CardHeader title="Assign To" icon={<Users size={17} />} />

            {/* Type tabs */}
            <div className="flex gap-2 mb-4">
              {[
                { value: 'students', label: 'Students', icon: <Users    size={14} /> },
                { value: 'classes',  label: 'Classes',  icon: <Building2 size={14} /> },
                { value: 'schools',  label: 'Schools',  icon: <School   size={14} /> },
              ].map(opt => (
                <button key={opt.value} onClick={() => setAssignTo(opt.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    assignTo === opt.value ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={assignTo === opt.value ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` } : {}}>
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>

            {/* Students list */}
            {assignTo === 'students' && (
              <div className="space-y-2">
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input placeholder="Search students…" value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <p className="text-xs text-slate-400">{selectedStudents.length} selected</p>
                <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1">
                  {filteredStudents.map(s => (
                    <label key={s.id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                      selectedStudents.includes(s.id) ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'
                    }`}>
                      <input type="checkbox" checked={selectedStudents.includes(s.id)}
                        onChange={() => toggle(s.id, selectedStudents, setSelectedStudents)}
                        className="accent-indigo-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.grade} · Avg {s.avgScore}%</p>
                      </div>
                      <Badge variant={s.status === 'active' ? 'success' : 'default'} dot>{s.status}</Badge>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Classes grid */}
            {assignTo === 'classes' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">{selectedClasses.length} class(es) selected</p>
                <div className="grid grid-cols-3 gap-2">
                  {CLASSES.map(cls => (
                    <button key={cls} onClick={() => toggle(cls, selectedClasses, setSelectedClasses)}
                      className={`py-3 rounded-xl text-sm font-bold transition-all ${
                        selectedClasses.includes(cls)
                          ? 'text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                      }`}
                      style={selectedClasses.includes(cls) ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` } : {}}>
                      {cls}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Schools list */}
            {assignTo === 'schools' && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">{selectedSchools.length} school(s) selected</p>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {mockSchools.map(sc => (
                    <label key={sc.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      selectedSchools.includes(sc.id) ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'
                    }`}>
                      <input type="checkbox" checked={selectedSchools.includes(sc.id)}
                        onChange={() => toggle(sc.id, selectedSchools, setSelectedSchools)}
                        className="accent-indigo-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{sc.name}</p>
                        <p className="text-xs text-slate-400">{sc.district} · {sc.students} students</p>
                      </div>
                      <Badge variant={sc.status === 'active' ? 'success' : 'default'} dot>{sc.status}</Badge>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Assign button */}
          <Button fullWidth icon={<Send size={15} />} onClick={handleAssign}>
            Assign Quiz
          </Button>
        </div>
      </div>
    </div>
  );
}

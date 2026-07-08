import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Settings, Save, CheckCircle, RotateCcw, Clock,
  Eye, Shuffle, Users, Unlock,
  AlertTriangle, Info, ToggleLeft, ToggleRight, Shield, Loader2,
} from 'lucide-react';
import { api } from '../../utils/api';

const DEFAULT_GLOBAL = {
  quizTimerMinutes:       10,
  showResultsImmediately: true,
  registrationOpen:       true,
  maintenanceMode:        false,
};

/* ── Toggle row ── */
function ToggleRow({ label, desc, value, onChange, icon, color = '#4F46E5' }) {
  return (
    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 shrink-0" style={{ background: `${color}15` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
        </div>
      </div>
      <button onClick={(e) => { e.preventDefault(); onChange(!value); }}
        className={`shrink-0 transition-colors ${value ? 'text-indigo-500' : 'text-slate-300'}`}>
        {value ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
      </button>
    </label>
  );
}

/* ── Number input row ── */
function NumberRow({ label, desc, value, onChange, icon, color = '#4F46E5', min = 0, max = 999, suffix = '' }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 shrink-0" style={{ background: `${color}15` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-lg leading-none flex items-center justify-center transition-colors">−</button>
        <span className="w-14 text-center text-sm font-bold text-slate-800">{value}{suffix}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-lg leading-none flex items-center justify-center transition-colors">+</button>
      </div>
    </div>
  );
}

/* ── MAIN ── */
export default function SystemSettings() {
  const { user } = useAuth();
  const [global,    setGlobal]    = useState(DEFAULT_GLOBAL);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [showReset, setShowReset] = useState(false);
  // A transient backend failure (Render cold-start timeout) must NOT silently fall
  // back to DEFAULT_GLOBAL — that looks exactly like saved settings reverting to
  // defaults after a refresh. Retry, and if it still fails show an explicit error
  // (with retry) instead of presenting defaults as if they were the saved values.
  const [loadError,   setLoadError]   = useState(false);
  const [saveError,   setSaveError]   = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    let tries = 0;
    const load = () => {
      api.getSettings()
        .then((settingsData) => {
          if (cancelled) return;
          if (settingsData && Object.keys(settingsData).length > 0) {
            const { levels: _ignore, ...rest } = settingsData;
            setGlobal(prev => ({ ...prev, ...rest }));
          }
          setLoadError(false);
          setLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          tries += 1;
          if (tries <= 5) {
            setTimeout(load, Math.min(1000 * tries, 5000));
          } else {
            setLoadError(true);
            setLoading(false);
          }
        });
    };
    load();
    return () => { cancelled = true; };
  }, [user?.id, reloadNonce]);

  const retryLoad = () => { setLoadError(false); setLoading(true); setReloadNonce(n => n + 1); };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(false);
    try {
      await api.saveSettings({ ...global });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setGlobal(DEFAULT_GLOBAL);
    try {
      await api.saveSettings({ ...DEFAULT_GLOBAL });
    } catch { /* ignore — local reset already applied */ }
    setShowReset(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) return (
    <div className="min-h-full flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-indigo-400" />
    </div>
  );

  if (loadError) return (
    <div className="min-h-full flex flex-col items-center justify-center gap-3 py-32 px-6 text-center">
      <AlertTriangle size={32} className="text-red-400" />
      <p className="text-sm font-semibold text-slate-700">Couldn't load settings</p>
      <p className="text-xs text-slate-400 max-w-xs">The server may be starting up or temporarily unavailable. Your saved settings are safe — please try again.</p>
      <button onClick={retryLoad}
        className="mt-1 flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
        <RotateCcw size={14} /> Retry
      </button>
    </div>
  );

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {/* Toast */}
      {saved && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-semibold shadow-lg">
          <CheckCircle size={14}/> Settings saved successfully!
        </div>
      )}

      {/* Save failed — tell the admin instead of letting a cold-start timeout look
          like a successful save that then "didn't persist". */}
      {saveError && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold shadow-lg">
          <AlertTriangle size={14}/> Couldn't save — please try again.
        </div>
      )}

      {/* Reset confirm */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowReset(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle size={18} className="text-red-500"/>
              </div>
              <h3 className="font-bold text-slate-800">Reset to Defaults?</h3>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              All global settings will be restored to their default values.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowReset(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 -mt-6 py-4 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>System Settings</h1>
          <p className="text-sm text-slate-400 mt-0.5">Configure platform-wide settings</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowReset(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <RotateCcw size={14}/> Defaults
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Maintenance banner */}
      {global.maintenanceMode && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="text-amber-500 shrink-0"/>
          <p className="text-sm font-semibold text-amber-800">Maintenance mode is ON — students and trainers cannot access the platform</p>
        </div>
      )}

      {/* ── GLOBAL SETTINGS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center"><Clock size={15} className="text-blue-500"/></div>
            <h2 className="font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>Quiz Settings</h2>
          </div>
          <NumberRow label="Default Quiz Timer" desc="Fallback timer for levels without a custom timer"
            value={global.quizTimerMinutes} onChange={v => setGlobal(p => ({ ...p, quizTimerMinutes: v }))}
            icon={<Clock size={15}/>} color="#3B82F6" min={1} max={60} suffix=" min"/>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center"><Shuffle size={15} className="text-purple-500"/></div>
            <h2 className="font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>Question & Result</h2>
          </div>
          <ToggleRow label="Show Results Immediately" desc="Students see score right after submission"
            value={global.showResultsImmediately} onChange={v => setGlobal(p => ({ ...p, showResultsImmediately: v }))}
            icon={<Eye size={14}/>} color="#3BC0EF"/>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center"><Unlock size={15} className="text-green-500"/></div>
            <h2 className="font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>Access & Registration</h2>
          </div>
          <ToggleRow label="Registration Open" desc="Allow new students and trainers to register"
            value={global.registrationOpen} onChange={v => setGlobal(p => ({ ...p, registrationOpen: v }))}
            icon={<Users size={14}/>} color="#10B981"/>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center"><Shield size={15} className="text-red-500"/></div>
            <h2 className="font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>System Control</h2>
          </div>
          <ToggleRow label="Maintenance Mode" desc="Take platform offline for students and trainers"
            value={global.maintenanceMode} onChange={v => setGlobal(p => ({ ...p, maintenanceMode: v }))}
            icon={<Settings size={14}/>} color="#EF4444"/>
          <div className="flex items-start gap-2 bg-slate-50 rounded-xl px-4 py-3">
            <Info size={13} className="text-slate-400 shrink-0 mt-0.5"/>
            <p className="text-xs text-slate-500">Settings are saved to the database and apply globally to all users.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-4" style={{ fontFamily:'Space Grotesk' }}>Current Configuration Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:'Default Timer',  value:`${global.quizTimerMinutes} min`,  color:'#3B82F6' },
            { label:'Registration',   value: global.registrationOpen?'Open':'Closed', color: global.registrationOpen?'#10B981':'#EF4444' },
            { label:'Maintenance',    value: global.maintenanceMode?'ON':'OFF', color: global.maintenanceMode?'#EF4444':'#10B981' },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold" style={{ color:s.color, fontFamily:'Space Grotesk' }}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-4 flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
          {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
          {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}

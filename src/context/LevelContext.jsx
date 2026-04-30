import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const LevelContext = createContext(null);

const STORAGE_KEY        = 'rqa_level_progress';
const GLOBAL_ACCESS_KEY  = 'rqa_global_level_access';
const LEVEL_SETTINGS_KEY = 'rqa_level_settings';
const OVERRIDES_KEY      = 'rqa_admin_overrides';
export const APPROVALS_KEY      = 'rqa_level_approvals';
// shape: { [userId]: { 2: 'pending'|'approved'|'rejected', 3: 'pending'|'approved'|'rejected' } }

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadLevelSettings() {
  try { return JSON.parse(localStorage.getItem(LEVEL_SETTINGS_KEY) || '{}'); }
  catch { return {}; }
}

function loadGlobalAccess() {
  try { return JSON.parse(localStorage.getItem(GLOBAL_ACCESS_KEY) || '{}'); }
  catch { return {}; }
}

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}'); }
  catch { return {}; }
}

function saveOverridesData(data) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(data));
}

export function loadApprovals() {
  try { return JSON.parse(localStorage.getItem(APPROVALS_KEY) || '{}'); }
  catch { return {}; }
}

export function saveApprovals(data) {
  localStorage.setItem(APPROVALS_KEY, JSON.stringify(data));
}

export function LevelProvider({ children }) {
  const [progress,       setProgress]       = useState(load);
  const [approvals,      setApprovals]      = useState(loadApprovals);
  const [overrides,      setOverridesState] = useState(loadOverrides);
  const [levelSettings,  setLevelSettings]  = useState(loadLevelSettings);
  const [globalAccess,   setGlobalAccessState] = useState(loadGlobalAccess);

  useEffect(() => {
    function onStorage(e) {
      if (e.key === OVERRIDES_KEY)      { try { setOverridesState(JSON.parse(e.newValue || '{}')); }    catch {} }
      if (e.key === LEVEL_SETTINGS_KEY) { try { setLevelSettings(JSON.parse(e.newValue || '{}'));  }    catch {} }
      if (e.key === GLOBAL_ACCESS_KEY)  { try { setGlobalAccessState(JSON.parse(e.newValue || '{}')); } catch {} }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // progress shape: { [userId]: { [levelId]: { status, score, completedAt, contentRead } } }

  const getLevel = useCallback((userId, levelId) => {
    return progress[userId]?.[levelId] ?? null;
  }, [progress]);

  const getLevelStatus = useCallback((userId, levelId) => {
    // 1. Admin deactivated this level → locked for everyone
    const isActive = levelSettings[levelId]?.active !== false;
    if (!isActive) return 'locked';

    // 2. Global unlock: admin opened level for ALL students
    if (levelId !== 1 && globalAccess[levelId] === true) {
      return progress[userId]?.[levelId]?.status ?? 'unlocked';
    }

    // 3. Per-student admin override (manual individual unlock)
    if (overrides[userId]?.includes(levelId)) {
      return progress[userId]?.[levelId]?.status ?? 'unlocked';
    }

    // 4. Level 1 always accessible by default
    if (levelId === 1) {
      return progress[userId]?.[1]?.status ?? 'unlocked';
    }

    // 5. Previous level must be completed
    const prev = progress[userId]?.[levelId - 1];
    if (prev?.status !== 'completed') return 'locked';

    // 6. Level is active and student completed the previous level → auto-unlock.
    //    Admin can still explicitly reject individual students via setApproval.
    const approval = approvals[userId]?.[levelId];
    if (approval === 'rejected') return 'rejected';
    return progress[userId]?.[levelId]?.status ?? 'unlocked';

  }, [progress, approvals, overrides, levelSettings, globalAccess]);

  const markContentRead = useCallback((userId, levelId) => {
    setProgress(prev => {
      const next = {
        ...prev,
        [userId]: {
          ...prev[userId],
          [levelId]: { ...prev[userId]?.[levelId], contentRead: true },
        },
      };
      save(next);
      return next;
    });
  }, []);

  const markLevelComplete = useCallback((userId, levelId, score) => {
    setProgress(prev => {
      const next = {
        ...prev,
        [userId]: {
          ...prev[userId],
          [levelId]: {
            ...prev[userId]?.[levelId],
            status: 'completed',
            score,
            completedAt: new Date().toISOString(),
          },
        },
      };
      save(next);
      return next;
    });

    // Auto-create a pending approval entry for the next level
    if (levelId === 1 || levelId === 2) {
      const nextId = levelId + 1;
      setApprovals(prev => {
        if (prev[userId]?.[nextId]) return prev; // already has a record, don't overwrite
        const next = {
          ...prev,
          [userId]: { ...prev[userId], [nextId]: 'pending' },
        };
        saveApprovals(next);
        return next;
      });
    }
  }, []);

  const isContentRead = useCallback((userId, levelId) => {
    return progress[userId]?.[levelId]?.contentRead === true;
  }, [progress]);

  // Admin: toggle a level active/inactive
  const setLevelActive = useCallback((levelId, active) => {
    setLevelSettings(prev => {
      const next = { ...prev, [levelId]: { ...prev[levelId], active } };
      localStorage.setItem(LEVEL_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Admin: toggle global access for a level
  const setGlobalAccess = useCallback((levelId, open) => {
    setGlobalAccessState(prev => {
      const next = { ...prev, [levelId]: open };
      localStorage.setItem(GLOBAL_ACCESS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Admin: per-student override unlock
  const setStudentOverride = useCallback((userId, levelId) => {
    setOverridesState(prev => {
      const existing = prev[userId] ?? [];
      if (existing.includes(levelId)) return prev;
      const next = { ...prev, [userId]: [...existing, levelId] };
      saveOverridesData(next);
      return next;
    });
  }, []);

  // Admin: approve or reject a student's access to a level
  const setApproval = useCallback((userId, levelId, status) => {
    setApprovals(prev => {
      const next = {
        ...prev,
        [userId]: { ...prev[userId], [levelId]: status },
      };
      saveApprovals(next);
      return next;
    });
  }, []);

  return (
    <LevelContext.Provider value={{
      getLevel, getLevelStatus, markContentRead, markLevelComplete, isContentRead,
      setApproval, approvals, setStudentOverride, setLevelActive, setGlobalAccess,
      levelSettings, globalAccess,
    }}>
      {children}
    </LevelContext.Provider>
  );
}

export function useLevel() {
  const ctx = useContext(LevelContext);
  if (!ctx) throw new Error('useLevel must be used inside LevelProvider');
  return ctx;
}

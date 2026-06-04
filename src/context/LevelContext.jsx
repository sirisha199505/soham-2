import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../utils/api';

const LevelContext = createContext(null);

export function LevelProvider({ children }) {
  const { user } = useAuth();
  const [progress,            setProgress]           = useState({});
  const [approvals,           setApprovals]          = useState({});
  const [overrides,           setOverrides]          = useState({});
  const [levelSettings,       setLevelSettings]      = useState({});
  const [globalAccess,        setGlobalAccess]       = useState({});
  // true once the first successful /api/levels/settings response arrives
  const [levelSettingsLoaded, setLevelSettingsLoaded] = useState(false);
  // tracks which userIds have had their progress fully fetched from DB
  const [progressFetched, setProgressFetched] = useState({});

  // Track which userIds are currently being fetched (in-flight guard)
  const fetchedUsers = useRef(new Set());

  const refreshLevelSettings = useCallback(() => {
    api.getLevelSettings()
      .then(data => {
        const arr = Array.isArray(data) ? data : Object.values(data || {});
        const map = {};
        arr.forEach(lvl => { if (lvl?.id) map[lvl.id] = lvl; });
        setLevelSettings(map);
        setLevelSettingsLoaded(true);
      })
      .catch(() => {});
  }, []);

  /* ── Fetch progress for a specific student ── */
  const fetchProgress = useCallback(async (userId) => {
    if (!userId || fetchedUsers.current.has(userId)) return;
    // Hold the in-flight guard across all retries so concurrent renders don't
    // kick off a duplicate fetch.
    fetchedUsers.current.add(userId);

    // A transient backend failure (e.g. Render cold-start 503 / timeout) must NOT
    // be treated as "no progress" — that would make every admin-unlocked level fall
    // back to 'locked' (getLevelStatus), i.e. the student's unlock state would
    // appear to reset on screen even though the DB row is intact. Retry with backoff
    // so the real state is always restored; keep showing the loading skeleton
    // (progressFetched stays false) rather than a wrong "locked" state meanwhile.
    for (let attempt = 1; attempt <= 6; attempt++) {
      try {
        const data = await api.getLevelProgress(userId);
        const map = {};
        const userApprovals = {};
        Object.entries(data || {}).forEach(([k, v]) => {
          const levelId = Number(k);
          map[levelId] = v;
          if (v.approvalStatus) userApprovals[levelId] = v.approvalStatus;
        });
        setProgress(prev => ({ ...prev, [userId]: map }));
        if (Object.keys(userApprovals).length > 0) {
          setApprovals(prev => ({ ...prev, [userId]: userApprovals }));
        }
        setProgressFetched(prev => ({ ...prev, [userId]: true }));
        return;
      } catch {
        if (attempt < 6) {
          await new Promise(res => setTimeout(res, Math.min(1000 * attempt, 5000)));
        }
      }
    }

    // All retries failed — release the guard so a later trigger can retry again,
    // and stop the skeleton so the dashboard isn't stuck loading forever.
    fetchedUsers.current.delete(userId);
    setProgressFetched(prev => ({ ...prev, [userId]: true }));
  }, []);

  // Reload whenever the logged-in user changes (login / logout)
  useEffect(() => {
    if (!user) {
      // Logout: wipe all user-specific cached state so the next login starts clean
      fetchedUsers.current.clear();
      setProgress({});
      setProgressFetched({});
      return;
    }

    // Login: evict this user from the fetch cache so progress is always
    // re-loaded fresh from the DB — critical after logout/re-login.
    if (user.id) {
      fetchedUsers.current.delete(user.id);
      setProgressFetched(prev => { const n = { ...prev }; delete n[user.id]; return n; });
      // Eagerly fetch progress now — StudentDashboard shows skeleton cards while
      // progressFetched[userId] is false and never calls getLevelStatus (which
      // would otherwise be the only trigger). Without this, skeletons show forever.
      fetchProgress(user.id);
    }

    // Level settings: backend returns [{id, title, open, ...}, ...]
    refreshLevelSettings();

    // Global access: backend returns [{levelId, open}, ...]
    api.getGlobalAccess()
      .then(data => {
        const arr = Array.isArray(data) ? data : Object.entries(data || {});
        const map = {};
        arr.forEach(item => {
          if (Array.isArray(item)) map[Number(item[0])] = item[1];
          else if (item?.levelId != null) map[item.levelId] = item.open;
        });
        setGlobalAccess(map);
      })
      .catch(() => {});

    // Admin-only calls — only fetch for admin roles to avoid 401/403 for students
    const ADMIN_ROLES = ['admin', 'super_admin', 'school_admin', 'district_admin', 'teacher'];
    if (ADMIN_ROLES.includes(user.role)) {
      api.getApprovals()
        .then(data => {
          setApprovals(typeof data === 'object' && data ? data : {});
        })
        .catch(() => {});

      api.getOverrides()
        .then(data => {
          setOverrides(typeof data === 'object' && data ? data : {});
        })
        .catch(() => {});
    }
  }, [user?.id]);

  const getLevel = useCallback((userId, levelId) => {
    if (userId && !fetchedUsers.current.has(userId)) fetchProgress(userId);
    return progress[userId]?.[levelId] ?? null;
  }, [progress, fetchProgress]);

  const getLevelStatus = useCallback((userId, levelId) => {
    if (userId && !fetchedUsers.current.has(userId)) fetchProgress(userId);

    // 1a. Level deleted entirely from DB — treat as locked.
    //     Only apply after levelSettings has been fetched at least once so we
    //     don't falsely lock everything during the initial load.
    if (levelSettingsLoaded && !levelSettings[levelId]) return 'locked';

    // 1b. Admin deactivated → locked
    if (levelSettings[levelId]?.active === false) return 'locked';

    // 2. Level is open — read from levelSettings (already loaded with its own
    //    "loaded" flag) to avoid the race condition where globalAccess arrives
    //    after the first render and leaves every non-ID-1 level stuck as locked.
    if (levelSettings[levelId]?.open === true) {
      return progress[userId]?.[levelId]?.status ?? 'unlocked';
    }

    // 3. Per-student override granted by admin. For the admin UI this comes from
    //    the overrides map; for the student themselves it arrives on their own
    //    progress payload (overridden flag) since students don't load all overrides.
    if (overrides[userId]?.includes(levelId) || progress[userId]?.[levelId]?.overridden === true) {
      return progress[userId]?.[levelId]?.status ?? 'unlocked';
    }

    // 4. Level 1 is the default entry point — accessible even before admin touches anything
    if (levelId === 1) {
      return progress[userId]?.[1]?.status ?? 'unlocked';
    }

    // 5. All other levels stay locked until admin explicitly opens them.
    //    Completing a previous level does NOT auto-unlock the next one.
    return 'locked';
  }, [progress, overrides, levelSettings, globalAccess, fetchProgress, levelSettingsLoaded]);

  const markContentRead = useCallback(async (userId, levelId) => {
    try {
      await api.markContentRead(userId, levelId);
      setProgress(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          [levelId]: { ...prev[userId]?.[levelId], contentRead: true },
        },
      }));
    } catch { /* ignore */ }
  }, []);

  const markLevelComplete = useCallback(async (userId, levelId, score) => {
    // Optimistic update first — next level unlocks immediately after completion
    setProgress(prev => {
      const existing  = prev[userId]?.[levelId];
      const prevBest  = existing?.score?.pct ?? -1;
      const bestScore = score.pct >= prevBest ? score : existing?.score;
      const now       = new Date().toISOString();
      return {
        ...prev,
        [userId]: {
          ...prev[userId],
          [levelId]: {
            ...existing,
            status:          'completed',
            score:           bestScore,
            lastScore:       score,
            completedAt:     existing?.completedAt || now,
            lastCompletedAt: now,
          },
        },
      };
    });

    // Persist to DB — re-throw so callers can show an error if this fails
    await api.completeLevelProgress(userId, levelId, score);
  }, []);

  const isContentRead = useCallback((userId, levelId) => {
    return progress[userId]?.[levelId]?.contentRead === true;
  }, [progress]);

  // Admin: save full level settings (title, subtitle, description, timeLimit, active)
  const setLevelActive = useCallback(async (levelId, settings) => {
    try {
      const current = levelSettings[levelId] || {};
      // settings may be a plain { active } boolean call (legacy) or a full form object
      const payload = typeof settings === 'boolean'
        ? { ...current, active: settings }
        : { ...current, ...settings };
      await api.saveLevelSettings(levelId, payload);
      setLevelSettings(prev => ({
        ...prev,
        [levelId]: { ...(prev[levelId] || {}), ...payload },
      }));
    } catch (err) {
      console.error('setLevelActive failed:', err.message);
    }
  }, [levelSettings]);

  // Admin: toggle global access for a level
  const setGlobalAccessFn = useCallback(async (levelId, open) => {
    try {
      await api.setGlobalAccess(levelId, open);
      setGlobalAccess(prev => ({ ...prev, [levelId]: open }));
      // Keep levelSettings.open in sync so getLevelStatus reflects the change immediately
      setLevelSettings(prev => ({
        ...prev,
        [levelId]: { ...(prev[levelId] || {}), open, active: open },
      }));
    } catch (err) {
      console.error('setGlobalAccess failed:', err.message);
    }
  }, []);

  // Admin: per-student override unlock
  const setStudentOverride = useCallback(async (userId, levelId) => {
    try {
      await api.setOverride(userId, levelId);
      setOverrides(prev => {
        const existing = prev[userId] ?? [];
        if (existing.includes(levelId)) return prev;
        return { ...prev, [userId]: [...existing, levelId] };
      });
    } catch (err) {
      console.error('setStudentOverride failed:', err.message);
    }
  }, []);

  // Admin: approve or reject a student's level access
  const setApproval = useCallback(async (userId, levelId, status) => {
    try {
      await api.setApproval(userId, levelId, status);
      setApprovals(prev => ({
        ...prev,
        [userId]: { ...prev[userId], [levelId]: status },
      }));
    } catch (err) {
      console.error('setApproval failed:', err.message);
    }
  }, []);

  // Admin: create a new exam level
  const createLevel = useCallback(async (data) => {
    try {
      const newLevel = await api.createLevel(data);
      setLevelSettings(prev => ({
        ...prev,
        [newLevel.id]: { ...newLevel, active: newLevel.open },
      }));
      return newLevel;
    } catch (err) {
      console.error('createLevel failed:', err.message);
      throw err;
    }
  }, []);

  // Admin: delete an exam level
  const deleteLevel = useCallback(async (levelId) => {
    try {
      await api.deleteLevel(levelId);
      setLevelSettings(prev => {
        const next = { ...prev };
        delete next[levelId];
        return next;
      });
    } catch (err) {
      console.error('deleteLevel failed:', err.message);
      throw err;
    }
  }, []);

  return (
    <LevelContext.Provider value={{
      getLevel, getLevelStatus, markContentRead, markLevelComplete, isContentRead,
      setApproval, approvals, setStudentOverride, setLevelActive,
      setGlobalAccess: setGlobalAccessFn, levelSettings, levelSettingsLoaded, globalAccess,
      refreshLevelSettings, createLevel, deleteLevel, progressFetched,
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

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../utils/api';

const LevelContext = createContext(null);

export function LevelProvider({ children }) {
  const { user } = useAuth();
  const [progress,      setProgress]      = useState({});
  const [approvals,     setApprovals]     = useState({});
  const [overrides,     setOverrides]     = useState({});
  const [levelSettings, setLevelSettings] = useState({});
  const [globalAccess,  setGlobalAccess]  = useState({});

  // Track which userIds we've already fetched so we don't loop
  const fetchedUsers = useRef(new Set());

  // Reload whenever the logged-in user changes (login / logout)
  useEffect(() => {
    if (!user) return;

    api.getLevelSettings()
      .then(levels => {
        // Convert array [{ id, open, ... }] → map { [id]: { ... } }
        const map = {};
        if (Array.isArray(levels)) levels.forEach(l => { map[l.id] = l; });
        setLevelSettings(map);
      })
      .catch(() => {});

    api.getGlobalAccess()
      .then(levels => {
        const map = {};
        if (Array.isArray(levels)) levels.forEach(l => { map[l.levelId] = l.open; });
        setGlobalAccess(map);
      })
      .catch(() => {});

    // Admin-only calls — ignore 403s silently
    api.getApprovals()
      .then(rows => {
        const map = {};
        if (Array.isArray(rows)) rows.forEach(r => {
          if (!map[r.userId]) map[r.userId] = {};
          map[r.userId][r.levelId] = r.status;
        });
        setApprovals(map);
      })
      .catch(() => {});

    api.getOverrides()
      .then(rows => {
        const map = {};
        if (Array.isArray(rows)) rows.forEach(r => {
          if (!map[r.userId]) map[r.userId] = [];
          map[r.userId].push(r.levelId);
        });
        setOverrides(map);
      })
      .catch(() => {});
  }, [user?.id]);

  /* ── Fetch progress for a specific student ── */
  const fetchProgress = useCallback(async (userId) => {
    if (!userId || fetchedUsers.current.has(userId)) return;
    fetchedUsers.current.add(userId);
    try {
      const rows = await api.getLevelProgress(userId);
      // Convert array [{ levelId, status, score, ... }] → map { [levelId]: { ... } }
      const map = {};
      if (Array.isArray(rows)) rows.forEach(r => { map[r.levelId] = r; });
      setProgress(prev => ({ ...prev, [userId]: map }));
    } catch {}
  }, []);

  const getLevel = useCallback((userId, levelId) => {
    if (userId && !fetchedUsers.current.has(userId)) fetchProgress(userId);
    return progress[userId]?.[levelId] ?? null;
  }, [progress, fetchProgress]);

  const getLevelStatus = useCallback((userId, levelId) => {
    if (userId && !fetchedUsers.current.has(userId)) fetchProgress(userId);

    // 1. Admin deactivated → locked
    if (levelSettings[levelId]?.active === false) return 'locked';

    // 2. Global unlock
    if (levelId !== 1 && globalAccess[levelId] === true) {
      return progress[userId]?.[levelId]?.status ?? 'unlocked';
    }

    // 3. Per-student override
    if (overrides[userId]?.includes(levelId)) {
      return progress[userId]?.[levelId]?.status ?? 'unlocked';
    }

    // 4. Level 1 always unlocked
    if (levelId === 1) {
      return progress[userId]?.[1]?.status ?? 'unlocked';
    }

    // 5. Previous level must be completed
    const prev = progress[userId]?.[levelId - 1];
    if (prev?.status !== 'completed') return 'locked';

    // 6. Check approval
    const approval = approvals[userId]?.[levelId];
    if (approval === 'rejected') return 'rejected';
    if (approval === 'pending')  return 'pending_approval';
    return progress[userId]?.[levelId]?.status ?? 'unlocked';
  }, [progress, approvals, overrides, levelSettings, globalAccess, fetchProgress]);

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
    } catch {}
  }, []);

  const markLevelComplete = useCallback(async (userId, levelId, score) => {
    try {
      await api.completeLevelProgress(userId, levelId, score);

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

      // Auto-pending approval for next level (optimistic)
      const nextLevel = levelId + 1;
      if (nextLevel <= 3) {
        setApprovals(prev => {
          if (prev[userId]?.[nextLevel]) return prev;
          return {
            ...prev,
            [userId]: { ...prev[userId], [nextLevel]: 'pending' },
          };
        });
      }
    } catch (err) {
      console.error('markLevelComplete failed:', err.message);
    }
  }, []);

  const isContentRead = useCallback((userId, levelId) => {
    return progress[userId]?.[levelId]?.contentRead === true;
  }, [progress]);

  // Admin: toggle a level active/inactive
  const setLevelActive = useCallback(async (levelId, active) => {
    try {
      const current = levelSettings[levelId] || {};
      await api.saveLevelSettings(levelId, { ...current, active });
      setLevelSettings(prev => ({
        ...prev,
        [levelId]: { ...prev[levelId], active },
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

  return (
    <LevelContext.Provider value={{
      getLevel, getLevelStatus, markContentRead, markLevelComplete, isContentRead,
      setApproval, approvals, setStudentOverride, setLevelActive,
      setGlobalAccess: setGlobalAccessFn, levelSettings, globalAccess,
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

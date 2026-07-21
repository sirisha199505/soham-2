import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../utils/api';

const SettingsContext = createContext(null);

// Fetches platform-wide system settings once a user is authenticated and exposes
// the few flags that need to be ENFORCED app-wide (maintenance mode, registration).
// GET /api/settings only requires authentication, so any logged-in role can read it.
export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loaded,   setLoaded]   = useState(false);

  const refreshSettings = useCallback(() => {
    api.getSettings()
      .then(data => { setSettings(data || {}); setLoaded(true); })
      .catch(() => { setLoaded(true); }); // fail-open: never lock users out on a fetch error
  }, []);

  useEffect(() => {
    if (!user) { setSettings(null); setLoaded(false); return; }
    refreshSettings();
  }, [user?.id, refreshSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    settings,
    settingsLoaded:  loaded,
    maintenanceMode: settings?.maintenanceMode === true,
    registrationOpen: settings?.registrationOpen !== false,
    // Admin-configured global default quiz timer (minutes). Used as the fallback for
    // any level without its own timeLimit — the student quiz honours THIS value so it
    // can't diverge from what the admin sees. Falls back to 10 if unset/invalid.
    quizTimerMinutes: Number(settings?.quizTimerMinutes) > 0 ? Number(settings.quizTimerMinutes) : 10,
    refreshSettings,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

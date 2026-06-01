import { useState, useRef, useEffect } from 'react';
import { Menu, Search, ChevronDown, LogOut, HelpCircle, X } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ROLES, ROLE_LABELS } from '../../utils/constants';
import { getSidebarItems } from '../../utils/rolePermissions';
import Avatar from '../ui/Avatar';

const ROLE_BADGE_STYLE = {
  student:        { bg: '#3BC0EF15', color: '#1589b5', dot: '#3BC0EF' },
  coach:          { bg: '#FAAB3418', color: '#b97308', dot: '#FAAB34' },
  teacher:        { bg: '#FAAB3418', color: '#b97308', dot: '#FAAB34' },
  admin:          { bg: '#4F46E518', color: '#4338ca', dot: '#4F46E5' },
  school_admin:   { bg: '#1E3A8A18', color: '#1E3A8A', dot: '#1E3A8A' },
  district_admin: { bg: '#8B5CF618', color: '#7c3aed', dot: '#8B5CF6' },
  super_admin:    { bg: '#10B98118', color: '#059669', dot: '#10B981' },
};

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchOpen,  setSearchOpen]    = useState(false);
  const searchRef  = useRef(null);
  const profileRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/login'); };

  const roleBadge = ROLE_BADGE_STYLE[user?.role] || ROLE_BADGE_STYLE.student;

  // Admin-only: build searchable list from sidebar items
  const isAdmin = user?.role && user.role !== ROLES.STUDENT;
  const navItems = isAdmin ? getSidebarItems(user.role) : [];

  const searchResults = searchQuery.trim().length > 0
    ? navItems.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleResultClick = (path) => {
    navigate(path);
    setSearchQuery('');
    setSearchOpen(false);
  };

  // Close search dropdown on outside click
  useEffect(() => {
    if (!searchOpen) return;
    const handle = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [searchOpen]);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!showProfile) return;
    const handle = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showProfile]);

  return (
    <header className="sticky top-0 z-30 h-[62px] flex items-center px-4 md:px-6 gap-4"
      style={{ background: 'rgba(240,244,248,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(59,192,239,0.1)' }}>

      {/* Mobile menu */}
      <button onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl transition-colors text-slate-600 hover:bg-white hover:shadow-sm">
        <Menu size={20} />
      </button>

      {/* Search — admin only */}
      {isAdmin && (
        <div className="flex-1 max-w-sm hidden sm:block" ref={searchRef}>
          <div className="relative group">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#3BC0EF] transition-colors pointer-events-none" />
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={e => {
                if (e.key === 'Escape') { setSearchQuery(''); setSearchOpen(false); }
                if (e.key === 'Enter' && searchResults.length > 0) handleResultClick(searchResults[0].path);
              }}
              placeholder="Search pages…"
              className="w-full pl-10 pr-8 py-2.5 text-sm rounded-xl transition-all"
              style={{
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(59,192,239,0.15)',
                outline: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = `${colors.primary}60`; e.target.style.boxShadow = `0 0 0 3px ${colors.primary}15`; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(59,192,239,0.15)'; e.target.style.boxShadow = 'none'; }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}

            {/* Dropdown results */}
            {searchOpen && searchQuery.trim().length > 0 && (
              <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                {searchResults.length > 0 ? (
                  <ul className="py-1">
                    {searchResults.map(item => (
                      <li key={item.path}>
                        <button
                          onMouseDown={() => handleResultClick(item.path)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
                        >
                          <Search size={12} className="text-slate-400 shrink-0" />
                          <span className="font-medium">{item.label}</span>
                          <span className="ml-auto text-[10px] text-slate-400 font-mono truncate max-w-[120px]">{item.path}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-400 text-center">No pages match "{searchQuery}"</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 ml-auto">

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile(p => !p)}
            className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl hover:bg-white transition-all hover:shadow-sm"
          >
            <div className="relative">
              <Avatar name={user?.name} size="sm" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-bold text-slate-800 leading-tight">{user?.name?.split(' ')[0] || 'User'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: roleBadge.dot }} />
                <p className="text-[11px] font-medium" style={{ color: roleBadge.color }}>{ROLE_LABELS[user?.role]}</p>
              </div>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden md:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
              {/* Profile header — all roles */}
              <div className="px-4 py-4 border-b border-slate-50"
                style={{ background: `linear-gradient(135deg, ${roleBadge.bg}, transparent)` }}>
                <div className="flex items-center gap-3">
                  <Avatar name={user?.name} size="md" />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{user?.name || 'User'}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {user?.email?.includes('@student.rq') ? (user?.phoneNumber || 'Student Account') : user?.email}
                    </p>
                    <span
                      className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: roleBadge.bg, color: roleBadge.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: roleBadge.dot }} />
                      {ROLE_LABELS[user?.role]}
                    </span>
                  </div>
                </div>
              </div>

            {/* Dropdown actions */}
            <div className="p-2 space-y-0.5">
              <Link
                to="/help"
                onClick={() => setShowProfile(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-colors w-full text-sm font-medium"
              >
                <HelpCircle size={15} className="text-slate-400" />
                Help &amp; Support
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors w-full text-sm font-medium"
              >
                <LogOut size={15} className="text-slate-400" />
                Sign Out
              </button>
            </div>

            </div>
          )}
        </div>
      </div>

    </header>
  );
}

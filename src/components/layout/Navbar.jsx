import { useState } from 'react';
import { Menu, Search, ChevronDown, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ROLES, ROLE_LABELS } from '../../utils/constants';
import { formatUniqueId } from '../../utils/uniqueId';
import Avatar from '../ui/Avatar';

const ROLE_BADGE_STYLE = {
  student:        { bg: '#3BC0EF15', color: '#1589b5', dot: '#3BC0EF' },
  teacher:        { bg: '#FAAB3418', color: '#b97308', dot: '#FAAB34' },
  school_admin:   { bg: '#1E3A8A18', color: '#1E3A8A', dot: '#1E3A8A' },
  district_admin: { bg: '#8B5CF618', color: '#7c3aed', dot: '#8B5CF6' },
  super_admin:    { bg: '#10B98118', color: '#059669', dot: '#10B981' },
};

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  const roleBadge = ROLE_BADGE_STYLE[user?.role] || ROLE_BADGE_STYLE.student;

  return (
    <header className="sticky top-0 z-30 h-[62px] flex items-center px-4 md:px-6 gap-4"
      style={{ background: 'rgba(240,244,248,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(59,192,239,0.1)' }}>

      {/* Mobile menu */}
      <button onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl transition-colors text-slate-600 hover:bg-white hover:shadow-sm">
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-sm hidden sm:block">
        <div className="relative group">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#3BC0EF] transition-colors" />
          <input
            placeholder="Search quizzes, topics…"
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl transition-all"
            style={{
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(59,192,239,0.15)',
              outline: 'none',
            }}
            onFocus={e => { e.target.style.borderColor = `${colors.primary}60`; e.target.style.boxShadow = `0 0 0 3px ${colors.primary}15`; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(59,192,239,0.15)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(p => !p)}
            className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl hover:bg-white transition-all hover:shadow-sm"
          >
            <div className="relative">
              {/* Students show ID-based avatar, others show name */}
              {user?.role === ROLES.STUDENT
                ? (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${roleBadge.dot}, ${roleBadge.dot}99)` }}
                  >
                    ID
                  </div>
                )
                : <Avatar name={user?.name} size="sm" />
              }
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
            </div>
            <div className="hidden md:block text-left">
              {user?.role === ROLES.STUDENT ? (
                <>
                  <p className="text-sm font-bold text-slate-800 leading-tight font-mono tracking-wider">
                    #{formatUniqueId(user?.uniqueId)}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: roleBadge.dot }} />
                    <p className="text-[11px] font-medium" style={{ color: roleBadge.color }}>Student</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-800 leading-tight">{user?.name?.split(' ')[0]}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: roleBadge.dot }} />
                    <p className="text-[11px] font-medium" style={{ color: roleBadge.color }}>{ROLE_LABELS[user?.role]}</p>
                  </div>
                </>
              )}
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden md:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
              {/* Profile header */}
              <div className="px-4 py-4 border-b border-slate-50"
                style={{ background: `linear-gradient(135deg, ${roleBadge.bg}, transparent)` }}>
                <div className="flex items-center gap-3">
                  {user?.role === ROLES.STUDENT ? (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ background: `linear-gradient(135deg, ${roleBadge.dot}, ${roleBadge.dot}99)` }}
                    >
                      ID
                    </div>
                  ) : (
                    <Avatar name={user?.name} size="md" />
                  )}
                  <div className="min-w-0">
                    {user?.role === ROLES.STUDENT ? (
                      <>
                        <p className="font-bold text-slate-800 text-sm font-mono tracking-wider">
                          #{formatUniqueId(user?.uniqueId)}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Student Account</p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-slate-800 text-sm truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      </>
                    )}
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

              {/* Menu items */}
              <div className="p-2">
                {[
                  { icon: <User size={14} />, label: 'My Profile', action: () => { navigate('/profile'); setShowProfile(false); } },
                ].map(item => (
                  <button key={item.label} onClick={item.action}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors font-medium">
                    <span className="text-slate-400">{item.icon}</span> {item.label}
                  </button>
                ))}
                <div className="my-1 h-px bg-slate-100" />
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside */}
      {showProfile && (
        <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
      )}
    </header>
  );
}

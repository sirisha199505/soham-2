import { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/constants';
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
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/login'); };

  const roleBadge = ROLE_BADGE_STYLE[user?.role] || ROLE_BADGE_STYLE.student;

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
    <header className="sticky top-0 z-[45] h-[62px] flex items-center px-4 md:px-6 gap-4"
      style={{ background: 'rgba(240,244,248,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(59,192,239,0.1)' }}>

      {/* Mobile menu */}
      <button onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl transition-colors text-slate-600 hover:bg-white hover:shadow-sm">
        <Menu size={20} />
      </button>

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

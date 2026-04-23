import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, History, User, TrendingUp,
  Database, PlusCircle, ClipboardList, BarChart2, Users,
  Building2, Globe, Settings, LogOut, ChevronLeft, ChevronRight, X, Activity,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getSidebarItems } from '../../utils/rolePermissions';
import { ROLE_LABELS } from '../../utils/constants';
import Avatar from '../ui/Avatar';

const ICON_MAP = {
  LayoutDashboard, BookOpen, History, User, TrendingUp,
  Database, PlusCircle, ClipboardList, BarChart2, Users,
  Building2, Globe, Settings, Activity,
};

const ROLE_COLORS = {
  student:        '#3BC0EF',
  teacher:        '#FAAB34',
  school_admin:   '#1E3A8A',
  district_admin: '#8B5CF6',
  super_admin:    '#10B981',
};

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const items = getSidebarItems(user?.role);
  const roleColor = ROLE_COLORS[user?.role] || colors.primary;

  const handleLogout = () => { logout(); navigate('/login'); };

  const NavItem = ({ item }) => {
    const Icon = ICON_MAP[item.icon] || BookOpen;
    return (
      <NavLink
        to={item.path}
        onClick={onMobileClose}
        title={collapsed ? item.label : ''}
        end={item.path === '/dashboard' || item.path.includes('/dashboard/')}
      >
        {({ isActive }) => (
          <div
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm
              transition-all duration-150 cursor-pointer
              ${collapsed ? 'justify-center' : ''}
              ${isActive ? '' : 'hover:bg-slate-50/80 text-slate-500 hover:text-slate-800'}
            `}
            style={isActive ? {
              background: `linear-gradient(135deg, ${roleColor}18 0%, ${roleColor}0a 100%)`,
              color: roleColor,
              borderLeft: `3px solid ${roleColor}`,
              paddingLeft: collapsed ? 12 : 9,
            } : {}}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </div>
        )}
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Logo header */}
      <div className={`flex items-center gap-3 px-4 py-4 ${collapsed ? 'justify-center' : 'justify-between'}`}
        style={{ borderBottom: '1px solid #f1f5f9' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 p-1 rounded-xl" style={{ background: `${roleColor}12`, border: `1px solid ${roleColor}22` }}>
            <img
              src="/logo2.png"
              alt="RoboQuiz"
              className="object-contain"
              style={{ width: 30, height: 30, borderRadius: 6 }}
            />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm leading-tight truncate" style={{ fontFamily: 'Space Grotesk' }}>RoboQuiz</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: roleColor }}>
                {ROLE_LABELS[user?.role]}
              </p>
            </div>
          )}
        </div>
        <button onClick={onToggle}
          className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors shrink-0">
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
        {!collapsed && (
          <button onClick={onMobileClose} className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Navigation</p>
        )}
        {items.map(item => <NavItem key={item.path} item={item} />)}
      </nav>


      {/* User footer */}
      <div style={{ borderTop: '1px solid #f1f5f9' }} className="p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-50 group transition-colors">
            <div className="relative shrink-0">
              <Avatar name={user?.name} size="sm" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{user?.name}</p>
              <p className="text-[11px] truncate mt-0.5" style={{ color: roleColor }}>{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar name={user?.name} size="sm" />
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 border-2 border-white" />
            </div>
            <button onClick={handleLogout} title="Logout"
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className={`
        hidden lg:flex flex-col h-screen sticky top-0 shrink-0 sidebar-transition
        shadow-sm
        ${collapsed ? 'w-[70px]' : 'w-[248px]'}
      `}>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onMobileClose} />
          <aside className="relative w-[248px] h-full flex flex-col shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

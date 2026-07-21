import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Users, ClipboardList, Trophy } from 'lucide-react';
import { api } from '../utils/api';

export default function AuthLayout() {
  const { colors } = useTheme();

  // Live platform stats shown on the branding panel (public, cached endpoint).
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let alive = true;
    api.getPlatformStats()
      .then(s => { if (alive) setStats(s); })
      .catch(() => { /* leave placeholders on failure — never block the login UI */ });
    return () => { alive = false; };
  }, []);

  const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('en-IN'));
  const liveStats = [
    { icon: <Users size={16} />,         value: fmt(stats?.totalRegistered ?? stats?.totalStudents), label: 'Total Registered' },
    { icon: <ClipboardList size={16} />, value: fmt(stats?.totalQuizzes),    label: 'Quizzes Attempted' },
    { icon: <Trophy size={16} />,        value: fmt(stats?.levelsCompleted), label: 'Levels Cleared' },
  ];

  return (
    <div className="min-h-screen flex bg-[#0a1628]">
      {/* ── Left branding panel ── */}
      {/* Pinned to the viewport (h-screen + sticky + self-start) so its
          justify-between layout doesn't redistribute — and the badge/hero stay
          put — when the right form changes height between the Student and Trainer
          tabs (Student has more fields, which used to push this panel down). */}
      <div className="hidden lg:flex flex-col justify-between w-[48%] p-12 relative overflow-hidden lg:h-screen lg:sticky lg:top-0 lg:self-start">
        {/* Layered background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{
            background: `linear-gradient(145deg, #0d1f3c 0%, #0f2d5a 40%, #0a1628 100%)`
          }} />
          {/* Glowing orbs */}
          <div className="absolute top-[-80px] right-[-80px] w-[380px] h-[380px] rounded-full opacity-20 blur-[80px]"
            style={{ background: colors.primary }} />
          <div className="absolute bottom-[-60px] left-[-60px] w-[280px] h-[280px] rounded-full opacity-15 blur-[60px]"
            style={{ background: colors.secondary }} />
          <div className="absolute top-[40%] left-[30%] w-[200px] h-[200px] rounded-full opacity-10 blur-[50px]"
            style={{ background: '#8B5CF6' }} />
          {/* Grid overlay */}
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }}>
            <defs>
              <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.8"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          {/* Dot pattern */}
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }}>
            <defs>
              <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="white"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-2 z-10 pb-2">
          <div className="p-1.5 rounded-2xl" style={{ background: `${colors.primary}20`, border: `1px solid ${colors.primary}35` }}>
            <img src="/logo2.png" alt="Soham Quiz" className="w-10 h-10 object-contain" style={{ borderRadius: 8 }} />
          </div>
          <div>
            <p className="text-white font-bold text-xl tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>Soham Quiz</p>
            <p style={{ color: colors.primary, fontSize: 11, fontWeight: 500, letterSpacing: '0.08em' }}>ASSESSMENT PLATFORM</p>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 space-y-10">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6"
              style={{ background: `${colors.primary}20`, color: colors.primary, border: `1px solid ${colors.primary}30` }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: colors.primary }} />
              Trusted by 240+ schools across India
            </div>

            <h1 className="text-[2.7rem] font-bold text-white leading-[1.15] mb-5" style={{ fontFamily: 'Space Grotesk' }}>
              Transforming Robotics<br />Education Through<br />
              <span style={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
              }}>
                Smart Assessments
              </span>
            </h1>

            <p className="text-slate-400 text-base leading-relaxed max-w-md">
              A comprehensive quiz platform built for robotics education — empowering students, teachers, and administrators with real-time insights.
            </p>
          </div>

          {/* Live platform stats */}
          <div className="grid grid-cols-3 gap-5">
            {liveStats.map((s, i) => (
              <div key={i}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 shrink-0"
                  style={{ background: `${colors.primary}20`, color: colors.primary }}>
                  {s.icon}
                </div>
                <p className="text-2xl font-bold text-white tabular-nums" style={{ fontFamily: 'Space Grotesk' }}>{s.value}</p>
                <p className="text-slate-400 text-xs mt-1 leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-slate-600 text-xs">© 2026 Soham Quiz. Robotics Assessment Platform.</p>
      </div>

      {/* ── Right form panel ── */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-y-auto"
        style={{ background: 'linear-gradient(160deg, #0d1f3c 0%, #060e20 100%)' }}
      >
        {/* Subtle glow behind form */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-8 blur-[100px]"
          style={{ background: colors.primary }} />

        <div className="w-full max-w-md relative z-10 px-5 py-8">
          {/* ── Mobile branding (hidden on lg+) ── */}
          <div className="lg:hidden mb-8 space-y-5">
            {/* Logo row */}
            <div className="flex items-center gap-2.5 justify-center">
              <div className="p-1.5 rounded-xl" style={{ background: `${colors.primary}20`, border: `1px solid ${colors.primary}35` }}>
                <img src="/logo2.png" alt="Soham Quiz" className="w-9 h-9 object-contain" style={{ borderRadius: 6 }} />
              </div>
              <p className="text-white font-bold text-xl" style={{ fontFamily: 'Space Grotesk' }}>Soham Quiz</p>
            </div>

            {/* Trusted badge */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: `${colors.primary}20`, color: colors.primary, border: `1px solid ${colors.primary}30` }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: colors.primary }} />
                Trusted by 240+ schools across India
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-2xl font-bold text-white text-center leading-snug" style={{ fontFamily: 'Space Grotesk' }}>
              Transforming Robotics Education Through{' '}
              <span style={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                Smart Assessments
              </span>
            </h1>

            <p className="text-slate-400 text-sm text-center leading-relaxed">
              A comprehensive quiz platform built for robotics education — empowering students, Trainers, and administrators with real-time insights.
            </p>

            {/* Live platform stats */}
            <div className="flex justify-center gap-8 pt-1">
              {liveStats.map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-xl font-bold text-white tabular-nums" style={{ fontFamily: 'Space Grotesk' }}>{s.value}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-white/10" />
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}

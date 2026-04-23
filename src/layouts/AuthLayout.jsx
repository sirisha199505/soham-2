import { Outlet } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Shield, Zap, Award, Users } from 'lucide-react';

const FEATURES = [
  { icon: <Zap size={16} />,    text: 'Real-time quiz engine with auto-save' },
  { icon: <Shield size={16} />, text: 'Role-based access for all stakeholders' },
  { icon: <Award size={16} />,  text: 'AI-powered performance analytics' },
  { icon: <Users size={16} />,  text: 'School & district-level dashboards' },
];

export default function AuthLayout() {
  const { colors } = useTheme();

  return (
    <div className="min-h-screen flex bg-[#0a1628]">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[48%] p-12 relative overflow-hidden">
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
        <div className="relative flex items-center gap-3 z-10">
          <div className="p-1.5 rounded-2xl" style={{ background: `${colors.primary}20`, border: `1px solid ${colors.primary}35` }}>
            <img src="/logo2.png" alt="RoboQuiz" className="w-10 h-10 object-contain" style={{ borderRadius: 8 }} />
          </div>
          <div>
            <p className="text-white font-bold text-xl tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>RoboQuiz</p>
            <p style={{ color: colors.primary, fontSize: 11, fontWeight: 500, letterSpacing: '0.08em' }}>ASSESSMENT PLATFORM</p>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 space-y-10">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
              style={{ background: `${colors.primary}20`, color: colors.primary, border: `1px solid ${colors.primary}30` }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: colors.primary }} />
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

          {/* Feature list */}
          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${colors.primary}20`, color: colors.primary }}>
                  {f.icon}
                </div>
                <p className="text-slate-300 text-sm">{f.text}</p>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex gap-6">
            {[
              { value: '45K+', label: 'Students' },
              { value: '12K+', label: 'Quizzes' },
              { value: '98%',  label: 'Uptime' },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>{stat.value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-slate-600 text-xs">© 2026 RoboQuiz. Built for Indian Robotics Education.</p>
      </div>

      {/* ── Right form panel ── */}
      <div
        className="flex-1 flex items-center justify-center p-6 relative"
        style={{ background: 'linear-gradient(160deg, #0d1f3c 0%, #060e20 100%)' }}
      >
        {/* Subtle glow behind form */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-8 blur-[100px]"
          style={{ background: colors.primary }} />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <img src="/logo2.png" alt="RoboQuiz" className="w-10 h-10 object-contain rounded-xl" />
            <p className="text-white font-bold text-xl" style={{ fontFamily: 'Space Grotesk' }}>RoboQuiz</p>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Bot, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-6">
          <Bot size={40} className="text-indigo-400" />
        </div>
        <h1 className="text-6xl font-bold text-slate-200 mb-2" style={{ fontFamily: 'Space Grotesk' }}>404</h1>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Page Not Found</h2>
        <p className="text-slate-500 text-sm mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          <Home size={16} /> Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

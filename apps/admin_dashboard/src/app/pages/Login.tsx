import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, ChefHat } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { useMenuConfig } from '../context/MenuConfigContext';
import { useAuth, requiresAuth } from '../context/AuthContext';
import { getStoredProfileLogo } from '../context/ProfileLogoContext';

export function Login() {
  const navigate = useNavigate();
  const { branding } = useMenuConfig();
  const { signIn } = useAuth();
  const [logoUrl] = useState<string | null>(getStoredProfileLogo);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    if (requiresAuth()) {
      const { error: err } = await signIn(email, password);
      setLoading(false);
      if (err) {
        setError(err.message ?? 'Login failed');
        return;
      }
      navigate('/');
    } else {
      setTimeout(() => {
        setLoading(false);
        navigate('/');
      }, 1200);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Left — Image Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1771360963016-1408c2de12c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwa2l0Y2hlbiUyMGZvb2QlMjBwcmVwYXJhdGlvbnxlbnwxfHx8fDE3NzMzOTc4MDd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Restaurant kitchen"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <h1 className="text-white text-3xl mb-2">{branding.restaurantName}</h1>
          <p className="text-white/70 text-sm max-w-md">
            {branding.tagline}
          </p>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <ChefHat className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-gray-900 text-lg">{branding.restaurantName}</h2>
              <p className="text-xs text-gray-400">Restaurant Dashboard</p>
            </div>
          </div>

          {/* Welcome */}
          <div className="mb-6">
            <h3 className="text-gray-900 text-xl mb-1">{branding.welcomeMessage}</h3>
            <p className="text-sm text-gray-400">Sign in to your dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`you@${branding.restaurantName.toLowerCase().replace(/\s+/g, '')}.com`}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 appearance-none rounded border border-gray-300 bg-white checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/30 cursor-pointer relative checked:after:content-['✓'] checked:after:text-white checked:after:text-[10px] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center"
                />
                <span className="text-xs text-gray-500">Remember me</span>
              </label>
              <button type="button" className="text-xs text-primary hover:underline cursor-pointer">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-white text-sm rounded-xl hover:brightness-90 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-300">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Demo login */}
          <button
            onClick={() => {
              setEmail('admin@spicegarden.com');
              setPassword('demo1234');
            }}
            className="w-full py-2.5 border border-gray-200 bg-white text-sm text-gray-600 rounded-xl hover:bg-gray-50 transition-all cursor-pointer"
          >
            Use Demo Credentials
          </button>

          <p className="text-center text-xs text-gray-300 mt-8">
            &copy; 2026 {branding.restaurantName}. All rights reserved.
          </p>
        </div>
      </div>

      {/* Powered by */}
      <span className="absolute bottom-4 right-4 text-[11px] text-gray-400/60">
        powered by Smart Menu
      </span>
    </div>
  );
}
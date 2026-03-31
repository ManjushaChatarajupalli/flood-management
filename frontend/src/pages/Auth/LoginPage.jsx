import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const ROLES = [
  {
    id: 'citizen',
    label: 'Citizen',
    icon: '👤',
    description: 'Report floods & receive alerts',
    gradient: 'from-blue-500 to-cyan-500',
    activeTab: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-200',
    inactiveTab: 'text-gray-500 hover:text-blue-500 hover:bg-blue-50',
    inputBorder: 'border-blue-300 focus:ring-blue-400 focus:border-blue-400',
    btn: 'from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-blue-200',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    features: [
      'Receive live flood alerts for your location',
      'Report emergencies with photo & GPS',
      'Find nearest shelters and relief centers'
    ],
    demo: { email: 'citizen@demo.com', password: 'password123' }
  },
  {
    id: 'rescue_team',
    label: 'Rescue Team',
    icon: '🚒',
    description: 'Coordinate rescue operations',
    gradient: 'from-orange-500 to-red-500',
    activeTab: 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-200',
    inactiveTab: 'text-gray-500 hover:text-orange-500 hover:bg-orange-50',
    inputBorder: 'border-orange-300 focus:ring-orange-400 focus:border-orange-400',
    btn: 'from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-orange-200',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    features: [
      'View and accept rescue assignments',
      'Real-time coordination with other teams',
      'Update rescue status and mark safe zones'
    ],
    demo: { email: 'rescue@demo.com', password: 'password123' }
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: '🛡️',
    description: 'System management & alerts',
    gradient: 'from-violet-600 to-purple-600',
    activeTab: 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-200',
    inactiveTab: 'text-gray-500 hover:text-violet-600 hover:bg-violet-50',
    inputBorder: 'border-violet-300 focus:ring-violet-400 focus:border-violet-400',
    btn: 'from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-violet-200',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    features: [
      'Manage all incidents and verifications',
      'Send manual flood alerts to citizens',
      'Monitor system health and team status'
    ],
    demo: { email: 'admin@demo.com', password: 'password123' }
  }
];

const LoginPage = () => {
  const [selectedRole, setSelectedRole] = useState('citizen');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const activeRole = ROLES.find(r => r.id === selectedRole);

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId);
    setError('');
    setFormData({ email: '', password: '' });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await login(formData.email, formData.password);
      const role = response.user.role;
      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'rescue_team') navigate('/rescue/dashboard');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setFormData({ email: activeRole.demo.email, password: activeRole.demo.password });
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left decorative panel (desktop only) ── */}
      <div className={`hidden lg:flex lg:w-5/12 bg-gradient-to-br ${activeRole.gradient} flex-col justify-between p-12 relative overflow-hidden transition-all duration-500`}>
        {/* BG circles */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-white" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-white -translate-x-1/2 -translate-y-1/2" />
        </div>
        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0 opacity-20 pointer-events-none">
          <svg viewBox="0 0 1440 320" className="w-full">
            <path fill="white" d="M0,192L48,186.7C96,181,192,171,288,176C384,181,480,203,576,197.3C672,192,768,160,864,160C960,160,1056,192,1152,197.3C1248,203,1344,181,1392,170.7L1440,160L1440,320L0,320Z" />
            <path fill="white" fillOpacity="0.5" d="M0,256L48,245.3C96,235,192,213,288,218.7C384,224,480,256,576,250.7C672,245,768,203,864,197.3C960,192,1056,224,1152,229.3C1248,235,1344,213,1392,202.7L1440,192L1440,320L0,320Z" />
          </svg>
        </div>

        {/* Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white border-opacity-30">
              <span className="text-2xl">🌊</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl leading-tight">Flood Rescue</h1>
              <p className="text-white text-opacity-70 text-xs">Emergency Response System</p>
            </div>
          </div>
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Saving lives<br />together
          </h2>
          <p className="text-white text-opacity-80 text-base leading-relaxed">
            Real-time flood monitoring, instant alerts, and coordinated rescue operations — all in one platform.
          </p>
        </div>

        {/* Features + avatars */}
        <div className="relative z-10 space-y-4">
          {activeRole.features.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-white bg-opacity-20 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white text-opacity-85 text-sm">{f}</p>
            </div>
          ))}
          <div className="pt-4 flex items-center gap-3">
            <div className="flex -space-x-2">
              {['👩','👨','👷','👩‍⚕️'].map((e, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-white bg-opacity-20 border-2 border-white border-opacity-40 flex items-center justify-center text-sm backdrop-blur-sm">
                  {e}
                </div>
              ))}
            </div>
            <p className="text-white text-opacity-80 text-sm"><strong>2,400+</strong> responders active</p>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-md">

          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${activeRole.gradient} rounded-2xl shadow-lg mb-3 transition-all duration-500`}>
              <span className="text-3xl">🌊</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Flood Rescue</h1>
            <p className="text-gray-500 text-sm">Emergency Response System</p>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 mt-1 text-sm">Choose your role and sign in to continue</p>
          </div>

          {/* ── 3-Role Tab Selector ── */}
          <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl mb-6">
            {ROLES.map(role => (
              <button
                key={role.id}
                type="button"
                onClick={() => handleRoleChange(role.id)}
                className={`flex-1 flex flex-col items-center py-3 px-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                  selectedRole === role.id ? role.activeTab : role.inactiveTab
                }`}
              >
                <span className="text-xl mb-1">{role.icon}</span>
                <span className="leading-tight text-center">{role.label}</span>
              </button>
            ))}
          </div>

          {/* Role badge */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 transition-all duration-300 ${activeRole.badge}`}>
            <span className="text-2xl">{activeRole.icon}</span>
            <div>
              <p className="text-xs font-bold">{activeRole.label} Portal</p>
              <p className="text-xs opacity-75">{activeRole.description}</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
              <span className="text-lg mt-0.5 flex-shrink-0">⚠️</span>
              <div>
                <p className="font-semibold text-sm">Login Failed</p>
                <p className="text-xs mt-0.5 opacity-80">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:outline-none transition-all bg-white text-gray-800 placeholder-gray-400 ${activeRole.inputBorder}`}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:ring-2 focus:outline-none transition-all bg-white text-gray-800 placeholder-gray-400 ${activeRole.inputBorder}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition text-lg"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-blue-500" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-sm font-semibold text-blue-600 hover:underline">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl text-white font-bold text-base transition-all duration-300 bg-gradient-to-r shadow-lg ${
                loading
                  ? 'from-gray-400 to-gray-400 cursor-not-allowed shadow-none'
                  : activeRole.btn
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                `Sign in as ${activeRole.label} ${activeRole.icon}`
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-gray-50 text-gray-400 font-medium">or</span>
            </div>
          </div>

          <p className="text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-blue-600 hover:underline">
              Create account
            </Link>
          </p>

          {/* Demo credentials */}
          <div className={`mt-6 p-4 border rounded-xl transition-all duration-300 ${activeRole.badge}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold">🔑 Demo — {activeRole.label}</p>
              <button
                type="button"
                onClick={fillDemo}
                className="text-xs font-bold underline opacity-70 hover:opacity-100 transition"
              >
                Auto-fill ↗
              </button>
            </div>
            <p className="text-xs opacity-75 font-mono">{activeRole.demo.email}</p>
            <p className="text-xs opacity-75 font-mono">{activeRole.demo.password}</p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            © 2026 Flood Rescue System •{' '}
            <a href="#" className="hover:underline">Privacy</a> •{' '}
            <a href="#" className="hover:underline">Terms</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

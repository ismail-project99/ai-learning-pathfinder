import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  ChevronRight, 
  Target, 
  Zap, 
  CheckCircle2, 
  Circle, 
  MessageSquare, 
  BarChart3, 
  Trophy,
  ArrowRight,
  Brain,
  Code,
  ExternalLink,
  Loader2,
  Send,
  X,
  Github,
  Play,
  FileText
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  sendEmailVerification
} from 'firebase/auth';
import { auth } from './firebase';
import { generateRoadmap, getMentorResponse } from './services/gemini';
import { cn } from './lib/utils';
import { useProgressStore } from './store/useStore';
import { Roadmap, RoadmapNode, Resource } from './types';

// --- Mock Data for Dashboard ---
const velocityData = [
  { day: 'Mon', xp: 120 },
  { day: 'Tue', xp: 300 },
  { day: 'Wed', xp: 200 },
  { day: 'Thu', xp: 450 },
  { day: 'Fri', xp: 380 },
  { day: 'Sat', xp: 600 },
  { day: 'Sun', xp: 520 },
];

// --- Sub-components (Defined outside App to prevent re-renders) ---

const Header = ({ onSignIn, onSignUp, user, onSignOut }: { 
  onSignIn: () => void, 
  onSignUp: () => void, 
  user: User | null,
  onSignOut: () => void
}) => (
  <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-zinc-800/50">
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
          <Brain className="w-5 h-5 text-zinc-950" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">AI Learning Path</span>
      </div>
      <div className="flex items-center gap-6">
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-zinc-400 text-xs hidden sm:inline-block">
              {user.displayName || user.email}
            </span>
            <button 
              onClick={onSignOut}
              className="text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <>
            <button 
              onClick={onSignIn}
              className="text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"
            >
              Sign In
            </button>
            <button 
              onClick={onSignUp}
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/10"
            >
              Sign Up
            </button>
          </>
        )}
      </div>
    </div>
  </header>
);

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const AuthModal = ({ isOpen, onClose, mode, setMode, onVerificationRequired }: { 
  isOpen: boolean, 
  onClose: () => void, 
  mode: 'signin' | 'signup',
  setMode: (mode: 'signin' | 'signup') => void,
  onVerificationRequired: (email: string) => void
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSocialLogin = async (providerName: 'google' | 'github') => {
    setError('');
    setLoading(true);
    const provider = providerName === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err: any) {
      console.error(`${providerName} login error:`, err);
      setError(`Failed to sign in with ${providerName}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential.user.emailVerified) {
          const userEmail = userCredential.user.email || email;
          await signOut(auth);
          onVerificationRequired(userEmail);
          onClose();
          return;
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (fullName.trim()) {
          await updateProfile(userCredential.user, {
            displayName: fullName.trim()
          });
        }
        await sendEmailVerification(userCredential.user);
        const userEmail = userCredential.user.email || email;
        await signOut(auth);
        onVerificationRequired(userEmail);
        onClose();
        return;
      }
      onClose();
    } catch (err: any) {
      console.error("Auth error:", err.code, err.message);
      const errorCode = err.code;
      
      if (errorCode === 'auth/user-not-found' || 
          errorCode === 'auth/wrong-password' || 
          errorCode === 'auth/invalid-credential' ||
          errorCode === 'auth/invalid-email') {
        setError("Email or password is incorrect");
      } else if (errorCode === 'auth/email-already-in-use') {
        setError("User already exists. Please sign in");
      } else if (errorCode === 'auth/weak-password') {
        setError("Password is too weak. Please use at least 6 characters.");
      } else if (errorCode === 'auth/too-many-requests') {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 z-[70] shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">{mode === 'signin' ? 'Sign In' : 'Create Account'}</h3>
              <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Full Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Email Address</label>
                  <input 
                    type="email" 
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Password</label>
                  <input 
                    type="password" 
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-900 px-2 text-zinc-500 font-bold">OR</span>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-zinc-950 text-white font-bold py-3 rounded-xl hover:bg-zinc-800 transition-all border border-zinc-800 disabled:opacity-50"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
                <button 
                  type="button"
                  onClick={() => handleSocialLogin('github')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-zinc-950 text-white font-bold py-3 rounded-xl hover:bg-zinc-800 transition-all border border-zinc-800 disabled:opacity-50"
                >
                  <Github className="w-5 h-5" />
                  Continue with GitHub
                </button>
              </div>

              {error && (
                <p className="text-red-400 text-sm font-medium bg-red-400/10 border border-red-400/20 p-3 rounded-lg">
                  {error}
                </p>
              )}

              <div className="space-y-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
                </button>

                <div className="text-center">
                  <button 
                    type="button"
                    onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                    className="text-zinc-500 hover:text-emerald-400 text-sm transition-colors"
                  >
                    {mode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

interface OnboardingProps {
  onboardingData: any;
  setOnboardingData: (data: any) => void;
  handleStartOnboarding: () => void;
  loading: boolean;
}

const VerificationScreen = ({ email, onBackToLogin }: { email: string, onBackToLogin: () => void }) => (
  <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl"
    >
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
        <Send className="w-8 h-8 text-emerald-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Verify your email</h2>
        <p className="text-zinc-400">
          We have sent you a verification email to <span className="text-white font-medium">{email}</span>. Please verify it and log in.
        </p>
      </div>
      <button 
        onClick={onBackToLogin}
        className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/10"
      >
        Login
      </button>
    </motion.div>
  </div>
);

const Onboarding = ({ onboardingData, setOnboardingData, handleStartOnboarding, loading }: OnboardingProps) => (
  <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg w-full space-y-8"
    >
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <Brain className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Architect your future.</h1>
        <p className="text-zinc-400 text-lg">Define your path. Our AI will build the bridge.</p>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 space-y-6 backdrop-blur-xl">
        <div className="space-y-2">
          <label htmlFor="onboarding-skill-input" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">What do you want to master?</label>
          <input 
            id="onboarding-skill-input"
            type="text" 
            placeholder="e.g. Distributed Systems, Oil Painting, Quantum Physics"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            value={onboardingData.skill}
            onChange={(e) => {
              const val = e.target.value;
              setOnboardingData((prev: any) => ({...prev, skill: val}));
            }}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="onboarding-goal-input" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">What is your ultimate goal?</label>
          <input 
            id="onboarding-goal-input"
            type="text" 
            placeholder="e.g. Build a SaaS, Get hired at Google, Write a novel"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            value={onboardingData.goal}
            onChange={(e) => {
              const val = e.target.value;
              setOnboardingData((prev: any) => ({...prev, goal: val}));
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="onboarding-proficiency-select" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Proficiency</label>
            <select 
              id="onboarding-proficiency-select"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none"
              value={onboardingData.proficiency}
              onChange={(e) => {
                const val = e.target.value;
                setOnboardingData((prev: any) => ({...prev, proficiency: val}));
              }}
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="onboarding-commitment-select" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Weekly Commitment</label>
            <select 
              id="onboarding-commitment-select"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none"
              value={onboardingData.timeCommitment}
              onChange={(e) => {
                const val = e.target.value;
                setOnboardingData((prev: any) => ({...prev, timeCommitment: val}));
              }}
            >
              <option>2-5 hours</option>
              <option>5-10 hours</option>
              <option>10-20 hours</option>
              <option>Full-time</option>
            </select>
          </div>
        </div>

        <button 
          onClick={handleStartOnboarding}
          disabled={!onboardingData.skill || loading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-zinc-950 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 group"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              Generate Learning Path
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  </div>
);

interface DashboardProps {
  roadmap: Roadmap | null;
  setStep: (step: 'onboarding' | 'dashboard' | 'roadmap') => void;
  onSignOut: () => void;
  onNewRoadmap: () => void;
}

const Dashboard = ({ roadmap, setStep, onSignOut, onNewRoadmap }: DashboardProps) => {
  const { points, streak, completedNodes } = useProgressStore();
  
  // Calculate completion rate based on store's completedNodes
  const completionRate = roadmap 
    ? Math.round((roadmap.nodes.filter(n => completedNodes.includes(n.id)).length / roadmap.nodes.length) * 100) 
    : 0;
  
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h2 className="text-zinc-500 text-sm font-semibold uppercase tracking-widest mb-1">Welcome back, Architect</h2>
            <h1 className="text-3xl font-bold">{roadmap?.title}</h1>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onNewRoadmap}
              className="px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-all text-zinc-400 text-sm flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              New Path
            </button>
            <button 
              onClick={onSignOut}
              className="px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-all text-zinc-400 text-sm"
            >
              Logout
            </button>
            <button onClick={() => setStep('roadmap')} className="px-6 py-2 bg-emerald-500 text-zinc-950 rounded-lg hover:bg-emerald-400 transition-all flex items-center gap-2 font-bold">
              Continue Learning
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 text-xs font-bold uppercase">Completion</span>
              <Zap className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold font-mono">{completionRate}%</div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                className="bg-emerald-500 h-full" 
              />
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-2">
            <span className="text-zinc-500 text-xs font-bold uppercase">Learning Velocity</span>
            <div className="text-3xl font-bold font-mono">1.2x</div>
            <p className="text-xs text-emerald-400 font-medium">+12% from last week</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-2">
            <span className="text-zinc-500 text-xs font-bold uppercase">Current Streak</span>
            <div className="text-3xl font-bold font-mono">{streak} Days</div>
            <p className="text-xs text-zinc-500">Next milestone: {streak + 3} days</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-2">
            <span className="text-zinc-500 text-xs font-bold uppercase">Total XP</span>
            <div className="text-3xl font-bold font-mono">{points.toLocaleString()}</div>
            <p className="text-xs text-zinc-500">Level {Math.floor(points / 500) + 1} Architect</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                Activity Telemetry
              </h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20">WEEKLY</span>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityData}>
                  <defs>
                    <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="day" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Area type="monotone" dataKey="xp" stroke="#10b981" fillOpacity={1} fill="url(#colorXp)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl space-y-6">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Milestones
            </h3>
            <div className="space-y-4">
              {roadmap?.nodes.slice(0, 4).map((node, i) => {
                const isNodeCompleted = completedNodes.includes(node.id);
                return (
                  <div key={node.id} className="flex items-center gap-4 p-3 rounded-xl bg-zinc-950 border border-zinc-800/50">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      isNodeCompleted ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                    )}>
                      {isNodeCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{node.title}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{node.stage.replace('_', ' ')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setStep('roadmap')} className="w-full py-3 text-sm font-bold text-zinc-400 hover:text-white transition-colors">
              View All Milestones
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RoadmapViewProps {
  roadmap: Roadmap | null;
  setStep: (step: 'onboarding' | 'dashboard' | 'roadmap') => void;
  activeNodeId: string | null;
  setActiveNodeId: (id: string | null) => void;
  toggleNodeCompletion: (id: string) => void;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  chatMessages: {role: 'user' | 'ai', content: string}[];
  chatInput: string;
  setChatInput: (input: string) => void;
  handleSendMessage: () => void;
  onSignOut: () => void;
}

const RoadmapView = ({ 
  roadmap, 
  setStep, 
  activeNodeId, 
  setActiveNodeId, 
  toggleNodeCompletion, 
  chatOpen, 
  setChatOpen, 
  chatMessages, 
  chatInput, 
  setChatInput, 
  handleSendMessage,
  onSignOut
}: RoadmapViewProps) => {
  const { completedResources, completeResource, completedNodes } = useProgressStore();
  const stages = ["FUNDAMENTALS", "CORE_SKILLS", "APPLIED_PROJECTS", "ADVANCED_CONCEPTS", "CAREER_PREP"];
  
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-80 border-r border-zinc-800 p-6 flex flex-col gap-8 bg-zinc-950/50 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Brain className="w-6 h-6 text-zinc-950" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">Pathfinder</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <button onClick={() => setStep('dashboard')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all">
            <BarChart3 className="w-5 h-5" />
            Dashboard
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 transition-all">
            <Target className="w-5 h-5" />
            Roadmap
          </button>
          <button 
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
            Logout
          </button>
        </nav>

        <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Mentor Online</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">Ask me anything about your current milestone.</p>
          <button 
            onClick={() => setChatOpen(true)}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold transition-all"
          >
            Start Chat
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12">
        <div className="max-w-4xl mx-auto space-y-12">
          <header className="space-y-2">
            <h2 className="text-emerald-400 text-sm font-bold uppercase tracking-widest">Interactive Path</h2>
            <h1 className="text-4xl font-bold">{roadmap?.title}</h1>
            <p className="text-zinc-400 text-lg">{roadmap?.description}</p>
          </header>

          <div className="space-y-16 relative">
            {/* Vertical Line */}
            <div className="absolute left-6 top-8 bottom-8 w-px bg-zinc-800" />

            {stages.map((stage) => {
              const stageNodes = roadmap?.nodes.filter(n => n.stage === stage) || [];
              if (stageNodes.length === 0) return null;

              return (
                <section key={stage} className="space-y-8 relative">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center z-10">
                      <BookOpen className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-zinc-300">
                      {stage.replace('_', ' ')}
                    </h3>
                  </div>

                  <div className="grid gap-6 ml-12">
                            {stageNodes.map((node) => {
                              const isNodeCompleted = completedNodes.includes(node.id);
                              return (
                                <motion.div 
                                  key={node.id}
                                  layoutId={node.id}
                                  onClick={() => setActiveNodeId(activeNodeId === node.id ? null : node.id)}
                                  className={cn(
                                    "group p-6 rounded-3xl border transition-all cursor-pointer relative overflow-hidden",
                                    activeNodeId === node.id 
                                      ? "bg-zinc-900 border-emerald-500/50 shadow-2xl shadow-emerald-500/10" 
                                      : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
                                  )}
                                >
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1 flex-1">
                                      <div className="flex items-center gap-3">
                                        <h4 className="font-bold text-lg">{node.title}</h4>
                                        {isNodeCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                                      </div>
                                      <p className="text-zinc-400 text-sm line-clamp-2">{node.description}</p>
                                    </div>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleNodeCompletion(node.id);
                                      }}
                                      className={cn(
                                        "p-2 rounded-xl border transition-all",
                                        isNodeCompleted 
                                          ? "bg-emerald-500 border-emerald-400 text-zinc-950" 
                                          : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white"
                                      )}
                                    >
                                      <CheckCircle2 className="w-5 h-5" />
                                    </button>
                                  </div>

                        <AnimatePresence>
                          {activeNodeId === node.id && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-6 pt-6 border-t border-zinc-800 space-y-6"
                            >
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Estimated Effort</span>
                                  <div className="flex items-center gap-2 text-sm font-mono">
                                    <Loader2 className="w-4 h-4 text-emerald-400" />
                                    {node.estimatedHours} Hours
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Resources</span>
                                  <div className="flex gap-2">
                                    {node.resources.map((r, i) => (
                                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-all">
                                        <ExternalLink className="w-4 h-4" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              
                                  <div className="space-y-3">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Curated Resources</span>
                                    <div className="space-y-2">
                                      {node.resources.map((res, i) => {
                                        const resourceId = `${node.id}-${i}`;
                                        const isCompleted = completedResources.includes(resourceId);
                                        return (
                                          <div 
                                            key={i} 
                                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/30 transition-all group/link"
                                          >
                                            <a 
                                              href={res.type === 'youtube' 
                                                ? `https://www.youtube.com/results?search_query=${encodeURIComponent(res.youtubeSearchQuery || res.title)}`
                                                : res.url
                                              } 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-3 flex-1"
                                            >
                                              <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
                                                {res.type === 'youtube' ? (
                                                  <Play className="w-4 h-4 text-red-400 fill-red-400/20" />
                                                ) : res.type === 'article' ? (
                                                  <FileText className="w-4 h-4 text-blue-400" />
                                                ) : (
                                                  <Code className="w-4 h-4 text-zinc-400" />
                                                )}
                                              </div>
                                              <div className="flex flex-col">
                                                <span className="text-sm font-medium">{res.title}</span>
                                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{res.type}</span>
                                              </div>
                                            </a>
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                completeResource(resourceId);
                                              }}
                                              disabled={isCompleted}
                                              className={cn(
                                                "p-2 rounded-lg border transition-all ml-4",
                                                isCompleted 
                                                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                                                  : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700"
                                              )}
                                              title={isCompleted ? "Completed" : "Mark as complete (+10 XP)"}
                                            >
                                              <CheckCircle2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                              <button 
                                onClick={() => setChatOpen(true)}
                                className="w-full py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold text-sm hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                              >
                                <MessageSquare className="w-4 h-4" />
                                Discuss with AI Mentor
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          </div>
        </div>
      </main>

      {/* Chat Drawer */}
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 bottom-0 w-[450px] bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col shadow-2xl"
            >
              <header className="p-6 border-b border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold">AI Mentor</h3>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Context Aware</p>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)} className="p-2 hover:bg-zinc-900 rounded-lg transition-all">
                  <X className="w-5 h-5" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-8">
                    <MessageSquare className="w-12 h-12 text-zinc-800" />
                    <p className="text-zinc-500 text-sm">Ask me about the current milestone, debugging, or conceptual deep-dives.</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex flex-col gap-2",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-emerald-500 text-zinc-950 font-medium" 
                        : "bg-zinc-900 border border-zinc-800 text-zinc-300"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-zinc-800">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="relative"
                >
                  <input 
                    id="chat-input-field"
                    type="text" 
                    placeholder="Type your question..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-4 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button 
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 text-zinc-950 rounded-lg hover:bg-emerald-400 transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [authModal, setAuthModal] = useState<{ isOpen: boolean, mode: 'signin' | 'signup' }>({ isOpen: false, mode: 'signin' });
  const [step, setStep] = useState<'onboarding' | 'dashboard' | 'roadmap'>('onboarding');
  const [loading, setLoading] = useState(false);
  const { currentRoadmap, setRoadmap } = useProgressStore();
  const [onboardingData, setOnboardingData] = useState({
    skill: '',
    goal: '',
    proficiency: 'Beginner',
    timeCommitment: '5-10 hours'
  });
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && !currentUser.emailVerified && currentUser.providerData.some(p => p.providerId === 'password')) {
        // If logged in with password but not verified, sign out and show verification screen
        const email = currentUser.email;
        signOut(auth).then(() => {
          if (email) setVerificationEmail(email);
        });
        return;
      }

      setUser(currentUser);
      if (currentUser && step === 'onboarding' && currentRoadmap) {
        setStep('dashboard');
      }
      if (!currentUser) {
        setStep('onboarding');
      }
    });
    return () => unsubscribe();
  }, [step, currentRoadmap]);

  // --- Handlers ---
  const handleSignOut = async () => {
    await signOut(auth);
    setStep('onboarding');
  };

  const handleNewRoadmap = () => {
    setRoadmap(null);
    setStep('onboarding');
  };

  const handleStartOnboarding = async () => {
    setLoading(true);
    try {
      const data = await generateRoadmap(onboardingData.skill, onboardingData.goal, onboardingData.proficiency);
      setRoadmap(data);
      setStep('dashboard');
    } catch (error) {
      console.error("Failed to generate roadmap:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNodeCompletion = (id: string) => {
    useProgressStore.getState().toggleNodeCompletion(id);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !currentRoadmap) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    
    const activeNode = currentRoadmap.nodes.find(n => n.id === activeNodeId);
    const response = await getMentorResponse(userMsg, {
      roadmapTitle: currentRoadmap.title,
      roadmapDescription: currentRoadmap.description,
      currentNodeTitle: activeNode?.title || 'General Overview'
    });
    
    setChatMessages(prev => [...prev, { role: 'ai', content: response }]);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {step === 'onboarding' && (
        <Header 
          onSignIn={() => setAuthModal({ isOpen: true, mode: 'signin' })}
          onSignUp={() => setAuthModal({ isOpen: true, mode: 'signup' })}
          user={user}
          onSignOut={handleSignOut}
        />
      )}
      
      <AuthModal 
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        mode={authModal.mode}
        setMode={(mode) => setAuthModal({ ...authModal, mode })}
        onVerificationRequired={(email) => setVerificationEmail(email)}
      />

      {verificationEmail ? (
        <VerificationScreen 
          email={verificationEmail} 
          onBackToLogin={() => {
            setVerificationEmail(null);
            setAuthModal({ isOpen: true, mode: 'signin' });
          }} 
        />
      ) : step === 'onboarding' && !currentRoadmap ? (
        <motion.div
          key="onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Onboarding 
            onboardingData={onboardingData} 
            setOnboardingData={setOnboardingData} 
            handleStartOnboarding={handleStartOnboarding} 
            loading={loading} 
          />
        </motion.div>
      ) : null}
      {(step === 'dashboard' || (step === 'onboarding' && currentRoadmap)) && (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Dashboard 
            roadmap={currentRoadmap} 
            setStep={setStep} 
            onSignOut={handleSignOut}
            onNewRoadmap={handleNewRoadmap}
          />
        </motion.div>
      )}
      {step === 'roadmap' && (
        <motion.div
          key="roadmap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <RoadmapView 
            roadmap={currentRoadmap}
            setStep={setStep}
            activeNodeId={activeNodeId}
            setActiveNodeId={setActiveNodeId}
            toggleNodeCompletion={toggleNodeCompletion}
            chatOpen={chatOpen}
            setChatOpen={setChatOpen}
            chatMessages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            handleSendMessage={handleSendMessage}
            onSignOut={handleSignOut}
          />
        </motion.div>
      )}
    </div>
  );
}

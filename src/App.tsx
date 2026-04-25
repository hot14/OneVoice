import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { InterpretationDashboard } from './components/InterpretationDashboard';
import { InterpreterSession } from './components/InterpreterSession';
import { TutorSession } from './components/TutorSession';
import { ReviewSession } from './components/ReviewSession';
import { Loader2 } from 'lucide-react';
import { useLanguage } from './contexts/LanguageContext';

type View = 'dashboard' | 'interpreter' | 'tutor' | 'review';

export default function App() {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedTopic, setSelectedTopic] = useState<string | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
            🗣️
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">OneVoice</h1>
          <p className="text-gray-600 mb-8">AI Real-time Interpretation & Language Tutor</p>
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" alt="Google" className="w-6 h-6 bg-white rounded-full p-1" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'dashboard' && (
        <InterpretationDashboard 
          onStartInterpretation={() => setCurrentView('interpreter')}
        />
      )}
      
      {currentView === 'interpreter' && (
        <InterpreterSession onClose={() => setCurrentView('dashboard')} />
      )}

      {currentView === 'tutor' && (
        <TutorSession 
          onClose={() => setCurrentView('dashboard')} 
          topic={selectedTopic}
          onLessonComplete={() => setCurrentView('dashboard')}
        />
      )}

      {currentView === 'review' && (
        <ReviewSession 
          onClose={() => setCurrentView('dashboard')} 
          onComplete={() => setCurrentView('dashboard')}
        />
      )}

      {/* Navigation for Tutor and Review (if needed from Dashboard) */}
      {currentView === 'dashboard' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-4 bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-lg border border-white/20 z-40">
          <button 
            onClick={() => setCurrentView('tutor')}
            className="px-6 py-2 rounded-xl font-bold text-sm transition-colors hover:bg-indigo-50 text-indigo-600"
          >
            AI Tutor
          </button>
          <button 
            onClick={() => setCurrentView('review')}
            className="px-6 py-2 rounded-xl font-bold text-sm transition-colors hover:bg-indigo-50 text-indigo-600"
          >
            Review
          </button>
        </div>
      )}
    </div>
  );
}

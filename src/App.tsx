import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Auth } from './components/Auth';
import { InterpretationDashboard } from './components/InterpretationDashboard';
import { InterpretationHome } from './components/InterpretationHome';
import { InterpreterSession } from './components/InterpreterSession';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LanguageProvider } from './contexts/LanguageContext';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInterpreter, setShowInterpreter] = useState(false);
  const [showLearning, setShowLearning] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <LanguageProvider>
        {!user ? (
          <Auth />
        ) : showLearning ? (
          <InterpretationDashboard 
            onStartInterpretation={() => {
              setShowLearning(false);
              setShowInterpreter(true);
            }} 
          />
        ) : (
          <>
            <InterpretationHome 
              onStartInterpretation={() => setShowInterpreter(true)}
              onShowLearning={() => setShowLearning(true)}
            />
            {showInterpreter && (
              <InterpreterSession 
                onClose={() => {
                  setShowInterpreter(false);
                }} 
              />
            )}
          </>
        )}
      </LanguageProvider>
    </ErrorBoundary>
  );
}

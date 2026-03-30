import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSwitch } from './LanguageSwitch';

export function Auth() {
  const { t } = useLanguage();
  const handleLogin = async () => {
    try {
      // Add Google Drive scope to access NotebookLM files stored in Drive
      googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
      googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
      googleProvider.setCustomParameters({
        prompt: 'consent'
      });
      
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Extract and store Google Drive access token
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        localStorage.setItem('gdrive_token', token);
        // Token typically expires in 1 hour (3600 seconds)
        localStorage.setItem('gdrive_token_expires', (Date.now() + 3500 * 1000).toString());
      }
      
      // Check if user profile exists
      const userRef = doc(db, 'users', user.uid);
      try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            displayName: user.displayName || 'Learner',
            email: user.email || '',
            photoURL: user.photoURL || '',
            level: 1,
            createdAt: serverTimestamp(),
            lastActiveAt: serverTimestamp()
          });
        } else {
          await setDoc(userRef, {
            uid: user.uid,
            displayName: user.displayName || 'Learner',
            email: user.email || '',
            photoURL: user.photoURL || '',
            lastActiveAt: serverTimestamp()
          }, { merge: true });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request') {
        console.log('Login popup was closed by the user.');
      } else {
        console.error('Login failed:', error);
        alert(t('auth.loginFailed'));
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitch />
      </div>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🗣️</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('app.title')}</h1>
        <p className="text-gray-500 mb-8">{t('app.subtitle')}</p>
        
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          {t('auth.login')}
        </button>
      </div>
    </div>
  );
}

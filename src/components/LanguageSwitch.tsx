import { useLanguage, Language, languageNames } from '../contexts/LanguageContext';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { error as loggerError } from '../lib/logger';

export function LanguageSwitch() {
  const { sourceLanguage, targetLanguage, setSourceLanguage, setTargetLanguage } = useLanguage();

  const handleSourceLanguageChange = async (newLang: Language) => {
    setSourceLanguage(newLang);
    if (auth.currentUser) {
      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        await setDoc(userRef, {
          nativeLanguage: newLang
        }, { merge: true });
      } catch (error) {
        loggerError("Failed to update language preference:", error instanceof Error ? error.message : 'Unknown error');
      }
    }
  };

  return (
    <div className="flex gap-2">
      <select
        value={sourceLanguage}
        onChange={(e) => handleSourceLanguageChange(e.target.value as Language)}
        className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block px-2 py-1 outline-none cursor-pointer hover:bg-gray-50 transition-colors"
      >
        {Object.entries(languageNames).map(([code, name]) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
      <select
        value={targetLanguage}
        onChange={(e) => setTargetLanguage(e.target.value as Language)}
        className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block px-2 py-1 outline-none cursor-pointer hover:bg-gray-50 transition-colors"
      >
        {Object.entries(languageNames).map(([code, name]) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
    </div>
  );
}

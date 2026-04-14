import { Mic, BookOpen, Settings, LogOut } from 'lucide-react';
import { auth } from '../firebase';
import { LanguageSwitch } from './LanguageSwitch';
import { useState } from 'react';
import { SettingsModal } from './SettingsModal';
import { useLanguage } from '../contexts/LanguageContext';

interface InterpretationHomeProps {
  onStartInterpretation: () => void;
  onShowLearning: () => void;
}

export function InterpretationHome({ onStartInterpretation, onShowLearning }: InterpretationHomeProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] flex flex-col font-sans">
      <header className="border-b border-[#141414] p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="font-serif italic text-sm uppercase tracking-wider">{t("app.title")}</h1>
          <div className="flex items-center gap-4">
            <LanguageSwitch />
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="col-header hover:text-white hover:bg-[#141414] p-2 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => auth.signOut()}
              className="col-header hover:text-white hover:bg-[#141414] p-2 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-12">
        <button
          onClick={onStartInterpretation}
          className="group w-full max-w-sm aspect-square border-2 border-[#141414] flex flex-col items-center justify-center gap-4 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] transition-all hover:bg-[#141414] hover:text-[#E4E3E0]"
        >
          <Mic className="w-24 h-24" />
          <span className="font-mono text-2xl font-bold tracking-tighter uppercase">{t("interpreter.start")}</span>
        </button>

        <button
          onClick={onShowLearning}
          className="flex items-center gap-3 font-mono text-sm uppercase tracking-widest hover:underline"
        >
          <BookOpen className="w-5 h-5" />
          {t("dash.goToLearning")}
        </button>
      </main>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

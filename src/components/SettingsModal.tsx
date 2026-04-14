import React from 'react';
import { X } from 'lucide-react';
import { useLanguage, languageNames } from '../contexts/LanguageContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { uiLanguage, setUiLanguage, t } = useLanguage();
  const [speed, setSpeed] = React.useState(parseInt(localStorage.getItem('translationSpeed') || '3'));

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseInt(e.target.value);
    setSpeed(newSpeed);
    localStorage.setItem('translationSpeed', newSpeed.toString());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{t('dash.settings')}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('dash.uiLanguage')}</label>
          <select
            value={uiLanguage}
            onChange={(e) => setUiLanguage(e.target.value as any)}
            className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none cursor-pointer"
          >
            {Object.entries(languageNames).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Translation Aggressiveness</label>
          <input
            type="range"
            min="1"
            max="5"
            value={speed}
            onChange={handleSpeedChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Precise</span>
            <span>Ultra-fast</span>
          </div>
        </div>
      </div>
    </div>
  );
}

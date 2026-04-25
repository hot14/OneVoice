
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Trash2, 
  Languages, 
  Calendar, 
  Clock,
  User,
  Share2,
  MoreVertical
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getHistoryItem, deleteHistoryItem, HistoryItem } from '../services/historyService';

export default function HistoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    if (id) {
      const data = getHistoryItem(id);
      if (data) setItem(data);
      else navigate('/history');
    }
  }, [id, navigate]);

  if (!item) return null;

  const handleDelete = () => {
    if (confirm('정말로 이 기록을 삭제할까요?')) {
      deleteHistoryItem(item.id);
      navigate('/history');
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-surface-variant rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-on-surface" />
            </button>
            <div>
              <h1 className="font-bold text-xl text-on-surface">{item.langs}</h1>
              <p className="text-xs text-on-surface-variant font-medium uppercase tracking-widest">{item.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-surface-variant rounded-full transition-colors"><Share2 className="w-5 h-5 text-on-surface-variant" /></button>
            <button onClick={handleDelete} className="p-2 hover:bg-red-50 rounded-full transition-colors text-red-500"><Trash2 className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-surface-variant rounded-full transition-colors"><MoreVertical className="w-5 h-5 text-on-surface-variant" /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 space-y-8">
        <section className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm">
          <h2 className="font-bold text-sm text-primary uppercase tracking-widest mb-4">대화 요약 (Summary)</h2>
          <p className="text-on-surface font-medium leading-relaxed italic text-lg">
            "{item.summary}"
          </p>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-primary rounded-full"></div>
            <h2 className="font-bold text-xl text-on-surface">전체 스크립트</h2>
          </div>

          <div className="space-y-4">
            {item.script.map((line, idx) => (
              <div 
                key={line.id || idx}
                className={`flex flex-col ${line.isUser ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[85%] md:max-w-[70%] rounded-3xl p-5 ${line.isUser ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'}`}>
                  {line.originalText && (
                    <p className={`text-xs font-bold mb-2 opacity-70 uppercase tracking-widest`}>
                      {line.speakerLabel}
                    </p>
                  )}
                  {line.originalText && (
                    <p className="text-sm font-medium mb-3 opacity-90 border-b border-current/20 pb-2">{line.originalText}</p>
                  )}
                  <p className="text-lg font-bold leading-tight">{line.translatedText}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

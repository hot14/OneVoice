
import { useNavigate } from 'react-router-dom';
import { 
  History as HistoryIcon, 
  ChevronRight, 
  Languages, 
  Calendar,
  Trash2,
  Search
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getHistory, HistoryItem, deleteHistoryItem } from '../services/historyService';
import { useTranslation } from 'react-i18next';

export default function History() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setItems(getHistory());
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('이 기록을 삭제하시겠습니까?')) {
      deleteHistoryItem(id);
      setItems(getHistory());
    }
  };

  const filteredItems = items.filter(item => 
    item.langs.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pt-6 pb-[104px] px-6 lg:px-8 max-w-4xl mx-auto w-full min-h-screen">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="font-bold text-3xl text-on-surface tracking-tight mb-1">{t('homePage.history')}</h1>
          <p className="text-on-surface-variant font-medium">관리 및 검토를 위한 모든 번역 기록입니다.</p>
        </div>
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <HistoryIcon className="w-6 h-6" />
        </div>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-outline-variant" />
        </div>
        <input 
          type="text" 
          placeholder="언어 또는 내용으로 검색..." 
          className="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filteredItems.length > 0 ? filteredItems.map((item) => (
          <div 
            key={item.id}
            onClick={() => navigate(`/history/${item.id}`)}
            className="bg-surface hover:bg-surface-container-low border border-outline-variant/30 rounded-2xl p-5 flex items-center justify-between group transition-all cursor-pointer hover:shadow-md"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-surface-variant rounded-2xl flex items-center justify-center text-on-surface-variant group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                <Languages className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-bold text-lg text-on-surface">{item.langs}</p>
                  <span className="px-2 py-0.5 bg-surface-variant text-[10px] uppercase font-bold tracking-wider rounded-md text-on-surface-variant">Translate</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-on-surface-variant/70 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {item.date}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => handleDelete(e, item.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-outline-variant hover:text-red-500 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <ChevronRight className="w-5 h-5 text-outline-variant group-hover:text-on-surface transition-colors" />
            </div>
          </div>
        )) : (
          <div className="text-center py-20 bg-surface-container-lowest border border-dashed border-outline-variant/50 rounded-3xl">
            <div className="w-16 h-16 bg-surface-dim rounded-full flex items-center justify-center mx-auto mb-4">
              <HistoryIcon className="w-8 h-8 text-outline-variant" />
            </div>
            <p className="font-bold text-on-surface mb-1">기록이 없습니다</p>
            <p className="text-sm text-on-surface-variant">아직 진행한 대화 세션이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

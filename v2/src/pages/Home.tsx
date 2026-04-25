import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, ArrowRight, BookOpen, Clock, ChevronRight, AudioWaveform, Activity, BarChart3, Globe2, ShieldCheck } from 'lucide-react';
import { PretextWrap } from '../components/PretextWrap';
import { useTranslation } from 'react-i18next';
import { getHistory, HistoryItem } from '../services/historyService';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const history = getHistory();
    setRecentHistory(history.slice(0, 3));
  }, []);

  return (
    <div className="pt-8 pb-24 px-6 lg:px-8 max-w-7xl mx-auto w-full font-['Public_Sans']">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <PretextWrap 
            text="Welcome back,"
            as="p"
            className="text-primary font-bold tracking-[0.1em] text-sm uppercase mb-1"
          />
          <PretextWrap 
            text="Your AI Dashboard"
            as="h1"
            className="font-black text-4xl md:text-5xl text-on-surface leading-tight tracking-tight"
          />
        </div>
        <div className="flex items-center gap-3 bg-surface-container-high p-4 rounded-3xl border border-outline-variant/30 shadow-sm">
          <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Plan Status</p>
            <p className="text-sm font-black text-on-surface">Pro Subscription</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Usage Stats Summary - Left (Col 8) */}
        <div className="md:col-span-8 flex flex-col gap-8">
          
          {/* Main Action Banner */}
          <div 
            onClick={() => navigate('/translate')}
            className="group cursor-pointer bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden shadow-2xl hover:shadow-primary/20 transition-all duration-500 hover:-translate-y-2"
          >
            {/* Visual Background Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-container/40 rounded-full blur-3xl -translate-x-1/4 translate-y-1/4 group-hover:scale-125 transition-transform duration-1000"></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-center gap-2 mb-8">
                <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
                  <span className="text-white font-black text-xs tracking-widest uppercase">Live Translation</span>
                </div>
                <div className="flex -space-x-2">
                   {[1,2,3].map(i => (
                     <div key={i} className="w-8 h-8 rounded-full border-2 border-primary bg-primary/30 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold text-white">
                        {i === 1 ? 'EN' : i === 2 ? 'KO' : 'JA'}
                     </div>
                   ))}
                </div>
              </div>
              
              <div>
                <PretextWrap text={t('homePage.faceToFace')} as="h2" className="font-black text-4xl md:text-5xl mb-3 text-white tracking-tighter" />
                <p className="text-xl text-white/70 font-medium mb-10 max-w-sm">Experience the future of real-time multi-language interpreting.</p>
                
                <div className="flex flex-wrap gap-4">
                  <button className="bg-white text-primary font-black text-base py-4 px-8 rounded-2xl inline-flex items-center gap-3 hover:bg-surface-bright active:scale-95 transition-all shadow-xl group/btn">
                    <Mic className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                    Launch Live Interp
                  </button>
                  <button className="bg-primary-container/20 backdrop-blur-md border border-white/20 text-white font-bold text-base py-4 px-6 rounded-2xl inline-flex items-center gap-3 hover:bg-white/10 transition-all">
                    Tutorial
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Statistics Section */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-[2.5rem] p-8 md:p-10 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-secondary/10 rounded-2xl text-secondary">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="font-black text-2xl text-on-surface tracking-tight">Usage Statistics</h3>
              </div>
              <button className="text-sm font-bold text-primary px-4 py-2 bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors">
                This Week
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Minutes Used', value: '1,240', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: 'Sessions', value: '42', icon: Activity, color: 'text-green-500', bg: 'bg-green-50' },
                { label: 'Words Processed', value: '128K', icon: Globe2, color: 'text-purple-500', bg: 'bg-purple-50' },
                { label: 'Accuracy', value: '98.2%', icon: ShieldCheck, color: 'text-orange-500', bg: 'bg-orange-50' },
              ].map((stat, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-5 rounded-3xl border border-surface-variant/50 hover:bg-surface-container-low transition-colors duration-300">
                  <div className={`p-2 w-fit rounded-xl ${stat.bg} ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{stat.label}</p>
                  <p className="text-2xl font-black text-on-surface">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info Cards - Right (Col 4) */}
        <div className="md:col-span-4 flex flex-col gap-8">
          
          {/* Guide Card */}
          <div 
            onClick={() => navigate('/guide')}
            className="flex-1 bg-surface-container-high border border-outline-variant/30 rounded-[2.5rem] p-8 flex flex-col justify-between group cursor-pointer hover:border-primary/50 hover:bg-surface-variant transition-all duration-300"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-[1.75rem] flex items-center justify-center text-primary mb-12 group-hover:bg-primary group-hover:text-on-primary group-hover:rotate-6 transition-all duration-500">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h2 className="font-black text-2xl text-on-surface mb-3 tracking-tight">{t('homePage.culturalGuide')}</h2>
              <p className="text-base text-on-surface-variant font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">Master cross-cultural etiquette with our integrated AI intelligence system.</p>
              <div className="mt-8 flex items-center gap-2 text-primary font-black text-sm uppercase tracking-widest">
                Explore Guides <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </div>

          {/* Recent History Card */}
          <div className="flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded-[2.5rem] p-8 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-8 border-b border-surface-variant/50 pb-4">
               <div className="flex items-center gap-2">
                 <Clock className="w-5 h-5 text-primary" />
                 <h3 className="font-black text-lg text-on-surface italic">Activity Log</h3>
               </div>
               <button 
                onClick={() => navigate('/history')}
                className="p-2 hover:bg-surface-container-low rounded-xl text-outline-variant hover:text-primary transition-all"
               >
                 <ArrowRight className="w-5 h-5" />
               </button>
            </div>

            <div className="flex flex-col gap-3">
              {recentHistory.length > 0 ? recentHistory.map(item => (
                <div 
                  key={item.id}
                  onClick={() => navigate(`/history/${item.id}`)}
                  className="flex items-center gap-4 p-4 hover:bg-surface-container-low rounded-2xl transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center text-primary border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <AudioWaveform className="w-6 h-6" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-black text-sm text-on-surface truncate tracking-tight">{item.langs}</p>
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">{item.date}</p>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center p-8 opacity-30 text-center">
                   <Activity className="w-8 h-8 mb-2" />
                   <p className="text-xs font-bold">No active history</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, HelpCircle, Volume2, SplitSquareHorizontal, Smartphone, ChevronRight, LogOut, User as UserIcon, MonitorSmartphone, Languages, Info, ExternalLink, X, Check } from 'lucide-react';
import { PretextWrap } from '../components/PretextWrap';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const renderModal = () => {
    if (!activeModal) return null;

    const modalConfig: Record<string, { title: string; content: ReactNode }> = {
      voice: {
        title: '음성 출력 설정',
        content: (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-black text-on-surface mb-3 uppercase tracking-widest">목소리 선택</p>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-4 bg-primary text-white rounded-2xl font-black text-sm flex items-center justify-between">
                  남성 (민성) <Check className="w-4 h-4" />
                </button>
                <button className="p-4 bg-surface-container hover:bg-surface-variant rounded-2xl font-black text-sm text-on-surface transition-colors">
                  여성 (서연)
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm font-black text-on-surface mb-3 uppercase tracking-widest">말하기 속도</p>
              <input type="range" className="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary" />
              <div className="flex justify-between mt-2 text-xs font-bold text-on-surface-variant">
                <span>느리게</span>
                <span>보통</span>
                <span>빠르게</span>
              </div>
            </div>
          </div>
        )
      },
      offline: {
        title: '오프라인 언어팩',
        content: (
          <div className="space-y-4">
            <div className="p-4 border border-outline-variant/30 rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-black text-sm text-on-surface">한국어 - 영어</p>
                <p className="text-xs font-bold text-on-surface-variant/70">85.4 MB</p>
              </div>
              <button className="text-xs font-black text-primary px-3 py-1.5 bg-primary/10 rounded-lg">다운로드됨</button>
            </div>
            <div className="p-4 border border-outline-variant/30 rounded-2xl flex items-center justify-between opacity-60">
              <div>
                <p className="font-black text-sm text-on-surface">한국어 - 일본어</p>
                <p className="text-xs font-bold text-on-surface-variant/70">102.1 MB</p>
              </div>
              <button className="text-xs font-black text-on-surface px-3 py-1.5 bg-surface-container rounded-lg">다운로드</button>
            </div>
          </div>
        )
      },
      help: {
        title: '도움말 및 지원',
        content: (
          <div className="space-y-2">
            <button className="w-full p-4 hover:bg-surface-container rounded-2xl text-left flex items-center justify-between group">
              <span className="font-bold text-on-surface">자주 묻는 질문 (FAQ)</span>
              <ChevronRight className="w-5 h-5 text-outline-variant group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full p-4 hover:bg-surface-container rounded-2xl text-left flex items-center justify-between group">
              <span className="font-bold text-on-surface">1:1 실시간 채팅 접수</span>
              <ChevronRight className="w-5 h-5 text-outline-variant group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full p-4 hover:bg-surface-container rounded-2xl text-left flex items-center justify-between group">
              <span className="font-bold text-on-surface">이용 가이드 보기</span>
              <ChevronRight className="w-5 h-5 text-outline-variant group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )
      }
    };

    const config = modalConfig[activeModal];

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className="p-8 border-b border-surface-variant/40 flex items-center justify-between">
            <h2 className="font-black text-2xl text-on-surface tracking-tight">{config.title}</h2>
            <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
              <X className="w-6 h-6 text-on-surface-variant" />
            </button>
          </div>
          <div className="p-8">
            {config.content}
          </div>
          <div className="p-6 bg-surface-container-low flex justify-end">
             <button onClick={() => setActiveModal(null)} className="px-8 py-3 bg-primary text-white font-black text-sm rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                완료
             </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="px-6 py-10 md:py-16 pb-28 mb-20 md:mb-0 w-full max-w-5xl mx-auto font-['Public_Sans']">
      {renderModal()}
      <div className="mb-14 border-b border-surface-variant/50 pb-8">
        <PretextWrap 
          text="애플리케이션 설정"
          as="h1"
          className="text-4xl sm:text-5xl font-black text-on-surface mb-3 tracking-tighter"
        />
        <PretextWrap 
          text="개인화된 환경설정 및 시스템 옵션을 관리합니다."
          as="p"
          className="text-lg text-on-surface-variant font-medium opacity-80"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        
        {/* Left Aspect: User Profile Summary */}
        <div className="md:col-span-4">
          <div className="sticky top-24 space-y-6">
            <section className="bg-surface-container-low border border-outline-variant/30 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-primary text-on-primary rounded-[2rem] flex items-center justify-center mb-6 shadow-xl ring-8 ring-primary/5">
                  <UserIcon className="w-10 h-10" />
                </div>
                <h3 className="font-black text-2xl text-on-surface tracking-tight mb-1">사용자 이름</h3>
                <p className="text-base font-bold text-on-surface-variant/70 mb-8">Premium Plan</p>
                
                <div className="w-full space-y-3">
                  <button className="w-full py-4 px-4 bg-white border border-outline-variant/40 rounded-2xl font-black text-sm text-on-surface hover:bg-surface-container-high transition-all flex items-center justify-center gap-2">
                    프로필 수정
                  </button>
                  <button 
                    onClick={() => navigate('/login')}
                    className="w-full py-4 px-4 bg-error/5 text-error font-black text-sm rounded-2xl hover:bg-error/10 transition-all flex items-center justify-center gap-2"
                  >
                    로그아웃 <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>

            <section className="bg-primary/5 border border-primary/10 rounded-[2rem] p-6">
               <div className="flex items-center gap-3 mb-4">
                 <Info className="w-5 h-5 text-primary" />
                 <h4 className="font-black text-sm text-primary uppercase tracking-widest">Tip</h4>
               </div>
               <p className="text-sm font-bold text-on-surface-variant leading-relaxed">자주 사용하는 언어 조합은 대시보드에서 바로 시작할 수 있습니다.</p>
            </section>
          </div>
        </div>

        {/* Right Aspect: Detailed Settings */}
        <div className="md:col-span-8 flex flex-col gap-10">
          
          {/* Interface Section */}
          <section className="bg-white border border-outline-variant/30 rounded-[2.5rem] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="flex items-center gap-3 mb-10 pb-6 border-b border-surface-variant/40">
              <div className="p-3 bg-secondary/10 rounded-2xl text-secondary">
                <MonitorSmartphone className="w-6 h-6" />
              </div>
              <h2 className="font-black text-2xl text-on-surface tracking-tight">인터페이스 설정</h2>
            </div>

            <div className="space-y-12">
              {/* Language Selection */}
              <div>
                <div className="flex items-center justify-between mb-6">
                   <div>
                     <h3 className="font-black text-lg text-on-surface tracking-tight">표시 언어</h3>
                     <p className="text-sm font-bold text-on-surface-variant/70 italic">앱 인터페이스 전체의 언어를 선택합니다.</p>
                   </div>
                   <Languages className="w-6 h-6 text-outline-variant" />
                </div>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'ko', label: '한국어' },
                    { id: 'en', label: 'English' },
                    { id: 'ja', label: '日本語' }
                  ].map(lang => (
                    <button 
                      key={lang.id}
                      onClick={() => handleLanguageChange(lang.id)}
                      className={`px-6 py-3 rounded-2xl text-sm font-black transition-all ${i18n.language === lang.id ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-surface-container hover:bg-surface-variant text-on-surface border border-outline-variant/20'}`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout Mode */}
              <div className="pt-10 border-t border-surface-variant/40">
                <div className="mb-8">
                  <h3 className="font-black text-lg text-on-surface tracking-tight mb-1">화면 레이아웃</h3>
                  <p className="text-sm font-bold text-on-surface-variant/70 italic">통역 시 대화창의 배치 방식을 선택합니다.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="cursor-pointer">
                    <input className="peer sr-only" name="screen_mode" type="radio" />
                    <div className="border border-outline-variant/30 rounded-[2rem] p-6 flex flex-col gap-4 peer-checked:border-primary peer-checked:bg-primary/[0.03] hover:bg-surface-container-low transition-all">
                      <div className="flex items-center justify-between">
                         <div className="p-2 bg-surface-variant rounded-xl peer-checked:bg-primary/10">
                            <SplitSquareHorizontal className="w-6 h-6 text-on-surface-variant transition-colors" />
                         </div>
                         <div className="w-6 h-6 rounded-full border-2 border-outline-variant/40 flex items-center justify-center p-1">
                            <div className="w-full h-full rounded-full bg-primary opacity-0 transition-opacity"></div>
                         </div>
                      </div>
                      <div>
                        <div className="font-black text-lg text-on-surface">분할 화면</div>
                        <div className="text-xs font-bold text-on-surface-variant/60">마주보고 대화할 때 최적화</div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="cursor-pointer">
                    <input className="peer sr-only" name="screen_mode" type="radio" defaultChecked />
                    <div className="border border-primary bg-primary/[0.03] rounded-[2rem] p-6 flex flex-col gap-4 hover:bg-primary/[0.05] transition-all">
                      <div className="flex items-center justify-between">
                         <div className="p-2 bg-primary/10 rounded-xl">
                            <Smartphone className="w-6 h-6 text-primary" />
                         </div>
                         <div className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center p-1">
                            <div className="w-full h-full rounded-full bg-primary opacity-100"></div>
                         </div>
                      </div>
                      <div>
                        <div className="font-black text-lg text-on-surface">단일 화면</div>
                        <div className="text-xs font-bold text-on-surface-variant/60">개인 학습 및 모니터링 모드</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Functional Menus */}
          <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="divide-y divide-surface-variant/40">
              {[
                { label: '음성 출력 설정', icon: Volume2, detail: 'AI 음성 속도 및 성별 선택', id: 'voice' },
                { label: '오프라인 언어팩', icon: Download, detail: '인터넷 없이도 통역 가능', id: 'offline' },
                { label: '도움말 및 지원', icon: HelpCircle, detail: '자주 묻는 질문 및 1:1 문의', id: 'help' }
              ].map((item, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveModal(item.id)}
                  className="w-full flex items-center justify-between p-8 hover:bg-surface-container-low transition-all text-left group"
                >
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-surface-variant rounded-2xl group-hover:bg-primary/10 transition-colors">
                       <item.icon className="w-6 h-6 text-outline-variant group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <span className="font-black text-lg text-on-surface block mb-0.5 tracking-tight">{item.label}</span>
                      <span className="text-xs font-bold text-on-surface-variant/60">{item.detail}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-outline-variant group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </section>

          {/* External Links */}
          <section className="flex gap-4">
             <button className="flex-1 p-6 bg-surface-container-low border border-outline-variant/20 rounded-3xl flex items-center justify-between group hover:bg-surface-variant transition-colors">
                <span className="text-sm font-black text-on-surface">이용 약관</span>
                <ExternalLink className="w-4 h-4 text-outline-variant group-hover:text-on-surface" />
             </button>
             <button className="flex-1 p-6 bg-surface-container-low border border-outline-variant/20 rounded-3xl flex items-center justify-between group hover:bg-surface-variant transition-colors">
                <span className="text-sm font-black text-on-surface">개인정보 처리방침</span>
                <ExternalLink className="w-4 h-4 text-outline-variant group-hover:text-on-surface" />
             </button>
          </section>
        </div>
      </div>
    </div>
  );
}

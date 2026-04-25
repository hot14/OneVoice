import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Languages, History, BookOpen, Settings, Maximize, Minimize, AudioWaveform } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const pathname = location.pathname;

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dispatch custom event for Translate component to know fullscreen state
  useEffect(() => {
    const event = new CustomEvent('fullscreen-change', { detail: { isFullscreen } });
    window.dispatchEvent(event);
  }, [isFullscreen]);

  const isTranslateApp = pathname === '/';
  const isHistoryDetail = pathname.startsWith('/history/') && pathname !== '/history';
  const isSubscription = pathname === '/subscription';
  
  const showBottomNav = !isHistoryDetail && !isSubscription && !isFullscreen;
  const showTopNav = !isFullscreen;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Dynamic Top App Bar */}
      {showTopNav && (
        isHistoryDetail || isSubscription ? (
          <header className="bg-surface-container-lowest border-b border-surface-variant sticky top-0 z-50 flex items-center px-4 md:px-6 h-16 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <button 
              onClick={() => navigate(-1)}
              aria-label="Go back" 
              className="p-2 -ml-2 text-on-surface hover:bg-surface-container-low rounded-full transition-colors flex items-center justify-center mr-3"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            {isHistoryDetail ? (
               <div className="flex-1">
                 <h1 className="font-headline-md text-xl md:text-2xl text-on-surface font-semibold leading-tight">Session</h1>
                 <p className="font-body-md text-sm text-outline">Interpretation Session</p>
               </div>
            ) : (
              <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-lg">
                <AudioWaveform className="w-5 h-5 text-primary" />
              </div>
              <span className="font-['Public_Sans'] text-lg font-semibold tracking-tight text-primary">OneVoice</span>
              </div>
            )}
            {isHistoryDetail && (
              <div className="ml-auto flex gap-2">
                <button aria-label="Share transcript" className="p-2 text-primary hover:bg-surface-container-low rounded-full transition-colors">
                  <span className="material-symbols-outlined">ios_share</span>
                </button>
                <button aria-label="More options" className="p-2 text-outline hover:bg-surface-container-low rounded-full transition-colors">
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>
            )}
          </header>
        ) : (
          <header className="bg-white border-b border-gray-200 flex justify-between items-center w-full px-6 h-16 md:max-w-[1200px] md:mx-auto z-40 sticky top-0">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-lg">
                <AudioWaveform className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-bold text-primary font-['Public_Sans'] tracking-normal hidden md:block">OneVoice</span>
              <div id="translate-header-controls" className="ml-2 flex items-center"></div>
            </div>
            
            <nav className="hidden md:flex items-center h-full">
              <NavLink to="/" className={({isActive}) => clsx("h-full px-4 flex items-center font-['Public_Sans'] text-base font-bold transition-colors", isActive ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:bg-gray-50")}>{t('homePage.faceToFace')}</NavLink>
              <NavLink to="/history" className={({isActive}) => clsx("h-full px-4 flex items-center font-['Public_Sans'] text-base font-bold transition-colors", isActive ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:bg-gray-50")}>{t('homePage.history')}</NavLink>
              <NavLink to="/guide" className={({isActive}) => clsx("h-full px-4 flex items-center font-['Public_Sans'] text-base font-bold transition-colors", isActive ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:bg-gray-50")}>{t('homePage.culturalGuide')}</NavLink>
              <NavLink to="/home" className={({isActive}) => clsx("h-full px-4 flex items-center font-['Public_Sans'] text-base font-bold transition-colors", isActive ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:bg-gray-50")}>{t('homePage.home')}</NavLink>
              <NavLink to="/settings" className={({isActive}) => clsx("h-full px-4 flex items-center font-['Public_Sans'] text-base font-bold transition-colors", isActive ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:bg-gray-50")}>{t('homePage.settings')}</NavLink>
            </nav>
            
            <div className="flex items-center gap-2">
               {isTranslateApp && (
                 <button 
                   onClick={() => setIsFullscreen(true)}
                   className="p-2 text-gray-500 hover:text-primary hover:bg-gray-50 rounded-full transition-colors flex items-center justify-center"
                   title="전체화면"
                 >
                   <Maximize className="w-5 h-5" />
                 </button>
               )}
            </div>
          </header>
        )
      )}

      {/* Main Content Area */}
      <main className={clsx("flex-grow flex flex-col w-full mx-auto relative", isTranslateApp ? "" : "max-w-[1200px]")}>
        <Outlet />
        
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-[200] p-3 border border-gray-200/50 bg-white/40 hover:bg-white/80 text-gray-700/80 hover:text-gray-900 rounded-full backdrop-blur-md transition-all shadow-lg"
            title="전체화면 끄기"
          >
            <Minimize className="w-5 h-5" />
          </button>
        )}
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      {showBottomNav && (
        <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-[72px] bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] px-2 pb-safe">
            <NavLink to="/" className={({isActive}) => clsx("flex flex-col items-center justify-center w-full h-full transition-transform active:opacity-70 gap-1 mt-1", isActive ? "text-primary" : "text-outline-variant hover:text-primary/70")}>
              {({ isActive }) => (
                <>
                  <div className={clsx("p-1.5 rounded-xl transition-colors", isActive ? "bg-primary/10" : "")}>
                    <Languages className={clsx("w-6 h-6", isActive ? "text-primary" : "text-outline-variant")} />
                  </div>
                  <span className="font-['Public_Sans'] text-[10px] font-bold tracking-wider">{t('homePage.faceToFace')}</span>
                </>
              )}
            </NavLink>
            <NavLink to="/history" className={({isActive}) => clsx("flex flex-col items-center justify-center w-full h-full transition-transform active:opacity-70 gap-1 mt-1", isActive ? "text-primary" : "text-outline-variant hover:text-primary/70")}>
              {({ isActive }) => (
                <>
                  <div className={clsx("p-1.5 rounded-xl transition-colors", isActive ? "bg-primary/10" : "")}>
                    <History className={clsx("w-6 h-6", isActive ? "text-primary" : "text-outline-variant")} />
                  </div>
                  <span className="font-['Public_Sans'] text-[10px] font-bold tracking-wider">{t('homePage.history')}</span>
                </>
              )}
            </NavLink>
            <NavLink to="/home" className={({isActive}) => clsx("flex flex-col items-center justify-center w-full h-full transition-transform active:opacity-70 gap-1 mt-1", isActive ? "text-primary" : "text-outline-variant hover:text-primary/70")}>
              {({ isActive }) => (
                <>
                  <div className={clsx("p-1.5 rounded-xl transition-colors", isActive ? "bg-primary/10" : "")}>
                    <span className={clsx("material-symbols-outlined text-[24px]", isActive ? "text-primary" : "text-outline-variant")}>grid_view</span>
                  </div>
                  <span className="font-['Public_Sans'] text-[10px] font-bold tracking-wider">대시보드</span>
                </>
              )}
            </NavLink>
            <NavLink to="/guide" className={({isActive}) => clsx("flex flex-col items-center justify-center w-full h-full transition-transform active:opacity-70 gap-1 mt-1", isActive ? "text-primary" : "text-outline-variant hover:text-primary/70")}>
              {({ isActive }) => (
                <>
                  <div className={clsx("p-1.5 rounded-full transition-colors", isActive ? "bg-primary/10" : "")}>
                    <BookOpen className={clsx("w-6 h-6", isActive ? "text-primary" : "text-outline-variant")} />
                  </div>
                  <span className="font-['Public_Sans'] text-[10px] font-bold tracking-wider">{t('homePage.culturalGuide')}</span>
                </>
              )}
            </NavLink>
            <NavLink to="/settings" className={({isActive}) => clsx("flex flex-col items-center justify-center w-full h-full transition-transform active:opacity-70 gap-1 mt-1", isActive ? "text-primary" : "text-outline-variant hover:text-primary/70")}>
              {({ isActive }) => (
                <>
                  <div className={clsx("p-1.5 rounded-full transition-colors", isActive ? "bg-primary/10" : "")}>
                    <Settings className={clsx("w-6 h-6", isActive ? "text-primary" : "text-outline-variant")} />
                  </div>
                  <span className="font-['Public_Sans'] text-[10px] font-bold tracking-wider">{t('homePage.settings')}</span>
                </>
              )}
            </NavLink>
        </nav>
      )}
    </div>
  );
}

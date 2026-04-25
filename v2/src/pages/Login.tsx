import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/');
  };

  return (
    <div className="bg-background text-on-background font-body-md text-body-md antialiased min-h-screen flex flex-col items-center justify-center p-6">
      {/* Login Container */}
      <main className="w-full max-w-[480px] bg-surface rounded-xl border border-outline-variant p-12 shadow-sm flex flex-col gap-12">
        
        {/* Header / Logo */}
        <header className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center text-on-primary-container mb-1">
            <span className="material-symbols-outlined text-4xl">language</span>
          </div>
          <h1 className="font-headline-lg text-4xl font-bold text-primary">OneVoice</h1>
          <p className="font-body-md text-lg text-on-surface-variant">환영합니다. 계속하시려면 로그인해주세요.</p>
        </header>

        {/* Login Form */}
        <form className="flex flex-col gap-6 w-full" onSubmit={handleLogin}>
          <div className="flex flex-col gap-1">
            <label className="font-label-lg text-base font-semibold text-on-surface" htmlFor="email">이메일 또는 아이디</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">person</span>
              <input 
                className="w-full h-12 pl-12 pr-3 rounded border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md focus:border-primary focus:ring-2 focus:ring-primary-fixed outline-none transition-all" 
                id="email" 
                placeholder="이메일 입력" 
                type="text" 
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="font-label-lg text-base font-semibold text-on-surface" htmlFor="password">비밀번호</label>
              <a className="font-label-lg text-base font-semibold text-primary hover:underline" href="#">비밀번호 찾기</a>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">lock</span>
              <input 
                className="w-full h-12 pl-12 pr-3 rounded border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md focus:border-primary focus:ring-2 focus:ring-primary-fixed outline-none transition-all" 
                id="password" 
                placeholder="비밀번호 입력" 
                type="password" 
              />
            </div>
          </div>

          <button className="w-full h-12 mt-1 bg-primary hover:bg-secondary text-on-primary font-label-lg text-base font-semibold rounded transition-colors flex items-center justify-center gap-3" type="submit">
            로그인
            <span className="material-symbols-outlined text-xl">login</span>
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-6 w-full my-3">
          <div className="h-px bg-outline-variant flex-1"></div>
          <span className="font-body-md text-on-surface-variant">또는</span>
          <div className="h-px bg-outline-variant flex-1"></div>
        </div>

        {/* Social Login */}
        <div className="flex flex-col gap-3 w-full">
          <button 
            type="button" 
            onClick={() => navigate('/')}
            className="w-full h-12 bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low text-on-surface font-label-lg text-base font-semibold rounded transition-colors flex items-center justify-center gap-3"
          >
            <img 
              alt="Google" 
              className="w-6 h-6 rounded-full" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAn_imA0oKZlPMq5ASwOlkkbdwmTUmWeBxbJ9jsy6aDHbERj0eODlAy5ru9JJXVlQcioIqbwrSnARpeivCLgE7Bd3vxljEnDxeD2ykYGoPc8Wo66nDfBXBfjXWnRIMrpKXwQYCxXBQ19TebBHL1J5OOqiiTf1rXQ-wNGgPHbEefn8C-YMaxdJxKPV0aC1da22c71r_GD4LzOTIvRzdcjxinoM403NGs3Qf4lUdsQhjls41I_D4VTzhRlASImyOW57i5fDLTH2gkSxY" 
            />
            Google로 로그인
          </button>
          <button 
            type="button"
            onClick={() => navigate('/')}
            className="w-full h-12 bg-[#03C75A] hover:bg-[#02b350] text-[#ffffff] font-label-lg text-base font-semibold rounded transition-colors flex items-center justify-center gap-3"
          >
            <span className="font-bold text-xl">N</span>
            네이버로 로그인
          </button>
          <button 
            type="button"
            onClick={() => navigate('/')}
            className="w-full h-12 bg-[#FEE500] hover:bg-[#ebd300] text-[#000000] font-label-lg text-base font-semibold rounded transition-colors flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined text-[#000000]">chat_bubble</span>
            카카오톡으로 로그인
          </button>
        </div>

        {/* Footer Links */}
        <div className="text-center mt-3">
          <span className="font-body-md text-on-surface-variant">계정이 없으신가요?</span>
          <a className="font-label-lg text-primary hover:underline ml-1" href="#">회원가입</a>
        </div>
      </main>
    </div>
  );
}

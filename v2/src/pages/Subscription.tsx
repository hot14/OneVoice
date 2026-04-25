import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, History, HeadphonesIcon, CalendarDays, InfinityIcon, Star } from 'lucide-react';
import { PretextWrap } from '../components/PretextWrap';

export default function Subscription() {
  const navigate = useNavigate();

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 md:py-16 pb-32 w-full">
      <div className="text-center mb-14 md:mb-20 flex flex-col items-center">
        <PretextWrap 
          text="이용권 선택"
          as="h1"
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-on-surface mb-4 tracking-tight"
        />
        <PretextWrap 
          text="나에게 맞는 통역 시간을 선택해보세요."
          as="p"
          className="text-lg md:text-xl text-on-surface-variant/80 font-medium max-w-lg"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-start">
        
        {/* Plan Card 1 */}
        <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/30 p-8 flex flex-col hover:border-primary/40 hover:shadow-lg transition-all duration-300 cursor-pointer group group-hover:-translate-y-1 relative">
          <div className="flex items-center justify-between mb-8">
            <span className="bg-primary/10 text-primary font-bold text-sm px-4 py-1.5 rounded-full tracking-wide">가장 저렴한</span>
            <CheckCircle2 className="text-outline-variant/50 w-6 h-6 group-hover:text-primary transition-colors" />
          </div>
          <h2 className="font-bold text-2xl text-on-surface mb-2 tracking-tight">매월 60분</h2>
          <div className="flex items-baseline gap-1 mb-8">
            <span className="font-bold text-4xl lg:text-5xl text-primary tracking-tight">₩9,900</span>
            <span className="text-lg font-medium text-on-surface-variant/70">/월</span>
          </div>
          <ul className="space-y-4 mb-10 flex-grow">
            <li className="flex items-start gap-3">
              <Clock className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-base font-medium text-on-surface">한 달 동안 총 60분 통역</span>
            </li>
            <li className="flex items-start gap-3">
              <History className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-base font-medium text-on-surface">통역 기록 무제한 보관</span>
            </li>
          </ul>
          <button 
             onClick={() => navigate('/settings')}
             className="w-full bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80 hover:text-on-surface font-bold text-base py-4 rounded-2xl transition-colors"
          >
             선택하기
          </button>
        </div>

        {/* Plan Card 2 (Recommended) */}
        <div className="bg-surface-container-lowest rounded-[2rem] border-2 border-primary p-8 flex flex-col relative shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group transform md:-translate-y-4 lg:-translate-y-6">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-on-primary font-bold text-sm px-5 py-1.5 rounded-full shadow-md whitespace-nowrap tracking-wide flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-current" /> 가장 많이 선택해요
          </div>
          <div className="flex items-center justify-between mb-8 mt-2">
            <span className="bg-secondary/10 text-secondary font-bold text-sm px-4 py-1.5 rounded-full tracking-wide">추천</span>
            <CheckCircle2 className="text-primary w-7 h-7" />
          </div>
          <h2 className="font-bold text-3xl text-on-surface mb-2 tracking-tight">매월 300분</h2>
          <div className="flex items-baseline gap-1 mb-8">
            <span className="font-bold text-4xl lg:text-5xl text-primary tracking-tight">₩29,900</span>
            <span className="text-lg font-medium text-on-surface-variant/70">/월</span>
          </div>
          <ul className="space-y-4 mb-10 flex-grow">
            <li className="flex items-start gap-3">
              <Clock className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-base font-bold text-on-surface">한 달 동안 넉넉하게 300분</span>
            </li>
            <li className="flex items-start gap-3">
              <History className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-base font-medium text-on-surface">통역 기록 무제한 보관</span>
            </li>
            <li className="flex items-start gap-3">
              <HeadphonesIcon className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-base font-medium text-on-surface">우선 연결 지원</span>
            </li>
          </ul>
          <button 
             onClick={() => navigate('/settings')}
             className="w-full bg-primary text-on-primary hover:bg-primary/90 font-bold text-lg py-4 rounded-2xl transition-all shadow-md active:scale-95"
          >
            선택하기
          </button>
        </div>

        {/* Plan Card 3 */}
        <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/30 p-8 flex flex-col hover:border-primary/40 hover:shadow-lg transition-all duration-300 cursor-pointer group group-hover:-translate-y-1 relative">
          <div className="flex items-center justify-between mb-8">
            <span className="bg-tertiary-fixed text-on-tertiary-fixed font-bold text-sm px-4 py-1.5 rounded-full tracking-wide">꾸준히 쓰는</span>
            <CheckCircle2 className="text-outline-variant/50 w-6 h-6 group-hover:text-primary transition-colors" />
          </div>
          <h2 className="font-bold text-2xl text-on-surface mb-2 tracking-tight">매일 60분</h2>
          <div className="flex items-baseline gap-1 mb-8">
            <span className="font-bold text-4xl lg:text-5xl text-primary tracking-tight">₩39,900</span>
            <span className="text-lg font-medium text-on-surface-variant/70">/월</span>
          </div>
          <ul className="space-y-4 mb-10 flex-grow">
            <li className="flex items-start gap-3">
              <CalendarDays className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-base font-medium text-on-surface">매일매일 60분 통역</span>
            </li>
            <li className="flex items-start gap-3">
              <History className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-base font-medium text-on-surface">통역 기록 무제한 보관</span>
            </li>
          </ul>
          <button 
             onClick={() => navigate('/settings')}
             className="w-full bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80 hover:text-on-surface font-bold text-base py-4 rounded-2xl transition-colors"
          >
            선택하기
          </button>
        </div>

        {/* Plan Card 4 */}
        <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/30 p-8 flex flex-col hover:border-primary/40 hover:shadow-lg transition-all duration-300 cursor-pointer group group-hover:-translate-y-1 relative lg:col-span-1.5 max-w-sm mx-auto w-full lg:max-w-none">
          <div className="flex items-center justify-between mb-8">
            <span className="bg-tertiary-fixed text-on-tertiary-fixed font-bold text-sm px-4 py-1.5 rounded-full tracking-wide">자주 쓰는</span>
            <CheckCircle2 className="text-outline-variant/50 w-6 h-6 group-hover:text-primary transition-colors" />
          </div>
          <h2 className="font-bold text-2xl text-on-surface mb-2 tracking-tight">매일 300분</h2>
          <div className="flex items-baseline gap-1 mb-8">
            <span className="font-bold text-4xl lg:text-5xl text-primary tracking-tight">₩89,900</span>
            <span className="text-lg font-medium text-on-surface-variant/70">/월</span>
          </div>
          <ul className="space-y-4 mb-10 flex-grow">
            <li className="flex items-start gap-3">
              <CalendarDays className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-base font-medium text-on-surface">매일매일 300분 통역</span>
            </li>
            <li className="flex items-start gap-3">
              <HeadphonesIcon className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-base font-medium text-on-surface">최우선 연결 지원</span>
            </li>
          </ul>
          <button 
             onClick={() => navigate('/settings')}
             className="w-full bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80 hover:text-on-surface font-bold text-base py-4 rounded-2xl transition-colors"
          >
            선택하기
          </button>
        </div>

        {/* Plan Card 5 */}
        <div className="rounded-[2rem] border border-outline-variant/30 p-8 flex flex-col hover:border-primary/40 hover:shadow-lg transition-all duration-300 cursor-pointer group group-hover:-translate-y-1 relative lg:col-start-2 lg:col-span-2 bg-gradient-to-br from-surface-container-lowest to-secondary/5 max-w-sm lg:max-w-none mx-auto w-full">
          <div className="flex items-center justify-between mb-8">
            <span className="bg-inverse-surface text-inverse-on-surface font-bold text-sm px-4 py-1.5 rounded-full tracking-wide">전문가용</span>
            <CheckCircle2 className="text-outline-variant/50 w-6 h-6 group-hover:text-primary transition-colors" />
          </div>
          <h2 className="font-bold text-2xl text-on-surface mb-2 tracking-tight">나는 무제한</h2>
          <div className="flex items-baseline gap-1 mb-8">
            <span className="font-bold text-4xl lg:text-5xl text-primary tracking-tight">₩149,900</span>
            <span className="text-lg font-medium text-on-surface-variant/70">/월</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 flex-grow mb-10">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <InfinityIcon className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span className="text-base font-medium text-on-surface">시간 제한 없는 무제한 통역</span>
              </li>
              <li className="flex items-start gap-3">
                <Star className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span className="text-base font-medium text-on-surface">모든 고급 기능 포함</span>
              </li>
            </ul>
             <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <HeadphonesIcon className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span className="text-base font-medium text-on-surface">최우선 연결 지원</span>
              </li>
              <li className="flex items-start gap-3">
                <History className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span className="text-base font-medium text-on-surface">통역 기록 무제한 보관</span>
              </li>
            </ul>
          </div>
          <button 
             onClick={() => navigate('/settings')}
             className="w-full bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80 hover:text-on-surface font-bold text-base py-4 rounded-2xl transition-colors lg:max-w-md mx-auto"
          >
            선택하기
          </button>
        </div>
      </div>
    </div>
  );
}

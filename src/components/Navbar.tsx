import React, { useState, useRef, useEffect } from 'react';
import logo10qbs from '../assets/images/logo_10qbs_1787276648773.jpg';
import { 
  Home,
  ClipboardCheck, 
  FileSpreadsheet, 
  LineChart, 
  ShoppingCart, 
  User, 
  Calendar,
  Sparkles,
  Smartphone,
  Database,
  Globe,
  Check,
  ChevronDown
} from 'lucide-react';
import { UserProfile, AppLanguage } from '../types';
import { calculateBMI, getBMICategory, formatDateDisplay, getTodayDateString, isWeekend } from '../utils/calculations';
import { SUPPORTED_LANGUAGES, translate } from '../utils/translations';

interface NavbarProps {
  activeTab: 'home' | 'questions' | 'balancesheet' | 'trend' | 'grocery' | 'profile';
  setActiveTab: (tab: 'home' | 'questions' | 'balancesheet' | 'trend' | 'grocery' | 'profile') => void;
  profile: UserProfile;
  onOpenProfile: () => void;
  onOpenQuestionBank: () => void;
  todayCompleted: boolean;
  mobileViewMode: boolean;
  setMobileViewMode: (v: boolean | ((prev: boolean) => boolean)) => void;
  currentLanguage: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  profile,
  onOpenProfile,
  onOpenQuestionBank,
  todayCompleted,
  mobileViewMode,
  setMobileViewMode,
  currentLanguage,
  onLanguageChange,
}) => {
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement | null>(null);

  const bmi = calculateBMI(profile.height, profile.weight);
  const bmiCategory = getBMICategory(bmi);
  const todayStr = getTodayDateString();
  const weekendNow = isWeekend(todayStr);

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    {
      id: 'home' as const,
      label: translate('nav.home', currentLanguage, '總覽概況'),
      icon: Home,
    },
    {
      id: 'grocery' as const,
      label: translate('nav.grocery', currentLanguage, '超市採買清單'),
      icon: ShoppingCart,
      highlight: weekendNow,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80 shadow-xs">
      {/* Top Banner: Single-Payment 30 TWD Feature & Status */}
      <div className="bg-slate-900 text-slate-100 px-4 py-1.5 text-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded text-[11px] tracking-wide">
              {translate('nav.lifetimeBadge', currentLanguage, 'NT$ 30 單次下載')}
            </span>
            <span className="text-slate-300 hidden sm:inline">
              iOS / Android 手機極簡健康管家・多語言 AI 翻譯支援
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector in top bar */}
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setIsLangMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded transition-colors text-[11px] border border-slate-700"
                title="切換多語言版本"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentLangObj.flag} {currentLangObj.nativeName}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1 z-50 text-xs">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    選擇語言 / Language
                  </div>
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = lang.code === currentLanguage;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          onLanguageChange(lang.code);
                          setIsLangMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition-colors ${
                          isSelected
                            ? 'bg-emerald-600/30 text-emerald-300 font-bold'
                            : 'text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.nativeName}</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {weekendNow && (
              <button
                onClick={() => setActiveTab('grocery')}
                className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded hover:bg-amber-500/30 transition-colors text-[11px]"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>週末備餐提醒</span>
              </button>
            )}

            <button
              onClick={() => setMobileViewMode((prev) => !prev)}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition-colors text-[11px]"
              title="切換手機擬真視窗/寬螢幕模式"
            >
              <Smartphone className="w-3 h-3" />
              <span>{mobileViewMode ? '展開寬版' : '手機版型'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header Container */}
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Brand Identity with 10QBS Image Logo */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 p-1 rounded-2xl hover:bg-slate-100/80 transition-all text-left group"
          title="返回 10QBS 最新結餘首頁"
        >
          <img
            src={logo10qbs}
            alt="10QBS"
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl shadow-xs object-cover border border-amber-200/60 ring-2 ring-amber-400/20 group-hover:scale-105 transition-transform"
            referrerPolicy="no-referrer"
          />
          <span className="text-sm sm:text-base font-black text-slate-800 tracking-tight leading-tight">
            {formatDateDisplay(todayStr)}
          </span>
        </button>

        {/* Right: Dedicated '圖' (Trends) & '帳號' (Account) & Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Dedicated '圖' Button - Opens Weight / Assets / Liabilities Trend Analysis */}
          <button
            type="button"
            onClick={() => setActiveTab('trend')}
            id="nav-trend-chart-btn"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-bold shadow-2xs group ${
              activeTab === 'trend'
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 hover:border-purple-300'
            }`}
            title="點擊查看 體重 / 資產 / 負債 綜合趨勢圖"
          >
            <LineChart className={`w-4 h-4 transition-transform group-hover:scale-110 ${activeTab === 'trend' ? 'text-white' : 'text-purple-600'}`} />
            <span className="font-black text-xs tracking-wide">圖</span>
            <span className="hidden md:inline text-[10px] opacity-80">(趨勢分析)</span>
          </button>

          {/* Question Bank Manager & Expansion Market Button */}
          <button
            type="button"
            onClick={onOpenQuestionBank}
            id="open-question-bank-btn"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-all text-xs font-bold shadow-2xs group"
            title="題庫管理、自訂題目、CSV匯入與AI智慧翻譯"
          >
            <Database className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">{translate('nav.questionBank', currentLanguage, '題庫')}</span>
          </button>

          {/* Dedicated '帳號' (Account/Profile) Button */}
          <button
            type="button"
            onClick={onOpenProfile}
            id="open-profile-btn"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 transition-all text-left group shadow-2xs"
            title="點擊管理個人帳號、體重目標、定時提醒與多語言"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-200/80 group-hover:bg-emerald-100 text-slate-700 group-hover:text-emerald-700 flex items-center justify-center transition-colors">
              <User className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-slate-800 tracking-tight">帳號</span>
                <span className="hidden sm:inline text-[10px] text-slate-500 font-semibold truncate max-w-[60px]">{profile.name}</span>
              </div>
              <span className="hidden sm:inline text-[9px] text-slate-400 font-mono leading-none">{profile.weight}kg</span>
            </div>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Desktop & Mobile Segmented Control) */}
      <nav className="max-w-6xl mx-auto px-4 pb-2">
        <div className="flex items-center gap-1 sm:gap-2 p-1 bg-slate-100/90 rounded-xl overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-1 min-w-[120px] sm:min-w-0 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                } ${item.highlight && !isActive ? 'ring-1 ring-amber-400 bg-amber-50/60 text-amber-900' : ''}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.highlight && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse absolute top-1.5 right-2" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};

import React from 'react';
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
  Database
} from 'lucide-react';
import { UserProfile } from '../types';
import { calculateBMI, getBMICategory, formatDateDisplay, getTodayDateString, isWeekend } from '../utils/calculations';

interface NavbarProps {
  activeTab: 'home' | 'questions' | 'balancesheet' | 'trend' | 'grocery' | 'profile';
  setActiveTab: (tab: 'home' | 'questions' | 'balancesheet' | 'trend' | 'grocery' | 'profile') => void;
  profile: UserProfile;
  onOpenProfile: () => void;
  onOpenQuestionBank: () => void;
  todayCompleted: boolean;
  mobileViewMode: boolean;
  setMobileViewMode: (v: boolean | ((prev: boolean) => boolean)) => void;
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
}) => {
  const bmi = calculateBMI(profile.height, profile.weight);
  const bmiCategory = getBMICategory(bmi);
  const todayStr = getTodayDateString();
  const weekendNow = isWeekend(todayStr);

  const navItems = [
    {
      id: 'home' as const,
      label: '首頁總覽',
      sublabel: '最新資產負債',
      icon: Home,
    },
    {
      id: 'questions' as const,
      label: '今日10題',
      sublabel: todayCompleted ? '已完成打卡' : '進行中',
      icon: ClipboardCheck,
      badge: todayCompleted ? '✓' : '10題',
      badgeColor: todayCompleted ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white',
    },
    {
      id: 'balancesheet' as const,
      label: '詳細報表',
      sublabel: '健康損益分析',
      icon: FileSpreadsheet,
    },
    {
      id: 'trend' as const,
      label: '趨勢圖表',
      sublabel: '體重VS資產負債',
      icon: LineChart,
    },
    {
      id: 'grocery' as const,
      label: '週末超市菜單',
      sublabel: '一週採買規劃',
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
              NT$ 30 單次下載
            </span>
            <span className="text-slate-300 hidden sm:inline">
              iOS / Android 手機極簡健康管家・終身純淨無訂閱
            </span>
          </div>

          <div className="flex items-center gap-3">
            {weekendNow && (
              <button
                onClick={() => setActiveTab('grocery')}
                className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded hover:bg-amber-500/30 transition-colors text-[11px]"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>週末備餐提醒：前往採買清單</span>
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
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-500/20">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                健康資產負債表
              </h1>
              <span className="text-[11px] font-medium bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                每日10題
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{formatDateDisplay(todayStr)}</span>
            </p>
          </div>
        </div>

        {/* Right: Quick Actions & Profile Capsule */}
        <div className="flex items-center gap-2">
          {/* Question Bank Manager & Expansion Market Button */}
          <button
            onClick={onOpenQuestionBank}
            id="open-question-bank-btn"
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-all text-xs font-bold shadow-2xs group"
            title="題庫管理、自訂題目與每次50題付費10元擴充包"
          >
            <Database className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">題庫擴充</span>
            <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              +50題
            </span>
          </button>

          <button
            onClick={onOpenProfile}
            id="open-profile-btn"
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-700 flex items-center justify-center transition-colors">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-800">{profile.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${bmiCategory.bgColor} ${bmiCategory.textColor}`}>
                  BMI {bmi}・{bmiCategory.label}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                {profile.height}cm / {profile.weight}kg
                {profile.bodyFat ? ` / 體脂 ${profile.bodyFat}%` : ''}
              </div>
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
                className={`flex-1 min-w-[76px] sm:min-w-0 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-medium transition-all relative whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs font-semibold ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                } ${item.highlight && !isActive ? 'ring-1 ring-amber-400 bg-amber-50/60 text-amber-900' : ''}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-none ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
                {item.highlight && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse absolute -top-0.5 -right-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};

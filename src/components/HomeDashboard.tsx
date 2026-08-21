import React from 'react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  LineChart, 
  Share2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { DailyRecord, UserProfile, AppLanguage } from '../types';
import { 
  calculateBMI, 
  getBMICategory, 
  getHealthGrade, 
  formatDateDisplay, 
  getTodayDateString
} from '../utils/calculations';
import { GoogleAdsBanner } from './GoogleAdsBanner';

interface HomeDashboardProps {
  latestRecord: DailyRecord | null;
  todayRecord: DailyRecord | null;
  records: DailyRecord[];
  profile: UserProfile;
  onStartCheckin: () => void;
  onViewBalanceSheet: () => void;
  onViewTrends: () => void;
  onViewGrocery: () => void;
  onOpenProfile: () => void;
  onOpenQuestionBank?: () => void;
  currentLanguage?: AppLanguage;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  latestRecord,
  todayRecord,
  records,
  profile,
  onStartCheckin,
  onViewBalanceSheet,
  onViewTrends,
  onViewGrocery,
  onOpenProfile,
  onOpenQuestionBank,
  currentLanguage = 'zh-TW',
}) => {
  const todayStr = getTodayDateString();
  const isTodayDone = Boolean(todayRecord?.completed);
  const activeRecord = todayRecord || latestRecord;

  const currentWeight = activeRecord ? activeRecord.weight : profile.weight;
  const bmi = calculateBMI(profile.height, currentWeight);
  const bmiCat = getBMICategory(bmi);

  // Health Grade & Stats from active record
  const netWorth = activeRecord ? activeRecord.netWorth : 0;
  const totalAssets = activeRecord ? activeRecord.totalAssets : 0;
  const totalLiabilities = activeRecord ? activeRecord.totalLiabilities : 0;
  const healthGrade = getHealthGrade(netWorth);

  const handleShare = () => {
    if (!activeRecord) return;
    const text = `📊【${profile.name}的最新健康資產負債表】
📅 結算日：${formatDateDisplay(activeRecord.date)}
⚖️ 體重：${activeRecord.weight} kg (BMI: ${bmi}・${bmiCat.label})
🏆 健康評等：${healthGrade.grade} (${healthGrade.status})
💰 總資產：+$${activeRecord.totalAssets}
📉 總負債：-$${activeRecord.totalLiabilities}
💎 最新BS健康結餘：${activeRecord.netWorth >= 0 ? `+$${activeRecord.netWorth}` : `-$${Math.abs(activeRecord.netWorth)}`}
— 透過每日 10 題健康資產負債表管理身體！`;

    navigator.clipboard?.writeText(text);
    alert('已複製最新資產負債表摘要至剪貼簿！可直接貼上至 Line 或社群。');
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 animate-in fade-in duration-300 px-1 sm:px-0">
      
      {/* 🌟 頂部最核心：最新 BS 健康結餘指標 (極簡大字版) */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-800 relative overflow-hidden">
        
        {/* 背景微光裝飾 */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 頂部標題與狀態 */}
        <div className="relative z-10 flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black text-slate-200 tracking-tight">
              最新BS健康結餘
            </span>
            <span className="text-[11px] text-slate-400">
              ({activeRecord ? formatDateDisplay(activeRecord.date) : formatDateDisplay(todayStr)})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isTodayDone && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                今日已結算
              </span>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="分享結餘"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 超大結餘核心指標 */}
        <div className="relative z-10 py-5 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <div>
              <div className="text-[11px] text-slate-400 font-medium flex items-center justify-center sm:justify-start gap-1 mb-1">
                <span>健康淨增值 (Health Net Worth)</span>
                <Sparkles className="w-3 h-3 text-amber-400" />
              </div>
              <div className={`text-5xl sm:text-6xl font-black tracking-tight font-mono ${netWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netWorth >= 0 ? `+$${netWorth}` : `-$${Math.abs(netWorth)}`}
              </div>
            </div>

            {/* 評等 Badge */}
            <div className="flex flex-col items-center sm:items-end shrink-0 pt-1">
              <span className={`px-3 py-1 rounded-xl text-xs font-black shadow-xs ${healthGrade.badgeColor}`}>
                {healthGrade.grade}・{healthGrade.status}
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                {activeRecord ? `${activeRecord.weight} kg (BMI ${bmi})` : `${profile.weight} kg`}
              </span>
            </div>
          </div>

          {/* 關鍵結餘數據簡約列 (資產 vs 負債) */}
          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-left">
            <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span>總資產</span>
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">
                  +${totalAssets}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-rose-400" />
                  <span>總負債</span>
                </div>
                <div className="text-base sm:text-lg font-black text-rose-400 mt-0.5">
                  -${totalLiabilities}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 🌟 核心操作：大大的開始按鈕 */}
        <div className="relative z-10 space-y-2.5 pt-1">
          <button
            type="button"
            onClick={onStartCheckin}
            id="main-start-10-questions-btn"
            className={`w-full py-4 sm:py-5 px-6 rounded-2xl font-black text-xl sm:text-2xl transition-all shadow-lg flex items-center justify-center gap-3 group active:scale-98 tracking-wider ${
              isTodayDone
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white ring-4 ring-emerald-500/25 shadow-emerald-600/30 hover:shadow-xl'
            }`}
          >
            <Sparkles className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform" />
            <span>{isTodayDone ? '重新開始' : '開始'}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
          </button>

          {/* 簡約捷徑列：詳細損益表 & 趨勢圖 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onViewBalanceSheet}
              id="bs-card-details-btn"
              className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
              <span>詳細損益報表</span>
            </button>

            <button
              type="button"
              onClick={onViewTrends}
              id="bs-card-trend-btn"
              className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-300 hover:text-purple-200 border border-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 group"
            >
              <LineChart className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span>趨勢分析</span>
            </button>
          </div>
        </div>

      </div>

      {/* 2. 廣告展示區 (Google Ads Banner) */}
      <div className="pt-1">
        <GoogleAdsBanner currentLanguage={currentLanguage} />
      </div>

    </div>
  );
};

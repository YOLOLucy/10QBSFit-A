import React from 'react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  LineChart, 
  Clock, 
  Share2
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
  const healthGrade = getHealthGrade(netWorth);

  const handleShare = () => {
    if (!activeRecord) return;
    const text = `📊【${profile.name}的最新健康資產負債表】
📅 結算日：${formatDateDisplay(activeRecord.date)}
⚖️ 體重：${activeRecord.weight} kg (BMI: ${bmi}・${bmiCat.label})
🏆 健康評等：${healthGrade.grade} (${healthGrade.status})
💰 總資產：+$${activeRecord.totalAssets}
📉 總負債：-$${activeRecord.totalLiabilities}
💎 健康淨值：${activeRecord.netWorth >= 0 ? `+$${activeRecord.netWorth}` : `-$${Math.abs(activeRecord.netWorth)}`}
— 透過每日 10 題健康資產負債表管理身體！`;

    navigator.clipboard?.writeText(text);
    alert('已複製最新資產負債表摘要至剪貼簿！可直接貼上至 Line 或社群。');
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 animate-in fade-in duration-300">
      
      {/* 1. 主核心：最新BS健康結餘卡片 */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-md border border-slate-200/90 relative overflow-hidden transition-all">
        
        {/* Top Header: Date, Status Badge & Quick Share */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-600 text-white shadow-2xs">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <div>
              <span className="text-sm font-bold text-slate-800 tracking-tight">
                最新BS健康結餘
              </span>
              <span className="text-xs text-slate-400 ml-1.5">
                ({activeRecord ? formatDateDisplay(activeRecord.date) : formatDateDisplay(todayStr)})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTodayDone && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                今日已結算
              </span>
            )}

            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
              title="複製分享最新資產負債表"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 核心淨值大數字 Display */}
        <div className="my-5 p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-inner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <span>健康淨增值 (Health Net Worth)</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className={`text-4xl sm:text-5xl font-black tracking-tight mt-1 ${netWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netWorth >= 0 ? `+$${netWorth}` : `-$${Math.abs(netWorth)}`}
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {healthGrade.summary}
            </p>
          </div>

          <div className="sm:text-right shrink-0">
            <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black shadow-xs ${healthGrade.badgeColor}`}>
              評等：{healthGrade.grade}
            </span>
            <div className="text-xs font-bold text-slate-300 mt-1">
              {healthGrade.status}
            </div>
          </div>
        </div>

        {/* 🌟 核心操作：大大的開始按鈕 */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={onStartCheckin}
            id="main-start-10-questions-btn"
            className={`w-full py-5 px-6 rounded-2xl font-black text-xl sm:text-2xl transition-all shadow-lg flex items-center justify-center gap-3 group active:scale-98 tracking-wider ${
              isTodayDone
                ? 'bg-slate-900 hover:bg-slate-800 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white ring-4 ring-emerald-500/25 shadow-emerald-600/30 hover:shadow-xl'
            }`}
          >
            <Sparkles className="w-6 h-6 text-amber-300 group-hover:rotate-12 transition-transform" />
            <span>{isTodayDone ? '重新開始' : '開始'}</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
          </button>

          {/* 輔助捷徑：圖 (趨勢圖) & 詳細損益表 */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onViewTrends}
              id="bs-card-trend-btn"
              className="py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 group"
            >
              <LineChart className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
              <span>查看「圖」(趨勢圖)</span>
            </button>

            <button
              type="button"
              onClick={onViewBalanceSheet}
              id="bs-card-details-btn"
              className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-600" />
              <span>詳細損益報表</span>
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


import React from 'react';
import { 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Scale, 
  Calendar, 
  Droplets, 
  Flame, 
  LineChart, 
  ShoppingCart, 
  Clock, 
  RotateCcw,
  Zap,
  Activity,
  ShieldCheck,
  Share2,
  Database
} from 'lucide-react';
import { DailyRecord, UserProfile } from '../types';
import { 
  calculateBMI, 
  getBMICategory, 
  getHealthGrade, 
  formatDateDisplay, 
  getTodayDateString,
  isWeekend,
  calculateDailyWaterNeed
} from '../utils/calculations';

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
}) => {
  const todayStr = getTodayDateString();
  const isTodayDone = Boolean(todayRecord?.completed);
  const activeRecord = todayRecord || latestRecord;

  const currentWeight = activeRecord ? activeRecord.weight : profile.weight;
  const bmi = calculateBMI(profile.height, currentWeight);
  const bmiCat = getBMICategory(bmi);
  const waterNeed = calculateDailyWaterNeed(currentWeight);
  const weekendNow = isWeekend(todayStr);

  // Health Grade & Stats from active record
  const netWorth = activeRecord ? activeRecord.netWorth : 0;
  const totalAssets = activeRecord ? activeRecord.totalAssets : 0;
  const totalLiabilities = activeRecord ? activeRecord.totalLiabilities : 0;
  const healthGrade = getHealthGrade(netWorth);

  const totalFlow = totalAssets + totalLiabilities;
  const assetRatio = totalFlow > 0 ? Math.round((totalAssets / totalFlow) * 100) : 50;
  const liabilityRatio = 100 - assetRatio;

  // Breakdown items
  const assetItems = activeRecord?.answers?.filter((a) => a.isAsset && a.assetValue > 0) || [];
  const liabilityItems = activeRecord?.answers?.filter((a) => !a.isAsset && a.liabilityValue > 0) || [];

  // Recent 7 days net worth history
  const recentRecords = [...records].slice(-7);

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
    <div className="w-full max-w-4xl mx-auto space-y-5">
      
      {/* 1. Top Greeting & Action Prompt Banner */}
      <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
        isTodayDone 
          ? 'bg-gradient-to-r from-emerald-900 to-slate-900 text-white border-emerald-800 shadow-md' 
          : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-slate-800 shadow-lg'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-300 border border-white/10">
                {formatDateDisplay(todayStr)}
              </span>
              {isTodayDone ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  今日已完成結算
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  今日尚未評估（10題）
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              您好，{profile.name}！這是您的最新健康資產負債總覽
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              {isTodayDone
                ? '今日生活習慣已結算入帳，身體持續累積健康複利！'
                : '只需 1 分鐘回答 10 題（飲食/運動/飲水/體重），立即產出今日資產負債表。'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            {isTodayDone ? (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={onViewBalanceSheet}
                  className="flex-1 md:flex-initial py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>查看完整財務表</span>
                </button>
                <button
                  onClick={onStartCheckin}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all flex items-center gap-1"
                  title="重新回答今日10題"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>重填</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onStartCheckin}
                className="w-full md:w-auto py-3 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-black transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 group"
              >
                <Sparkles className="w-4 h-4 text-slate-900 group-hover:rotate-12 transition-transform" />
                <span>立即開始今日 10 題問答</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Hero Balance Sheet Card (一目了然最新資產負債核心結果) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200/90 relative overflow-hidden">
        
        {/* Card Title & Grade */}
        <div className="flex items-start justify-between gap-4 flex-wrap pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Latest Balance Sheet Overview
              </span>
              {activeRecord && (
                <span className="text-[11px] text-slate-400">
                  (結算日：{formatDateDisplay(activeRecord.date)})
                </span>
              )}
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              最新健康資產負債結果
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black shadow-xs ${healthGrade.badgeColor}`}>
                評等：{healthGrade.grade}
              </span>
              <div className="text-xs font-bold text-slate-700 mt-1">
                {healthGrade.status}
              </div>
            </div>

            <button
              onClick={handleShare}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
              title="複製分享最新資產負債表"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3 Core Big Numbers KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 my-5">
          {/* Net Worth */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm flex flex-col justify-between">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>健康淨增值 (Net Worth)</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="my-2">
              <div className={`text-3xl sm:text-4xl font-black tracking-tight ${netWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netWorth >= 0 ? `+$${netWorth}` : `-$${Math.abs(netWorth)}`}
              </div>
            </div>
            <div className="text-[11px] text-slate-300 leading-tight">
              {healthGrade.summary}
            </div>
          </div>

          {/* Total Assets */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-slate-900 flex flex-col justify-between">
            <div className="text-xs text-emerald-800 font-bold flex items-center justify-between">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                總健康資產 (Assets)
              </span>
              <span className="text-[11px] font-extrabold text-emerald-700">{assetRatio}%</span>
            </div>
            <div className="my-2">
              <div className="text-3xl font-black tracking-tight text-emerald-700">
                +${totalAssets}
              </div>
            </div>
            <div className="text-[11px] text-emerald-700">
              包含優質蛋白、足量步數、規律補水等增值習慣
            </div>
          </div>

          {/* Total Liabilities */}
          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-slate-900 flex flex-col justify-between">
            <div className="text-xs text-rose-800 font-bold flex items-center justify-between">
              <span className="flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                總健康負債 (Liabilities)
              </span>
              <span className="text-[11px] font-extrabold text-rose-700">{liabilityRatio}%</span>
            </div>
            <div className="my-2">
              <div className="text-3xl font-black tracking-tight text-rose-600">
                -${totalLiabilities}
              </div>
            </div>
            <div className="text-[11px] text-rose-700">
              {totalLiabilities === 0 ? '極佳自律！無任何健康負債' : '包含熬夜、久坐、精緻糖油炸等透支項目'}
            </div>
          </div>
        </div>

        {/* Visual Asset vs Liability Ratio Bar */}
        <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="text-emerald-700">健康資產佔比：{assetRatio}%</span>
            <span className="text-rose-700">健康負債佔比：{liabilityRatio}%</span>
          </div>
          <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500 rounded-l-full"
              style={{ width: `${assetRatio}%` }}
            />
            <div 
              className="h-full bg-rose-500 transition-all duration-500 rounded-r-full"
              style={{ width: `${liabilityRatio}%` }}
            />
          </div>
        </div>

        {/* Breakdown Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {/* Top Assets */}
          <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900 border-b border-emerald-100 pb-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                最新資產入帳項目 ({assetItems.length}項)
              </span>
              <span className="text-emerald-700 font-extrabold">+${totalAssets}</span>
            </div>
            <div className="space-y-1.5">
              {assetItems.length > 0 ? (
                assetItems.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-white border border-emerald-100">
                    <span className="font-semibold text-slate-800 line-clamp-1">{item.assetLabel}</span>
                    <span className="font-black text-emerald-700 shrink-0">+${item.assetValue}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 text-center py-2">尚無已結算資產</div>
              )}
              {assetItems.length > 3 && (
                <div className="text-[11px] text-emerald-600 font-medium text-center pt-0.5">
                  還有 +{assetItems.length - 3} 項已記錄於完整報表...
                </div>
              )}
            </div>
          </div>

          {/* Top Liabilities */}
          <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-rose-900 border-b border-rose-100 pb-2">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                最新健康負債項目 ({liabilityItems.length}項)
              </span>
              <span className="text-rose-600 font-extrabold">-${totalLiabilities}</span>
            </div>
            <div className="space-y-1.5">
              {liabilityItems.length > 0 ? (
                liabilityItems.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-white border border-rose-100">
                    <span className="font-semibold text-slate-800 line-clamp-1">{item.liabilityLabel}</span>
                    <span className="font-black text-rose-600 shrink-0">-${item.liabilityValue}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-emerald-700 font-bold text-center py-2 bg-emerald-50 rounded-lg">
                  太棒了！無任何健康負債
                </div>
              )}
              {liabilityItems.length > 3 && (
                <div className="text-[11px] text-rose-600 font-medium text-center pt-0.5">
                  還有 +{liabilityItems.length - 3} 項負債待改善...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Action Link */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="text-slate-500">
            想查看更詳細的會計科目明細與問答題目？
          </span>
          <button
            onClick={onViewBalanceSheet}
            className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <span>打開完整損益表</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Quick Glance Widgets: Body Composition & Multi-Day Trend Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Left Widget: Current Body Metric Capsule */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/90 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">體態與生理基準</h4>
                <p className="text-[11px] text-slate-400">目前體重與代謝指標</p>
              </div>
            </div>
            <button
              onClick={onOpenProfile}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2 py-1 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              設定基本資料
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 my-3 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50">
              <div className="text-[10px] text-slate-400">目前體重</div>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">{currentWeight} <span className="text-xs font-normal">kg</span></div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50">
              <div className="text-[10px] text-slate-400">BMI 指數</div>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">{bmi}</div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50">
              <div className="text-[10px] text-slate-400">體位狀態</div>
              <div className={`text-xs font-bold mt-1 inline-block px-1.5 py-0.5 rounded border ${bmiCat.bgColor} ${bmiCat.textColor}`}>
                {bmiCat.label}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-blue-500" />
              每日建議補水：<strong>{waterNeed} cc</strong>
            </span>
            {activeRecord?.weightSource && activeRecord.weightSource !== 'manual' && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                {activeRecord.weightSource === 'apple_health' ? 'Apple健康同步' :
                 activeRecord.weightSource === 'google_fit' ? 'Google Fit同步' : '體脂計同步'}
              </span>
            )}
          </div>
        </div>

        {/* Right Widget: Trend Snapshot & Weekend Grocery */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/90 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <LineChart className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">體重 VS 資產趨勢</h4>
                <p className="text-[11px] text-slate-400">近 7 天健康成長動能</p>
              </div>
            </div>
            <button
              onClick={onViewTrends}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 px-2 py-1 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
            >
              <span>趨勢大圖</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Mini 7-Day Net Worth sparkline-like bars */}
          <div className="flex items-end justify-between gap-1.5 h-16 pt-2 px-1">
            {recentRecords.map((r, idx) => {
              const isToday = r.date === todayStr;
              const heightPercent = Math.min(100, Math.max(20, Math.round((Math.abs(r.netWorth) / 1200) * 100)));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer" onClick={onViewTrends}>
                  <div className="text-[9px] font-bold text-slate-400 group-hover:text-slate-900 transition-colors">
                    {r.netWorth > 0 ? `+${r.netWorth}` : r.netWorth}
                  </div>
                  <div className="w-full bg-slate-100 rounded-t-md h-12 flex items-end justify-center p-0.5">
                    <div 
                      className={`w-full rounded-t transition-all ${
                        isToday 
                          ? 'bg-emerald-500 ring-2 ring-emerald-300' 
                          : r.netWorth >= 0 ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <div className={`text-[9px] ${isToday ? 'font-bold text-emerald-700' : 'text-slate-400'}`}>
                    {r.date.slice(8)}日
                  </div>
                </div>
              );
            })}
          </div>

          {/* Weekend Grocery shortcut banner */}
          <div 
            onClick={onViewGrocery}
            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
              weekendNow 
                ? 'bg-amber-50/80 border-amber-200 text-amber-950 hover:bg-amber-100/80' 
                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className={`w-4 h-4 ${weekendNow ? 'text-amber-600' : 'text-slate-500'}`} />
              <span className="font-bold">
                {weekendNow ? ' 週末採買提醒：檢視一週食材清單' : '週末超市採買清單與建議菜單'}
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

      </div>

      {/* Question Bank Manager & 50-Question Pack Expansion Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 border border-indigo-500/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-indigo-600/60 text-indigo-200 ring-4 ring-indigo-500/20 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-white">健康題庫管理與擴充中心</h4>
              <span className="bg-amber-400 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-full">
                每次更新 50 題 (NT$ 10)
              </span>
              <span className="bg-emerald-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-full">
                支援 CSV 匯入/匯出
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 leading-relaxed max-w-xl">
              支援「自訂個人專屬問題」或「下載/上傳 CSV 題庫檔案」融入每日抽題，亦可單次 10 元解鎖 Andy Galpin 50 題專業生理學擴充包。
            </p>
          </div>
        </div>

        {onOpenQuestionBank && (
          <button
            type="button"
            onClick={onOpenQuestionBank}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
          >
            <span>管理題庫 / 加購 50 題</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 4. Andy Galpin Performance Daily Principle Capsule */}
      <div className="bg-gradient-to-r from-indigo-50 via-slate-50 to-emerald-50 rounded-2xl p-4 border border-indigo-100 flex items-center justify-between flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-indigo-950">Andy Galpin 生理學健康管理指南</div>
            <div className="text-slate-600 text-[11px] mt-0.5">
              「健康的本質如同財務資產管理，每日存入微小自律，複利效應將在 90 天內重塑代謝與體態。」
            </div>
          </div>
        </div>

        <button
          onClick={onStartCheckin}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shrink-0"
        >
          {isTodayDone ? '複習今日問卷' : '前往 10 題問答'}
        </button>
      </div>

    </div>
  );
};

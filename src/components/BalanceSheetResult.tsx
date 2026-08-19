import React from 'react';
import { 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  ShieldCheck, 
  Sparkles, 
  RotateCcw, 
  Share2, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  ShoppingCart,
  LineChart,
  Scale
} from 'lucide-react';
import { DailyRecord, UserProfile } from '../types';
import { calculateBMI, getBMICategory, getHealthGrade, formatDateDisplay } from '../utils/calculations';

interface BalanceSheetResultProps {
  record: DailyRecord;
  profile: UserProfile;
  onRetake: () => void;
  onGoToTrends: () => void;
  onGoToGrocery: () => void;
}

export const BalanceSheetResult: React.FC<BalanceSheetResultProps> = ({
  record,
  profile,
  onRetake,
  onGoToTrends,
  onGoToGrocery,
}) => {
  const bmi = calculateBMI(profile.height, record.weight);
  const bmiCat = getBMICategory(bmi);
  const healthGrade = getHealthGrade(record.netWorth);

  // Group assets and liabilities from answers
  const assetItems = record.answers.filter((a) => a.isAsset && a.assetValue > 0);
  const liabilityItems = record.answers.filter((a) => !a.isAsset && a.liabilityValue > 0);

  // Financial ratios
  const totalTurnover = record.totalAssets + record.totalLiabilities;
  const assetRatio = totalTurnover > 0 ? Math.round((record.totalAssets / totalTurnover) * 100) : 0;
  const debtRatio = 100 - assetRatio;

  const handleCopySummary = () => {
    const text = `📊【${profile.name}的每日健康資產負債表】
📅 日期：${formatDateDisplay(record.date)}
⚖️ 今日體重：${record.weight} kg (BMI: ${bmi}・${bmiCat.label})
🏆 健康財務評等：${healthGrade.grade} (${healthGrade.status})
💰 總健康資產：+$${record.totalAssets}
📉 總健康負債：-$${record.totalLiabilities}
💎 今日健康淨值：${record.netWorth >= 0 ? `+$${record.netWorth}` : `-$${Math.abs(record.netWorth)}`}
💡 健康儲蓄率：${assetRatio}%
— 透過每日10題健康資產負債表管理身體！`;

    navigator.clipboard.writeText(text);
    alert('已成功複製今日健康資產負債報表！可貼上至 Line 或社群分享。');
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      {/* Financial Statement Header Card */}
      <div className={`rounded-3xl p-6 sm:p-7 shadow-sm border ${healthGrade.cardColor} bg-white relative overflow-hidden`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Daily Health Balance Sheet
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              今日健康資產負債表
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              結算日期：{formatDateDisplay(record.date)}・受評者：{profile.name}
            </p>
          </div>

          <div className="text-right">
            <span className={`inline-block px-3 py-1 rounded-xl text-xs font-extrabold shadow-xs ${healthGrade.badgeColor}`}>
              {healthGrade.grade}
            </span>
            <div className="text-xs font-bold text-slate-700 mt-1">
              {healthGrade.status}
            </div>
          </div>
        </div>

        {/* Primary Financial Metric Box: Net Worth */}
        <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs text-slate-400 font-medium">今日健康淨增值 (Net Health Equity)</div>
              <div className="text-3xl sm:text-4xl font-black tracking-tight mt-0.5 text-emerald-400">
                {record.netWorth >= 0 ? `+$${record.netWorth}` : `-$${Math.abs(record.netWorth)}`}
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="text-[11px] text-slate-400">健康資產率</div>
                <div className="text-lg font-extrabold text-emerald-300">{assetRatio}%</div>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div>
                <div className="text-[11px] text-slate-400">今日量測體重</div>
                <div className="text-lg font-extrabold text-purple-300">{record.weight} kg</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/80 text-xs text-slate-300 leading-relaxed flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{healthGrade.summary}</span>
          </div>
        </div>
      </div>

      {/* Itemized Accounting Ledger: Assets (資產) vs Liabilities (負債) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Health Assets */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-emerald-200">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-100 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">健康資產清單 (Assets)</h3>
                <p className="text-[11px] text-emerald-600">優良生活習慣・身體增值項目</p>
              </div>
            </div>
            <div className="text-sm font-black text-emerald-600">
              +${record.totalAssets}
            </div>
          </div>

          <div className="space-y-2.5">
            {assetItems.length > 0 ? (
              assetItems.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs"
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-800">{item.assetLabel}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{item.questionTitle}</div>
                    </div>
                  </div>
                  <div className="font-black text-emerald-700 shrink-0">
                    +${item.assetValue}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                今日尚無存入資產項目
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Health Liabilities */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-rose-200">
          <div className="flex items-center justify-between pb-3 border-b border-rose-100 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">健康負債清單 (Liabilities)</h3>
                <p className="text-[11px] text-rose-600">潛在健康透支・待改進項目</p>
              </div>
            </div>
            <div className="text-sm font-black text-rose-600">
              -${record.totalLiabilities}
            </div>
          </div>

          <div className="space-y-2.5">
            {liabilityItems.length > 0 ? (
              liabilityItems.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-rose-50/60 border border-rose-100 text-xs"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-800">{item.liabilityLabel}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{item.questionTitle}</div>
                    </div>
                  </div>
                  <div className="font-black text-rose-600 shrink-0">
                    -${item.liabilityValue}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-emerald-600 font-bold bg-emerald-50/50 rounded-xl">
                太棒了！今日零健康負債，完美自律！
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body Composition Summary Capsule */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 flex items-center justify-between flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <span>體態健康量表</span>
              {record.weightSource && record.weightSource !== 'manual' && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                  {record.weightSource === 'apple_health' ? 'Apple 健康同步' :
                   record.weightSource === 'google_fit' ? 'Google Fit 同步' : '藍牙體脂計同步'}
                </span>
              )}
            </div>
            <div className="text-slate-500 text-[11px]">
              身高 {profile.height} cm / 今日體重 {record.weight} kg
              {record.syncedAt && ` (於 ${record.syncedAt} 讀取)`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className={`px-2 py-0.5 rounded-md font-bold text-xs border ${bmiCat.bgColor} ${bmiCat.textColor}`}>
              BMI: {bmi} ({bmiCat.label})
            </span>
            {record.bodyFat && (
              <div className="text-[11px] text-slate-500 mt-0.5">體脂率: {record.bodyFat}%</div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
        <button
          onClick={onGoToTrends}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
        >
          <LineChart className="w-4 h-4 text-emerald-400" />
          <span>查看體重VS資產負債趨勢</span>
        </button>

        <button
          onClick={onGoToGrocery}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all"
        >
          <ShoppingCart className="w-4 h-4 text-emerald-600" />
          <span>週末超市採買與建議菜單</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySummary}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>複製分享</span>
          </button>

          <button
            onClick={onRetake}
            className="flex items-center justify-center gap-1 py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
            title="重新填寫今日問卷"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重填</span>
          </button>
        </div>
      </div>
    </div>
  );
};

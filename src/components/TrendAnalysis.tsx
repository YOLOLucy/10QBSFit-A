import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import { 
  LineChart as LineChartIcon, 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  Calendar, 
  Sparkles, 
  Award,
  ChevronRight,
  Info
} from 'lucide-react';
import { DailyRecord, UserProfile } from '../types';
import { calculateBMI, getBMICategory, getHealthGrade, formatDateDisplay } from '../utils/calculations';

interface TrendAnalysisProps {
  records: DailyRecord[];
  profile: UserProfile;
  onSelectRecord?: (record: DailyRecord) => void;
}

export const TrendAnalysis: React.FC<TrendAnalysisProps> = ({
  records,
  profile,
  onSelectRecord,
}) => {
  const [timeRange, setTimeRange] = useState<'7' | '14' | '30' | 'all'>('7');
  const [activeMetric, setActiveMetric] = useState<'all' | 'weight' | 'assets_liabilities'>('all');

  // Sort chronologically
  const sortedRecords = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filter records based on selected time range
  const filteredRecords = (() => {
    if (timeRange === 'all') return sortedRecords;
    const days = parseInt(timeRange, 10);
    return sortedRecords.slice(-days);
  })();

  // Transform data for Recharts
  const chartData = filteredRecords.map((r) => {
    const parts = r.date.split('-');
    const dateLabel = `${Number(parts[1])}/${Number(parts[2])}`;
    return {
      date: r.date,
      dateLabel,
      weight: r.weight,
      bodyFat: r.bodyFat,
      totalAssets: r.totalAssets,
      totalLiabilities: r.totalLiabilities,
      netWorth: r.netWorth,
      targetWeight: profile.targetWeight || 60,
    };
  });

  // Calculate high-level stats
  const totalDays = filteredRecords.length;
  const avgAssets = totalDays > 0 ? Math.round(filteredRecords.reduce((sum, r) => sum + r.totalAssets, 0) / totalDays) : 0;
  const avgLiabilities = totalDays > 0 ? Math.round(filteredRecords.reduce((sum, r) => sum + r.totalLiabilities, 0) / totalDays) : 0;
  const avgNetWorth = avgAssets - avgLiabilities;

  const firstWeight = filteredRecords[0]?.weight || profile.weight;
  const latestWeight = filteredRecords[filteredRecords.length - 1]?.weight || profile.weight;
  const weightChange = Number((latestWeight - firstWeight).toFixed(1));

  // Find min/max weight for dynamic Y-axis domain
  const weights = filteredRecords.map((r) => r.weight);
  const minWeight = Math.floor(Math.min(...(weights.length ? weights : [60])) - 1);
  const maxWeight = Math.ceil(Math.max(...(weights.length ? weights : [70])) + 1);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <LineChartIcon className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Health Economics & Weight Trends
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            體重 VS 資產 VS 負債 綜合趨勢表
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            觀察健康行為（資產/負債）如何實質帶動體態與體重的長期正向轉變
          </p>
        </div>

        {/* Time range switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          {[
            { id: '7', label: '近 7 天' },
            { id: '14', label: '近 14 天' },
            { id: '30', label: '近 30 天' },
            { id: 'all', label: '全部' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTimeRange(item.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === item.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-purple-100">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>期間體重變化</span>
            <Scale className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {latestWeight} <span className="text-xs font-bold text-slate-400">kg</span>
          </div>
          <div className="text-xs font-bold mt-1 flex items-center gap-1">
            <span className={weightChange <= 0 ? 'text-emerald-600' : 'text-amber-600'}>
              {weightChange > 0 ? `+${weightChange}` : weightChange} kg
            </span>
            <span className="text-slate-400 font-normal">相較期初</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>平均每日健康資產</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">
            +${avgAssets}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">良好飲食與運動積累</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-xs border border-rose-100">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>平均每日健康負債</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600">
            -${avgLiabilities}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">熬夜/久坐/甜食透支</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-xs border border-teal-100">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>平均健康淨值</span>
            <Sparkles className="w-4 h-4 text-teal-500" />
          </div>
          <div className={`text-xl sm:text-2xl font-black ${avgNetWorth >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>
            {avgNetWorth >= 0 ? `+$${avgNetWorth}` : `-$${Math.abs(avgNetWorth)}`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">整體財務增值水準</div>
        </div>
      </div>

      {/* Main Dual-Axis Interactive Chart Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              趨勢交叉分析圖 (左軸：體重 kg / 右軸：資產與負債點數 $)
            </h3>
            <p className="text-xs text-slate-400">
              綠色長條為健康資產，紅色長條為健康負債，紫色折線為每日體重走勢
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1 text-purple-700">
              <span className="w-3 h-3 rounded-full bg-purple-600 inline-block" />
              <span>體重 (kg)</span>
            </span>
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
              <span>資產 ($)</span>
            </span>
            <span className="flex items-center gap-1 text-rose-700">
              <span className="w-3 h-3 rounded-sm bg-rose-400 inline-block" />
              <span>負債 ($)</span>
            </span>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="w-full h-80 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              
              <XAxis 
                dataKey="dateLabel" 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />

              {/* Left Y-Axis for Weight (kg) */}
              <YAxis 
                yAxisId="weightAxis"
                orientation="left"
                domain={[minWeight, maxWeight]}
                tick={{ fontSize: 11, fill: '#7c3aed' }}
                unit="kg"
                axisLine={false}
                tickLine={false}
              />

              {/* Right Y-Axis for Assets / Liabilities ($) */}
              <YAxis 
                yAxisId="financeAxis"
                orientation="right"
                domain={[0, 1600]}
                tick={{ fontSize: 11, fill: '#059669' }}
                unit="$"
                axisLine={false}
                tickLine={false}
              />

              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white text-xs rounded-xl p-3 shadow-lg border border-slate-700 space-y-1.5">
                        <div className="font-bold text-slate-300 border-b border-slate-700 pb-1">
                          {formatDateDisplay(data.date)}
                        </div>
                        <div className="flex items-center justify-between gap-4 text-purple-300 font-bold">
                          <span>測量體重：</span>
                          <span>{data.weight} kg</span>
                        </div>
                        {data.bodyFat && (
                          <div className="flex items-center justify-between gap-4 text-purple-200">
                            <span>體脂率：</span>
                            <span>{data.bodyFat}%</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-4 text-emerald-400">
                          <span>健康資產：</span>
                          <span>+${data.totalAssets}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-rose-400">
                          <span>健康負債：</span>
                          <span>-${data.totalLiabilities}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-teal-300 font-black border-t border-slate-700 pt-1">
                          <span>健康淨值：</span>
                          <span>{data.netWorth >= 0 ? `+$${data.netWorth}` : `-$${Math.abs(data.netWorth)}`}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Bar for Health Assets */}
              <Bar 
                yAxisId="financeAxis"
                dataKey="totalAssets" 
                name="健康資產" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
                barSize={14}
              />

              {/* Bar for Health Liabilities */}
              <Bar 
                yAxisId="financeAxis"
                dataKey="totalLiabilities" 
                name="健康負債" 
                fill="#fb7185" 
                radius={[4, 4, 0, 0]}
                barSize={14}
              />

              {/* Dotted target weight line */}
              {profile.targetWeight && (
                <ReferenceLine 
                  yAxisId="weightAxis" 
                  y={profile.targetWeight} 
                  stroke="#9333ea" 
                  strokeDasharray="4 4" 
                  label={{ value: `目標 ${profile.targetWeight}kg`, fill: '#9333ea', fontSize: 10, position: 'insideTopRight' }}
                />
              )}

              {/* Line for Weight */}
              <Line 
                yAxisId="weightAxis"
                type="monotone" 
                dataKey="weight" 
                name="體重 (kg)" 
                stroke="#7c3aed" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#7c3aed', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: '#9333ea' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Insight callout */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
          <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>數據規律洞察：</strong>
            當單日健康資產超過 <strong>+$1,000</strong> 且負債控制在 <strong>-$200</strong> 以內時，身體處於高效抗發炎與脂肪代謝狀態，體重曲線通常在 3-5 天內呈現平穩微幅下降。持續保持資產大於負債，是達成目標體重最科學的無痛途徑！
          </div>
        </div>
      </div>

      {/* Historical Record Log Table */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">歷史打卡紀錄明細</h3>
          </div>
          <span className="text-xs text-slate-400">共 {records.length} 筆紀錄</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">日期</th>
                <th className="py-2.5 px-3">體重 / BMI</th>
                <th className="py-2.5 px-3">健康資產</th>
                <th className="py-2.5 px-3">健康負債</th>
                <th className="py-2.5 px-3">健康淨值</th>
                <th className="py-2.5 px-3 text-right">財務評等</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRecords.slice().reverse().map((rec) => {
                const dayBMI = calculateBMI(profile.height, rec.weight);
                const grade = getHealthGrade(rec.netWorth);
                return (
                  <tr 
                    key={rec.date}
                    onClick={() => onSelectRecord && onSelectRecord(rec)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-3 font-semibold text-slate-800 flex items-center gap-1.5">
                      <span>{formatDateDisplay(rec.date)}</span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">
                      {rec.weight} kg <span className="text-slate-400">({dayBMI})</span>
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-600">
                      +${rec.totalAssets}
                    </td>
                    <td className="py-3 px-3 font-bold text-rose-600">
                      -${rec.totalLiabilities}
                    </td>
                    <td className="py-3 px-3 font-black text-slate-900">
                      {rec.netWorth >= 0 ? `+$${rec.netWorth}` : `-$${Math.abs(rec.netWorth)}`}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${grade.badgeColor}`}>
                        {grade.grade.split(' ')[0]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

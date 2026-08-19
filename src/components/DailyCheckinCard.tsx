import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  Sparkles, 
  Scale, 
  Utensils, 
  Dumbbell, 
  Droplet, 
  CheckCircle2, 
  HelpCircle,
  RotateCcw,
  Flame,
  ArrowRight,
  Smartphone,
  RefreshCw,
  Sliders,
  Bluetooth,
  Heart
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { HealthQuestion, DailyAnswer, UserProfile, DailyRecord, WeightSource } from '../types';
import { calculateBMI, getBMICategory } from '../utils/calculations';
import { HealthSyncModal } from './HealthSyncModal';
import { syncWeightFromProvider, detectMobilePlatform, HealthSyncResult } from '../utils/healthSync';

interface DailyCheckinCardProps {
  questions: HealthQuestion[];
  profile: UserProfile;
  onCompleteCheckin: (record: DailyRecord) => void;
  existingRecord?: DailyRecord | null;
  onGoToBalanceSheet: () => void;
}

export const DailyCheckinCard: React.FC<DailyCheckinCardProps> = ({
  questions,
  profile,
  onCompleteCheckin,
  existingRecord,
  onGoToBalanceSheet,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, 'yes' | 'no'>>(() => {
    if (existingRecord && existingRecord.answers.length > 0) {
      const map: Record<string, 'yes' | 'no'> = {};
      existingRecord.answers.forEach((a) => {
        map[a.questionId] = a.answer;
      });
      return map;
    }
    return {};
  });

  const [todayWeight, setTodayWeight] = useState<number>(() => {
    return existingRecord?.weight || profile.weight || 65.0;
  });

  const [todayBodyFat, setTodayBodyFat] = useState<string>(() => {
    return existingRecord?.bodyFat ? String(existingRecord.bodyFat) : profile.bodyFat ? String(profile.bodyFat) : '';
  });

  const [weightInputMode, setWeightInputMode] = useState<'auto' | 'manual'>('auto');
  const [weightSource, setWeightSource] = useState<WeightSource>(() => {
    return existingRecord?.weightSource || (detectMobilePlatform() === 'ios' ? 'apple_health' : 'google_fit');
  });
  const [syncedAt, setSyncedAt] = useState<string | undefined>(existingRecord?.syncedAt);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isQuickSyncing, setIsQuickSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const isCompleted = Boolean(existingRecord?.completed);
  const currentQuestion = questions[currentIndex] || questions[0];
  const totalQuestions = questions.length; // 10
  const isLastQuestion = currentIndex === totalQuestions - 1;

  // Calculate live running totals
  let runningAssets = 0;
  let runningLiabilities = 0;

  questions.slice(0, 9).forEach((q) => {
    const ans = answers[q.id];
    if (ans !== undefined) {
      const isAsset = ans === q.positiveAnswer;
      if (isAsset) {
        runningAssets += q.assetValue;
      } else {
        runningLiabilities += q.liabilityValue;
      }
    }
  });

  // If question 10 (weight) is answered / recorded
  if (answers['weight_daily_check'] !== undefined) {
    if (answers['weight_daily_check'] === 'yes') {
      runningAssets += 200;
    } else {
      runningLiabilities += 150;
    }
  }

  const runningNetWorth = runningAssets - runningLiabilities;

  const handleAnswer = (question: HealthQuestion, ans: 'yes' | 'no') => {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: ans,
    }));

    // Auto advance to next question after answering with smooth delay
    if (currentIndex < totalQuestions - 1) {
      setTimeout(() => {
        setDirection(1);
        setCurrentIndex((prev) => prev + 1);
      }, 250);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleQuickSync = async () => {
    setIsQuickSyncing(true);
    try {
      const result = await syncWeightFromProvider(weightSource, todayWeight);
      setTodayWeight(result.weight);
      if (result.bodyFat) {
        setTodayBodyFat(String(result.bodyFat));
      }
      setSyncedAt(result.syncedAt);
      setSyncFeedback(`已於 ${result.syncedAt} 成功自【${result.sourceName}】讀取！`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsQuickSyncing(false);
    }
  };

  const handleApplySyncedData = (result: HealthSyncResult) => {
    setTodayWeight(result.weight);
    if (result.bodyFat) {
      setTodayBodyFat(String(result.bodyFat));
    }
    setWeightSource(result.source);
    setSyncedAt(result.syncedAt);
    setSyncFeedback(`已於 ${result.syncedAt} 成功自【${result.sourceName}】同步！`);
    setIsSyncModalOpen(false);
  };

  const handleFinish = () => {
    // Make sure weight is recorded
    const finalAnswers: DailyAnswer[] = [];
    let totalAssets = 0;
    let totalLiabilities = 0;

    questions.slice(0, 9).forEach((q) => {
      const userAns = answers[q.id] || 'no';
      const isAsset = userAns === q.positiveAnswer;
      const assetVal = isAsset ? q.assetValue : 0;
      const liabilityVal = isAsset ? 0 : q.liabilityValue;

      totalAssets += assetVal;
      totalLiabilities += liabilityVal;

      finalAnswers.push({
        questionId: q.id,
        category: q.category,
        questionTitle: q.title,
        answer: userAns,
        isAsset,
        assetValue: assetVal,
        liabilityValue: liabilityVal,
        assetLabel: q.assetLabel,
        liabilityLabel: q.liabilityLabel,
      });
    });

    // Add weight answer
    const weightAns = 'yes';
    totalAssets += 200;
    finalAnswers.push({
      questionId: 'weight_daily_check',
      category: 'weight',
      questionTitle: '今日體重紀錄與體態自評',
      answer: weightAns,
      isAsset: true,
      assetValue: 200,
      liabilityValue: 0,
      assetLabel: '體重自覺追蹤資產',
      liabilityLabel: '體重逃避盲目負債',
    });

    const parsedFat = todayBodyFat ? parseFloat(todayBodyFat) : undefined;

    const newRecord: DailyRecord = {
      date: new Date().toISOString().split('T')[0],
      weight: todayWeight,
      bodyFat: Number.isNaN(parsedFat) ? undefined : parsedFat,
      weightSource: weightInputMode === 'auto' ? weightSource : 'manual',
      syncedAt: weightInputMode === 'auto' ? (syncedAt || '07:30') : undefined,
      answers: finalAnswers,
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      completed: true,
      notes: weightInputMode === 'auto' ? `已透過手機健康 (${weightSource}) 自動同步` : '手動輸入體重打卡',
    };

    // Confetti effect
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // safe fallback
    }

    onCompleteCheckin(newRecord);
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'diet':
        return {
          label: '飲食營養',
          icon: Utensils,
          color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        };
      case 'exercise':
        return {
          label: '運動活力',
          icon: Dumbbell,
          color: 'bg-blue-100 text-blue-800 border-blue-300',
        };
      case 'hydration':
        return {
          label: '飲水作息',
          icon: Droplet,
          color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
        };
      case 'weight':
        return {
          label: '體重與體態',
          icon: Scale,
          color: 'bg-purple-100 text-purple-800 border-purple-300',
        };
      default:
        return {
          label: '健康主題',
          icon: Sparkles,
          color: 'bg-slate-100 text-slate-800 border-slate-300',
        };
    }
  };

  const categoryInfo = getCategoryBadge(currentQuestion.category);
  const CategoryIcon = categoryInfo.icon;
  const currentAnswer = answers[currentQuestion.id];
  const currentBMI = calculateBMI(profile.height, todayWeight);
  const currentBMICategory = getBMICategory(currentBMI);

  const answeredCount = Object.keys(answers).length + (todayWeight > 0 ? 1 : 0);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Live Financial Balance Indicator Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">即時健康資產淨值</div>
            <div className={`text-base sm:text-lg font-extrabold tracking-tight ${
              runningNetWorth >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {runningNetWorth >= 0 ? `+$${runningNetWorth}` : `-$${Math.abs(runningNetWorth)}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right text-xs">
          <div>
            <div className="text-slate-400">已累積資產</div>
            <div className="font-bold text-emerald-700">+${runningAssets}</div>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <div className="text-slate-400">已產生負債</div>
            <div className="font-bold text-rose-600">-${runningLiabilities}</div>
          </div>
        </div>
      </div>

      {/* Progress Track with 10 question dots */}
      <div className="bg-white rounded-2xl p-3 shadow-xs border border-slate-200/80">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
          <span className="flex items-center gap-1.5">
            <span>第 {currentIndex + 1} 題 / 共 10 題</span>
            {isLastQuestion && (
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-bold">
                今日體重必填・支援手機同步
              </span>
            )}
          </span>
          <span className="text-slate-400">
            已完成 {answeredCount > 10 ? 10 : answeredCount} / 10
          </span>
        </div>

        <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
          {questions.map((q, idx) => {
            const hasAns = answers[q.id] !== undefined || (idx === 9 && todayWeight > 0);
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={q.id}
                onClick={() => {
                  setDirection(idx > currentIndex ? 1 : -1);
                  setCurrentIndex(idx);
                }}
                className={`h-2.5 rounded-full transition-all ${
                  isCurrent
                    ? 'ring-2 ring-emerald-500 ring-offset-1 bg-emerald-500 scale-105'
                    : hasAns
                    ? 'bg-emerald-400'
                    : 'bg-slate-200 hover:bg-slate-300'
                }`}
                title={`第 ${idx + 1} 題: ${q.title}`}
              />
            );
          })}
        </div>
      </div>

      {/* Main Swipeable Question Card with AnimatePresence */}
      <div className="relative overflow-hidden min-h-[470px] flex flex-col justify-between">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 80 : -80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -80 : 80 }}
            transition={{ duration: 0.24, ease: 'easeInOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50 && currentIndex < totalQuestions - 1) {
                handleNext();
              } else if (info.offset.x > 50 && currentIndex > 0) {
                handlePrev();
              }
            }}
            className="w-full bg-white rounded-3xl p-5 sm:p-7 shadow-md border border-slate-200/90 flex flex-col justify-between"
          >
            {/* Card Header: Category & Swipe Hint */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${categoryInfo.color}`}>
                    <CategoryIcon className="w-3.5 h-3.5" />
                    <span>{categoryInfo.label}</span>
                  </span>
                  {currentQuestion.question_id && (
                    <span className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {currentQuestion.question_id}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span>← 左右滑動換題 →</span>
                </span>
              </div>

              {/* Question Content */}
              {!isLastQuestion ? (
                <div className="space-y-3.5">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug tracking-tight">
                    {currentQuestion.title}
                  </h2>

                  {/* Galpin Principle Tag */}
                  {currentQuestion.galpin_principle && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-100 text-[11px] font-medium text-indigo-900">
                      <span className="font-bold text-indigo-700">🔬 Galpin 生理學原理：</span>
                      <span>{currentQuestion.galpin_principle}</span>
                    </div>
                  )}

                  <p className="text-slate-600 text-sm leading-relaxed">
                    {currentQuestion.description}
                  </p>

                  {/* Impact preview */}
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-start gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-emerald-900">
                          {currentQuestion.positiveAnswer === 'yes' ? '回答【是】' : '回答【否】'}
                        </div>
                        <div className="text-[11px] text-emerald-700">
                          +{currentQuestion.assetValue} {currentQuestion.assetLabel}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 text-rose-800">
                      <HelpCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-rose-900">
                          {currentQuestion.positiveAnswer === 'yes' ? '回答【否】' : '回答【是】'}
                        </div>
                        <div className="text-[11px] text-rose-700">
                          產生 ${currentQuestion.liabilityValue} {currentQuestion.liabilityLabel}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pro Tip */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/50">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span><strong>健康密技：</strong>{currentQuestion.tip}</span>
                  </div>
                </div>
              ) : (
                /* Question 10: Special Weight & Body Fat Check with Auto Sync & Manual Input */
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                        <Scale className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                          第 10 題：今日體重紀錄
                        </h2>
                        <p className="text-xs text-slate-500">
                          可自動讀取手機健康數據或手動精確調整
                        </p>
                      </div>
                    </div>

                    {/* Mode Switcher: Auto Phone Sync vs Manual */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs">
                      <button
                        type="button"
                        onClick={() => setWeightInputMode('auto')}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                          weightInputMode === 'auto'
                            ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>手機自動同步</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setWeightInputMode('manual')}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                          weightInputMode === 'manual'
                            ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5 text-purple-600" />
                        <span>手動輸入</span>
                      </button>
                    </div>
                  </div>

                  {/* Auto Sync Banner (when in auto mode) */}
                  {weightInputMode === 'auto' && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          {weightSource === 'apple_health' && <Heart className="w-4 h-4" />}
                          {weightSource === 'google_fit' && <Smartphone className="w-4 h-4" />}
                          {weightSource === 'smart_scale' && <Bluetooth className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>
                              {weightSource === 'apple_health' ? 'Apple 健康 (HealthKit)' : 
                               weightSource === 'google_fit' ? 'Google Health Connect' : '藍牙智慧體脂計'}
                            </span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                              已連線
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            {syncFeedback || (syncedAt ? `已於今日 ${syncedAt} 完成同步` : '點擊立即一鍵從手機更新最新體重')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleQuickSync}
                          disabled={isQuickSyncing}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 transition-all active:scale-95"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isQuickSyncing ? 'animate-spin' : ''}`} />
                          <span>{isQuickSyncing ? '同步中' : '一鍵同步'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsSyncModalOpen(true)}
                          className="p-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold"
                          title="切換同步來源 (Apple / Google / 藍牙體重計)"
                        >
                          更換
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Weight Display & Adjustment Box */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/80 to-slate-50 border border-purple-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-700">今日量測體重 (kg)</label>
                        {weightInputMode === 'auto' && (
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            手機健康同步
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${currentBMICategory.bgColor} ${currentBMICategory.textColor}`}>
                        即時 BMI: {currentBMI} ({currentBMICategory.label})
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setTodayWeight((w) => Number((Math.max(30, w - 0.1)).toFixed(1)))}
                        className="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-lg active:scale-95"
                      >
                        -
                      </button>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={todayWeight}
                          onChange={(e) => setTodayWeight(parseFloat(e.target.value) || 0)}
                          className="w-32 text-center text-3xl font-black text-slate-900 bg-white border border-purple-200 rounded-2xl py-2 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                        />
                        <span className="text-xs font-bold text-slate-400 absolute right-3 bottom-3">kg</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTodayWeight((w) => Number((w + 0.1).toFixed(1)))}
                        className="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-lg active:scale-95"
                      >
                        +
                      </button>
                    </div>

                    {/* Quick Stepper adjustment pills */}
                    <div className="flex items-center justify-center gap-1.5 pt-1">
                      {[
                        { label: '-0.3kg', delta: -0.3 },
                        { label: '-0.1kg', delta: -0.1 },
                        { label: '與昨相同', delta: 0, reset: true },
                        { label: '+0.1kg', delta: 0.1 },
                        { label: '+0.3kg', delta: 0.3 },
                      ].map((pill, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => {
                            if (pill.reset) {
                              setTodayWeight(profile.weight || 65.0);
                            } else {
                              setTodayWeight((w) => Number((w + pill.delta).toFixed(1)));
                            }
                          }}
                          className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-purple-300 text-[11px] font-semibold text-slate-600 hover:text-purple-700 transition-colors"
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>

                    {/* Optional Body Fat % */}
                    <div className="pt-2 border-t border-purple-100/60 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium text-slate-700">體脂率 %</div>
                        <div className="text-[11px] text-slate-400">選填（非必須欄位，支援體脂計自動匯入）</div>
                      </div>
                      <div className="w-28 relative">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="例如 21.5"
                          value={todayBodyFat}
                          onChange={(e) => setTodayBodyFat(e.target.value)}
                          className="w-full text-right pr-6 py-1.5 text-sm font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                        />
                        <span className="text-xs text-slate-400 absolute right-2 top-2">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>落實今日體重測量，立即入帳 <strong>+$200 體重自覺追蹤資產</strong>！</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions: YES / NO Buttons for Questions 1-9 OR Finish Button for Question 10 */}
            <div className="pt-6 border-t border-slate-100 mt-6">
              {!isLastQuestion ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleAnswer(currentQuestion, 'yes')}
                    className={`py-4 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm text-base ${
                      currentAnswer === 'yes'
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-200 shadow-md'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    <Check className="w-5 h-5" />
                    <span>是 (Yes)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAnswer(currentQuestion, 'no')}
                    className={`py-4 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm text-base ${
                      currentAnswer === 'no'
                        ? 'bg-rose-600 text-white ring-4 ring-rose-200 shadow-md'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <X className="w-5 h-5" />
                    <span>否 (No)</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="w-full py-4 px-5 rounded-2xl font-extrabold text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all"
                  >
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>結算今日健康資產負債表</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <p className="text-center text-[11px] text-slate-400">
                    點擊結算後將產出今日健康財務報表與損益分析
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Prev / Next Bottom Stepper Controls */}
      <div className="flex items-center justify-between px-2 pt-1">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none p-2 rounded-xl hover:bg-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>上一題</span>
        </button>

        {isCompleted && (
          <button
            type="button"
            onClick={onGoToBalanceSheet}
            className="text-xs font-bold text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200/80 px-3 py-1.5 rounded-xl transition-colors"
          >
            查看今日資產負債表
          </button>
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={currentIndex === totalQuestions - 1}
          className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none p-2 rounded-xl hover:bg-white transition-colors"
        >
          <span>下一題</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Health Sync Modal */}
      <HealthSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        currentWeight={todayWeight}
        onApplySyncedData={handleApplySyncedData}
      />
    </div>
  );
};

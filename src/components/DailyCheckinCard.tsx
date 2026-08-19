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
  Smartphone, 
  RefreshCw, 
  Sliders, 
  Bluetooth, 
  Heart, 
  ArrowRight,
  TrendingUp,
  TrendingDown
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

    if (currentIndex < totalQuestions - 1) {
      setTimeout(() => {
        setDirection(1);
        setCurrentIndex((prev) => prev + 1);
      }, 200);
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
      setSyncFeedback(`已於 ${result.syncedAt} 自【${result.sourceName}】同步！`);
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
    setSyncFeedback(`已於 ${result.syncedAt} 自【${result.sourceName}】同步！`);
    setIsSyncModalOpen(false);
  };

  const handleFinish = () => {
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

    const weightAssetVal = todayWeight > 0 ? 200 : 0;
    const weightLiabilityVal = todayWeight > 0 ? 0 : 150;
    totalAssets += weightAssetVal;
    totalLiabilities += weightLiabilityVal;

    finalAnswers.push({
      questionId: 'weight_daily_check',
      category: 'weight',
      questionTitle: '今日體重量測與健康自覺',
      answer: todayWeight > 0 ? 'yes' : 'no',
      isAsset: todayWeight > 0,
      assetValue: weightAssetVal,
      liabilityValue: weightLiabilityVal,
      assetLabel: '體重自覺追蹤資產',
      liabilityLabel: '體重逃避盲目負債',
    });

    const netWorth = totalAssets - totalLiabilities;

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    const record: DailyRecord = {
      date: existingRecord?.date || new Date().toISOString().split('T')[0],
      weight: todayWeight,
      bodyFat: todayBodyFat ? parseFloat(todayBodyFat) : undefined,
      weightSource: weightInputMode === 'auto' ? weightSource : 'manual',
      syncedAt,
      answers: finalAnswers,
      totalAssets,
      totalLiabilities,
      netWorth,
      completed: true,
    };

    onCompleteCheckin(record);
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'nutrition':
      case 'diet':
        return { label: '營養飲食', icon: Utensils, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'exercise':
        return { label: '運動鍛鍊', icon: Dumbbell, color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'hydration':
        return { label: '飲水作息', icon: Droplet, color: 'bg-cyan-50 text-cyan-800 border-cyan-200' };
      case 'weight':
        return { label: '體重體態', icon: Scale, color: 'bg-purple-50 text-purple-800 border-purple-200' };
      default:
        return { label: '健康主題', icon: Sparkles, color: 'bg-slate-50 text-slate-800 border-slate-200' };
    }
  };

  const categoryInfo = getCategoryBadge(currentQuestion.category);
  const CategoryIcon = categoryInfo.icon;
  const currentAnswer = answers[currentQuestion.id];
  const currentBMI = calculateBMI(profile.height, todayWeight);
  const currentBMICategory = getBMICategory(currentBMI);
  const answeredCount = Object.keys(answers).length + (todayWeight > 0 ? 1 : 0);

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col justify-between select-none">
      
      {/* 1. Main Question Card (Compact Single Screen Fit) */}
      <div className="relative overflow-hidden bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200/90 flex flex-col justify-between min-h-[380px] sm:min-h-[400px]">
        
        {/* Top Header: Category, Question ID & Navigation Controls */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${categoryInfo.color}`}>
              <CategoryIcon className="w-3.5 h-3.5" />
              <span>{categoryInfo.label}</span>
            </span>
            {currentQuestion.question_id && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {currentQuestion.question_id}
              </span>
            )}
          </div>

          {/* Stepper Navigation */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 disabled:opacity-25 transition-colors"
              title="上一題"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-600 px-1">
              {currentIndex + 1} <span className="text-slate-300 font-normal">/</span> {totalQuestions}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex === totalQuestions - 1}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 disabled:opacity-25 transition-colors"
              title="下一題"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Question Animated Body */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -40 && currentIndex < totalQuestions - 1) {
                handleNext();
              } else if (info.offset.x > 40 && currentIndex > 0) {
                handlePrev();
              }
            }}
            className="flex-1 flex flex-col justify-between py-3 space-y-3"
          >
            {/* Standard Question (Questions 1 to 9) */}
            {!isLastQuestion ? (
              <div className="space-y-2.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug tracking-tight">
                  {currentQuestion.title}
                </h2>

                {/* Compact Galpin Principle Tag */}
                {currentQuestion.galpin_principle && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50/80 border border-indigo-100 text-[11px] text-indigo-900 font-medium line-clamp-1">
                    <span className="font-bold text-indigo-700">🔬 Galpin 原理：</span>
                    <span className="truncate">{currentQuestion.galpin_principle}</span>
                  </div>
                )}

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {currentQuestion.description}
                </p>

                {/* Compact Impact Bar */}
                <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      <strong>{currentQuestion.positiveAnswer === 'yes' ? '是' : '否'}：</strong>
                      +{currentQuestion.assetValue} {currentQuestion.assetLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-800">
                    <HelpCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">
                      <strong>{currentQuestion.positiveAnswer === 'yes' ? '否' : '是'}：</strong>
                      -${currentQuestion.liabilityValue} {currentQuestion.liabilityLabel}
                    </span>
                  </div>
                </div>

                {/* Compact Tip */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-amber-50/50 p-2 rounded-xl border border-amber-100">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate"><strong>建議：</strong>{currentQuestion.tip}</span>
                </div>
              </div>
            ) : (
              /* Question 10: Compact Weight & Body Fat Setup */
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      第 10 題：今日晨間體重紀錄
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      記錄空腹體重，立即存入 <strong>+$200 健康資產</strong>
                    </p>
                  </div>

                  {/* Mode switch */}
                  <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-[11px]">
                    <button
                      type="button"
                      onClick={() => setWeightInputMode('auto')}
                      className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 transition-all ${
                        weightInputMode === 'auto'
                          ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                          : 'text-slate-500'
                      }`}
                    >
                      <Smartphone className="w-3 h-3 text-emerald-600" />
                      <span>手機同步</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeightInputMode('manual')}
                      className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 transition-all ${
                        weightInputMode === 'manual'
                          ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                          : 'text-slate-500'
                      }`}
                    >
                      <Sliders className="w-3 h-3 text-purple-600" />
                      <span>手動</span>
                    </button>
                  </div>
                </div>

                {/* Auto Sync Banner */}
                {weightInputMode === 'auto' && (
                  <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <Heart className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-[11px] text-emerald-900 truncate">
                        {syncFeedback || (syncedAt ? `已同步 (${syncedAt})` : '可一鍵讀取 Apple/Google 健康數據')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={handleQuickSync}
                        disabled={isQuickSyncing}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shadow-xs hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isQuickSyncing ? 'animate-spin' : ''}`} />
                        <span>{isQuickSyncing ? '同步中' : '一鍵同步'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSyncModalOpen(true)}
                        className="px-1.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-800 text-[11px]"
                      >
                        設定
                      </button>
                    </div>
                  </div>
                )}

                {/* Compact Weight Stepper */}
                <div className="p-2.5 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTodayWeight((w) => Number((Math.max(30, w - 0.1)).toFixed(1)))}
                      className="w-8 h-8 rounded-xl bg-white shadow-xs border border-slate-200 text-slate-800 font-bold hover:bg-slate-100 flex items-center justify-center text-sm active:scale-95"
                    >
                      -
                    </button>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={todayWeight}
                        onChange={(e) => setTodayWeight(parseFloat(e.target.value) || 0)}
                        className="w-24 text-center text-xl font-black text-slate-900 bg-white border border-purple-200 rounded-xl py-1 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                      />
                      <span className="text-[10px] font-bold text-slate-400 absolute right-1.5 bottom-1.5">kg</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTodayWeight((w) => Number((w + 0.1).toFixed(1)))}
                      className="w-8 h-8 rounded-xl bg-white shadow-xs border border-slate-200 text-slate-800 font-bold hover:bg-slate-100 flex items-center justify-center text-sm active:scale-95"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${currentBMICategory.bgColor} ${currentBMICategory.textColor}`}>
                      BMI: {currentBMI} ({currentBMICategory.label})
                    </span>
                  </div>
                </div>

                {/* Quick adjustments pills */}
                <div className="flex items-center justify-between gap-1 text-[10px]">
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
                      className="flex-1 py-1 rounded-md bg-slate-50 hover:bg-purple-50 border border-slate-200 text-slate-600 hover:text-purple-700 font-medium text-center"
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Answer Control Buttons */}
            <div className="pt-2">
              {!isLastQuestion ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleAnswer(currentQuestion, 'yes')}
                    className={`py-3 px-3 rounded-2xl font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs text-sm ${
                      currentAnswer === 'yes'
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-sm'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>【是】符合</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAnswer(currentQuestion, 'no')}
                    className={`py-3 px-3 rounded-2xl font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs text-sm ${
                      currentAnswer === 'no'
                        ? 'bg-rose-600 text-white ring-2 ring-rose-300 shadow-sm'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    <span>【否】未符合</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="w-full py-3 px-4 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>完成問答・結算今日資產負債表</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 2. Bottom Health Balance Sheet & 10-Question Progress Bar (放置最下區・一目了然) */}
      <div className="mt-3 bg-white rounded-2xl p-3 shadow-xs border border-slate-200/90 space-y-2">
        {/* Real-time Net Worth & Assets/Liabilities Summary */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">即時健康淨值</span>
            <span className={`font-black text-sm ${runningNetWorth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {runningNetWorth >= 0 ? `+$${runningNetWorth}` : `-$${Math.abs(runningNetWorth)}`}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <TrendingUp className="w-3 h-3" />
              +${runningAssets}
            </span>
            <span className="flex items-center gap-1 text-rose-600 font-bold">
              <TrendingDown className="w-3 h-3" />
              -${runningLiabilities}
            </span>
            <span className="text-slate-400">
              ({answeredCount > 10 ? 10 : answeredCount}/10題)
            </span>
          </div>
        </div>

        {/* 10 Dots Progress Track */}
        <div className="grid grid-cols-10 gap-1 sm:gap-1.5 pt-0.5">
          {questions.map((q, idx) => {
            const hasAns = answers[q.id] !== undefined || (idx === 9 && todayWeight > 0);
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  setDirection(idx > currentIndex ? 1 : -1);
                  setCurrentIndex(idx);
                }}
                className={`h-2 rounded-full transition-all ${
                  isCurrent
                    ? 'ring-2 ring-emerald-500 ring-offset-1 bg-emerald-500 scale-105'
                    : hasAns
                    ? 'bg-emerald-400'
                    : 'bg-slate-200 hover:bg-slate-300'
                }`}
                title={`第 ${idx + 1} 題`}
              />
            );
          })}
        </div>
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

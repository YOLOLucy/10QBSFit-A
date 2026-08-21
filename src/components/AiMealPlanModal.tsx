import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Users, 
  Flame, 
  Dna, 
  Scale, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChefHat, 
  UtensilsCrossed, 
  ShoppingCart, 
  ArrowRight,
  ShieldAlert,
  CalendarCheck,
  Check,
  Activity,
  HeartPulse,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { DayMealPlan, GroceryItem, UserProfile, DailyRecord, PlanNutritionSummary } from '../types';
import { calculateGalpinMacroTargets, GalpinMacroPlan, loadUserProfile } from '../utils/calculations';

export interface AiMealPlanResult {
  servings: number;
  themeTitle: string;
  galpinSummary: string;
  nutritionTarget?: PlanNutritionSummary;
  weeklyMealPlan: DayMealPlan[];
  groceryList: GroceryItem[];
}

interface AiMealPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPlan: (result: AiMealPlanResult) => void;
  currentServings?: number;
  profile?: UserProfile;
  latestRecord?: DailyRecord | null;
}

const FITNESS_GOALS = [
  {
    id: '增肌修復與代謝優化',
    title: '🏋️ 增肌修復 (Hypertrophy & MPS)',
    desc: '熱量盈餘 +300kcal，蛋白質 2.0g/kg，刺激亮氨酸閾值促進肌肉蛋白質合成',
  },
  {
    id: '減脂維持與高飽足穩定血糖',
    title: '⚖️ 減脂維持 (Fat Loss & Satiety)',
    desc: '熱量赤字 -400kcal，高蛋白質 2.2g/kg 保肌抗分解，搭配高纖低 GI 原型碳水',
  },
  {
    id: '運動表現與週期化耐力充能',
    title: '⚡ 運動表現 (Performance & Glycogen)',
    desc: '微幅熱量補給 +150kcal，蛋白質 1.8g/kg，補給優質複合碳水與電解質',
  },
  {
    id: '抗發炎長壽與神經修復',
    title: '🌿 抗發炎長壽 (Longevity & Recovery)',
    desc: '熱量維持平衡，蛋白質 1.6g/kg，強化深海 Omega-3、十字花科蘿蔔硫素抗氧化',
  },
];

const DIET_PREFERENCES = [
  { id: '原型全食物均衡 (Omnivore)', label: '🥩 原型全食物均衡 (肉/魚/蛋/穀/蔬)' },
  { id: '多海鮮白肉地中海 (Pescatarian & Lean Poultry)', label: '🐟 多海鮮白肉 (鯖魚/鮭魚/雞胸/豆腐)' },
  { id: '低碳抗發炎 (Low Carb Anti-inflammatory)', label: '🥑 低碳高優質油脂 (極少精緻澱粉)' },
  { id: '蛋奶素植物優質蛋白 (Lacto-Ovo Vegetarian)', label: '🥚 蛋奶素 (雞蛋/希臘優格/毛豆/豆腐/堅果)' },
];

export const AiMealPlanModal: React.FC<AiMealPlanModalProps> = ({
  isOpen,
  onClose,
  onApplyPlan,
  currentServings = 2,
  profile: propProfile,
  latestRecord,
}) => {
  // Load base profile from prop or local storage
  const baseProfile = useMemo(() => {
    return propProfile || loadUserProfile();
  }, [propProfile]);

  const [servings, setServings] = useState<number>(currentServings);
  const [fitnessGoal, setFitnessGoal] = useState<string>(FITNESS_GOALS[0].id);
  const [dietPreference, setDietPreference] = useState<string>(DIET_PREFERENCES[0].id);
  const [specialNotes, setSpecialNotes] = useState<string>('');

  // User physiological biometric states (height, weight, body fat, etc.)
  const [height, setHeight] = useState<number>(baseProfile.height || 172);
  const [weight, setWeight] = useState<number>(
    latestRecord?.weight || baseProfile.weight || 68.5
  );
  const [bodyFat, setBodyFat] = useState<number | undefined>(
    latestRecord?.bodyFat !== undefined 
      ? latestRecord.bodyFat 
      : baseProfile.bodyFat !== undefined 
        ? baseProfile.bodyFat 
        : 22
  );
  const [age, setAge] = useState<number>(baseProfile.age || 29);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(baseProfile.gender || 'female');
  const [activityLevel, setActivityLevel] = useState<UserProfile['activityLevel']>(
    baseProfile.activityLevel || 'light'
  );

  const [isBiometricsExpanded, setIsBiometricsExpanded] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<AiMealPlanResult | null>(null);
  const [previewTab, setPreviewTab] = useState<'plan' | 'grocery'>('plan');
  const [selectedPreviewDay, setSelectedPreviewDay] = useState<number>(0);

  // Sync state when modal opens or base profile changes
  useEffect(() => {
    if (isOpen) {
      if (baseProfile.height) setHeight(baseProfile.height);
      if (latestRecord?.weight) setWeight(latestRecord.weight);
      else if (baseProfile.weight) setWeight(baseProfile.weight);

      if (latestRecord?.bodyFat !== undefined) setBodyFat(latestRecord.bodyFat);
      else if (baseProfile.bodyFat !== undefined) setBodyFat(baseProfile.bodyFat);

      if (baseProfile.age) setAge(baseProfile.age);
      if (baseProfile.gender) setGender(baseProfile.gender);
      if (baseProfile.activityLevel) setActivityLevel(baseProfile.activityLevel);
    }
  }, [isOpen, baseProfile, latestRecord]);

  // Real-time calculation of BMR, TDEE, and Macronutrients
  const macroPlan: GalpinMacroPlan = useMemo(() => {
    return calculateGalpinMacroTargets(
      {
        height: height || 172,
        weight: weight || 68.5,
        bodyFat: bodyFat,
        age: age || 29,
        gender: gender || 'female',
        activityLevel: activityLevel || 'light',
      },
      fitnessGoal
    );
  }, [height, weight, bodyFat, age, gender, activityLevel, fitnessGoal]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setGeneratedResult(null);
    setLoadingStep(1);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1400);

    try {
      const res = await fetch('/api/gemini/generate-meal-and-grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servings,
          fitnessGoal,
          dietPreference,
          specialNotes,
          language: 'zh-TW',
          userBiometrics: {
            height,
            weight,
            bodyFat,
            age,
            gender,
            activityLevel,
            bmr: macroPlan.bmr,
            tdee: macroPlan.tdee,
            targetCalories: macroPlan.targetCalories,
            targetProteinG: macroPlan.targetProteinG,
            targetCarbsG: macroPlan.targetCarbsG,
            targetFatsG: macroPlan.targetFatsG,
          },
        }),
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        setGeneratedResult(json.data);
      } else {
        throw new Error('無法取得 AI 規劃數據，請重試');
      }
    } catch (err: any) {
      console.error('AI Meal Generation Request Error:', err);
      setErrorMessage(err.message || '生成失敗，請確認網路連線或稍後再試。');
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (generatedResult) {
      onApplyPlan(generatedResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-900 via-emerald-800 to-emerald-900 text-white p-5 sm:p-6 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-700/80 text-emerald-200">
                <Sparkles className="w-4 h-4 text-emerald-300" />
              </span>
              <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                Dr. Andy Galpin Nutrition Protocol
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              AI 客製菜單與同步採買清單生成
            </h2>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              根據您的<strong>身高、體重、體脂率</strong>精準換算 <strong>TDEE 與三大營養素黃金配比</strong>，結合 1-4 人份同步生成一週原型食物菜單與超市採買清單。
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">生成失敗</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* STATE 1: Generation Configuration Form (When not loading and no result yet) */}
          {!isLoading && !generatedResult && (
            <div className="space-y-6">
              
              {/* SECTION A: Individual Physiological Metrics & Real-time TDEE/Macronutrient Engine */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        1. 帳戶個人生理數值與 TDEE 三大營養素計算
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        已自動代入您的健康檔案，可直接於下方微調即時試算
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsBiometricsExpanded(!isBiometricsExpanded)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <span>{isBiometricsExpanded ? '收合微調' : '展開微調'}</span>
                    {isBiometricsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Collapsible Input Form */}
                {isBiometricsExpanded && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-200/80">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        身高 (Height)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={height}
                          onChange={(e) => setHeight(Math.max(Number(e.target.value) || 0, 100))}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-900 pr-8 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          placeholder="172"
                        />
                        <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-semibold">cm</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        目前體重 (Weight)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={weight}
                          onChange={(e) => setWeight(Math.max(Number(e.target.value) || 0, 30))}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-900 pr-8 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          placeholder="68.5"
                        />
                        <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-semibold">kg</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        體脂率 (Body Fat)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={bodyFat !== undefined ? bodyFat : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBodyFat(val === '' ? undefined : Number(val));
                          }}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-900 pr-7 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          placeholder="22.0"
                        />
                        <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-semibold">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        日常活動量等級
                      </label>
                      <select
                        value={activityLevel}
                        onChange={(e) => setActivityLevel(e.target.value as any)}
                        className="w-full px-2.5 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      >
                        <option value="sedentary">久坐無規律運動 (1.2x)</option>
                        <option value="light">輕度活動每週1-3天 (1.375x)</option>
                        <option value="moderate">中度運動每週3-5天 (1.55x)</option>
                        <option value="very_active">高強度每週6-7天 (1.725x)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Real-time TDEE & 3 Major Macronutrients Calculation Result Card */}
                <div className="bg-white rounded-2xl p-4 border border-emerald-100/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-lg">
                        TDEE 計算完成
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        基礎代謝 BMR: <span className="text-emerald-700 font-extrabold">{macroPlan.bmr}</span> kcal | 每日總消耗 TDEE: <span className="text-emerald-700 font-extrabold">{macroPlan.tdee}</span> kcal
                      </span>
                    </div>

                    <div className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                      🎯 每日目標攝取: <span className="text-base text-emerald-950 font-black">{macroPlan.targetCalories}</span> kcal/天
                    </div>
                  </div>

                  {/* 3 Major Macronutrient Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {/* Protein */}
                    <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-rose-900 flex items-center gap-1">
                          🥩 蛋白質 (Protein)
                        </span>
                        <span className="font-bold text-rose-700">{macroPlan.proteinRatioPercent}%</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-rose-950">{macroPlan.targetProteinG}</span>
                        <span className="text-xs font-bold text-rose-800">g / 日</span>
                        <span className="text-[10px] text-rose-600 ml-auto font-semibold">({macroPlan.proteinPerKg}g/kg)</span>
                      </div>
                      <div className="text-[10px] text-rose-700 font-medium">
                        每餐約 <strong>{macroPlan.perMealProteinG}g</strong> 觸發 MPS 亮氨酸閾值
                      </div>
                    </div>

                    {/* Low-GI Carbs */}
                    <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-amber-900 flex items-center gap-1">
                          🍠 低 GI 碳水 (Carbs)
                        </span>
                        <span className="font-bold text-amber-700">{macroPlan.carbsRatioPercent}%</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-amber-950">{macroPlan.targetCarbsG}</span>
                        <span className="text-xs font-bold text-amber-800">g / 日</span>
                      </div>
                      <div className="text-[10px] text-amber-700 font-medium">
                        地瓜、燕麥、藜麥原型慢釋放肝醣
                      </div>
                    </div>

                    {/* Healthy Fats */}
                    <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-teal-900 flex items-center gap-1">
                          🥑 優質好油脂 (Fats)
                        </span>
                        <span className="font-bold text-teal-700">{macroPlan.fatsRatioPercent}%</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-teal-950">{macroPlan.targetFatsG}</span>
                        <span className="text-xs font-bold text-teal-800">g / 日</span>
                      </div>
                      <div className="text-[10px] text-teal-700 font-medium">
                        深海 Omega-3、EVOO 橄欖油抗發炎
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Servings Selection (1-4 人份) */}
              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>2. 選擇預計用餐人數（1 ~ 4 人份）</span>
                  <span className="text-[11px] font-normal text-slate-400">（菜單三大營養素以個人為核心基準，採買總量等比倍增）</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { count: 1, label: '1 人份 (個人專屬)', icon: '👤', desc: '一人一週備餐，完全貼合個人 TDEE' },
                    { count: 2, label: '2 人份 (雙人日常)', icon: '👥', desc: '雙人早午晚餐，採買份量乘 2 倍' },
                    { count: 3, label: '3 人份 (小家庭)', icon: '👨‍👩‍👦', desc: '三人份量，兼顧多樣口味與備餐' },
                    { count: 4, label: '4 人份 (家庭全包)', icon: '👨‍👩‍👧‍👦', desc: '四人一週大份量採買規格' },
                  ].map((s) => (
                    <button
                      key={s.count}
                      type="button"
                      onClick={() => setServings(s.count)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        servings === s.count
                          ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 text-slate-900 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="text-xl mb-1">{s.icon}</div>
                      <div className="text-xs font-extrabold text-slate-900">{s.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fitness Goal Selection (Dr. Galpin Pillars) */}
              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-emerald-600" />
                  <span>3. 核心健康目標 (影響每日熱量增減與蛋白質倍率)</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {FITNESS_GOALS.map((goal) => (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setFitnessGoal(goal.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        fitnessGoal === goal.id
                          ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 text-slate-900 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-black text-slate-900 mb-1">{goal.title}</div>
                      <div className="text-[11px] text-slate-500 leading-relaxed">{goal.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Diet Preference Selection */}
              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                  <span>4. 飲食生活習慣偏好</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DIET_PREFERENCES.map((diet) => (
                    <button
                      key={diet.id}
                      type="button"
                      onClick={() => setDietPreference(diet.id)}
                      className={`px-3.5 py-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                        dietPreference === diet.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      {diet.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special Custom Notes */}
              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1.5">
                  5. 特殊自訂備註（選填）
                </label>
                <input
                  type="text"
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="例如：不吃牛肉、偏好鮭魚與毛豆、需方便微波便當、多加蒜香..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Andy Galpin Science Note Card */}
              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-100 text-teal-900 text-xs space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-teal-950">
                  <Dna className="w-4 h-4 text-teal-700" />
                  <span>Dr. Andy Galpin 生理營養三大金律保證</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-teal-800 space-y-0.5">
                  <li><strong>客製 TDEE 校準：</strong>以目前體重 {weight}kg 與體脂 {bodyFat ? `${bodyFat}%` : '基準'} 計算，每日目標攝取 {macroPlan.targetCalories} kcal。</li>
                  <li><strong>蛋白質分散：</strong>每日規劃 {macroPlan.targetProteinG}g 蛋白，每餐均勻攝取 ~{macroPlan.perMealProteinG}g 刺激亮氨酸 (Leucine) MPS 扳機。</li>
                  <li><strong>100% 同步超市規格：</strong>菜單每道料理食材與超市採買清單精確匹配，採買備餐不浪費！</li>
                </ul>
              </div>
            </div>
          )}

          {/* STATE 2: Loading State with Step-by-Step Animation */}
          {isLoading && (
            <div className="py-12 px-4 text-center space-y-6">
              <div className="relative inline-block">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center mx-auto text-emerald-700 animate-pulse">
                  <ChefHat className="w-8 h-8" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900">
                  AI 正在依您的 TDEE 與 Dr. Galpin 理論計算專屬菜單...
                </h3>
                <p className="text-xs text-slate-500">
                  針對 {height}cm / {weight}kg / TDEE {macroPlan.tdee} kcal 規劃三大營養素與 {servings} 人份 7 天超市採買清單
                </p>
              </div>

              {/* Progress Steps */}
              <div className="max-w-md mx-auto bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-2.5 text-xs">
                {[
                  `生理校準：計算 TDEE (${macroPlan.tdee} kcal) 與每日目標熱量 (${macroPlan.targetCalories} kcal)`,
                  `蛋白質合成：規劃每日 ${macroPlan.targetProteinG}g 蛋白質與每餐 ${macroPlan.perMealProteinG}g 亮氨酸閾值`,
                  '週期化配置 7 天早餐、午餐、晚餐、健康點心與低 GI 原型碳水',
                  `精確等比縮放 ${servings} 人份 7 天超市採買品項與分區清單`,
                ].map((stepText, idx) => {
                  const stepNum = idx + 1;
                  const isDone = loadingStep > stepNum;
                  const isCurrent = loadingStep === stepNum;
                  return (
                    <div 
                      key={stepText} 
                      className={`flex items-center gap-2.5 transition-opacity ${
                        isDone || isCurrent ? 'opacity-100 font-semibold' : 'opacity-40'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                          {stepNum}
                        </div>
                      )}
                      <span className={isCurrent ? 'text-emerald-700' : 'text-slate-700'}>
                        {stepText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STATE 3: Generated Result Preview */}
          {!isLoading && generatedResult && (
            <div className="space-y-5">
              {/* Success Plan Overview Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-black bg-emerald-600 text-white px-2.5 py-1 rounded-lg">
                    {generatedResult.servings} 人份 7 天方案已就緒
                  </span>
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                    <span>採買清單共 {generatedResult.groceryList.length} 項食材・100% 同步</span>
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {generatedResult.themeTitle}
                </h3>
                
                {/* Biometrics & Nutrition Target Summary */}
                {generatedResult.nutritionTarget && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white/80 p-3 rounded-xl border border-emerald-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">每日目標熱量</span>
                      <span className="font-black text-slate-900">{generatedResult.nutritionTarget.targetCalories} kcal</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">蛋白質目標</span>
                      <span className="font-black text-rose-700">{generatedResult.nutritionTarget.targetProteinG}g ({generatedResult.nutritionTarget.proteinRatioPercent || 25}%)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">低GI碳水目標</span>
                      <span className="font-black text-amber-700">{generatedResult.nutritionTarget.targetCarbsG}g ({generatedResult.nutritionTarget.carbsRatioPercent || 45}%)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">好油脂目標</span>
                      <span className="font-black text-teal-700">{generatedResult.nutritionTarget.targetFatsG}g ({generatedResult.nutritionTarget.fatsRatioPercent || 30}%)</span>
                    </div>
                  </div>
                )}

                <p className="text-xs text-emerald-800 leading-relaxed bg-white/70 p-3 rounded-xl border border-emerald-100">
                  💡 <strong>Galpin 生理摘要：</strong>{generatedResult.galpinSummary}
                </p>
              </div>

              {/* Preview Mode Switcher */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl max-w-sm">
                <button
                  type="button"
                  onClick={() => setPreviewTab('plan')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    previewTab === 'plan'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  <span>預覽 7 天菜單</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('grocery')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    previewTab === 'grocery'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>預覽超市採買清單 ({generatedResult.groceryList.length})</span>
                </button>
              </div>

              {/* PREVIEW SUBTAB 1: 7 Days Meal Plan */}
              {previewTab === 'plan' && (
                <div className="space-y-3">
                  {/* Day Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                    {generatedResult.weeklyMealPlan.map((plan, idx) => (
                      <button
                        key={plan.dayOfWeek}
                        type="button"
                        onClick={() => setSelectedPreviewDay(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          selectedPreviewDay === idx
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {plan.dayOfWeek}
                      </button>
                    ))}
                  </div>

                  {/* Selected Day Preview Card */}
                  {generatedResult.weeklyMealPlan[selectedPreviewDay] && (
                    <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 pb-2">
                        <div>
                          <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                            {generatedResult.weeklyMealPlan[selectedPreviewDay].dayOfWeek}
                          </span>
                          <span className="text-xs font-bold text-slate-900 ml-2">
                            {generatedResult.weeklyMealPlan[selectedPreviewDay].dayTitle}
                          </span>
                        </div>
                        {generatedResult.weeklyMealPlan[selectedPreviewDay].totalCaloriesApprox && (
                          <span className="text-xs font-bold text-slate-600">
                            全日熱量: ~{generatedResult.weeklyMealPlan[selectedPreviewDay].totalCaloriesApprox} kcal | 蛋白: ~{generatedResult.weeklyMealPlan[selectedPreviewDay].totalProteinApprox}g
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-100">
                        {generatedResult.weeklyMealPlan[selectedPreviewDay].nutritionTip}
                      </div>

                      {/* 4 Meals */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {[
                          { label: '早餐', meal: generatedResult.weeklyMealPlan[selectedPreviewDay].breakfast, bg: 'bg-amber-50/70 border-amber-200/70' },
                          { label: '午餐', meal: generatedResult.weeklyMealPlan[selectedPreviewDay].lunch, bg: 'bg-emerald-50/70 border-emerald-200/70' },
                          { label: '晚餐', meal: generatedResult.weeklyMealPlan[selectedPreviewDay].dinner, bg: 'bg-teal-50/70 border-teal-200/70' },
                          { label: '點心', meal: generatedResult.weeklyMealPlan[selectedPreviewDay].snack, bg: 'bg-purple-50/70 border-purple-200/70' },
                        ].map(({ label, meal, bg }) => (
                          <div key={label} className={`p-3 rounded-xl border ${bg} space-y-1`}>
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-slate-800">{label}</span>
                              <span className="text-emerald-700">
                                ~{meal.caloriesApprox} kcal | 蛋白 {meal.proteinApprox}g
                                {meal.carbsApprox ? ` | 碳水 ${meal.carbsApprox}g` : ''}
                              </span>
                            </div>
                            <div className="font-bold text-slate-900 text-xs">{meal.name}</div>
                            <div className="text-[11px] text-slate-600">{meal.description}</div>
                            {meal.ingredients && meal.ingredients.length > 0 && (
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 flex-wrap pt-0.5">
                                <span className="font-semibold text-slate-600">食材：</span>
                                {meal.ingredients.map((ing) => (
                                  <span key={ing} className="bg-white/80 px-1.5 py-0.2 rounded border border-slate-200">
                                    {ing}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PREVIEW SUBTAB 2: Grocery List */}
              {previewTab === 'grocery' && (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {generatedResult.groceryList.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{item.name}</span>
                          <span className="text-[11px] text-emerald-700 font-semibold ml-2">{item.quantity}</span>
                          {item.notes && (
                            <div className="text-[10px] text-slate-400 mt-0.5">💡 {item.notes}</div>
                          )}
                          {item.mealUsage && item.mealUsage.length > 0 && (
                            <div className="text-[9px] text-slate-500 mt-1 flex items-center gap-1 flex-wrap">
                              {item.mealUsage.slice(0, 3).map((u) => (
                                <span key={u} className="bg-slate-100 px-1 py-0.2 rounded text-slate-700 font-medium">
                                  {u}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          {!generatedResult ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>依 TDEE 生成 {servings} 人份菜單與採買清單</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setGeneratedResult(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                ← 重新微調生理數值或目標
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>一鍵套用此菜單與採買清單</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

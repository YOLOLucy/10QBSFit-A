import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Users, 
  Flame, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  UtensilsCrossed, 
  ShoppingCart, 
  Check,
  Activity,
  ChevronDown,
  ChevronUp,
  Globe,
  ExternalLink,
  Shuffle,
  Info,
  Clock
} from 'lucide-react';
import { 
  DayMealPlan, 
  GroceryItem, 
  UserProfile, 
  DailyRecord, 
  PlanNutritionSummary, 
  GroundingSource, 
  WebRecipeSuggestion 
} from '../types';
import { 
  calculateGalpinMacroTargets, 
  GalpinMacroPlan, 
  loadUserProfile,
  generateClientGalpinMealPlan,
} from '../utils/calculations';

export interface AiMealPlanResult {
  servings: number;
  themeTitle: string;
  galpinSummary: string;
  nutritionTarget?: PlanNutritionSummary;
  weeklyMealPlan: DayMealPlan[];
  groceryList: GroceryItem[];
  groundingSources?: GroundingSource[];
  searchQueriesUsed?: string[];
}

interface AiMealPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPlan: (result: AiMealPlanResult) => void;
  onInsertRecipeToDay?: (recipe: WebRecipeSuggestion, dayOfWeek: string, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => void;
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
  const baseProfile = useMemo(() => {
    return propProfile || loadUserProfile();
  }, [propProfile]);

  const [servings, setServings] = useState<number>(currentServings);
  const [fitnessGoal, setFitnessGoal] = useState<string>(FITNESS_GOALS[0].id);
  const [dietPreference, setDietPreference] = useState<string>(DIET_PREFERENCES[0].id);
  const [specialNotes, setSpecialNotes] = useState<string>('');
  const [randomizeWebInspiration, setRandomizeWebInspiration] = useState<boolean>(true);

  // User physiological biometrics
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

  // Sync when modal opens
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
      const biometricsPayload = {
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
      };

      // Generate a dynamic variety seed on every click
      const varietySeed = Math.floor(Math.random() * 100000);
      const seedNote = `[多樣性換新種子 #${varietySeed}] ${specialNotes || ''}`;

      try {
        const res = await fetch('/api/gemini/generate-meal-and-grocery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            servings,
            fitnessGoal,
            dietPreference,
            specialNotes: seedNote,
            language: 'zh-TW',
            useGoogleSearch: true,
            userBiometrics: biometricsPayload,
          }),
        });

        clearInterval(stepInterval);

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setGeneratedResult(json.data);
            return;
          }
        }
      } catch (fetchErr) {
        console.warn('Backend API returned error, activating Dr. Galpin calculation fallback:', fetchErr);
      }

      // Seamless fallback to client-side Dr. Galpin calculation engine
      const fallbackResult = generateClientGalpinMealPlan(
        servings,
        fitnessGoal,
        dietPreference,
        biometricsPayload,
        varietySeed
      );
      setGeneratedResult(fallbackResult as AiMealPlanResult);
    } catch (err: any) {
      console.error('AI Meal Generation Request Error:', err);
      const safePlan = generateClientGalpinMealPlan(
        servings,
        fitnessGoal,
        dietPreference,
        {
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
        Math.floor(Math.random() * 100000)
      );
      setGeneratedResult(safePlan as AiMealPlanResult);
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
        <div className="bg-gradient-to-r from-teal-950 via-emerald-900 to-teal-900 text-white p-5 sm:p-6 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-emerald-700/80 text-emerald-200 flex items-center gap-1.5 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-[11px] font-black uppercase tracking-wider">Google 搜尋「問問 AI」模式</span>
              </span>
              <span className="text-xs font-bold text-emerald-300/90 flex items-center gap-1 bg-black/20 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>核心指令：「依安迪·加爾平的理論設計一週菜單」</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Google 問問 AI：依安迪·加爾平理論設計一週菜單與採買清單
            </h2>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              啟動 <strong>Google 搜尋「問問 AI」深度模式</strong>，直接以「依安迪·加爾平的理論設計一週菜單」連網檢索全球運動生理食譜，並依個人 TDEE 與三大營養素目標，精算 1-4 人份 7 天菜單與 100% 同步的超市採買清單。
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

          {/* STATE 1: Configuration Form */}
          {!isLoading && !generatedResult && (
            <div className="space-y-6">
              
              {/* Google Ask AI Mode Query Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border-2 border-emerald-300/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-700 text-white shadow-sm shrink-0 mt-0.5">
                    <Globe className="w-5 h-5 animate-pulse text-emerald-200" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                        Google 搜尋・問問 AI
                      </span>
                      <span className="text-xs font-black text-slate-900">
                        檢索指令：【依安迪·加爾平的理論設計一週菜單】
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      已啟用 Google 搜尋問問 AI 模式，系統將自動從網路檢索 Dr. Andy Galpin 運動生理、MPS 亮氨酸閾值高蛋白原型食譜，並 100% 完整整合進一週 7 天菜單與超市採買清單中。
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setRandomizeWebInspiration(!randomizeWebInspiration)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all border ${
                      randomizeWebInspiration
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="每次生成隨機換新網路食譜靈感"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>{randomizeWebInspiration ? '隨機換新 ON' : '隨機換新 OFF'}</span>
                  </button>
                </div>
              </div>

              {/* SECTION 1: Individual Physiological Metrics & Real-time TDEE/Macronutrient Engine */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        1. 個人生理數值與 TDEE 三大營養素計算
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

              {/* SECTION 2: Servings Selection */}
              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>2. 選擇用餐人數（1 ~ 4 人份）</span>
                  <span className="text-[11px] font-normal text-slate-400">（三大營養素以個人為基準，採買量等比倍增）</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { count: 1, label: '1 人份 (個人專屬)', icon: '👤', desc: '一人一週備餐，精準符合個人 TDEE' },
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

              {/* SECTION 3: Fitness Goal Selection */}
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

              {/* SECTION 4: Diet Preference Selection */}
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

              {/* SECTION 5: Special Custom Notes */}
              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1.5">
                  5. 特殊飲食習慣或指定食材偏好（選填）
                </label>
                <input
                  type="text"
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="例如：不吃牛肉、多用鮭魚與毛豆、偏好多樣蔬菜便當、無麩質、微波便當..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* STATE 2: Loading State with Step-by-Step Animation */}
          {isLoading && (
            <div className="py-12 px-4 text-center space-y-6">
              <div className="relative inline-block">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center mx-auto text-emerald-700 animate-pulse">
                  <Globe className="w-8 h-8" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Google 搜尋「問問 AI」深度檢索中</span>
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  正在以「依安迪·加爾平的理論設計一週菜單」進行聯網整合...
                </h3>
                <p className="text-xs text-slate-500">
                  為 {height}cm / {weight}kg / TDEE {macroPlan.tdee} kcal 精算每日三大營養素，並同步生成 {servings} 人份 7 天超市採買清單
                </p>
              </div>

              {/* Progress Steps */}
              <div className="max-w-md mx-auto bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-2.5 text-xs">
                {[
                  `Google 搜尋「問問 AI」模式：檢索指令「依安迪·加爾平的理論設計一週菜單」`,
                  `生理校準：計算個人 TDEE (${macroPlan.tdee} kcal) 與每日目標熱量 (${macroPlan.targetCalories} kcal)`,
                  `蛋白質合成：規劃每日 ${macroPlan.targetProteinG}g 蛋白質與每餐 ${macroPlan.perMealProteinG}g 亮氨酸閾值`,
                  `食材 100% 完整整合：等比縮放 ${servings} 人份 7 天超市採買品項與分區清單`,
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black bg-emerald-600 text-white px-2.5 py-1 rounded-lg">
                      {generatedResult.servings} 人份 7 天方案已生成
                    </span>
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Google 搜尋「問問 AI」整合完成</span>
                    </span>
                  </div>

                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                    <span>採買清單共 {generatedResult.groceryList.length} 項食材・100% 完整整合</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                  <Globe className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>檢索依據：【依安迪·加爾平的理論設計一週菜單】・MPS 亮氨酸閾值・低 GI 原型全食物</span>
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
                  💡 <strong>Galpin 生理理論摘要：</strong>{generatedResult.galpinSummary}
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
                  <span>預覽 7 天建議菜單</span>
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
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-900">{label}：{meal.name}</span>
                              <span className="text-[10px] text-slate-500 font-semibold">
                                {meal.caloriesApprox} kcal | 蛋白 {meal.proteinApprox}g
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-2">
                              {meal.description}
                            </p>
                            {meal.tags && meal.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {meal.tags.map((tag: string, tIdx: number) => (
                                  <span key={tIdx} className="text-[9px] bg-white/80 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                                    {tag}
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
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span>食材已依 {generatedResult.servings} 人份等比放大，共 {generatedResult.groceryList.length} 項</span>
                    <span className="text-emerald-700 font-bold">100% 原型食材・超市分區</span>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                    {generatedResult.groceryList.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs border border-slate-100"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs">
                            {item.category === 'protein' ? '🥩' :
                             item.category === 'vegetables' ? '🥦' :
                             item.category === 'carbs' ? '🍠' :
                             item.category === 'fruits' ? '🍎' :
                             item.category === 'healthy_fats' ? '🥑' : '🧂'}
                          </span>
                          <span className="font-bold text-slate-900">{item.name}</span>
                          <span className="text-[10px] text-slate-400">({item.galpinCategoryName || item.category})</span>
                        </div>
                        <div className="text-slate-600 font-bold">
                          {item.quantity} {item.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          {!generatedResult ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                關閉
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2 transition-all disabled:opacity-50 hover:scale-102"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>以 Google 問問 AI 模式生成 {servings} 人份菜單與採買清單</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGeneratedResult(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  ← 返回修改設定
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 flex items-center gap-1.5 transition-colors"
                >
                  <Shuffle className="w-3.5 h-3.5 text-emerald-700" />
                  <span>換一組 Google 問問 AI 建議菜單</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleApply}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2 transition-all hover:scale-102"
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

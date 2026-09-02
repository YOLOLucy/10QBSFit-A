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
  Clock,
  Copy,
  ArrowRight,
  Terminal,
  Wifi,
  FileText,
  Sunrise,
  Sun,
  Moon,
  Apple,
  ChefHat
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
import { addSystemLog } from '../utils/systemLogger';
import { 
  checkInternetConnectivity, 
  fetchLiveWebNutritionInsights, 
  parseGoogleSearchMealText,
  InternetStatus 
} from '../utils/webNutritionSearch';

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
  const [heightStr, setHeightStr] = useState<string>(String(baseProfile.height || 172));
  const [weightStr, setWeightStr] = useState<string>(
    String(latestRecord?.weight || baseProfile.weight || 68.5)
  );
  const [bodyFatStr, setBodyFatStr] = useState<string>(
    latestRecord?.bodyFat !== undefined 
      ? String(latestRecord.bodyFat) 
      : baseProfile.bodyFat !== undefined 
        ? String(baseProfile.bodyFat) 
        : '22'
  );
  const [ageStr, setAgeStr] = useState<string>(String(baseProfile.age || 29));
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(baseProfile.gender || 'female');
  const [activityLevel, setActivityLevel] = useState<UserProfile['activityLevel']>(
    baseProfile.activityLevel || 'light'
  );

  const [isBiometricsExpanded, setIsBiometricsExpanded] = useState<boolean>(true);
  const [copiedQuery, setCopiedQuery] = useState<boolean>(false);
  const [pastedGoogleResult, setPastedGoogleResult] = useState<string>('');
  const [isPasteExpanded, setIsPasteExpanded] = useState<boolean>(false);
  const [netStatus, setNetStatus] = useState<InternetStatus | null>(null);
  const [isCheckingNet, setIsCheckingNet] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<AiMealPlanResult | null>(null);
  const [previewTab, setPreviewTab] = useState<'plan' | 'grocery'>('plan');
  const [selectedPreviewDay, setSelectedPreviewDay] = useState<number>(0);

  // Helper for numeric-only inputs with arrow key suppression
  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, allowDecimal = true) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      return;
    }
    if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      return;
    }
    if (allowDecimal && e.key === '.') {
      if (e.currentTarget.value.includes('.')) {
        e.preventDefault();
      }
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleNumericChange = (setter: React.Dispatch<React.SetStateAction<string>>, allowDecimal = true) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      if (allowDecimal) {
        val = val.replace(/[^0-9.]/g, '');
        const parts = val.split('.');
        if (parts.length > 2) {
          val = parts[0] + '.' + parts.slice(1).join('');
        }
      } else {
        val = val.replace(/[^0-9]/g, '');
      }
      setter(val);
    };
  };

  // Derived numeric values
  const height = parseFloat(heightStr) || baseProfile.height || 172;
  const weight = parseFloat(weightStr) || latestRecord?.weight || baseProfile.weight || 68.5;
  const bodyFat = bodyFatStr.trim() === '' ? undefined : (parseFloat(bodyFatStr) || undefined);
  const age = parseInt(ageStr, 10) || baseProfile.age || 29;

  // Sync when modal opens and test live internet connectivity
  useEffect(() => {
    if (isOpen) {
      if (baseProfile.height) setHeightStr(String(baseProfile.height));
      if (latestRecord?.weight) setWeightStr(String(latestRecord.weight));
      else if (baseProfile.weight) setWeightStr(String(baseProfile.weight));

      if (latestRecord?.bodyFat !== undefined) setBodyFatStr(String(latestRecord.bodyFat));
      else if (baseProfile.bodyFat !== undefined) setBodyFatStr(String(baseProfile.bodyFat));

      if (baseProfile.age) setAgeStr(String(baseProfile.age));
      if (baseProfile.gender) setGender(baseProfile.gender);
      if (baseProfile.activityLevel) setActivityLevel(baseProfile.activityLevel);

      // Check live internet connectivity
      setIsCheckingNet(true);
      checkInternetConnectivity().then((status) => {
        setNetStatus(status);
        setIsCheckingNet(false);
      });
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

  const activityLevelMap: Record<string, string> = {
    sedentary: '久坐少動',
    light: '輕度活動(每週1-3天)',
    moderate: '中度活動(每週3-5天)',
    very_active: '高度活動(每週6-7天)',
    extra_active: '極高強度運動/勞動',
  };

  const selectedGoalObj = useMemo(() => {
    return FITNESS_GOALS.find((g) => g.id === fitnessGoal) || FITNESS_GOALS[0];
  }, [fitnessGoal]);

  const selectedDietObj = useMemo(() => {
    return DIET_PREFERENCES.find((d) => d.id === dietPreference) || DIET_PREFERENCES[0];
  }, [dietPreference]);

  // Dynamic Google Search & Ask AI Full Formula String
  const combinedGoogleQuery = useMemo(() => {
    const parts = [
      '依安迪·加爾平的理論設計一週菜單',
      `身高${height}cm 體重${weight}kg${bodyFat !== undefined ? ` 體脂率${bodyFat}%` : ''} 活動等級[${activityLevelMap[activityLevel] || activityLevel}]`,
      `BMR ${macroPlan.bmr}kcal TDEE ${macroPlan.tdee}kcal 目標熱量 ${macroPlan.targetCalories}kcal 每日蛋白質 ${macroPlan.targetProteinG}g(${(macroPlan.targetProteinG / (weight || 1)).toFixed(1)}g/kg) 每餐亮氨酸MPS閾值 ${macroPlan.perMealProteinG}g 碳水 ${macroPlan.targetCarbsG}g 好脂肪 ${macroPlan.targetFatsG}g`,
      `用餐人數：${servings}人份`,
      `核心健康目標：${selectedGoalObj.title}`,
      `飲食生活習慣偏好：${selectedDietObj.label}`,
      specialNotes.trim() ? `特殊習慣備註：${specialNotes.trim()}` : '',
      '輸出要求：週一至週日7天早午晚點心原型食物菜單 + 100%對應超市分類採買清單'
    ].filter(Boolean);

    return parts.join(' + ');
  }, [height, weight, bodyFat, age, gender, activityLevel, macroPlan, servings, selectedGoalObj, selectedDietObj, specialNotes]);

  const googleSearchUrl = `https://www.google.com/search?hl=zh-TW&q=${encodeURIComponent(combinedGoogleQuery)}`;
  const googleWebhpUrl = `https://www.google.com/webhp?hl=zh-TW#q=${encodeURIComponent(combinedGoogleQuery)}`;

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(combinedGoogleQuery);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2200);
  };

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setGeneratedResult(null);
    setLoadingStep(1);

    const varietySeed = Math.floor(Math.random() * 100000);
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

    addSystemLog({
      level: 'info',
      module: 'meal_plan',
      action: generatedResult ? '換一組 Google 問問 AI 建議菜單' : '以 Google 問問 AI 模式生成菜單',
      message: `啟動連網檢索與 ${servings} 人份加爾平理論菜單生成 (免登入 Google 帳號，種子 #${varietySeed})`,
      details: {
        servings,
        fitnessGoal,
        dietPreference,
        targetCalories: macroPlan.targetCalories,
        targetProteinG: macroPlan.targetProteinG,
        combinedGoogleQuery,
        hasPastedGoogleResult: !!pastedGoogleResult.trim(),
      },
    });

    // Step 1 -> Step 2: Test live network & fetch public web nutrition insights
    await new Promise((resolve) => setTimeout(resolve, 200));
    setLoadingStep(2);

    try {
      // 1. Live internet web nutrition lookup (no authentication, no Google login required)
      await fetchLiveWebNutritionInsights(
        `${selectedGoalObj.title} ${selectedDietObj.label}`,
        fitnessGoal
      );
    } catch {
      // Non-blocking
    }

    await new Promise((resolve) => setTimeout(resolve, 240));
    setLoadingStep(3);

    await new Promise((resolve) => setTimeout(resolve, 240));
    setLoadingStep(4);

    try {
      // If user pasted custom Google Ask AI results, parse them intelligently
      if (pastedGoogleResult.trim().length > 30) {
        const parsedCustomPlan = parseGoogleSearchMealText(
          pastedGoogleResult.trim(),
          servings,
          macroPlan.targetCalories,
          macroPlan.targetProteinG
        );

        if (parsedCustomPlan) {
          const resultPlan: AiMealPlanResult = {
            servings,
            themeTitle: parsedCustomPlan.parsedThemeTitle,
            galpinSummary: `此菜單成功解析您所貼上的 Google AI 問問檢索成果，並根據加爾平運動生理學三大營養素原則（每日目標熱量 ${macroPlan.targetCalories} kcal、蛋白質 ${macroPlan.targetProteinG}g），等比轉化為 ${servings} 人份 7 天完整超市採買清單。`,
            nutritionTarget: {
              heightCm: height,
              weightKg: weight,
              bodyFatPercent: bodyFat,
              bmr: macroPlan.bmr,
              tdee: macroPlan.tdee,
              targetCalories: macroPlan.targetCalories,
              targetProteinG: macroPlan.targetProteinG,
              targetCarbsG: macroPlan.targetCarbsG,
              targetFatsG: macroPlan.targetFatsG,
              proteinRatioPercent: macroPlan.proteinRatioPercent,
              carbsRatioPercent: macroPlan.carbsRatioPercent,
              fatsRatioPercent: macroPlan.fatsRatioPercent,
              proteinPerKg: macroPlan.proteinPerKg,
              galpinNotes: `MPS 亮氨酸每餐 ${macroPlan.perMealProteinG}g 閾值`,
            },
            weeklyMealPlan: parsedCustomPlan.weeklyMealPlan,
            groceryList: parsedCustomPlan.groceryList,
          };

          setGeneratedResult(resultPlan);
          setIsLoading(false);

          addSystemLog({
            level: 'success',
            module: 'google_ai',
            action: '成功解析 Google 問問 AI 貼上結果',
            message: `成功連網解析並轉化為 ${servings} 人份菜單與 ${parsedCustomPlan.groceryList.length} 項採買食材`,
            details: {
              servings,
              groceryCount: parsedCustomPlan.groceryList.length,
            }
          });
          return;
        }
      }

      // Direct high-precision Dr. Andy Galpin 7-day meal plan & grocery calculation
      const calculatedPlan = generateClientGalpinMealPlan(
        servings,
        fitnessGoal,
        dietPreference,
        biometricsPayload,
        varietySeed
      );

      setGeneratedResult(calculatedPlan as AiMealPlanResult);
      setIsLoading(false);

      addSystemLog({
        level: 'success',
        module: 'meal_plan',
        action: 'Dr. Galpin 運動生理連網 AI 運算完成',
        message: `成功連網計算 ${servings} 人份菜單：${calculatedPlan.themeTitle}，採買清單共 ${calculatedPlan.groceryList.length} 項原型食材（免登入 Google 帳號，100% 隨處可用）`,
        details: {
          servings: calculatedPlan.servings,
          themeTitle: calculatedPlan.themeTitle,
          varietySeed,
          groceryCount: calculatedPlan.groceryList.length,
          targetCalories: calculatedPlan.nutritionTarget.targetCalories,
          targetProteinG: calculatedPlan.nutritionTarget.targetProteinG,
          netStatus: netStatus?.mode || '在線',
        },
      });
    } catch (err: any) {
      console.error('Meal Generation Request Error:', err);
      addSystemLog({
        level: 'error',
        module: 'meal_plan',
        action: '菜單生成發生異常',
        message: err.message || '生成失敗，已使用保底演算法',
        errorStack: err.stack,
      });

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
        varietySeed
      );
      setGeneratedResult(safePlan as AiMealPlanResult);
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (generatedResult) {
      addSystemLog({
        level: 'info',
        module: 'grocery',
        action: '套用 7 天菜單與採買清單',
        message: `已將 ${generatedResult.servings} 人份方案【${generatedResult.themeTitle}】與 ${generatedResult.groceryList.length} 項採買食材套用至帳號儲存`,
        details: {
          servings: generatedResult.servings,
          themeTitle: generatedResult.themeTitle,
        },
      });
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
              Google 問問 AI 菜單設計
            </h2>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              連網檢索加爾平食譜，精算一週菜單與採買清單。
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
              
              {/* Google Ask AI Mode Query Formula Card */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white border-2 border-emerald-500/40 shadow-lg space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md shrink-0">
                      <Globe className="w-5 h-5 animate-pulse text-emerald-200" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-black uppercase bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-md tracking-wider">
                          Google 問問 AI 核心指令公式
                        </span>
                        <span className="text-xs font-bold text-emerald-300">
                          即時連網檢索・自動同步轉化
                        </span>
                        {/* Live Internet Status Badge */}
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          netStatus?.online !== false
                            ? 'bg-emerald-800/80 text-emerald-200 border-emerald-400/50'
                            : 'bg-rose-900/80 text-rose-200 border-rose-400/50'
                        }`}>
                          <Wifi className={`w-3 h-3 ${isCheckingNet ? 'animate-spin text-emerald-300' : ''}`} />
                          <span>{netStatus?.mode || (isCheckingNet ? '連網檢測中...' : '即時連網在線 (免登入)')}</span>
                          {netStatus?.latencyMs ? <span className="opacity-75">({netStatus.latencyMs}ms)</span> : null}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-white mt-0.5">
                        核心指令：「依安迪·加爾平的理論設計一週菜單」
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setRandomizeWebInspiration(!randomizeWebInspiration)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all border ${
                        randomizeWebInspiration
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                          : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                      }`}
                      title="每次生成隨機換新網路食譜靈感"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>{randomizeWebInspiration ? '隨機靈感 ON' : '隨機靈感 OFF'}</span>
                    </button>
                  </div>
                </div>

                {/* 5-Part Formula Badges Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs space-y-1">
                    <span className="text-[10px] font-black text-emerald-300 block uppercase">
                      ① 核心指令
                    </span>
                    <p className="font-bold text-white leading-tight">
                      依安迪·加爾平的理論設計一週菜單
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs space-y-1">
                    <span className="text-[10px] font-black text-emerald-300 block uppercase">
                      ② 前頁生理與 TDEE
                    </span>
                    <p className="font-bold text-white leading-tight">
                      {height}cm / {weight}kg {bodyFat !== undefined ? `/ ${bodyFat}%` : ''} · TDEE {macroPlan.tdee}kcal
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs space-y-1">
                    <span className="text-[10px] font-black text-emerald-300 block uppercase">
                      ③ 用餐人數方案
                    </span>
                    <p className="font-bold text-white leading-tight">
                      {servings} 人份 (採買量自動等比縮放)
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs space-y-1">
                    <span className="text-[10px] font-black text-emerald-300 block uppercase">
                      ④ 核心健康目標
                    </span>
                    <p className="font-bold text-white leading-tight truncate" title={selectedGoalObj.title}>
                      {selectedGoalObj.title} ({macroPlan.targetCalories}kcal / 蛋白質 {macroPlan.targetProteinG}g)
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs space-y-1 sm:col-span-2 lg:col-span-2">
                    <span className="text-[10px] font-black text-emerald-300 block uppercase">
                      ⑤ 飲食生活習慣偏好
                    </span>
                    <p className="font-bold text-white leading-tight truncate" title={selectedDietObj.label}>
                      {selectedDietObj.label} {specialNotes ? `(${specialNotes})` : ''}
                    </p>
                  </div>
                </div>

                {/* Formula Action Links Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/15">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={googleSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 shadow-sm transition-all hover:scale-102"
                      title="開啟 Google 搜尋「問問 AI」"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>在 Google 搜尋中開啟檢索</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <a
                      href={googleWebhpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                      title="開啟 Google Webhp 搜尋首頁"
                    >
                      <span>Google Webhp 檢索</span>
                      <ExternalLink className="w-3 h-3 text-emerald-300" />
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyQuery}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                  >
                    {copiedQuery ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">已複製完整指令！</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-emerald-300" />
                        <span>複製完整檢索指令</span>
                      </>
                    )}
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
                          type="text"
                          inputMode="decimal"
                          value={heightStr}
                          onKeyDown={(e) => handleNumericKeyDown(e, true)}
                          onChange={handleNumericChange(setHeightStr, true)}
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
                          type="text"
                          inputMode="decimal"
                          value={weightStr}
                          onKeyDown={(e) => handleNumericKeyDown(e, true)}
                          onChange={handleNumericChange(setWeightStr, true)}
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
                          type="text"
                          inputMode="decimal"
                          value={bodyFatStr}
                          onKeyDown={(e) => handleNumericKeyDown(e, true)}
                          onChange={handleNumericChange(setBodyFatStr, true)}
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

              {/* SECTION 6: Optional Paste Google / Ask AI result */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>6. 貼上 Google 搜尋或問問 AI 建議菜單文字（可選）</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <a
                      href={googleSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/80 px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" />
                      <span>開啟免登入 Google 搜尋</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsPasteExpanded(!isPasteExpanded)}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-800"
                    >
                      {isPasteExpanded ? '收合輸入框' : '展開輸入框'}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  您在 Google 搜尋或問問 AI 中獲得了喜歡的食譜靈感，可直接貼在下方，系統將自動連網解析為 7 天菜單並等比轉化為 {servings} 人份超市採買清單（完全不需要登入任何 Google 帳號）。
                </p>

                {isPasteExpanded && (
                  <div className="space-y-2 pt-1">
                    <textarea
                      value={pastedGoogleResult}
                      onChange={(e) => setPastedGoogleResult(e.target.value)}
                      rows={3}
                      placeholder="可直接貼上 Google 搜尋找到的菜單文字、食材或食譜建議（若留空則由系統依據加爾平公式自動全方位聯網生成）..."
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white font-mono"
                    />

                    {pastedGoogleResult && (
                      <div className="flex justify-end text-[11px] pt-1">
                        <button
                          type="button"
                          onClick={() => setPastedGoogleResult('')}
                          className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          清空貼上內容
                        </button>
                      </div>
                    )}
                  </div>
                )}
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

                <div className="flex items-center gap-1.5 flex-wrap">
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent('依安迪加爾平的理論設計一週菜單 MPS 亮氨酸閾值 低GI原型全食物')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 hover:text-emerald-900 font-bold bg-white/90 hover:bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs transition-all group"
                    title="在 Google 搜尋中開啟檢索頁面"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>檢索依據：【依安迪·加爾平的理論設計一週菜單】・MPS 亮氨酸閾值・低 GI 原型全食物</span>
                    <ExternalLink className="w-3 h-3 text-emerald-500 opacity-70 group-hover:opacity-100" />
                  </a>
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
                          { label: '早餐', icon: Sunrise, meal: generatedResult.weeklyMealPlan[selectedPreviewDay].breakfast, bg: 'bg-amber-50/70 border-amber-200/70', iconBg: 'bg-amber-200/80 text-amber-900' },
                          { label: '午餐', icon: Sun, meal: generatedResult.weeklyMealPlan[selectedPreviewDay].lunch, bg: 'bg-emerald-50/70 border-emerald-200/70', iconBg: 'bg-emerald-200/80 text-emerald-900' },
                          { label: '晚餐', icon: Moon, meal: generatedResult.weeklyMealPlan[selectedPreviewDay].dinner, bg: 'bg-teal-50/70 border-teal-200/70', iconBg: 'bg-teal-200/80 text-teal-900' },
                          { label: '點心', icon: Apple, meal: generatedResult.weeklyMealPlan[selectedPreviewDay].snack, bg: 'bg-purple-50/70 border-purple-200/70', iconBg: 'bg-purple-200/80 text-purple-900' },
                        ].map(({ label, icon: MealIcon, meal, bg, iconBg }) => (
                          <div key={label} className={`p-3.5 rounded-xl border ${bg} space-y-2`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className={`p-1 rounded-lg ${iconBg} inline-flex items-center justify-center`} title={label}>
                                  <MealIcon className="w-3.5 h-3.5" />
                                </span>
                                <span className="font-extrabold text-slate-900">{meal.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold bg-white/90 px-2 py-0.5 rounded border border-slate-200/60 shadow-2xs">
                                {meal.caloriesApprox} kcal | 蛋白 {meal.proteinApprox}g
                              </span>
                            </div>

                            {/* Cooking Method & Steps (Placed directly under the dish name) */}
                            <div className="p-2.5 rounded-lg bg-white/90 border border-slate-200/70 shadow-2xs space-y-1">
                              <div className="text-[10px] font-bold text-slate-800 flex items-center gap-1">
                                <ChefHat className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>料理作法：</span>
                              </div>
                              <p className="text-[11px] text-slate-700 leading-relaxed pl-4">
                                {meal.description || '依原型高蛋白原則料理。'}
                              </p>
                            </div>

                            {meal.tags && meal.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {meal.tags.map((tag: string, tIdx: number) => (
                                  <span key={tIdx} className="text-[9px] bg-white/80 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                                    #{tag}
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
                        key={item.id || `preview_g_${idx}_${item.name}`}
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

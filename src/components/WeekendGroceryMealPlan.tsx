import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  UtensilsCrossed, 
  Check, 
  Plus, 
  Trash2, 
  Copy, 
  Sparkles, 
  Flame, 
  ChefHat, 
  RefreshCw,
  Info,
  CalendarCheck,
  Users,
  Globe,
  ExternalLink,
  Settings,
  Target,
  Dumbbell,
  Activity,
  Heart,
  Scale,
  ArrowRight,
  CheckCircle2,
  Wifi,
  FileText,
  Search,
  X,
  Table,
  Eye,
  CheckSquare,
  Sunrise,
  Sun,
  Moon,
  Apple,
  Upload,
  FileUp,
  Download
} from 'lucide-react';
import { INITIAL_GROCERY_LIST, WEEKLY_MEAL_PLAN } from '../data/mealAndGroceryData';
import { GroceryItem, DayMealPlan, UserProfile, DailyRecord } from '../types';
import { 
  getTodayDateString, 
  calculateBMR, 
  calculateTDEE, 
  calculateGalpinMacroTargets,
  generateClientGalpinMealPlan,
} from '../utils/calculations';
import { 
  checkInternetConnectivity, 
  fetchLiveWebNutritionInsights, 
  parseGoogleSearchMealText,
  InternetStatus 
} from '../utils/webNutritionSearch';
import { addSystemLog } from '../utils/systemLogger';

const STORAGE_KEY_GROCERY = 'health_balance_grocery_items_custom_v3';
const STORAGE_KEY_MEALPLAN = 'health_balance_mealplan_custom_v3';
const STORAGE_KEY_PLAN_META = 'health_balance_plan_meta_v3';

interface PlanMeta {
  servings: number;
  themeTitle?: string;
  galpinSummary?: string;
  isAiCustomized?: boolean;
}

interface WeekendGroceryMealPlanProps {
  userProfile?: UserProfile;
  latestRecord?: DailyRecord | null;
  onOpenProfileModal?: () => void;
}

export const WeekendGroceryMealPlan: React.FC<WeekendGroceryMealPlanProps> = ({
  userProfile,
  latestRecord,
  onOpenProfileModal,
}) => {
  // 3 Primary Sub-Tabs: 'settings' (設定) | 'grocery' (一週採購清單) | 'mealplan' (7天建議菜單)
  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'grocery' | 'mealplan'>('settings');

  // Grocery state
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);

  // Settings: Directly read from user account profile (no duplicate re-configuration needed here)
  const servings = userProfile?.servings || 1;
  const fitnessGoal = userProfile?.healthGoal || '減脂維持 (Fat Loss & Satiety)';
  const dietPreference = userProfile?.dietPreference || '原型全食物均衡 (肉/魚/蛋/穀/蔬)';

  // Cooking method preference state (multi-select: 1.電鍋 2.一鍋到底 3.分開料理)
  const [cookingMethods, setCookingMethods] = useState<string[]>(() => {
    if (userProfile?.cookingMethods && userProfile.cookingMethods.length > 0) {
      return userProfile.cookingMethods;
    }
    try {
      const saved = localStorage.getItem('10qbs_preferred_cooking_methods');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return ['電鍋', '一鍋到底', '分開料理'];
  });

  useEffect(() => {
    if (userProfile?.cookingMethods && userProfile.cookingMethods.length > 0) {
      setCookingMethods(userProfile.cookingMethods);
    }
  }, [userProfile?.cookingMethods]);

  const handleToggleCookingMethod = (method: string) => {
    let updated: string[];
    if (cookingMethods.includes(method)) {
      if (cookingMethods.length <= 1) {
        updated = [method]; // Keep at least one
      } else {
        updated = cookingMethods.filter((m) => m !== method);
      }
    } else {
      updated = [...cookingMethods, method];
    }
    setCookingMethods(updated);
    try {
      localStorage.setItem('10qbs_preferred_cooking_methods', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Markdown & Structured Plain Text Modal state for inspecting/copying/downloading
  const [isMarkdownModalOpen, setIsMarkdownModalOpen] = useState<boolean>(false);
  const [markdownModalTab, setMarkdownModalTab] = useState<'grocery' | 'mealplan' | 'both' | 'plaintext'>('mealplan');
  const [copiedModalText, setCopiedModalText] = useState<boolean>(false);

  const [pastedGoogleResult, setPastedGoogleResult] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [copiedQuery, setCopiedQuery] = useState<boolean>(false);
  const [copiedPlainText, setCopiedPlainText] = useState<boolean>(false);
  const [customGoogleQuery, setCustomGoogleQuery] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setPastedGoogleResult(text);
        setUploadedFileName(file.name);
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  // Live network status
  const [netStatus, setNetStatus] = useState<InternetStatus | null>(null);
  const [isCheckingNet, setIsCheckingNet] = useState<boolean>(false);

  // Resolve user metrics dynamically linked directly to userProfile and latestRecord
  const defaultHeight = 164;
  const defaultWeight = 61.35;
  const defaultBodyFat = 28;

  const currentHeight = userProfile?.height || defaultHeight;
  const currentWeight = userProfile?.weight !== undefined && userProfile.weight > 0
    ? userProfile.weight
    : (latestRecord?.weight || defaultWeight);
  const currentBodyFat = userProfile?.bodyFat !== undefined 
    ? userProfile.bodyFat 
    : (latestRecord?.bodyFat !== undefined ? latestRecord.bodyFat : defaultBodyFat);
  const currentAge = userProfile?.age || 29;
  const currentGender = userProfile?.gender || 'female';
  const currentActivityLevel = userProfile?.activityLevel || 'light';

  const genderLabel = currentGender === 'male' ? '男性' : '女性';
  const activityMap: Record<string, string> = {
    sedentary: '久坐少動 (辦公室/每週少運動)',
    light: '輕度活動 (每週運動 1-3 天)',
    moderate: '中度活動 (每週運動 3-5 天)',
    active: '高度活動 (每週運動 6-7 天)',
    very_active: '極高活動 (重度體能勞動/運動員訓練)',
  };
  const activityLabel = activityMap[currentActivityLevel] || '輕度活動';

  // Calculate live BMR, TDEE, and Galpin Macro Targets
  const macroPlan = calculateGalpinMacroTargets({
    height: currentHeight,
    weight: currentWeight,
    bodyFat: currentBodyFat,
    age: currentAge,
    gender: currentGender,
    activityLevel: currentActivityLevel,
  }, fitnessGoal);

  // Load plan metadata (servings, title, Galpin summary)
  const [planMeta, setPlanMeta] = useState<PlanMeta>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLAN_META);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return {
      servings: 1,
      themeTitle: 'Google 問問 AI：依加爾平理論設計之 1898kcal 菜單 (1人份)',
      galpinSummary: '此菜單依循安迪·加爾平博士的運動營養學原則，旨在透過每日蛋白質攝取，並確保每餐蛋白質含量達到 30-45 克以可靠地觸發肌肉蛋白質合成 (MPS)。餐點結合低升糖指數的全穀物與豐富的優質脂肪，有助於穩定血糖、維持能量，並促進全身性代謝優化。所有食材皆為原型食物，並與採買清單 100% 完全同步。',
      isAiCustomized: false,
    };
  });

  // Load weekly meal plan with local storage, default to empty list []
  const [mealPlan, setMealPlan] = useState<DayMealPlan[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MEALPLAN);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Load grocery list with local storage, default to empty list []
  const [groceryList, setGroceryList] = useState<GroceryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GROCERY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Custom new item form state
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<GroceryItem['category']>('protein');
  const [newItemNotes, setNewItemNotes] = useState('');

  // Initial network check & cleanup legacy storage
  useEffect(() => {
    try {
      localStorage.removeItem('health_balance_grocery_items_custom_v2');
      localStorage.removeItem('health_balance_mealplan_custom_v2');
      localStorage.removeItem('health_balance_grocery_items');
      localStorage.removeItem('health_balance_mealplan');
    } catch (e) {
      // ignore
    }
    setIsCheckingNet(true);
    checkInternetConnectivity().then((status) => {
      setNetStatus(status);
      setIsCheckingNet(false);
    });
  }, []);

  // Helper to persist meal plan
  const saveMealPlan = (newPlan: DayMealPlan[]) => {
    setMealPlan(newPlan);
    try {
      localStorage.setItem(STORAGE_KEY_MEALPLAN, JSON.stringify(newPlan));
    } catch (e) {
      console.error(e);
    }
  };

  const saveGroceryList = (newList: GroceryItem[]) => {
    setGroceryList(newList);
    try {
      localStorage.setItem(STORAGE_KEY_GROCERY, JSON.stringify(newList));
    } catch (e) {
      console.error(e);
    }
  };

  const savePlanMeta = (meta: PlanMeta) => {
    setPlanMeta(meta);
    try {
      localStorage.setItem(STORAGE_KEY_PLAN_META, JSON.stringify(meta));
    } catch (e) {
      console.error(e);
    }
  };

  // Auto-sync or initialize default Galpin meal plan to reflect current macro targets
  useEffect(() => {
    // If meal plan is empty or using default Galpin model (not customized via pasted Google AI text),
    // ensure daily calories and protein are strictly synced with current macro targets.
    if (!planMeta.isAiCustomized || mealPlan.length === 0) {
      const calculated = generateClientGalpinMealPlan(
        servings,
        fitnessGoal,
        dietPreference,
        macroPlan,
        0
      );
      if (mealPlan.length === 0) {
        saveMealPlan(calculated.weeklyMealPlan);
        saveGroceryList(calculated.groceryList);
        savePlanMeta({
          servings,
          themeTitle: calculated.themeTitle,
          galpinSummary: calculated.galpinSummary,
          isAiCustomized: false,
        });
      } else {
        // Check if calories or protein have changed compared to first day's total
        const firstDay = mealPlan[0];
        const existingCal = firstDay?.totalCaloriesApprox || 0;
        const existingProt = firstDay?.totalProteinApprox || 0;
        if (existingCal !== macroPlan.targetCalories || existingProt !== macroPlan.targetProteinG) {
          saveMealPlan(calculated.weeklyMealPlan);
          saveGroceryList(calculated.groceryList);
          savePlanMeta({
            servings,
            themeTitle: calculated.themeTitle,
            galpinSummary: calculated.galpinSummary,
            isAiCustomized: false,
          });
        }
      }
    }
  }, [
    macroPlan.targetCalories,
    macroPlan.targetProteinG,
    servings,
    fitnessGoal,
    dietPreference,
    planMeta.isAiCustomized,
  ]);

  // Recalibrate existing meal plan to match latest macroPlan targets
  const handleRecalibrateToLatestTargets = () => {
    const calculated = generateClientGalpinMealPlan(
      servings,
      fitnessGoal,
      dietPreference,
      macroPlan,
      0,
      cookingMethods
    );
    saveMealPlan(calculated.weeklyMealPlan);
    saveGroceryList(calculated.groceryList);
    savePlanMeta({
      servings,
      themeTitle: calculated.themeTitle,
      galpinSummary: calculated.galpinSummary,
      isAiCustomized: false,
    });
  };

  const cookingMethodsStr = cookingMethods && cookingMethods.length > 0 ? cookingMethods.join('、') : '電鍋、一鍋到底、分開料理';

  // Google Search query builder string with Settings 1 + 2 + 3 and text-file export instruction
  const defaultGoogleQueryText = `依安迪·加爾平博士 (Dr. Andy Galpin) 運動生理學與營養學理論設計一週菜單與超市食材採買清單：
【1. 核心指令】加爾平運動生理學原則，每餐蛋白質達 30-45g 觸發肌肉蛋白質合成 (MPS) 亮氨酸超量恢復，100% 原型全食物。
【2. 前頁生理與 TDEE 數據】身高 ${currentHeight}cm、體重 ${currentWeight}kg、體脂率 ${currentBodyFat}%、年齡 ${currentAge}歲 (${genderLabel})、活動量「${activityLabel}」、基礎代謝率 BMR ${macroPlan.bmr} kcal、每日總消耗 TDEE ${macroPlan.tdee} kcal、每日目標熱量 ${macroPlan.targetCalories} kcal、目標蛋白質 ${macroPlan.targetProteinG}g。
【3. 個人偏好與生成設定】用餐人數「${servings} 人份」（食材採買份量依人數等比縮放）、核心健康目標「${fitnessGoal}」、飲食生活習慣偏好「${dietPreference}」、偏好料理方式「${cookingMethodsStr}」（請優先配合所選料理方式規劃極簡備餐步驟）。
【4. 輸出結構與文字檔格式】
請依序完整輸出以下兩大部分，並將生成內容格式化為繁體中文結構化純文字，使生成內容存檔可以生成下載的文字檔，出現可以一鍵複製的功能便於快速複製使用：
一、【一週超市食材採買清單 (${servings}人份)】
請明確區分以下五大專區，並於各專區底下以 1. 2. 3. 4. 編號列出採購清單（包含食材名稱、建議採買份量規格與營養備註）：
【蛋白質專區】
1. 食材名稱：建議採買份量規格（營養備註）
2. 食材名稱：建議採買份量規格（營養備註）
【蔬菜纖維區】
1. 食材名稱：建議採買份量規格（營養備註）
2. 食材名稱：建議採買份量規格（營養備註）
【優質低GI碳水】
1. 食材名稱：建議採買份量規格（營養備註）
2. 食材名稱：建議採買份量規格（營養備註）
【好油脂與調味】
1. 食材名稱：建議採買份量規格（營養備註）
2. 食材名稱：建議採買份量規格（營養備註）
【低GI水果與飲品】
1. 食材名稱：建議採買份量規格（營養備註）
2. 食材名稱：建議採買份量規格（營養備註）

二、【週一至週日 7天原型食物建議菜單 (${servings}人份)】
請依週一至週日，依序列出每天的早餐、午餐、晚餐、點心（請明確標註「菜色名稱:」、「主要食材:」、「作法:」、「預估蛋白質:」與「預估熱量:」）：
- 早餐：菜色名稱：菜名名稱，主要食材：食材項目，作法：詳細烹調指引，預估蛋白質：30g，預估熱量：400kcal
- 午餐：菜色名稱：菜名名稱，主要食材：食材項目，作法：詳細烹調指引，預估蛋白質：35g，預估熱量：550kcal
- 晚餐：菜色名稱：菜名名稱，主要食材：食材項目，作法：詳細烹調指引，預估蛋白質：35g，預估熱量：500kcal
- 點心：菜色名稱：菜名名稱，主要食材：食材項目，作法：詳細烹調指引，預估蛋白質：15g，預估熱量：200kcal
【存檔規範】請確保生成內容格式完整規範，可直接存檔為可下載的文字檔（.txt 格式），並於輸出區塊中提供便於一鍵複製的純文字格式，文字清晰易讀且完整無遺漏。`;

  const googleQueryText = customGoogleQuery !== null ? customGoogleQuery : defaultGoogleQueryText;
  const isQueryCustomized = customGoogleQuery !== null && customGoogleQuery !== defaultGoogleQueryText;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(googleQueryText)}`;

  const handleCopyGoogleQuery = () => {
    navigator.clipboard.writeText(googleQueryText);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2200);
  };

  // Generate & split into Grocery List + 7-Day Meal Plan
  const handleGenerateAndSplitPlan = async (isChangeSeed: boolean = false) => {
    setIsGenerating(true);

    const varietySeed = isChangeSeed ? Math.floor(Math.random() * 100000) : 0;

    addSystemLog({
      level: 'info',
      module: 'meal_plan',
      action: isChangeSeed ? '換一組 Google 問問 AI 建議菜單' : '以 Google 問問 AI 模式生成菜單',
      message: `啟動 ${servings} 人份加爾平理論菜單生成並分成採購食材與一週菜單 (免登入 Google 帳號)`,
      details: {
        servings,
        fitnessGoal,
        dietPreference,
        targetCalories: macroPlan.targetCalories,
        targetProteinG: macroPlan.targetProteinG,
        hasUploadedFile: !!uploadedFileName,
        hasPastedText: !!pastedGoogleResult.trim(),
      },
    });

    try {
      // 1. Check live web nutrition data
      try {
        await fetchLiveWebNutritionInsights(fitnessGoal, dietPreference);
      } catch {
        // non-blocking
      }

      let generatedGrocery: GroceryItem[] = [];
      let generatedMeals: DayMealPlan[] = [];
      let themeTitle = '';
      let galpinSummary = '';

      // Check if user uploaded a text file or pasted custom Google search results
      if (pastedGoogleResult.trim().length > 10) {
        const parsedCustom = parseGoogleSearchMealText(
          pastedGoogleResult.trim(),
          servings,
          macroPlan.targetCalories,
          macroPlan.targetProteinG
        );

        if (parsedCustom && parsedCustom.weeklyMealPlan.length > 0) {
          generatedMeals = parsedCustom.weeklyMealPlan;
          generatedGrocery = parsedCustom.groceryList;
          themeTitle = parsedCustom.parsedThemeTitle;
          galpinSummary = uploadedFileName
            ? `已成功抓取上傳文字檔【${uploadedFileName}】之內容，並依加爾平運動生理學三大營養素原則（每日目標熱量 ${macroPlan.targetCalories} kcal、蛋白質 ${macroPlan.targetProteinG}g），等比轉化為 ${servings} 人份一週超市採買清單 (${generatedGrocery.length}項食材) 與 7 天菜單。`
            : `已成功解析貼上的 Google 問問 AI 成果，並依加爾平運動生理學三大營養素原則（每日目標熱量 ${macroPlan.targetCalories} kcal、蛋白質 ${macroPlan.targetProteinG}g），等比轉化為 ${servings} 人份一週超市採買清單 (${generatedGrocery.length}項食材) 與 7 天菜單。`;
        }
      }

      // If no custom text pasted or fallback needed, use high-precision client Galpin calculation engine
      if (generatedMeals.length === 0) {
        const calculated = generateClientGalpinMealPlan(
          servings,
          fitnessGoal,
          dietPreference,
          macroPlan,
          varietySeed,
          cookingMethods
        );
        generatedGrocery = calculated.groceryList;
        generatedMeals = calculated.weeklyMealPlan;
        themeTitle = calculated.themeTitle;
        galpinSummary = calculated.galpinSummary;
      } else if (generatedGrocery.length === 0) {
        const calculated = generateClientGalpinMealPlan(
          servings,
          fitnessGoal,
          dietPreference,
          macroPlan,
          varietySeed,
          cookingMethods
        );
        generatedGrocery = calculated.groceryList;
      }

      const isCustomizedFromPasted = pastedGoogleResult.trim().length > 10;

      // Save and split into: 1. Grocery List, 2. Weekly Meal Plan
      saveGroceryList(generatedGrocery);
      saveMealPlan(generatedMeals);
      savePlanMeta({
        servings,
        themeTitle,
        galpinSummary,
        isAiCustomized: isCustomizedFromPasted,
      });

      setSelectedDayIdx(0);
      setIsGenerating(false);
      
      // Automatically switch to 7-day meal plan tab so the user can immediately verify the updated calories & protein
      setActiveSubTab('mealplan');

      addSystemLog({
        level: 'success',
        module: 'meal_plan',
        action: 'Google 問問 AI 菜單生成並分類完成',
        message: `成功將 ${servings} 人份菜單分為採購食材 (${generatedGrocery.length}項) 與 7天菜單，目標 ${macroPlan.targetCalories} kcal / 蛋白質 ${macroPlan.targetProteinG}g`,
        details: {
          servings,
          groceryCount: generatedGrocery.length,
          themeTitle,
        }
      });
    } catch (err: any) {
      console.error(err);
      setIsGenerating(false);
    }
  };

  const toggleCheck = (id: string) => {
    const updated = groceryList.map((item) => 
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    saveGroceryList(updated);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: GroceryItem = {
      id: `custom_${Date.now()}`,
      name: newItemName.trim(),
      quantity: newItemQty.trim() || '適量',
      category: newItemCategory,
      notes: newItemNotes.trim() || '自訂採買項目',
      checked: false,
      mealUsage: ['自訂加購'],
    };

    saveGroceryList([newItem, ...groceryList]);
    setNewItemName('');
    setNewItemQty('');
    setNewItemNotes('');
    setIsAddingItem(false);
  };

  const handleDeleteItem = (id: string) => {
    const updated = groceryList.filter((item) => item.id !== id);
    saveGroceryList(updated);
  };

  const handleClearGroceryList = () => {
    if (window.confirm('確定要清空目前所有的「一週超市採買清單」嗎？')) {
      saveGroceryList([]);
    }
  };

  const handleClearMealPlan = () => {
    if (window.confirm('確定要清空目前所有的「7天建議菜單」嗎？')) {
      saveMealPlan([]);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('確定要將「超市採買清單」與「7天建議菜單」全部清空嗎？清空後可隨時重新貼上 Google 問問 AI 內容或點擊生成按鈕。')) {
      saveGroceryList([]);
      saveMealPlan([]);
      setPastedGoogleResult('');
    }
  };

  const handleResetChecklist = () => {
    if (window.confirm('確定要重置所有食材的勾選狀態，開始新一週的採買嗎？')) {
      const reset = groceryList.map((item) => ({ ...item, checked: false }));
      saveGroceryList(reset);
    }
  };

  const handleCopyGroceryList = () => {
    const groupedByCategory: Record<string, string[]> = {
      protein: [],
      vegetable: [],
      carb: [],
      fat_seasoning: [],
      fruit_beverage: [],
    };

    const categoryNames: Record<string, string> = {
      protein: '【蛋白質專區】',
      vegetable: '【蔬菜纖維區】',
      carb: '【優質低GI碳水】',
      fat_seasoning: '【好油脂與調味】',
      fruit_beverage: '【低GI水果與飲品】',
    };

    groceryList.forEach((item) => {
      const usageStr = item.mealUsage && item.mealUsage.length > 0 ? ` [${item.mealUsage.slice(0, 3).join('/')}]` : '';
      groupedByCategory[item.category]?.push(`- ${item.checked ? ' [已買] ' : ' [ ] '} ${item.name} (${item.quantity})${usageStr}`);
    });

    let text = `🛒【${planMeta.servings || 1}人份 一週超市健康採買清單】（依 Dr. Andy Galpin 理論・與7天菜單100%同步）\n方案：${planMeta.themeTitle || 'Dr. Andy Galpin 菜單'}\n`;
    Object.entries(groupedByCategory).forEach(([catKey, items]) => {
      if (items.length > 0) {
        text += `\n${categoryNames[catKey] || '【其他】'}\n${items.join('\n')}`;
      }
    });
    text += `\n\n— 透過 10QBS 健康資產負債表管理一週原型食材！`;

    navigator.clipboard.writeText(text);
    alert(`已複製 ${planMeta.servings || 1} 人份一週採買清單到剪貼簿！可直接貼至備忘錄或 Line 採買時使用。`);
  };

  // Helper: Generate Table 1 Markdown (Category column is 100% filled and repeated on every single row)
  const generateGroceryMarkdownTable = (): string => {
    if (groceryList.length === 0) return '尚無食材採買資料';
    const catMap: Record<string, string> = {
      protein: '蛋白質專區',
      vegetable: '蔬菜纖維區',
      carb: '優質低GI碳水',
      fat_seasoning: '好油脂與調味',
      fruit_beverage: '低GI水果與飲品',
    };
    let md = `### 表一、【${planMeta.servings || 1}人份 一週超市食材採買清單】（分類欄位完整重複・絕不留白）\n\n`;
    md += `| 食材分類 | 食材名稱 | 建議採買份量規格 | 營養亮點與備註 |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    groceryList.forEach((item) => {
      const catName = catMap[item.category] || '蛋白質專區';
      const notes = item.notes || (item.mealUsage && item.mealUsage.length > 0 ? `用於 ${item.mealUsage.join('、')}` : '原型全食物');
      md += `| ${catName} | ${item.name} | ${item.quantity} | ${notes} |\n`;
    });
    return md;
  };

  // Helper: Generate Table 2 Markdown (Day of Week column is 100% filled and repeated on every single meal row)
  const generateMealPlanMarkdownTable = (): string => {
    if (mealPlan.length === 0) return '尚無 7 天建議菜單資料';
    let md = `### 表二、【週一至週日 7天原型食物建議菜單】（星期欄位完整重複・絕不留白）\n\n`;
    md += `| 星期 | 餐別 | 菜色名稱 | 主要食材搭配作法 | 預估蛋白質(g) | 預估熱量(kcal) |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    mealPlan.forEach((day) => {
      const dayName = day.dayOfWeek || '週一';
      const meals: { slot: string; item?: any }[] = [
        { slot: '早餐', item: day.breakfast },
        { slot: '午餐', item: day.lunch },
        { slot: '晚餐', item: day.dinner },
        { slot: '點心', item: day.snack },
      ];
      meals.forEach((m) => {
        const cal = m.item?.caloriesApprox || 0;
        const prot = m.item?.proteinApprox || 0;
        const desc = m.item?.description || m.item?.name || '依加爾平原則烹調備餐';
        md += `| ${dayName} | ${m.slot} | ${m.item?.name || '高蛋白原型餐'} | ${desc} | ${prot}g | ${cal} kcal |\n`;
      });
    });
    return md;
  };

  const handleCopyGroceryMarkdownTable = () => {
    const md = generateGroceryMarkdownTable();
    navigator.clipboard.writeText(md);
    alert(`已複製【表一：超市食材採買 Markdown 表格】至剪貼簿！（食材分類欄位每一行皆完整重複填寫，絕不留白）`);
  };

  const handleCopyMealPlanMarkdownTable = () => {
    const md = generateMealPlanMarkdownTable();
    navigator.clipboard.writeText(md);
    alert(`已複製【表二：7天建議菜單 Markdown 表格】至剪貼簿！（星期欄位每一行皆完整重複填寫，絕不留白）`);
  };

  const handleCopyBothMarkdownTables = () => {
    const md = `${generateGroceryMarkdownTable()}\n\n---\n\n${generateMealPlanMarkdownTable()}`;
    navigator.clipboard.writeText(md);
    alert(`已複製【一週採買清單 ＋ 7天菜單 完整 Markdown 表格】！（分類與星期欄位 100% 完整重複、絕無留白）`);
  };

  // Helper: Generate Structured Plain Text matching Part 1 & Part 2 exactly
  const generateStructuredPlainText = (): string => {
    const catMap: Record<string, string> = {
      protein: '【蛋白質專區】',
      vegetable: '【蔬菜纖維區】',
      carb: '【優質低GI碳水】',
      fat_seasoning: '【好油脂與調味】',
      fruit_beverage: '【低GI水果與飲品】',
    };

    const grouped: Record<string, GroceryItem[]> = {
      protein: [],
      vegetable: [],
      carb: [],
      fat_seasoning: [],
      fruit_beverage: [],
    };

    groceryList.forEach((item) => {
      if (grouped[item.category]) {
        grouped[item.category].push(item);
      } else {
        grouped.protein.push(item);
      }
    });

    let txt = `=======================================================\n`;
    txt += `依 Dr. Andy Galpin 運動生理學理論 一週超市食材採買清單與 7 天建議菜單\n`;
    txt += `方案：${planMeta.themeTitle || '加爾平原型食物菜單'}\n`;
    txt += `目標熱量：${macroPlan.targetCalories} kcal / 蛋白質：${macroPlan.targetProteinG}g / 用餐人數：${servings} 人份\n`;
    txt += `=======================================================\n\n`;

    txt += `一、【一週超市食材採買清單 (${servings}人份)】\n\n`;
    Object.entries(grouped).forEach(([catKey, items]) => {
      txt += `${catMap[catKey] || '【其他食材】'}\n`;
      if (items.length === 0) {
        txt += `1. 依個人喜好選購適量原型食材\n`;
      } else {
        items.forEach((it, idx) => {
          const notes = it.notes ? `（${it.notes}）` : '';
          txt += `${idx + 1}. ${it.name}：${it.quantity} ${notes}\n`;
        });
      }
      txt += `\n`;
    });

    txt += `二、【週一至週日 7天原型食物建議菜單 (${servings}人份)】\n\n`;
    mealPlan.forEach((day) => {
      txt += `【${day.dayOfWeek}】\n`;
      const slots = [
        { label: '早餐', meal: day.breakfast },
        { label: '午餐', meal: day.lunch },
        { label: '晚餐', meal: day.dinner },
        { label: '點心', meal: day.snack },
      ];
      slots.forEach((s) => {
        const m = s.meal;
        const ing = m?.ingredients && m.ingredients.length > 0 ? m.ingredients.join('、') : (m?.name || '依加爾平原則備餐');
        const desc = m?.description || '原型全食物料理';
        const prot = m?.proteinApprox || 30;
        const cal = m?.caloriesApprox || 400;
        txt += `- ${s.label}：菜色名稱：${m?.name || '高蛋白原型餐'}，主要食材：${ing}，作法：${desc}，預估蛋白質：${prot}g，預估熱量：${cal}kcal\n`;
      });
      txt += `\n`;
    });

    txt += `【備註】100% 遵循 Dr. Andy Galpin 運動生理學原則，每餐蛋白質達標觸發 MPS 肌肉蛋白質合成。\n`;
    return txt;
  };

  const handleDownloadTextFile = () => {
    const text = generateStructuredPlainText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Galpin_一週採買清單與7天菜單_${servings}人份.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyFullPlainText = () => {
    const text = generateStructuredPlainText();
    navigator.clipboard.writeText(text);
    setCopiedPlainText(true);
    setTimeout(() => setCopiedPlainText(false), 2200);
  };

  const openMarkdownModal = (tab: 'grocery' | 'mealplan' | 'both' | 'plaintext') => {
    setMarkdownModalTab(tab);
    setIsMarkdownModalOpen(true);
    setCopiedModalText(false);
  };

  const filteredGrocery = groceryList.filter((item) => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'unchecked') return !item.checked;
    return item.category === categoryFilter;
  });

  const totalCount = groceryList.length;
  const checkedCount = groceryList.filter((i) => i.checked).length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const currentMealPlan: DayMealPlan | undefined = mealPlan[selectedDayIdx] || mealPlan[0];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Header Card with 3 Tabs Switcher */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-700/80 text-emerald-200">
                <ChefHat className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Weekend Grocery & Weekly Meal Planner
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              週末超市採買清單 & 一週建議菜單
            </h2>
            <p className="text-xs text-emerald-100/90 max-w-xl leading-relaxed">
              依據 <strong>Dr. Andy Galpin 運動生理學理論</strong> 設計，設定後一鍵將 Google 問問 AI 成果分成 <strong>「一週採購清單」</strong> 與 <strong>「7天建議菜單」</strong>，食材 100% 同步！
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Live Internet Status Badge */}
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1 rounded-full border ${
              netStatus?.online !== false
                ? 'bg-emerald-950/80 text-emerald-200 border-emerald-400/50'
                : 'bg-rose-950/80 text-rose-200 border-rose-400/50'
            }`}>
              <Wifi className={`w-3 h-3 ${isCheckingNet ? 'animate-spin text-emerald-300' : ''}`} />
              <span>{netStatus?.mode || (isCheckingNet ? '連網檢測中...' : '即時連網在線 (免登入 Google 帳號)')}</span>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <span className="text-[11px] font-bold text-emerald-100 bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-500/40">
                {servings} 人份・{macroPlan.targetCalories} kcal / 蛋白質 {macroPlan.targetProteinG}g
              </span>
            </div>
          </div>
        </div>

        {/* 3 Sub-Tabs Switcher: 只留圖示 */}
        <div className="mt-6 flex items-center gap-2 p-1.5 bg-black/30 backdrop-blur rounded-2xl w-fit">
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`px-4 py-2.5 rounded-xl transition-all ${
              activeSubTab === 'settings'
                ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                : 'text-emerald-100 hover:text-white hover:bg-white/10'
            }`}
            title="設定與檢索"
            aria-label="設定與檢索"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveSubTab('grocery')}
            className={`px-4 py-2.5 rounded-xl transition-all relative ${
              activeSubTab === 'grocery'
                ? 'bg-white text-slate-900 shadow-md scale-105'
                : 'text-emerald-100 hover:text-white hover:bg-white/10'
            }`}
            title="一週採購清單"
            aria-label="一週採購清單"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveSubTab('mealplan')}
            className={`px-4 py-2.5 rounded-xl transition-all ${
              activeSubTab === 'mealplan'
                ? 'bg-white text-slate-900 shadow-md scale-105'
                : 'text-emerald-100 hover:text-white hover:bg-white/10'
            }`}
            title="7天建議菜單"
            aria-label="7天建議菜單"
          >
            <UtensilsCrossed className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: 設定 (Settings & Google Ask AI Search Integration) */}
      {/* ========================================================= */}
      {activeSubTab === 'settings' && (
        <div className="space-y-5">

          {/* Google Ask AI Search Integration & Generation Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200 space-y-6">
            {/* Google Search Open & Query Section */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border-2 border-emerald-300 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-black text-emerald-950">
                      在 Google 搜尋中開啟檢索（免登入 Google 帳號）
                    </span>
                    <p className="text-[11px] text-emerald-800">
                      已預先加入指令要求 Google / 問問 AI 產出採買清單與 7 天菜單，並將生成內容存成可下載之文字檔格式
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {isQueryCustomized && (
                    <button
                      type="button"
                      onClick={() => setCustomGoogleQuery(null)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                      title="重設為系統預設檢索指令"
                    >
                      <span>↺ 重設指令</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCopyGoogleQuery}
                    className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
                    title="複製檢索指令至剪貼簿"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedQuery ? '已複製檢索指令！' : '複製檢索指令'}</span>
                  </button>

                  <a
                    href={googleSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                    title="新分頁開啟 Google 搜尋（免登入帳號）"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>在 Google 搜尋中開啟檢索（免登入）</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-emerald-900 font-bold px-1">
                  <span>檢索指令內容（可直接點擊下方文字框修改）：</span>
                  {isQueryCustomized && (
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-100/90 px-2 py-0.5 rounded-md">
                      已自訂修改
                    </span>
                  )}
                </div>
                <textarea
                  value={googleQueryText}
                  onChange={(e) => setCustomGoogleQuery(e.target.value)}
                  rows={6}
                  placeholder="檢索指令內容..."
                  className="w-full p-3.5 rounded-xl border border-emerald-300 bg-white text-[11px] font-mono text-slate-800 leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-inner resize-y"
                />
              </div>
            </div>

            {/* Upload Text File / Paste Search Results Field */}
            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.md,.text,text/plain"
                className="hidden"
              />

              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>上傳文字檔或貼上 Google 問問 AI 內容（可選）</span>
                </label>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95"
                    title="點擊上傳 .txt 或 .md 純文字檔"
                  >
                    <Upload className="w-3 h-3 text-emerald-700" />
                    <span>上傳文字檔 (.txt)</span>
                  </button>

                  {uploadedFileName && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono flex items-center gap-1">
                      <FileUp className="w-3 h-3 text-emerald-600" />
                      <span className="max-w-[150px] truncate" title={uploadedFileName}>{uploadedFileName}</span>
                    </span>
                  )}

                  {pastedGoogleResult && (
                    <button
                      type="button"
                      onClick={() => {
                        setPastedGoogleResult('');
                        setUploadedFileName(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      清空內容
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={pastedGoogleResult}
                onChange={(e) => setPastedGoogleResult(e.target.value)}
                rows={4}
                placeholder="您可直接點擊右上角「上傳文字檔」載入 .txt 檔案，或將在 Google 搜尋 / 問問 AI 生成的食材清單與 7 天菜單文字直接貼在此處，系統將抓取文字檔內容自動拆分為採買清單與 7 天菜單..."
                className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-slate-50/50"
              />
            </div>

            {/* Action Buttons: Generate & Split */}
            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleGenerateAndSplitPlan(false)}
                className={`py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black shadow-md flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer ${
                  pastedGoogleResult.trim() || isGenerating ? 'flex-1' : ''
                }`}
                title={pastedGoogleResult.trim()
                  ? (uploadedFileName
                      ? `抓取上傳檔案【${uploadedFileName}】內容並拆分【採購食材 ＋ 7天菜單】(${servings}人份)`
                      : `抓取上傳/貼上文字內容並拆分【採購食材 ＋ 7天菜單】(${servings}人份)`)
                  : `以 Google 問問 AI 模式生成並拆分【採購食材 ＋ 7天菜單】(${servings}人份)`}
                aria-label="以 Google 問問 AI 模式生成並拆分【採購食材 ＋ 7天菜單】"
              >
                <Sparkles className={`w-4 h-4 text-slate-950 shrink-0 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating && (
                  <span className="truncate">正在連網運算並拆分清單...</span>
                )}
                {!isGenerating && pastedGoogleResult.trim() && (
                  <span className="truncate">
                    {uploadedFileName
                      ? `抓取上傳檔案【${uploadedFileName}】內容並拆分 (${servings}人份)`
                      : `抓取內容並拆分【採購食材 ＋ 7天菜單】(${servings}人份)`}
                  </span>
                )}
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleGenerateAndSplitPlan(true)}
                className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0"
                title="輪替另一組科學主題菜單"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>換一組建議</span>
              </button>

              {(groceryList.length > 0 || mealPlan.length > 0) && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="py-3 px-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0"
                  title="清空目前所有的食材清單與7天菜單"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>清空清單與菜單</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: 一週採購清單 (Grocery Checklist)                     */}
      {/* ========================================================= */}
      {activeSubTab === 'grocery' && (
        <div className="space-y-4">
          {/* Progress & Quick Action Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span>採買進度完成度</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    （{planMeta.servings || 1}人份・同步菜單共 {totalCount} 項食材）
                  </span>
                </span>
                <span className="text-emerald-600 font-black">{progressPercent}% ({checkedCount}/{totalCount} 項)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {groceryList.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleCopyFullPlainText}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer"
                    title="一鍵複製繁中結構化純文字（包含採買清單與 7 天菜單）"
                  >
                    {copiedPlainText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-slate-950" />
                        <span>已複製純文字！</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>一鍵複製純文字</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadTextFile}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                    title="下載 .txt 文字檔"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>下載 .txt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openMarkdownModal('grocery')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                    title="查看 Markdown / 結構化表格"
                  >
                    <Table className="w-3.5 h-3.5 text-emerald-700" />
                    <span>表格 / Markdown</span>
                  </button>

                  <button
                    onClick={handleResetChecklist}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition-all"
                    title="重置勾選狀態"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleClearGroceryList}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all"
                    title="清空採買清單"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span className="hidden sm:inline">清空清單</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Grocery Item Checklist or Empty State */}
          {groceryList.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <ShoppingCart className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">採買清單目前為空</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  目前尚未加入任何超市食材。您可以前往「設定與智能生成」貼上 Google 搜尋內容一鍵解析，自動建立採買清單。
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('settings')}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>前往設定與智能生成</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'all', label: '全部食材 (五大專區)' },
                  { id: 'unchecked', label: '待採買' },
                  { id: 'protein', label: '【蛋白質專區】' },
                  { id: 'vegetable', label: '【蔬菜纖維區】' },
                  { id: 'carb', label: '【優質低GI碳水】' },
                  { id: 'fat_seasoning', label: '【好油脂與調味】' },
                  { id: 'fruit_beverage', label: '【低GI水果與飲品】' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      categoryFilter === cat.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Grocery Item Checklist Grouped by Category */}
              {categoryFilter === 'all' ? (
                <div className="space-y-6">
                  {[
                    {
                      id: 'protein',
                      title: '【蛋白質專區】',
                      badge: '🥩 肌肉修復與 MPS',
                      color: 'border-rose-200 bg-rose-50/50 text-rose-800',
                      badgeColor: 'bg-rose-100 text-rose-700',
                      items: groceryList.filter((i) => i.category === 'protein'),
                    },
                    {
                      id: 'vegetable',
                      title: '【蔬菜纖維區】',
                      badge: '🥦 微量元素與高纖',
                      color: 'border-emerald-200 bg-emerald-50/50 text-emerald-800',
                      badgeColor: 'bg-emerald-100 text-emerald-700',
                      items: groceryList.filter((i) => i.category === 'vegetable'),
                    },
                    {
                      id: 'carb',
                      title: '【優質低GI碳水】',
                      badge: '🍠 平穩血糖與肌醣原',
                      color: 'border-amber-200 bg-amber-50/50 text-amber-800',
                      badgeColor: 'bg-amber-100 text-amber-700',
                      items: groceryList.filter((i) => i.category === 'carb'),
                    },
                    {
                      id: 'fat_seasoning',
                      title: '【好油脂與調味】',
                      badge: '🥑 單元不飽和與好油',
                      color: 'border-blue-200 bg-blue-50/50 text-blue-800',
                      badgeColor: 'bg-blue-100 text-blue-700',
                      items: groceryList.filter((i) => i.category === 'fat_seasoning'),
                    },
                    {
                      id: 'fruit_beverage',
                      title: '【低GI水果與飲品】',
                      badge: '🫐 超級抗氧化與代謝',
                      color: 'border-purple-200 bg-purple-50/50 text-purple-800',
                      badgeColor: 'bg-purple-100 text-purple-700',
                      items: groceryList.filter((i) => i.category === 'fruit_beverage'),
                    },
                  ].map((sec) => (
                    <div key={sec.id} className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-800 tracking-wide">
                            {sec.title}
                          </h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sec.badgeColor}`}>
                            {sec.badge}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400">
                          {sec.items.filter((i) => i.checked).length}/{sec.items.length} 項
                        </span>
                      </div>

                      {sec.items.length === 0 ? (
                        <div className="text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-center">
                          本專區目前無指定食材
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {sec.items.map((item, itemIdx) => (
                            <div
                              key={item.id}
                              onClick={() => toggleCheck(item.id)}
                              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 group select-none ${
                                item.checked
                                  ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                                  : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-xs text-slate-800'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors border ${
                                  item.checked
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'border-slate-300 group-hover:border-emerald-500 bg-white'
                                }`}>
                                  {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] font-black text-slate-400">
                                      {itemIdx + 1}.
                                    </span>
                                    <span className={`text-xs font-bold leading-tight ${item.checked ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                      {item.name}
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                                    份量：{item.quantity}
                                  </div>

                                  {/* Meal Plan Usage Badges */}
                                  {item.mealUsage && item.mealUsage.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap mt-1.5">
                                      <span className="text-[9px] text-slate-400 font-medium">用於：</span>
                                      {item.mealUsage.map((usage, uIdx) => (
                                        <span 
                                          key={`${item.id}-usage-${usage}-${uIdx}`} 
                                          className="text-[9px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded-md"
                                        >
                                          {usage}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {item.notes && (
                                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                                      💡 {item.notes}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {item.id.startsWith('custom_') && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteItem(item.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity"
                                  title="刪除自訂項目"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* Filtered or Unchecked List */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredGrocery.map((item, itemIdx) => (
                    <div
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 group select-none ${
                        item.checked
                          ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                          : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-xs text-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors border ${
                          item.checked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 group-hover:border-emerald-500 bg-white'
                        }`}>
                          {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-black text-slate-400">
                              {itemIdx + 1}.
                            </span>
                            <span className={`text-xs font-bold leading-tight ${item.checked ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                              {item.name}
                            </span>
                          </div>

                          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                            份量：{item.quantity}
                          </div>

                          {/* Meal Plan Usage Badges */}
                          {item.mealUsage && item.mealUsage.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mt-1.5">
                              <span className="text-[9px] text-slate-400 font-medium">用於：</span>
                              {item.mealUsage.map((usage, uIdx) => (
                                <span 
                                  key={`${item.id}-usage-${usage}-${uIdx}`} 
                                  className="text-[9px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded-md"
                                >
                                  {usage}
                                </span>
                              ))}
                            </div>
                          )}

                          {item.notes && (
                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                              💡 {item.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {item.id.startsWith('custom_') && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity"
                          title="刪除自訂項目"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {filteredGrocery.length === 0 && (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
                  該分類目前沒有食材項目
                </div>
              )}
            </>
          )}

          {/* Supermarket Shopping Pro Tip */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>超市採買黃金準則（Dr. Andy Galpin 原型食材原則）</span>
            </div>
            <p className="leading-relaxed text-amber-800">
              進入超市時，請優先沿著<strong>「外圍生鮮冷藏走道」</strong>（肉品、鮮魚、生鮮蔬果、蛋奶），避開中間走道滿滿的餅乾、含糖飲料與泡麵加工區。吃進原型食材，就是為身體存下最豐厚的長期健康資產！
            </p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: 7天建議菜單 (7-Day Meal Plan)                       */}
      {/* ========================================================= */}
      {activeSubTab === 'mealplan' && (
        <div className="space-y-5">
          {mealPlan.length === 0 || !currentMealPlan ? (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 text-center space-y-3 shadow-xs">
              <div className="w-10 h-10 mx-auto rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <ChefHat className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">7 天建議菜單目前為空</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  目前尚未規劃任何 7 天菜單。您可以前往「設定與智能生成」貼上 Google 搜尋內容一鍵解析，或直接使用預設模式生成符合 Dr. Galpin 原則的專屬飲食菜單。
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('settings')}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>前往設定與智能生成</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Quick Export & Actions Toolbar */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-600" />
                    <span>7 天加爾平原型食物菜單（{planMeta.servings || 1}人份）</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    每日四餐精準計算熱量與蛋白質，每餐蛋白質達標觸發 MPS 肌肉蛋白質合成
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyFullPlainText}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer"
                    title="一鍵複製繁中結構化純文字（包含採買清單與 7 天菜單）"
                  >
                    {copiedPlainText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-slate-950" />
                        <span>已複製純文字！</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>一鍵複製純文字</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadTextFile}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                    title="下載 .txt 文字檔"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>下載 .txt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openMarkdownModal('mealplan')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                    title="查看 Markdown / 結構化表格"
                  >
                    <Table className="w-3.5 h-3.5 text-emerald-700" />
                    <span>表格 / Markdown</span>
                  </button>
                </div>
              </div>

              {/* Day of Week Selector */}
              <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar">
                {mealPlan.map((plan, idx) => {
                  const dayCal =
                    (plan.breakfast?.caloriesApprox || 0) +
                    (plan.lunch?.caloriesApprox || 0) +
                    (plan.dinner?.caloriesApprox || 0) +
                    (plan.snack?.caloriesApprox || 0);
                  const dayProt =
                    (plan.breakfast?.proteinApprox || 0) +
                    (plan.lunch?.proteinApprox || 0) +
                    (plan.dinner?.proteinApprox || 0) +
                    (plan.snack?.proteinApprox || 0);
                  const finalCal = dayCal > 0 ? dayCal : (plan.totalCaloriesApprox || macroPlan.targetCalories);
                  const finalProt = dayProt > 0 ? dayProt : (plan.totalProteinApprox || macroPlan.targetProteinG);
                  return (
                    <button
                      key={plan.dayOfWeek}
                      onClick={() => setSelectedDayIdx(idx)}
                      className={`flex-1 min-w-[76px] py-2 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                        selectedDayIdx === idx
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-extrabold">{plan.dayOfWeek}</div>
                      <div className={`text-[10px] font-medium mt-0.5 ${selectedDayIdx === idx ? 'text-amber-300' : 'text-slate-500'}`}>
                        ~{finalCal} kcal
                      </div>
                      <div className={`text-[9px] font-bold ${selectedDayIdx === idx ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        {finalProt}g 蛋白
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Current Day Plan Card */}
              {(() => {
                const currentDayTotalCalories =
                  (currentMealPlan.breakfast?.caloriesApprox || 0) +
                  (currentMealPlan.lunch?.caloriesApprox || 0) +
                  (currentMealPlan.dinner?.caloriesApprox || 0) +
                  (currentMealPlan.snack?.caloriesApprox || 0);

                const currentDayTotalProtein =
                  (currentMealPlan.breakfast?.proteinApprox || 0) +
                  (currentMealPlan.lunch?.proteinApprox || 0) +
                  (currentMealPlan.dinner?.proteinApprox || 0) +
                  (currentMealPlan.snack?.proteinApprox || 0);

                return (
                  <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200 space-y-6">
                    {/* Header info */}
                    <div className="border-b border-slate-100 pb-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          {currentMealPlan.dayOfWeek} 專屬食譜（{planMeta.servings || 1}人份）
                        </span>
                        <span className="text-xs text-slate-700 flex items-center gap-1.5 font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                          <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                          <span>
                            單日菜單加總預估：
                            <strong className="text-slate-900 font-extrabold text-sm ml-1">
                              ~{currentDayTotalCalories > 0 ? currentDayTotalCalories : (currentMealPlan.totalCaloriesApprox || macroPlan.targetCalories)} kcal
                            </strong>
                            <span className="text-slate-300 mx-1.5">|</span>
                            蛋白質{' '}
                            <strong className="text-emerald-700 font-black text-sm ml-0.5">
                              ~{currentDayTotalProtein > 0 ? currentDayTotalProtein : (currentMealPlan.totalProteinApprox || macroPlan.targetProteinG)}g
                            </strong>
                          </span>
                        </span>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                        {currentMealPlan.dayTitle}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2">
                        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Dr. Galpin 備餐指南：</strong>{currentMealPlan.nutritionTip}</span>
                      </p>
                    </div>

                    {/* 4 Meals Grid: Breakfast, Lunch, Dinner, Snack */}
                    {(() => {
                      const bCal = currentMealPlan.breakfast?.caloriesApprox || Math.round(macroPlan.targetCalories * 0.25);
                      const bProt = currentMealPlan.breakfast?.proteinApprox || Math.round(macroPlan.targetProteinG * 0.25);

                      const lCal = currentMealPlan.lunch?.caloriesApprox || Math.round(macroPlan.targetCalories * 0.35);
                      const lProt = currentMealPlan.lunch?.proteinApprox || Math.round(macroPlan.targetProteinG * 0.35);

                      const dCal = currentMealPlan.dinner?.caloriesApprox || Math.round(macroPlan.targetCalories * 0.30);
                      const dProt = currentMealPlan.dinner?.proteinApprox || Math.round(macroPlan.targetProteinG * 0.30);

                      const sCal = currentMealPlan.snack?.caloriesApprox || Math.max(80, macroPlan.targetCalories - (bCal + lCal + dCal));
                      const sProt = currentMealPlan.snack?.proteinApprox || Math.max(5, macroPlan.targetProteinG - (bProt + lProt + dProt));

                      const renderMealCard = (
                        meal: DayMealPlan['breakfast'],
                        slotLabel: string,
                        slotIcon: React.ElementType,
                        cal: number,
                        prot: number,
                        theme: {
                          cardBg: string;
                          cardBorder: string;
                          iconBg: string;
                          iconColor: string;
                          textColor: string;
                          badgeBorder: string;
                          ingText: string;
                          tagBg: string;
                          tagText: string;
                        }
                      ) => {
                        const MealIcon = slotIcon;
                        return (
                          <div className={`p-4 rounded-2xl ${theme.cardBg} border ${theme.cardBorder} space-y-3 shadow-2xs`}>
                            {/* Header: Slot Badge & Calories/Protein Metrics */}
                            <div className="flex items-center justify-between text-xs gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`p-1.5 rounded-xl ${theme.iconBg} flex items-center justify-center shrink-0 shadow-2xs`} title={slotLabel}>
                                  <MealIcon className={`w-4 h-4 ${theme.iconColor}`} />
                                </span>
                                <span className={`text-xs font-black ${theme.textColor}`}>
                                  {slotLabel}
                                </span>
                              </div>
                              {/* Top right corner: calories & protein */}
                              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
                                <span className="font-extrabold text-slate-800 text-xs flex items-center gap-0.5">
                                  <span className="text-orange-500 text-[11px]">🔥</span>
                                  <span>{cal}</span>
                                  <span className="text-[10px] font-normal text-slate-500">kcal</span>
                                </span>
                                <span className="text-slate-200 font-bold">|</span>
                                <span className="font-extrabold text-emerald-700 text-xs flex items-center gap-0.5">
                                  <span className="text-emerald-600 text-[11px]">🥩</span>
                                  <span>{prot}g</span>
                                  <span className="text-[10px] font-normal text-emerald-600/80">蛋白</span>
                                </span>
                              </div>
                            </div>

                            {/* 1. Meal / Dish Name */}
                            <div className="pt-0.5">
                              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                                {meal.name}
                              </h4>
                            </div>

                            {/* 2. Cooking Method & Steps (Placed directly under the dish name) */}
                            <div className="p-3 rounded-xl bg-white/95 border border-slate-200/80 shadow-2xs space-y-1">
                              <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                                <ChefHat className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>料理作法：</span>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed pl-5 whitespace-pre-line">
                                {meal.description || '依原型高蛋白食材極簡備餐原則料理。'}
                              </p>
                            </div>
                            
                            {/* 3. Synchronized Ingredients */}
                            {meal.ingredients && meal.ingredients.length > 0 && (
                              <div className="pt-0.5">
                                <div className={`text-[10px] font-bold ${theme.ingText} mb-1.5 flex items-center gap-1`}>
                                  <CalendarCheck className="w-3 h-3 opacity-80" />
                                  <span>採買清單對應食材：</span>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                  {meal.ingredients.map((ing, iIdx) => (
                                    <span key={`ing-${ing}-${iIdx}`} className="text-[10px] font-medium bg-white text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                                      {ing}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 4. Tags */}
                            {meal.tags && meal.tags.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                {meal.tags.map((t, tIdx) => (
                                  <span key={`tag-${t}-${tIdx}`} className={`text-[10px] font-semibold ${theme.tagBg} ${theme.tagText} px-2 py-0.5 rounded-md border border-slate-200/60`}>
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      };

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Breakfast */}
                          {renderMealCard(
                            currentMealPlan.breakfast,
                            '早餐',
                            Sunrise,
                            bCal,
                            bProt,
                            {
                              cardBg: 'bg-amber-50/50',
                              cardBorder: 'border-amber-100/90',
                              iconBg: 'bg-amber-200/80 text-amber-950',
                              iconColor: 'text-amber-800',
                              textColor: 'text-amber-900',
                              badgeBorder: 'border-amber-200',
                              ingText: 'text-amber-900',
                              tagBg: 'bg-amber-100/60',
                              tagText: 'text-amber-800',
                            }
                          )}

                          {/* Lunch */}
                          {renderMealCard(
                            currentMealPlan.lunch,
                            '午餐',
                            Sun,
                            lCal,
                            lProt,
                            {
                              cardBg: 'bg-emerald-50/50',
                              cardBorder: 'border-emerald-100/90',
                              iconBg: 'bg-emerald-200/80 text-emerald-950',
                              iconColor: 'text-emerald-800',
                              textColor: 'text-emerald-900',
                              badgeBorder: 'border-emerald-200',
                              ingText: 'text-emerald-900',
                              tagBg: 'bg-emerald-100/60',
                              tagText: 'text-emerald-800',
                            }
                          )}

                          {/* Dinner */}
                          {renderMealCard(
                            currentMealPlan.dinner,
                            '晚餐',
                            Moon,
                            dCal,
                            dProt,
                            {
                              cardBg: 'bg-teal-50/50',
                              cardBorder: 'border-teal-100/90',
                              iconBg: 'bg-teal-200/80 text-teal-950',
                              iconColor: 'text-teal-800',
                              textColor: 'text-teal-900',
                              badgeBorder: 'border-teal-200',
                              ingText: 'text-teal-900',
                              tagBg: 'bg-teal-100/60',
                              tagText: 'text-teal-800',
                            }
                          )}

                          {/* Healthy Snack */}
                          {renderMealCard(
                            currentMealPlan.snack,
                            '午後點心',
                            Apple,
                            sCal,
                            sProt,
                            {
                              cardBg: 'bg-purple-50/50',
                              cardBorder: 'border-purple-100/90',
                              iconBg: 'bg-purple-200/80 text-purple-950',
                              iconColor: 'text-purple-800',
                              textColor: 'text-purple-900',
                              badgeBorder: 'border-purple-200',
                              ingText: 'text-purple-900',
                              tagBg: 'bg-purple-100/60',
                              tagText: 'text-purple-800',
                            }
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* Markdown Table Modal (Non-blank Category & Day Columns)   */}
      {/* ========================================================= */}
      {isMarkdownModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Table className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5 flex-wrap">
                    <span>Markdown 表格檢視與匯出</span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                      分類與星期欄位 100% 完整重複・絕不留白
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    完全遵循加爾平理論與結構化表格規範，每一列（Row）均重複保留分類與星期標籤
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadTextFile}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 border border-slate-300"
                  title="下載完整結構化文字檔 (.txt)"
                >
                  <Download className="w-3.5 h-3.5 text-slate-700" />
                  <span>下載文字檔 (.txt)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const textToCopy =
                      markdownModalTab === 'grocery'
                        ? generateGroceryMarkdownTable()
                        : markdownModalTab === 'mealplan'
                        ? generateMealPlanMarkdownTable()
                        : markdownModalTab === 'plaintext'
                        ? generateStructuredPlainText()
                        : `${generateGroceryMarkdownTable()}\n\n---\n\n${generateMealPlanMarkdownTable()}`;
                    navigator.clipboard.writeText(textToCopy);
                    setCopiedModalText(true);
                    setTimeout(() => setCopiedModalText(false), 2000);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  {copiedModalText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>已複製內容！</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{markdownModalTab === 'plaintext' ? '一鍵複製純文字' : '一鍵複製當前內容'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsMarkdownModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex items-center gap-1 p-2 bg-slate-100 border-b border-slate-200 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setMarkdownModalTab('plaintext')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
                  markdownModalTab === 'plaintext'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-slate-800" />
                <span>📝 繁體中文結構化純文字 (.txt)</span>
              </button>
              <button
                type="button"
                onClick={() => setMarkdownModalTab('mealplan')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                  markdownModalTab === 'mealplan'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                🍽️ 表二：7天建議菜單 (星期不留白)
              </button>
              <button
                type="button"
                onClick={() => setMarkdownModalTab('grocery')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                  markdownModalTab === 'grocery'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                🛒 表一：超市採買清單 (分類不留白)
              </button>
              <button
                type="button"
                onClick={() => setMarkdownModalTab('both')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                  markdownModalTab === 'both'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                📦 完整合併表格 (表一 + 表二)
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {/* Tab: Structured Plain Text (.txt format) */}
              {markdownModalTab === 'plaintext' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span>繁體中文結構化純文字檔 (.txt) 預覽</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        依據【4. 輸出結構與文字檔格式】規範，完整包含一、【一週超市食材採買清單】與二、【7天原型食物建議菜單】
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyFullPlainText}
                        className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        {copiedPlainText ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-slate-950" />
                            <span>已一鍵複製純文字！</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>一鍵複製繁中純文字</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadTextFile}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        <span>下載 .txt 文字檔</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-950 text-slate-100 p-4 sm:p-5 rounded-2xl font-mono text-[11px] sm:text-xs leading-relaxed overflow-x-auto max-h-96 shadow-inner border border-slate-800 selection:bg-amber-400 selection:text-slate-950">
                    <pre className="whitespace-pre-wrap font-mono">
                      {generateStructuredPlainText()}
                    </pre>
                  </div>
                </div>
              )}

              {/* Tab: Meal Plan or Both */}
              {(markdownModalTab === 'mealplan' || markdownModalTab === 'both') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                      <span>表二、【週一至週日 7天原型食物建議菜單表格】</span>
                    </h4>
                    <span className="text-[11px] text-teal-800 bg-teal-50 font-bold px-2 py-0.5 rounded border border-teal-200">
                      「星期」每一行完整重複填寫，絕無省略或空白
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-900 text-white font-extrabold text-[11px]">
                          <tr>
                            <th className="p-3 whitespace-nowrap">星期 (完整重複)</th>
                            <th className="p-3 whitespace-nowrap">餐別</th>
                            <th className="p-3 whitespace-nowrap">菜色名稱</th>
                            <th className="p-3">主要食材搭配作法</th>
                            <th className="p-3 whitespace-nowrap text-right">預估蛋白質</th>
                            <th className="p-3 whitespace-nowrap text-right">預估熱量</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium">
                          {mealPlan.flatMap((day, dayIndex) => {
                            const dayName = day.dayOfWeek || `第${dayIndex + 1}天`;
                            const meals = [
                              { slot: '早餐', icon: Sunrise, item: day.breakfast, badgeBg: 'bg-amber-100 text-amber-800' },
                              { slot: '午餐', icon: Sun, item: day.lunch, badgeBg: 'bg-blue-100 text-blue-800' },
                              { slot: '晚餐', icon: Moon, item: day.dinner, badgeBg: 'bg-teal-100 text-teal-800' },
                              { slot: '點心', icon: Apple, item: day.snack, badgeBg: 'bg-purple-100 text-purple-800' },
                            ];
                            return meals.map((m, mIdx) => {
                              const MealIcon = m.icon;
                              const cal = m.item?.caloriesApprox || 0;
                              const prot = m.item?.proteinApprox || 0;
                              const desc = m.item?.description || m.item?.name || '依加爾平原則備餐';
                              return (
                                <tr
                                  key={`${dayName}-${m.slot}-${mIdx}`}
                                  className={dayIndex % 2 === 0 ? 'bg-white hover:bg-emerald-50/30' : 'bg-slate-50/60 hover:bg-emerald-50/30'}
                                >
                                  <td className="p-3 font-black text-slate-900 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-extrabold">
                                      {dayName}
                                    </span>
                                  </td>
                                  <td className="p-3 whitespace-nowrap font-bold">
                                    <span className={`inline-flex items-center justify-center p-1.5 rounded-lg ${m.badgeBg}`} title={m.slot}>
                                      <MealIcon className="w-3.5 h-3.5" />
                                    </span>
                                  </td>
                                  <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                                    {m.item?.name || '高蛋白原型餐'}
                                  </td>
                                  <td className="p-3 text-slate-600 leading-relaxed min-w-[200px]">
                                    {desc}
                                  </td>
                                  <td className="p-3 font-black text-emerald-700 whitespace-nowrap text-right">
                                    {prot}g
                                  </td>
                                  <td className="p-3 font-bold text-slate-800 whitespace-nowrap text-right">
                                    {cal} kcal
                                  </td>
                                </tr>
                              );
                            });
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Grocery or Both */}
              {(markdownModalTab === 'grocery' || markdownModalTab === 'both') && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>表一、【{planMeta.servings || 1}人份 一週超市食材採買清單表格】</span>
                    </h4>
                    <span className="text-[11px] text-emerald-800 bg-emerald-50 font-bold px-2 py-0.5 rounded border border-emerald-200">
                      「食材分類」每一行完整重複填寫，絕無省略或空白
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-900 text-white font-extrabold text-[11px]">
                          <tr>
                            <th className="p-3 whitespace-nowrap">食材分類 (完整重複)</th>
                            <th className="p-3 whitespace-nowrap">食材名稱</th>
                            <th className="p-3 whitespace-nowrap">建議採買份量規格</th>
                            <th className="p-3">營養亮點與備註</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium">
                          {groceryList.map((item, idx) => {
                            const catLabels: Record<string, { label: string; bg: string }> = {
                              protein: { label: '蛋白質專區', bg: 'bg-rose-50 text-rose-800 border-rose-200' },
                              vegetable: { label: '蔬菜纖維區', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                              carb: { label: '優質低GI碳水', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
                              fat_seasoning: { label: '好油脂與調味', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
                              fruit_beverage: { label: '低GI水果與飲品', bg: 'bg-purple-50 text-purple-800 border-purple-200' },
                            };
                            const catInfo = catLabels[item.category] || { label: '蛋白質專區', bg: 'bg-slate-50 text-slate-800 border-slate-200' };
                            const notes = item.notes || (item.mealUsage && item.mealUsage.length > 0 ? `用於 ${item.mealUsage.join('、')}` : '原型全食物');
                            return (
                              <tr
                                key={`md-groc-${item.id}-${idx}`}
                                className={idx % 2 === 0 ? 'bg-white hover:bg-emerald-50/30' : 'bg-slate-50/60 hover:bg-emerald-50/30'}
                              >
                                <td className="p-3 font-black whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${catInfo.bg}`}>
                                    {catInfo.label}
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                                  {item.name}
                                </td>
                                <td className="p-3 font-semibold text-emerald-800 whitespace-nowrap">
                                  {item.quantity}
                                </td>
                                <td className="p-3 text-slate-600 leading-relaxed">
                                  {notes}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Markdown Source Code Box */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>原始 Markdown 代碼（點擊上方按鈕可一鍵複製）</span>
                  </span>
                </div>
                <div className="bg-slate-950 text-slate-100 p-4 rounded-2xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-60 shadow-inner">
                  <pre className="whitespace-pre">
                    {markdownModalTab === 'grocery'
                      ? generateGroceryMarkdownTable()
                      : markdownModalTab === 'mealplan'
                      ? generateMealPlanMarkdownTable()
                      : `${generateGroceryMarkdownTable()}\n\n---\n\n${generateMealPlanMarkdownTable()}`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 font-medium">
                💡 可將複製之 Markdown 表格貼至 Notion、Obsidian、GitHub 或 Google 文件中使用
              </span>
              <button
                type="button"
                onClick={() => setIsMarkdownModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all"
              >
                關閉視窗
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

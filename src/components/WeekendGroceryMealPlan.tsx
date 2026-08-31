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
  CheckSquare
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

  // Markdown Table Modal state for inspecting/copying non-blank Markdown tables
  const [isMarkdownModalOpen, setIsMarkdownModalOpen] = useState<boolean>(false);
  const [markdownModalTab, setMarkdownModalTab] = useState<'grocery' | 'mealplan' | 'both'>('mealplan');
  const [copiedModalText, setCopiedModalText] = useState<boolean>(false);

  const [pastedGoogleResult, setPastedGoogleResult] = useState<string>('');
  const [copiedQuery, setCopiedQuery] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationSuccessNotice, setGenerationSuccessNotice] = useState<string | null>(null);

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
    setGenerationSuccessNotice(
      `已成功將 7 天菜單與採買清單重新校準至最新目標：每日 ${macroPlan.targetCalories} kcal / 蛋白質 ${macroPlan.targetProteinG}g！`
    );
  };

  const cookingMethodsStr = cookingMethods && cookingMethods.length > 0 ? cookingMethods.join('、') : '電鍋、一鍋到底、分開料理';

  // Google Search query builder string with comprehensive Settings 1 + 2 + 3 and strict non-blank Table Output formatting
  const googleQueryText = `依安迪·加爾平博士 (Dr. Andy Galpin) 運動生理學與營養學理論設計一週菜單與超市食材採買清單：
【1. 核心指令】加爾平運動生理學原則，每餐蛋白質達 30-45g 觸發肌肉蛋白質合成 (MPS) 亮氨酸超量恢復，100% 原型全食物。
【2. 前頁生理與 TDEE 數據】身高 ${currentHeight}cm、體重 ${currentWeight}kg、體脂率 ${currentBodyFat}%、年齡 ${currentAge}歲 (${genderLabel})、活動量「${activityLabel}」、基礎代謝率 BMR ${macroPlan.bmr} kcal、每日總消耗 TDEE ${macroPlan.tdee} kcal、每日目標熱量 ${macroPlan.targetCalories} kcal、目標蛋白質 ${macroPlan.targetProteinG}g。
【3. 個人偏好與生成設定】用餐人數「${servings} 人份」（食材採買份量依人數等比縮放）、核心健康目標「${fitnessGoal}」、飲食生活習慣偏好「${dietPreference}」、偏好料理方式「${cookingMethodsStr}」（請優先配合所選料理方式規劃極簡備餐步驟）。
【表格格式硬性規範 - 嚴禁留白與合併儲存格】
1. 表一【一週超市食材採買清單表格】：『食材分類』欄位之每一行（Row）均必須完整填寫並重複顯示該食材所屬分類名稱（如：蛋白質專區、蛋白質專區、蔬菜纖維區、蔬菜纖維區、優質低GI碳水、好油脂與調味、低GI水果與飲品），每行均不可留白、不可省略、不可合併儲存格！
2. 表二【7天原型食物建議菜單表格】：『星期』欄位之每一行（Row）均必須完整填寫並重複顯示星期名稱（如：週一、週一、週一、週一、週二、週二、週二、週二、週三、週三...），每一餐每一列皆不可留白、不可省略、不可合併儲存格！
【輸出格式要求】最後文字請務必以清晰結構化的「繁體中文 Markdown 表格 (Table)」呈現：
表一、【${servings}人份 一週超市食材採買清單表格】
| 食材分類 | 食材名稱 | 建議採買份量規格 | 營養亮點與備註 |
（註：分類欄位每一行皆須完整重複填寫「蛋白質專區」、「蔬菜纖維區」、「優質低GI碳水」、「好油脂與調味」、「低GI水果與飲品」，絕不留白）
表二、【週一至週日 7天原型食物建議菜單表格】
| 星期 | 餐別(早餐/午餐/晚餐/點心) | 菜色名稱 | 主要食材搭配作法 | 預估蛋白質(g) | 預估熱量(kcal) |
（註：星期欄位每一行皆須完整重複填寫「週一」、「週二」...等，絕不留白）`;

  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(googleQueryText)}`;

  const handleCopyGoogleQuery = () => {
    navigator.clipboard.writeText(googleQueryText);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2200);
  };

  // Generate & split into Grocery List + 7-Day Meal Plan
  const handleGenerateAndSplitPlan = async (isChangeSeed: boolean = false) => {
    setIsGenerating(true);
    setGenerationSuccessNotice(null);

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

      // Check if user pasted custom Google search results
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
          galpinSummary = `已成功解析貼上的 Google AI 問問檢索成果，並依加爾平運動生理學三大營養素原則（每日目標熱量 ${macroPlan.targetCalories} kcal、蛋白質 ${macroPlan.targetProteinG}g），等比轉化為 ${servings} 人份一週超市採買清單 (${generatedGrocery.length}項食材) 與 7 天菜單。`;
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
      setGenerationSuccessNotice(`已成功將內容解析並同步更新為【一週採購食材 (${generatedGrocery.length}項)】與【7天建議菜單】！`);
      
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
      setGenerationSuccessNotice('已清空超市採買清單！');
    }
  };

  const handleClearMealPlan = () => {
    if (window.confirm('確定要清空目前所有的「7天建議菜單」嗎？')) {
      saveMealPlan([]);
      setGenerationSuccessNotice('已清空 7 天建議菜單！');
    }
  };

  const handleClearAll = () => {
    if (window.confirm('確定要將「超市採買清單」與「7天建議菜單」全部清空嗎？清空後可隨時重新貼上 Google 問問 AI 內容或點擊生成按鈕。')) {
      saveGroceryList([]);
      saveMealPlan([]);
      setPastedGoogleResult('');
      setGenerationSuccessNotice('已成功將超市採買清單與 7 天建議菜單全部清空！');
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

  const openMarkdownModal = (tab: 'grocery' | 'mealplan' | 'both') => {
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

        {/* 3 Sub-Tabs Switcher: 設定 | 一週採購清單 | 7天建議菜單 */}
        <div className="mt-6 flex items-center gap-2 p-1.5 bg-black/30 backdrop-blur rounded-2xl max-w-xl">
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'settings'
                ? 'bg-amber-400 text-slate-950 shadow-md scale-102'
                : 'text-emerald-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>① 設定與檢索</span>
          </button>

          <button
            onClick={() => setActiveSubTab('grocery')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'grocery'
                ? 'bg-white text-slate-900 shadow-md scale-102'
                : 'text-emerald-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>② 一週採購清單</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-950 font-black">
              {totalCount}項
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('mealplan')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'mealplan'
                ? 'bg-white text-slate-900 shadow-md scale-102'
                : 'text-emerald-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>③ 7天建議菜單</span>
          </button>
        </div>
      </div>

      {/* Global Success / Synchronized Notification Banner */}
      {generationSuccessNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-500 text-emerald-950 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs sm:text-sm font-black">{generationSuccessNotice}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveSubTab('grocery')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black shadow-xs inline-flex items-center gap-1 transition-all ${
                activeSubTab === 'grocery' ? 'bg-emerald-800 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>查看採購食材 ({groceryList.length}項)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('mealplan')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black shadow-xs inline-flex items-center gap-1 transition-all ${
                activeSubTab === 'mealplan' ? 'bg-slate-950 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>查看7天菜單</span>
            </button>
            <button
              onClick={() => setGenerationSuccessNotice(null)}
              className="p-1 rounded-lg text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 text-xs ml-1"
              title="關閉通知"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: 設定 (Settings & Google Ask AI Search Integration) */}
      {/* ========================================================= */}
      {activeSubTab === 'settings' && (
        <div className="space-y-5">

          {/* 3-Section Unified Settings Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-emerald-600" />
                  <span>菜單與食材生成設定（Dr. Andy Galpin 理論）</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  已自動帶入帳號設定的用餐人數、健康目標與飲食偏好（無需在此重複配置），一鍵檢索即可生成採購食材與7天菜單。
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                免登入 Google 帳號
              </span>
            </div>

            {/* The Settings Overview Sections */}
            <div className="space-y-4">
              {/* ① 核心指令 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center">
                      1
                    </span>
                    <span className="text-sm font-black text-slate-900">核心指令</span>
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                    加爾平運動生理學原則
                  </span>
                </div>
                <div className="text-sm font-black text-slate-800 bg-white p-3 rounded-xl border border-slate-200/90 font-mono flex items-center justify-between gap-2">
                  <span>依安迪·加爾平的理論設計一週菜單</span>
                  <span className="text-[11px] font-normal text-slate-400">（MPS 亮氨酸超量恢復・100% 原型食物）</span>
                </div>
              </div>

              {/* ② 前頁生理與 TDEE */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center">
                      2
                    </span>
                    <span className="text-sm font-black text-slate-900">前頁生理與 TDEE 數據</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    連動個人檔案與每日記錄
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                      <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {currentHeight} cm / {currentWeight} kg / {currentBodyFat}% 體脂 · {currentAge}歲 ({genderLabel})
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {activityLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg text-slate-600">
                      <div className="text-[10px] text-slate-400 font-bold">基礎代謝 (BMR)</div>
                      <div className="font-black text-slate-900 text-sm">{macroPlan.bmr} <span className="text-[10px] font-normal">kcal</span></div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-slate-600">
                      <div className="text-[10px] text-slate-400 font-bold">總消耗 (TDEE)</div>
                      <div className="font-black text-slate-900 text-sm">{macroPlan.tdee} <span className="text-[10px] font-normal">kcal</span></div>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-lg text-emerald-800 border border-emerald-100">
                      <div className="text-[10px] text-emerald-600 font-bold">每日目標熱量</div>
                      <div className="font-black text-emerald-950 text-sm">{macroPlan.targetCalories} <span className="text-[10px] font-normal">kcal</span></div>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-lg text-emerald-800 border border-emerald-100">
                      <div className="text-[10px] text-emerald-600 font-bold">每日蛋白質目標</div>
                      <div className="font-black text-emerald-950 text-sm">{macroPlan.targetProteinG} <span className="text-[10px] font-normal">g</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ③ 帳號綁定之個人飲食偏好與方案（已自帳號同步・此處無需再次設定） */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/90 to-teal-50/50 border border-emerald-200/90 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center">
                      3
                    </span>
                    <span className="text-sm font-black text-slate-900">個人帳號偏好設定（已同步・此處無須再次設定）</span>
                  </span>
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-md">
                    帳號統一管理
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Servings */}
                  <div className="bg-white p-3 rounded-xl border border-emerald-200/80 shadow-2xs space-y-1">
                    <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span>用餐人數</span>
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {servings} <span className="text-xs font-bold text-slate-500">人份</span>
                    </div>
                  </div>

                  {/* Dietary Preference */}
                  <div className="bg-white p-3 rounded-xl border border-emerald-200/80 shadow-2xs space-y-1">
                    <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>飲食偏好</span>
                    </div>
                    <div className="text-sm font-black text-slate-900 truncate">
                      {dietPreference}
                    </div>
                  </div>

                  {/* Health Goal */}
                  <div className="bg-white p-3 rounded-xl border border-emerald-200/80 shadow-2xs space-y-1">
                    <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-emerald-600" />
                      <span>健康目標</span>
                    </div>
                    <div className="text-sm font-black text-slate-900 truncate">
                      {fitnessGoal}
                    </div>
                  </div>
                </div>

                {/* 偏好料理方式 (多選項: 1.電鍋 2.一鍋到底 3.分開料理) */}
                <div className="pt-2 border-t border-emerald-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-emerald-600" />
                      <span>偏好料理方式（多選項）</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded font-bold">
                        可複選多項
                      </span>
                      <span className="text-[10px] text-slate-500">
                        已選：{cookingMethods.join('、')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: '電鍋', title: '1. 電鍋', desc: '免顧火蒸煮、高營養保留、極簡備餐' },
                      { id: '一鍋到底', title: '2. 一鍋到底', desc: '省時少洗碗、極速炒燉、高飽足' },
                      { id: '分開料理', title: '3. 分開料理', desc: '風味層次分明、烘烤乾煎、豐富口感' },
                    ].map((method) => {
                      const isSelected = cookingMethods.includes(method.id);
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => handleToggleCookingMethod(method.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white border-emerald-500 text-slate-900 shadow-xs ring-2 ring-emerald-500/20'
                              : 'bg-white/60 border-emerald-200/80 hover:border-emerald-300 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold text-xs">
                            <span className="text-xs font-black text-slate-900">{method.title}</span>
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                              isSelected
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">{method.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Google Search Open & Query Section */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border-2 border-emerald-300 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-black text-emerald-950">
                        在 Google 搜尋中開啟檢索（免登入 Google 帳號）
                      </span>
                      <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md shadow-2xs">
                        表格呈現指令 (Markdown Table)
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      已預先加入指令要求 Google / 問問 AI 最後文字以結構化「採買表格」與「7天菜單表格」呈現
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyGoogleQuery}
                    className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
                    title="複製檢索指令至剪貼簿"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedQuery ? '已複製表格檢索詞！' : '複製檢索指令'}</span>
                  </button>

                  <a
                    href={googleSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                    title="新分頁開啟 Google 搜尋（免登入帳號）"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>在 Google 搜尋中開啟檢索（免登入）</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>
              </div>

              <div className="text-[11px] font-mono bg-white p-3.5 rounded-xl border border-emerald-200 text-slate-700 leading-relaxed break-words whitespace-pre-line shadow-inner">
                {googleQueryText}
              </div>
            </div>

            {/* Paste Search Results Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>貼上 Google 搜尋結果或問問 AI 表格/文字（可選）</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  支援 Markdown 表格與分類清單，留空則依公式自動生成
                </span>
              </div>

              <textarea
                value={pastedGoogleResult}
                onChange={(e) => setPastedGoogleResult(e.target.value)}
                rows={4}
                placeholder="您可將在 Google 搜尋中或問問 AI 找到的 Markdown 表格、食譜或食材清單直接貼在此處，系統將自動解析為採買清單與 7 天菜單..."
                className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-slate-50/50"
              />

              <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                <span className="text-slate-400 font-medium">快捷範例：</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPastedGoogleResult(`表一、【1人份 一週超市食材採買清單表格】
食材分類食材名稱建議採買份量規格營養亮點與備註
蛋白質專區冷凍/冷藏鮭魚菲力3 片 (約 450g)富含 Omega-3 脂肪酸、抗發炎與優質蛋白質
蛋白質專區雞胸肉3 包 (約 600g)高蛋白、低脂肪，適合午晚餐主食
蛋白質專區雞蛋1 打 (10 顆)完整胺基酸、豐富膽鹼與維生素
蛋白質專區無糖希臘優格2 罐 (每罐 500g)高蛋白質、提供益生菌與飽足感
蛋白質專區冷凍毛豆仁1 包 (約 300g)植物性蛋白質與膳食纖維雙效來源
蔬菜纖維區彩椒4 顆富含維生素 C、抗氧化與植化素
蔬菜纖維區菠菜或綠色時蔬4 包/把豐富鐵質、鎂與膳食纖維
蔬菜纖維區花椰菜2 顆十字花科植化素、協助肝臟代謝
蔬菜纖維區小番茄2 盒茄紅素抗氧化、低熱量高水分
優質低GI碳水滾壓燕麥片1 小包 (500g)β-葡聚醣調節血脂與腸道健康
優質低GI碳水紅藜麥或糙米1 小包 (500g)複合性碳水、升糖指數低
優質低GI碳水地瓜3-4 中條優質澱粉、富含鉀離子與纖維
好油脂與調味特級初榨橄欖油1 瓶 (500ml)地中海核心好油脂、單元不飽和脂肪酸
好油脂與調味綜合堅果 (無調味)1 包 (200g)健康脂肪、維生素 E 與礦物質
好油脂與調味酪梨2-3 顆脂溶性營養素載體、高飽足感
好油脂與調味海鹽、黑胡椒、蒜頭各適量提升原型食物風味，無多餘熱量
低GI水果與飲品藍莓2 盒花青素極高、抗氧化與低果糖
低GI水果與飲品無糖綠茶/黑咖啡適量促進代謝、水分補充與抗自由基

表二、【週一至週日 7天原型食物建議菜單表格】
星期餐別(早餐/午餐/晚餐/點心)菜色名稱主要食材搭配作法預估蛋白質(g)預估熱量(kcal)
週一早餐希臘優格藍莓碗無糖希臘優格 200g + 藍莓 50g + 綜合堅果 15g22g310 kcal
午餐橄欖油煎雞胸沙拉雞胸肉 130g (煎) + 菠菜、彩椒 + 橄欖油 10ml36g380 kcal
晚餐烤鮭魚佐藜麥花椰菜鮭魚 130g (烤) + 煮熟藜麥 60g + 花椰菜 100g34g430 kcal
點心水煮蛋與小番茄水煮蛋 2 顆 + 小番茄 100g13g190 kcal
週二早餐燕麥水煮蛋起司杯燕麥 35g (泡熱水) + 水煮蛋 2 顆 + 少許鹽胡椒16g280 kcal
午餐烤鮭魚彩椒菠菜碗鮭魚 130g (烤) + 菠菜、彩椒 + 地瓜 100g33g420 kcal
晚餐地中海雞胸溫沙拉雞胸肉 130g + 綜合生菜、小番茄 + 酪梨 1/2 顆38g410 kcal
點心希臘優格毛豆杯希臘優格 150g + 熟毛豆仁 50g22g210 kcal
週三早餐酪梨水煮蛋全麥/燕麥餐水煮蛋 2 顆 + 酪梨 1/2 顆 + 燕麥 30g18g340 kcal
午餐青檸香煎雞胸佐地瓜雞胸肉 140g + 地瓜 120g + 烤花椰菜39g400 kcal
晚餐義式烤鮭魚彩椒盤鮭魚 130g + 彩椒、洋蔥 + 熟藜麥 50g33g410 kcal
點心藍莓一把與堅果藍莓 80g + 綜合堅果 15g3g160 kcal
週四早餐雙蛋燕麥粥雞蛋 2 顆 (水波或拌入) + 燕麥 35g 煮成鹹粥 + 蔥花17g290 kcal
午餐低脂毛豆雞胸藜麥沙拉雞胸肉 120g + 毛豆仁 50g + 藜麥 60g + 菠菜40g430 kcal
晚餐香煎鮭魚佐蒸時蔬鮭魚 130g + 花椰菜、小番茄 + 橄欖油 5ml32g380 kcal
點心水煮蛋 2 顆水煮蛋 2 顆13g150 kcal
週五早餐希臘優格堅果碗希臘優格 200g + 堅果 15g + 藍莓 30g21g300 kcal
午餐彩椒炒雞胸佐地瓜雞胸肉 140g + 彩椒 1 顆 + 中地瓜 1 條 (120g)40g420 kcal
晚餐毛豆炒蛋佐烤鮭魚鮭魚 100g + 蛋 1 顆 + 毛豆仁 50g + 菠菜35g400 kcal
點心小番茄佐黑咖啡小番茄 150g + 無糖黑咖啡 1 杯2g50 kcal
週六早餐酪梨水煮蛋沙拉水煮蛋 2 顆 + 酪梨 1/2 顆 + 彩椒絲16g290 kcal
午餐鮮蝦/毛豆炒蛋佐地瓜剝殼蝦仁 120g + 毛豆仁 50g + 炒蛋 1 顆 + 小地瓜 120g36g430 kcal
晚餐地中海烤鮭魚排佐藜麥鮭魚 140g (烤) + 煮熟藜麥 60g + 烤彩椒花椰菜35g450 kcal
點心希臘優格藍莓杯希臘優格 150g + 藍莓 50g16g170 kcal
週日早餐燕麥水煮蛋暖心碗燕麥 40g + 水煮蛋 2 顆 + 橄欖油 3 滴18g310 kcal
午餐香煎雞胸花椰菜沙拉雞胸肉 140g + 花椰菜 150g + 酪梨 1/3 顆 + 藜麥 50g41g440 kcal
晚餐彩椒鮭魚毛豆溫沙拉鮭魚 120g + 毛豆仁 60g + 彩椒 + 菠菜36g420 kcal
點心綜合堅果一把綜合堅果 20g + 無糖綠茶5g140 kcal`)}
                    className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-300 hover:bg-teal-100 text-teal-800 text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs"
                  >
                    <span>📋 Google 複製表格範例</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPastedGoogleResult(`表一、1人份 一週超市食材採買清單表格
| 食材分類 | 食材名稱 | 建議採買份量規格 | 營養亮點與備註 |
| :--- | :--- | :--- | :--- |
| 蛋白質 | 冷凍鮭魚菲力 | 700g | 富含 EPA/DHA Omega-3 |
| 蛋白質 | 冷藏雞胸肉 | 700g | 分裝每份 100g 舒肥/乾煎 |
| 蛋白質 | 傳統板豆腐 | 2 盒 | 優質大豆異黃酮與鈣質 |
| 蛋白質 | 特選生鮮蝦仁中卷 | 300g | 高純度蛋白質、低脂 |
| 蛋白質 | 無糖希臘優格 | 1 大桶(1000g) | 高密度酪蛋白與益生菌 |
| 蛋白質 | 放牧大紅蛋 | 1 打(12顆) | 必需胺基酸完整來源 |
| 蔬菜纖維 | 綠花椰菜 | 3 顆 | 高蘿蔔硫素抗氧化 |
| 蔬菜纖維 | 嫩葉菠菜 | 3 包 | 高鎂高鉀促進神經修復 |
| 蔬菜纖維 | 彩椒櫛瓜 | 6 顆 | 豐富維生素 C 與微量元素 |
| 蔬菜纖維 | 大番茄/小番茄 | 2 盒 | 茄紅素抗發炎 |
| 低GI碳水 | 糙米紅藜麥 | 1000g | 複合碳水穩定血糖 |
| 低GI碳水 | 台農57號地瓜 | 4 條 | 高纖抗性澱粉 |
| 低GI碳水 | 全麥酸種麵包 | 1 條 | 緩慢升糖低胰島素負擔 |
| 低GI碳水 | 水煮鷹嘴豆 | 2 罐 | 優質植物蛋白複合碳水 |
| 好油調味 | 特級初榨橄欖油 | 1 瓶 | 單元不飽和脂肪酸 |
| 好油調味 | 新鮮酪梨 | 3 顆 | 天然優質油脂 |
| 好油調味 | 綜合堅果仁 | 1 包(150g) | 補充維生素 E 與硒 |
| 水果飲品 | 急凍野生藍莓 | 2 盒 | 超高花青素抗氧化 |
| 水果飲品 | 綠色奇異果 | 4 顆 | 奇異果酵素助蛋白質吸收 |
| 水果飲品 | 無糖綠茶/黑咖啡 | 適量 | 促進脂質代謝與專注 |

表二、週一至週日 7天原型食物建議菜單表格
| 星期 | 餐別 | 菜色名稱 | 主要食材搭配作法 | 預估蛋白質(g) | 預估熱量(kcal) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 週一 | 早餐 | 全麥酸種麵包佐水煮蛋酪梨盤 | 酸種麵包 + 雞蛋2顆 + 酪梨切片 + 黑咖啡 | 32g | 480 kcal |
| 週一 | 午餐 | 舒肥嫩雞胸佐糙米紅藜麥飯 | 冷藏雞胸肉 180g + 糙米飯 + 蒜香嫩菠菜 | 45g | 620 kcal |
| 週一 | 晚餐 | 香煎鮭魚排佐烤地瓜櫛瓜 | 冷凍鮭魚菲力 160g + 烤地瓜 + 彩椒櫛瓜 | 38g | 520 kcal |
| 週一 | 點心 | 無糖希臘優格抗氧化藍莓碗 | 希臘優格 150g + 急凍藍莓 + 綜合堅果 | 18g | 200 kcal |
| 週二 | 早餐 | 彩椒炒板豆腐高蛋白全麥餐 | 板豆腐 + 雞蛋 + 鮮採彩椒 + 酸種麵包 1片 | 30g | 450 kcal |
| 週二 | 午餐 | 特選生鮮蝦仁中卷糙米藜麥碗 | 蝦仁中卷 150g + 糙米飯 + 綠花椰菜 | 42g | 580 kcal |
| 週二 | 晚餐 | 香料烤雞胸佐地瓜溫沙拉 | 雞胸肉 180g + 地瓜 1條 + 生菜番茄 | 44g | 550 kcal |
| 週二 | 點心 | 綠色奇異果佐綜合堅果 | 奇異果 1顆 + 綜合烘焙堅果 20g | 6g | 160 kcal |
| 週三 | 早餐 | 藍莓希臘優格碗佐溫泉蛋 | 希臘優格 180g + 藍莓 + 堅果 + 雞蛋 1顆 | 32g | 460 kcal |
| 週三 | 午餐 | 挪威鮭魚菲力佐鷹嘴豆彩椒沙拉 | 鮭魚菲力 160g + 鷹嘴豆 + 嫩菠菜番茄 | 40g | 600 kcal |
| 週三 | 晚餐 | 板豆腐炒鮮蝦中卷佐糙米飯 | 蝦仁中卷 120g + 板豆腐 120g + 糙米飯 | 38g | 540 kcal |
| 週三 | 點心 | 放牧水煮蛋佐純黑美式 | 水煮蛋 1顆 + 純黑咖啡 250ml | 7g | 80 kcal |
| 週四 | 早餐 | 酸種麵包佐酪梨鮭魚水波蛋 | 酸種麵包 + 酪梨 + 鮭魚 100g + 水波蛋 | 34g | 490 kcal |
| 週四 | 午餐 | 青檸黑椒嫩煎雞胸地瓜餐 | 雞胸肉 180g + 帶皮地瓜 + 蒜炒花椰菜 | 45g | 610 kcal |
| 週四 | 晚餐 | 鷹嘴豆清燉板豆腐鮮蝦湯 | 鷹嘴豆 + 板豆腐 + 鮮蝦中卷 + 嫩菠菜 | 36g | 500 kcal |
| 週四 | 點心 | 無糖希臘優格佐野生藍莓 | 希臘優格 150g + 藍莓 40g | 17g | 180 kcal |
| 週五 | 早餐 | 特製雙蛋菠菜番茄蔬菜蛋捲 | 雞蛋 2顆 + 嫩菠菜番茄 + 酸種麵包 1片 | 28g | 430 kcal |
| 週五 | 午餐 | 香煎鮭魚菲力佐糙米飯櫛瓜 | 鮭魚菲力 160g + 糙米藜麥飯 + 烤櫛瓜 | 40g | 610 kcal |
| 週五 | 晚餐 | 舒肥雞胸佐鷹嘴豆生菜溫沙拉 | 雞胸肉 180g + 鷹嘴豆 + 生菜沙拉酪梨 | 44g | 560 kcal |
| 週五 | 點心 | 綠色奇異果佐綜合堅果 | 奇異果 1顆 + 核桃杏仁 20g | 6g | 160 kcal |
| 週六 | 早餐 | 酪梨水煮蛋全麥酸種盤 | 酪梨 + 雞蛋 2顆 + 酸種麵包 + 奇異果 | 30g | 470 kcal |
| 週六 | 午餐 | 生鮮蝦仁中卷彩椒糙米飯 | 蝦仁中卷 150g + 糙米飯 + 鮮花椰菜彩椒 | 42g | 590 kcal |
| 週六 | 晚餐 | 板豆腐鮭魚菲力烤地瓜盤 | 板豆腐 + 鮭魚菲力 140g + 地瓜 + 菠菜 | 40g | 560 kcal |
| 週六 | 點心 | 無糖希臘優格藍莓奇亞籽 | 希臘優格 150g + 藍莓 + 奇亞籽 | 18g | 200 kcal |
| 週日 | 早餐 | 藍莓希臘優格碗佐水煮蛋 | 希臘優格 + 藍莓 + 堅果 + 雞蛋 1顆 | 32g | 460 kcal |
| 週日 | 午餐 | 義大利香料烤雞胸佐鷹嘴豆 | 雞胸肉 180g + 鷹嘴豆 + 生菜橄欖油 | 45g | 600 kcal |
| 週日 | 晚餐 | 海陸雙饗鮭魚鮮蝦佐地瓜時蔬 | 鮭魚 100g + 蝦仁 80g + 地瓜 + 花椰菜 | 42g | 580 kcal |
| 週日 | 點心 | 綠色奇異果佐純黑美式 | 奇異果 1顆 + 黑咖啡 250ml | 2g | 60 kcal |`)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs"
                  >
                    <span>📊 Markdown 表格範例</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPastedGoogleResult(`1. 蛋白質專區
冷凍鮭魚菲力：700g（每份 100g × 7）
冷藏雞胸肉：700g（每份 100g × 7）
傳統板豆腐 / 扎實豆腐：2 盒（每盒約 300g，分次使用）
特選生鮮蝦仁 / 中卷：300g
無糖希臘優格 (Greek Yogurt)：1 大桶（約 1000g）
雞蛋：1 打（12 顆）

2. 蔬菜纖維區
菠菜 / 羽衣甘藍：3 包（洗淨分裝）
綠花椰菜：3 顆
彩椒（紅、黃、綠）：6 顆
大番茄 / 小番茄：2 盒
櫛瓜：4 根
綜合生菜沙拉葉：2 包

3. 優質低 GI 碳水區
糙米 / 紅藜麥混合飯：熟重約 1000g（分裝冷凍，每份約 100-120g × 6 份）
地瓜：4 條中型（每條約 120-150g）
全麥酸種麵包 (Sourdough)：1 條（切片冷凍，每餐 1-2 片）
鷹嘴豆（水煮罐頭）：2 罐

4. 好油脂與調味區
特級冷壓初榨橄欖油 (EVOO)：1 瓶
酪梨：3 顆
無調味綜合堅果（核桃、杏仁）：1 包（約 150g）
天然海鹽、黑胡椒、義大利香料、檸檬：各 1 份

5. 低 GI 水果與飲品區
藍莓：2 盒（高抗氧化）
綠色奇異果：4 顆
無糖綠茶 / 黑咖啡：適量（日常飲用）`)}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 text-[10px] font-semibold"
                  >
                    5大專區清單範例
                  </button>
                  <button
                    type="button"
                    onClick={() => setPastedGoogleResult('Google 問問 AI 推薦：加爾平理論 7 天高蛋白增肌菜單，每餐 35g 蛋白質，搭配台農地瓜與挪威鮭魚、雞胸肉、深綠蔬菜，點心無糖希臘優格')}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 text-[10px] font-semibold"
                  >
                    加爾平增肌範例
                  </button>
                  <button
                    type="button"
                    onClick={() => setPastedGoogleResult('Google 問問 AI 推薦：地中海抗氧化高 Omega-3 減脂菜單，包含鯖魚、酪梨、特級初榨橄欖油、板豆腐、花椰菜、藍莓燕麥')}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 text-[10px] font-semibold"
                  >
                    地中海抗炎範例
                  </button>
                  {pastedGoogleResult && (
                    <button
                      type="button"
                      onClick={() => setPastedGoogleResult('')}
                      className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-bold"
                    >
                      清空輸入
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons: Generate & Split */}
            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleGenerateAndSplitPlan(false)}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black shadow-md flex items-center justify-center gap-2 transition-all hover:scale-101 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>
                  {isGenerating 
                    ? '正在連網運算並分割清單...' 
                    : pastedGoogleResult.trim()
                      ? `解析貼上內容並分成【採購食材 ＋ 7天菜單】(${servings}人份)`
                      : `以 Google 問問 AI 模式生成並分成【採購食材 ＋ 7天菜單】(${servings}人份)`}
                </span>
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleGenerateAndSplitPlan(true)}
                className="py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                title="輪替另一組科學主題菜單"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>換一組建議</span>
              </button>

              {(groceryList.length > 0 || mealPlan.length > 0) && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="py-3.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
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
              <button
                onClick={() => setActiveSubTab('settings')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all shadow-2xs"
                title="返回設定重新生成或調整人數"
              >
                <Settings className="w-3.5 h-3.5 text-amber-600" />
                <span>調整設定 / 重新生成</span>
              </button>

              <button
                onClick={() => setIsAddingItem(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>新增自訂食材</span>
              </button>

              {groceryList.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => openMarkdownModal('grocery')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-all shadow-2xs"
                    title="檢視並複製完整採買清單 Markdown 表格（分類欄位完整重複、絕不留白）"
                  >
                    <Table className="w-4 h-4 text-teal-600" />
                    <span>採買 Markdown 表格</span>
                  </button>

                  <button
                    onClick={handleCopyGroceryList}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                    title="複製文字清單分享至 Line"
                  >
                    <Copy className="w-4 h-4" />
                    <span>複製清單</span>
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

          {/* Add Item Inline Form */}
          {isAddingItem && (
            <form 
              onSubmit={handleAddItem}
              className="bg-white rounded-2xl p-5 shadow-md border-2 border-emerald-500 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>自訂新增採買食材</span>
                </h3>
                <button 
                  type="button" 
                  onClick={() => setIsAddingItem(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  取消
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">食材名稱 *</label>
                  <input
                    type="text"
                    required
                    placeholder="例如：無糖優格、牛番茄"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">採買份量 / 規格</label>
                  <input
                    type="text"
                    placeholder="例如：2盒（約500g）"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">分類類別</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
                  >
                    <option value="protein">蛋白質專區 (蛋肉魚豆)</option>
                    <option value="vegetable">蔬菜纖維區</option>
                    <option value="carb">優質低GI碳水</option>
                    <option value="fat_seasoning">健康油脂與調味</option>
                    <option value="fruit_beverage">低GI水果與飲品</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">營養或備餐備註（選填）</label>
                <input
                  type="text"
                  placeholder="例如：週一午餐沙拉使用"
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingItem(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  確認新增
                </button>
              </div>
            </form>
          )}

          {/* Grocery Item Checklist or Empty State */}
          {groceryList.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <ShoppingCart className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">採買清單目前為空</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  目前尚未加入任何超市食材。您可以前往「設定與智能生成」貼上 Google 搜尋內容一鍵解析，或直接手動新增自訂食材。
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
                <button
                  type="button"
                  onClick={() => setIsAddingItem(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>手動新增自訂食材</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'all', label: '全部食材' },
                  { id: 'unchecked', label: '待採買' },
                  { id: 'protein', label: '蛋白質' },
                  { id: 'vegetable', label: '蔬菜纖維' },
                  { id: 'carb', label: '低GI碳水' },
                  { id: 'fat_seasoning', label: '好油調味' },
                  { id: 'fruit_beverage', label: '水果飲品' },
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

              {/* Grocery Item Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredGrocery.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 group select-none ${
                      item.checked
                        ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                        : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-xs text-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors border ${
                        item.checked
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 group-hover:border-emerald-500 bg-white'
                      }`}>
                        {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
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
          {/* Quick Action bar for Meal Plan */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900">
                {planMeta.servings || 1} 人份菜單總覽
              </span>
              {planMeta.isAiCustomized && (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold">
                  Google 問問 AI 智能生成
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleRecalibrateToLatestTargets}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-xs transition-all"
                title="以目前生理最新目標重新計算 7 天熱量與蛋白質"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>同步最新目標 ({macroPlan.targetCalories} kcal / {macroPlan.targetProteinG}g 蛋白)</span>
              </button>

              {mealPlan.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => openMarkdownModal('mealplan')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-all shadow-2xs"
                    title="檢視並複製 7 天建議菜單 Markdown 表格（星期欄位完整重複、絕不留白）"
                  >
                    <Table className="w-3.5 h-3.5 text-teal-600" />
                    <span>7天菜單 Markdown 表格</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openMarkdownModal('both')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all shadow-2xs"
                    title="檢視並複製一週採買+7天菜單全部 Markdown 表格"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline">全覽 Markdown 表格</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setActiveSubTab('settings')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-xs transition-all"
              >
                <Settings className="w-3.5 h-3.5 text-slate-950" />
                <span>返回設定 / 重新生成</span>
              </button>

              {mealPlan.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearMealPlan}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-xs"
                  title="清空 7 天菜單"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>清空菜單</span>
                </button>
              )}
            </div>
          </div>

          {mealPlan.length === 0 || !currentMealPlan ? (
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <ChefHat className="w-7 h-7" />
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

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Breakfast */}
                          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/80 space-y-2.5">
                            <div className="flex items-center justify-between text-xs gap-2">
                              <span className="font-extrabold text-amber-900 flex items-center gap-1.5 shrink-0">
                                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                <span>早餐 (Breakfast)</span>
                              </span>
                              {/* Top right corner: calories & protein */}
                              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
                                <span className="font-extrabold text-slate-800 text-xs flex items-center gap-0.5">
                                  <span className="text-orange-500 text-[11px]">🔥</span>
                                  <span>{bCal}</span>
                                  <span className="text-[10px] font-normal text-slate-500">kcal</span>
                                </span>
                                <span className="text-amber-200 font-bold">|</span>
                                <span className="font-extrabold text-emerald-700 text-xs flex items-center gap-0.5">
                                  <span className="text-emerald-600 text-[11px]">🥩</span>
                                  <span>{bProt}g</span>
                                  <span className="text-[10px] font-normal text-emerald-600/80">蛋白</span>
                                </span>
                              </div>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">{currentMealPlan.breakfast.name}</h4>
                            <p className="text-xs text-slate-600 leading-relaxed">{currentMealPlan.breakfast.description}</p>
                            
                            {/* Synchronized Ingredients */}
                            {currentMealPlan.breakfast.ingredients && (
                              <div className="pt-1">
                                <div className="text-[10px] font-bold text-amber-900 mb-1 flex items-center gap-1">
                                  <CalendarCheck className="w-3 h-3 text-amber-600" />
                                  <span>採買清單對應食材：</span>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                  {currentMealPlan.breakfast.ingredients.map((ing, iIdx) => (
                                    <span key={`bf-ing-${ing}-${iIdx}`} className="text-[10px] font-medium bg-white text-amber-900 px-1.5 py-0.5 rounded border border-amber-200 shadow-2xs">
                                      {ing}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-1 flex-wrap pt-1">
                              {currentMealPlan.breakfast.tags.map((t, tIdx) => (
                                <span key={`bf-tag-${t}-${tIdx}`} className="text-[10px] font-semibold bg-amber-100/60 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200/60">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Lunch */}
                          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/80 space-y-2.5">
                            <div className="flex items-center justify-between text-xs gap-2">
                              <span className="font-extrabold text-emerald-900 flex items-center gap-1.5 shrink-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                <span>午餐 (Lunch)</span>
                              </span>
                              {/* Top right corner: calories & protein */}
                              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                                <span className="font-extrabold text-slate-800 text-xs flex items-center gap-0.5">
                                  <span className="text-orange-500 text-[11px]">🔥</span>
                                  <span>{lCal}</span>
                                  <span className="text-[10px] font-normal text-slate-500">kcal</span>
                                </span>
                                <span className="text-emerald-200 font-bold">|</span>
                                <span className="font-extrabold text-emerald-700 text-xs flex items-center gap-0.5">
                                  <span className="text-emerald-600 text-[11px]">🥩</span>
                                  <span>{lProt}g</span>
                                  <span className="text-[10px] font-normal text-emerald-600/80">蛋白</span>
                                </span>
                              </div>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">{currentMealPlan.lunch.name}</h4>
                            <p className="text-xs text-slate-600 leading-relaxed">{currentMealPlan.lunch.description}</p>
                            
                            {/* Synchronized Ingredients */}
                            {currentMealPlan.lunch.ingredients && (
                              <div className="pt-1">
                                <div className="text-[10px] font-bold text-emerald-900 mb-1 flex items-center gap-1">
                                  <CalendarCheck className="w-3 h-3 text-emerald-600" />
                                  <span>採買清單對應食材：</span>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                  {currentMealPlan.lunch.ingredients.map((ing, iIdx) => (
                                    <span key={`lu-ing-${ing}-${iIdx}`} className="text-[10px] font-medium bg-white text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-200 shadow-2xs">
                                      {ing}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-1 flex-wrap pt-1">
                              {currentMealPlan.lunch.tags.map((t, tIdx) => (
                                <span key={`lu-tag-${t}-${tIdx}`} className="text-[10px] font-semibold bg-emerald-100/60 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Dinner */}
                          <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100/80 space-y-2.5">
                            <div className="flex items-center justify-between text-xs gap-2">
                              <span className="font-extrabold text-teal-900 flex items-center gap-1.5 shrink-0">
                                <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                                <span>晚餐 (Dinner)</span>
                              </span>
                              {/* Top right corner: calories & protein */}
                              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-teal-200 shadow-2xs">
                                <span className="font-extrabold text-slate-800 text-xs flex items-center gap-0.5">
                                  <span className="text-orange-500 text-[11px]">🔥</span>
                                  <span>{dCal}</span>
                                  <span className="text-[10px] font-normal text-slate-500">kcal</span>
                                </span>
                                <span className="text-teal-200 font-bold">|</span>
                                <span className="font-extrabold text-emerald-700 text-xs flex items-center gap-0.5">
                                  <span className="text-emerald-600 text-[11px]">🥩</span>
                                  <span>{dProt}g</span>
                                  <span className="text-[10px] font-normal text-emerald-600/80">蛋白</span>
                                </span>
                              </div>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">{currentMealPlan.dinner.name}</h4>
                            <p className="text-xs text-slate-600 leading-relaxed">{currentMealPlan.dinner.description}</p>
                            
                            {/* Synchronized Ingredients */}
                            {currentMealPlan.dinner.ingredients && (
                              <div className="pt-1">
                                <div className="text-[10px] font-bold text-teal-900 mb-1 flex items-center gap-1">
                                  <CalendarCheck className="w-3 h-3 text-teal-600" />
                                  <span>採買清單對應食材：</span>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                  {currentMealPlan.dinner.ingredients.map((ing, iIdx) => (
                                    <span key={`di-ing-${ing}-${iIdx}`} className="text-[10px] font-medium bg-white text-teal-900 px-1.5 py-0.5 rounded border border-teal-200 shadow-2xs">
                                      {ing}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-1 flex-wrap pt-1">
                              {currentMealPlan.dinner.tags.map((t, tIdx) => (
                                <span key={`di-tag-${t}-${tIdx}`} className="text-[10px] font-semibold bg-teal-100/60 text-teal-800 px-2 py-0.5 rounded-md border border-teal-200/60">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Healthy Snack */}
                          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100/80 space-y-2.5">
                            <div className="flex items-center justify-between text-xs gap-2">
                              <span className="font-extrabold text-purple-900 flex items-center gap-1.5 shrink-0">
                                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                                <span>午後點心 (Healthy Snack)</span>
                              </span>
                              {/* Top right corner: calories & protein */}
                              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs">
                                <span className="font-extrabold text-slate-800 text-xs flex items-center gap-0.5">
                                  <span className="text-orange-500 text-[11px]">🔥</span>
                                  <span>{sCal}</span>
                                  <span className="text-[10px] font-normal text-slate-500">kcal</span>
                                </span>
                                <span className="text-purple-200 font-bold">|</span>
                                <span className="font-extrabold text-emerald-700 text-xs flex items-center gap-0.5">
                                  <span className="text-emerald-600 text-[11px]">🥩</span>
                                  <span>{sProt}g</span>
                                  <span className="text-[10px] font-normal text-emerald-600/80">蛋白</span>
                                </span>
                              </div>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">{currentMealPlan.snack.name}</h4>
                            <p className="text-xs text-slate-600 leading-relaxed">{currentMealPlan.snack.description}</p>
                            
                            {/* Synchronized Ingredients */}
                            {currentMealPlan.snack.ingredients && (
                              <div className="pt-1">
                                <div className="text-[10px] font-bold text-purple-900 mb-1 flex items-center gap-1">
                                  <CalendarCheck className="w-3 h-3 text-purple-600" />
                                  <span>採買清單對應食材：</span>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                  {currentMealPlan.snack.ingredients.map((ing, iIdx) => (
                                    <span key={`sn-ing-${ing}-${iIdx}`} className="text-[10px] font-medium bg-white text-purple-900 px-1.5 py-0.5 rounded border border-purple-200 shadow-2xs">
                                      {ing}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-1 flex-wrap pt-1">
                              {currentMealPlan.snack.tags.map((t, tIdx) => (
                                <span key={`sn-tag-${t}-${tIdx}`} className="text-[10px] font-semibold bg-purple-100/60 text-purple-800 px-2 py-0.5 rounded-md border border-purple-200/60">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>
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

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const textToCopy =
                      markdownModalTab === 'grocery'
                        ? generateGroceryMarkdownTable()
                        : markdownModalTab === 'mealplan'
                        ? generateMealPlanMarkdownTable()
                        : `${generateGroceryMarkdownTable()}\n\n---\n\n${generateMealPlanMarkdownTable()}`;
                    navigator.clipboard.writeText(textToCopy);
                    setCopiedModalText(true);
                    setTimeout(() => setCopiedModalText(false), 2000);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  {copiedModalText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>已複製表格！</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>複製當前表格</span>
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
            <div className="flex items-center gap-1 p-2 bg-slate-100 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setMarkdownModalTab('mealplan')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
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
                              { slot: '早餐', item: day.breakfast, badgeBg: 'bg-amber-100 text-amber-800' },
                              { slot: '午餐', item: day.lunch, badgeBg: 'bg-blue-100 text-blue-800' },
                              { slot: '晚餐', item: day.dinner, badgeBg: 'bg-teal-100 text-teal-800' },
                              { slot: '點心', item: day.snack, badgeBg: 'bg-purple-100 text-purple-800' },
                            ];
                            return meals.map((m, mIdx) => {
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
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${m.badgeBg}`}>
                                      {m.slot}
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

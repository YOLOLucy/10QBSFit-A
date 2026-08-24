import React, { useState } from 'react';
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
  PlusCircle,
  ExternalLink
} from 'lucide-react';
import { INITIAL_GROCERY_LIST, WEEKLY_MEAL_PLAN } from '../data/mealAndGroceryData';
import { GroceryItem, DayMealPlan, UserProfile, DailyRecord, WebRecipeSuggestion } from '../types';
import { getTodayDateString, isWeekend } from '../utils/calculations';
import { AiMealPlanModal, AiMealPlanResult } from './AiMealPlanModal';

const STORAGE_KEY_GROCERY = 'health_balance_grocery_items_custom_v2';
const STORAGE_KEY_MEALPLAN = 'health_balance_mealplan_custom_v2';
const STORAGE_KEY_PLAN_META = 'health_balance_plan_meta_v2';

interface PlanMeta {
  servings: number;
  themeTitle?: string;
  galpinSummary?: string;
  isAiCustomized?: boolean;
}

interface WeekendGroceryMealPlanProps {
  userProfile?: UserProfile;
  latestRecord?: DailyRecord | null;
}

export const WeekendGroceryMealPlan: React.FC<WeekendGroceryMealPlanProps> = ({
  userProfile,
  latestRecord,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'grocery' | 'mealplan'>('grocery');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

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
      galpinSummary: '此菜單依循安迪·加爾平博士的運動營養學原則，旨在透過每日約 124 克蛋白質的攝取，並確保每餐蛋白質含量達到 30-45 克以可靠地觸發肌肉蛋白質合成 (MPS)。餐點結合低升糖指數的全穀物與豐富的優質脂肪，有助於穩定血糖、維持能量，並促進全身性代謝優化。所有食材皆為原型食物，並與採買清單 100% 完全同步，確保飲食執行效益最大化。',
      isAiCustomized: false,
    };
  });

  // Load weekly meal plan with local storage, default to WEEKLY_MEAL_PLAN
  const [mealPlan, setMealPlan] = useState<DayMealPlan[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MEALPLAN);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return WEEKLY_MEAL_PLAN;
  });

  // Helper to persist meal plan
  const saveMealPlan = (newPlan: DayMealPlan[]) => {
    setMealPlan(newPlan);
    try {
      localStorage.setItem(STORAGE_KEY_MEALPLAN, JSON.stringify(newPlan));
    } catch (e) {
      console.error(e);
    }
  };

  // Insert a web-suggested recipe to a specific day and meal
  const handleInsertRecipeToDay = (
    recipe: WebRecipeSuggestion, 
    dayOfWeek: string, 
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  ) => {
    const updatedPlan = mealPlan.map((dayPlan) => {
      if (dayPlan.dayOfWeek === dayOfWeek) {
        const mealObj = {
          name: recipe.title,
          description: `${recipe.galpinPrinciple} (${recipe.prepTimeMin ? `耗時約 ${recipe.prepTimeMin} 分鐘` : '原型料理'})`,
          caloriesApprox: recipe.caloriesApprox,
          proteinApprox: recipe.proteinApprox,
          carbsApprox: recipe.carbsApprox || 0,
          fatsApprox: recipe.fatsApprox || 0,
          tags: recipe.tags || [recipe.goalTag, '#GoogleAI網路精選'],
          ingredients: recipe.ingredients || [],
        };
        return {
          ...dayPlan,
          [mealType]: mealObj,
        };
      }
      return dayPlan;
    });

    saveMealPlan(updatedPlan);
    const targetIdx = updatedPlan.findIndex((d) => d.dayOfWeek === dayOfWeek);
    if (targetIdx !== -1) {
      setSelectedDayIdx(targetIdx);
    }
    setActiveSubTab('mealplan');
  };

  // Load grocery list with local storage, default to synchronized INITIAL_GROCERY_LIST
  const [groceryList, setGroceryList] = useState<GroceryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GROCERY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_GROCERY_LIST;
  });

  // Custom new item form state
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<GroceryItem['category']>('protein');
  const [newItemNotes, setNewItemNotes] = useState('');

  const todayStr = getTodayDateString();
  const weekendNow = isWeekend(todayStr);

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

  const handleResetChecklist = () => {
    if (window.confirm('確定要重置所有食材的勾選狀態，開始新一週的採買嗎？')) {
      const reset = groceryList.map((item) => ({ ...item, checked: false }));
      saveGroceryList(reset);
    }
  };

  const handleApplyAiPlan = (result: AiMealPlanResult) => {
    saveMealPlan(result.weeklyMealPlan);
    saveGroceryList(result.groceryList);
    savePlanMeta({
      servings: result.servings,
      themeTitle: result.themeTitle,
      galpinSummary: result.galpinSummary,
      isAiCustomized: true,
    });
    setSelectedDayIdx(0);
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

    let text = `🛒【${planMeta.servings || 2}人份 一週超市健康採買清單】（依 Dr. Andy Galpin 理論・與7天菜單100%同步）\n方案：${planMeta.themeTitle || 'Dr. Andy Galpin 菜單'}\n`;
    Object.entries(groupedByCategory).forEach(([catKey, items]) => {
      if (items.length > 0) {
        text += `\n${categoryNames[catKey] || '【其他】'}\n${items.join('\n')}`;
      }
    });
    text += `\n\n— 透過 10QBS 健康資產負債表管理一週原型食材！`;

    navigator.clipboard.writeText(text);
    alert(`已複製 ${planMeta.servings || 2} 人份一週採買清單到剪貼簿！可直接貼至備忘錄或 Line 採買時使用。`);
  };

  const filteredGrocery = groceryList.filter((item) => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'unchecked') return !item.checked;
    return item.category === categoryFilter;
  });

  const totalCount = groceryList.length;
  const checkedCount = groceryList.filter((i) => i.checked).length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const currentMealPlan: DayMealPlan = mealPlan[selectedDayIdx] || mealPlan[0] || WEEKLY_MEAL_PLAN[0];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Weekend Header Card */}
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
              採買清單與一週7天建議菜單食材<strong>100% 嚴密同步</strong>。支援 <strong>Dr. Andy Galpin 1-4人份 AI 智能客製</strong>，事先備妥一週原型食材，遠離高油糖外食負債！
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Primary AI Custom Planner Button */}
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-md flex items-center gap-1.5 transition-all hover:scale-105"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>🤖 Google 問問 AI：依加爾平理論設計菜單 (1-4人份)</span>
            </button>

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <button
                onClick={() => setIsAiModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-100 bg-emerald-950/60 hover:bg-emerald-800/80 px-3 py-1.5 rounded-lg border border-emerald-500/40 cursor-pointer transition-all hover:scale-105 shadow-xs"
                title="點擊調整人數與個人目標"
              >
                <Users className="w-3.5 h-3.5 text-emerald-300" />
                <span>{planMeta.servings || 1} 人份規格 (點擊調整人數/目標)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sub-Tab Navigation Switcher */}
        <div className="mt-5 flex items-center gap-2 p-1.5 bg-black/25 backdrop-blur rounded-2xl max-w-md">
          <button
            onClick={() => setActiveSubTab('grocery')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'grocery'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-emerald-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>一週超市採買清單</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 font-extrabold">
              {checkedCount}/{totalCount}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('mealplan')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'mealplan'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-emerald-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>7 天建議健康菜單</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Grocery Checklist */}
      {activeSubTab === 'grocery' && (
        <div className="space-y-4">
          {/* Progress & Quick Action Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span>採買進度完成度</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    （{planMeta.servings || 2}人份・同步菜單共 {totalCount} 項食材）
                  </span>
                </span>
                <span className="text-emerald-600">{progressPercent}% ({checkedCount}/{totalCount} 項)</span>
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
                onClick={() => setIsAiModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all shadow-2xs"
                title="以 AI 客製 1-4 人份 Dr. Andy Galpin 菜單與清單"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>AI 客製 (1-4人份)</span>
              </button>

              <button
                onClick={() => setIsAddingItem(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>新增自訂食材</span>
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
            </div>
          </div>

          {/* Add Item Inline Drawer/Form */}
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

      {/* VIEW 2: 7-Day Recommended Meal Plan */}
      {activeSubTab === 'mealplan' && (
        <div className="space-y-5">
          {/* Quick Action bar for Meal Plan */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900">
                {planMeta.servings || 2} 人份菜單總覽
              </span>
              {planMeta.isAiCustomized && (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold">
                  AI 智能生成
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAiModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-xs transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>AI 重新生成 (1-4人份)</span>
              </button>
            </div>
          </div>

          {/* Day of Week Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar">
            {mealPlan.map((plan, idx) => (
              <button
                key={plan.dayOfWeek}
                onClick={() => setSelectedDayIdx(idx)}
                className={`flex-1 min-w-[65px] py-2 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                  selectedDayIdx === idx
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div>{plan.dayOfWeek}</div>
                <div className="text-[10px] font-normal opacity-80 mt-0.5">
                  {idx === 5 || idx === 6 ? '週末' : '平日'}
                </div>
              </button>
            ))}
          </div>

          {/* Current Day Plan Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200 space-y-6">
            {/* Header info */}
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {currentMealPlan.dayOfWeek} 專屬食譜（{planMeta.servings || 2}人份）
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>每人單日預估 ~1600-1850 kcal・蛋白質 ~110-140g</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Breakfast */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    <span>早餐 (Breakfast)</span>
                  </span>
                  <span className="font-bold text-amber-700 text-[11px]">
                    ~{currentMealPlan.breakfast.caloriesApprox} kcal | 蛋白 {currentMealPlan.breakfast.proteinApprox}g
                  </span>
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
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    <span>午餐 (Lunch)</span>
                  </span>
                  <span className="font-bold text-emerald-700 text-[11px]">
                    ~{currentMealPlan.lunch.caloriesApprox} kcal | 蛋白 {currentMealPlan.lunch.proteinApprox}g
                  </span>
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
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-teal-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                    <span>晚餐 (Dinner)</span>
                  </span>
                  <span className="font-bold text-teal-700 text-[11px]">
                    ~{currentMealPlan.dinner.caloriesApprox} kcal | 蛋白 {currentMealPlan.dinner.proteinApprox}g
                  </span>
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
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-purple-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                    <span>午後點心 (Healthy Snack)</span>
                  </span>
                  <span className="font-bold text-purple-700 text-[11px]">
                    ~{currentMealPlan.snack.caloriesApprox} kcal | 蛋白 {currentMealPlan.snack.proteinApprox}g
                  </span>
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
          </div>
        </div>
      )}

      {/* AI Meal & Grocery Planner Modal */}
      <AiMealPlanModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplyPlan={handleApplyAiPlan}
        onInsertRecipeToDay={handleInsertRecipeToDay}
        currentServings={planMeta.servings || 2}
        profile={userProfile}
        latestRecord={latestRecord}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { 
  ShoppingCart, 
  UtensilsCrossed, 
  Check, 
  Plus, 
  Trash2, 
  Copy, 
  Sparkles, 
  Calendar, 
  Flame, 
  Clock, 
  ChefHat, 
  RefreshCw,
  CheckCircle2,
  Share2,
  Info
} from 'lucide-react';
import { INITIAL_GROCERY_LIST, WEEKLY_MEAL_PLAN } from '../data/mealAndGroceryData';
import { GroceryItem, DayMealPlan } from '../types';
import { getTodayDateString, isWeekend } from '../utils/calculations';

const STORAGE_KEY_GROCERY = 'health_balance_grocery_items_custom_v1';

export const WeekendGroceryMealPlan: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'grocery' | 'mealplan'>('grocery');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);

  // Load grocery list with local storage
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

  const saveList = (newList: GroceryItem[]) => {
    setGroceryList(newList);
    try {
      localStorage.setItem(STORAGE_KEY_GROCERY, JSON.stringify(newList));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCheck = (id: string) => {
    const updated = groceryList.map((item) => 
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    saveList(updated);
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
    };

    saveList([newItem, ...groceryList]);
    setNewItemName('');
    setNewItemQty('');
    setNewItemNotes('');
    setIsAddingItem(false);
  };

  const handleDeleteItem = (id: string) => {
    const updated = groceryList.filter((item) => item.id !== id);
    saveList(updated);
  };

  const handleResetChecklist = () => {
    if (window.confirm('確定要重置所有食材的勾選狀態，開始新一週的採買嗎？')) {
      const reset = groceryList.map((item) => ({ ...item, checked: false }));
      saveList(reset);
    }
  };

  const handleRestoreDefaults = () => {
    if (window.confirm('確定要恢復為官方推薦的標準一週採買清單嗎？')) {
      saveList(INITIAL_GROCERY_LIST);
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
      groupedByCategory[item.category]?.push(`- ${item.checked ? ' [已買] ' : ' [ ] '} ${item.name} (${item.quantity})`);
    });

    let text = `🛒【一週超市健康採買清單】（規劃7天自煮好食材）\n`;
    Object.entries(groupedByCategory).forEach(([catKey, items]) => {
      if (items.length > 0) {
        text += `\n${categoryNames[catKey] || '【其他】'}\n${items.join('\n')}`;
      }
    });
    text += `\n\n— 透過健康資產負債表管理一週食材！`;

    navigator.clipboard.writeText(text);
    alert('已複製一週採買清單到剪貼簿！可直接貼至備忘錄或 Line 採買時使用。');
  };

  const filteredGrocery = groceryList.filter((item) => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'unchecked') return !item.checked;
    return item.category === categoryFilter;
  });

  const totalCount = groceryList.length;
  const checkedCount = groceryList.filter((i) => i.checked).length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const currentMealPlan: DayMealPlan = WEEKLY_MEAL_PLAN[selectedDayIdx] || WEEKLY_MEAL_PLAN[0];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Weekend Header Card */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
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
            <p className="text-xs text-emerald-100/90 mt-1 max-w-xl leading-relaxed">
              在星期六日事先備妥一週份量的原型食材，平日自煮省時省錢，徹底遠離高油高糖外食負債！
            </p>
          </div>

          {weekendNow ? (
            <span className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black shadow-sm flex items-center gap-1.5 animate-pulse">
              <Sparkles className="w-4 h-4 text-slate-900" />
              <span>今日逢週末！正是採買備餐黃金時機</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-xl bg-white/10 text-emerald-100 text-xs font-medium border border-white/15">
              隨時預先規劃下週食材
            </span>
          )}
        </div>

        {/* Sub-Tab Navigation Switcher */}
        <div className="mt-6 flex items-center gap-2 p-1.5 bg-black/25 backdrop-blur rounded-2xl max-w-md">
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
                <span>採買進度完成度</span>
                <span className="text-emerald-600">{progressPercent}% ({checkedCount}/{totalCount} 項)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddingItem(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>新增食材</span>
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
                  <span>自訂新增一週採買食材</span>
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

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-bold leading-tight ${item.checked ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {item.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                      份量：{item.quantity}
                    </div>
                    {item.notes && (
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                        {item.notes}
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
                    title="刪除項目"
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
              <span>超市採買黃金準則（避開健康負債區）</span>
            </div>
            <p className="leading-relaxed text-amber-800">
              進入超市時，請優先沿著<strong>「外圍生鮮冷藏走道」</strong>（肉品、鮮魚、生鮮蔬果、蛋奶），避開中間走道滿滿的餅乾、含糖飲料與泡麵加工區。吃進原型食材，就是為身體存下最豐厚的長期複利！
            </p>
          </div>
        </div>
      )}

      {/* VIEW 2: 7-Day Recommended Meal Plan */}
      {activeSubTab === 'mealplan' && (
        <div className="space-y-5">
          {/* Day of Week Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar">
            {WEEKLY_MEAL_PLAN.map((plan, idx) => (
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
                  {currentMealPlan.dayOfWeek} 專屬食譜
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>全日預估熱量 ~1600-1750 kcal・蛋白質 ~110-130g</span>
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                {currentMealPlan.dayTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>營養師備餐指南：</strong>{currentMealPlan.nutritionTip}</span>
              </p>
            </div>

            {/* 4 Meals Grid: Breakfast, Lunch, Dinner, Snack */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Breakfast */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/80 space-y-2">
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
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  {currentMealPlan.breakfast.tags.map((t) => (
                    <span key={t} className="text-[10px] font-semibold bg-white/80 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Lunch */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/80 space-y-2">
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
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  {currentMealPlan.lunch.tags.map((t) => (
                    <span key={t} className="text-[10px] font-semibold bg-white/80 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Dinner */}
              <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100/80 space-y-2">
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
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  {currentMealPlan.dinner.tags.map((t) => (
                    <span key={t} className="text-[10px] font-semibold bg-white/80 text-teal-800 px-2 py-0.5 rounded-md border border-teal-200">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Healthy Snack */}
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100/80 space-y-2">
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
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  {currentMealPlan.snack.tags.map((t) => (
                    <span key={t} className="text-[10px] font-semibold bg-white/80 text-purple-800 px-2 py-0.5 rounded-md border border-purple-200">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

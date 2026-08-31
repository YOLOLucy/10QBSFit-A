import { DailyRecord, UserProfile } from '../types';

export function calculateBMI(heightCm: number, weightKg: number): number {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return 0;
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

export function getBMICategory(bmi: number): {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
} {
  if (bmi <= 0) {
    return {
      label: '未設定',
      color: 'gray',
      bgColor: 'bg-slate-100',
      textColor: 'text-slate-600',
      description: '請填寫身高與體重',
    };
  }
  if (bmi < 18.5) {
    return {
      label: '體重過輕',
      color: 'amber',
      bgColor: 'bg-amber-50 border-amber-200',
      textColor: 'text-amber-700',
      description: '建議適度增加健康蛋白質與肌力訓練以增肌',
    };
  }
  if (bmi <= 23.9) {
    return {
      label: '標準健康',
      color: 'emerald',
      bgColor: 'bg-emerald-50 border-emerald-200',
      textColor: 'text-emerald-700',
      description: '恭喜！體位落在衛福部建議的理想健康範圍內',
    };
  }
  if (bmi <= 26.9) {
    return {
      label: '過重警示',
      color: 'orange',
      bgColor: 'bg-orange-50 border-orange-200',
      textColor: 'text-orange-700',
      description: '建議進行日常飲食管理，少糖少油並增加每日步數',
    };
  }
  return {
    label: '肥胖族群',
    color: 'rose',
    bgColor: 'bg-rose-50 border-rose-200',
    textColor: 'text-rose-700',
    description: '建議進行系統性減脂計畫，積極存入健康資產、降低負債',
  };
}

export function getIdealWeightRange(heightCm: number): { min: number; max: number; mid: number } {
  if (!heightCm || heightCm <= 0) return { min: 0, max: 0, mid: 0 };
  const heightM = heightCm / 100;
  const min = Number((18.5 * heightM * heightM).toFixed(1));
  const max = Number((23.9 * heightM * heightM).toFixed(1));
  const mid = Number((22 * heightM * heightM).toFixed(1));
  return { min, max, mid };
}

export function calculateBMR(profile: Pick<UserProfile, 'weight' | 'height' | 'age' | 'gender' | 'bodyFat'>): number {
  const { weight, height, age, gender, bodyFat } = profile;
  if (!weight || !height || !age) return 1400;

  // If valid body fat percentage is provided, utilize Katch-McArdle formula for lean-mass precision
  if (bodyFat && bodyFat >= 5 && bodyFat <= 55) {
    const leanBodyMassKg = weight * (1 - bodyFat / 100);
    return Math.round(370 + (21.6 * leanBodyMassKg));
  }

  // Otherwise, fallback to Mifflin-St Jeor Equation
  if (gender === 'male') {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  } else {
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  }
}

export function calculateTDEE(profile: Pick<UserProfile, 'weight' | 'height' | 'age' | 'gender' | 'activityLevel' | 'bodyFat'>): number {
  const bmr = calculateBMR(profile);
  const multipliers: Record<UserProfile['activityLevel'], number> = {
    sedentary: 1.2, // 久坐無規律運動
    light: 1.375, // 輕度活動（每週運動1-3天）
    moderate: 1.55, // 中度活動（每週運動3-5天）
    very_active: 1.725, // 高度活躍（每週運動6-7天）
  };
  return Math.round(bmr * (multipliers[profile.activityLevel] || 1.375));
}

export interface GalpinMacroPlan {
  heightCm: number;
  weightKg: number;
  bodyFatPercent?: number;
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatsG: number;
  proteinRatioPercent: number;
  carbsRatioPercent: number;
  fatsRatioPercent: number;
  proteinPerKg: number;
  perMealProteinG: number;
  calorieDelta: number; // e.g. +300 or -400
  calorieDeltaDesc: string;
  galpinNotes: string;
}

export function calculateGalpinMacroTargets(
  profile: Pick<UserProfile, 'height' | 'weight' | 'bodyFat' | 'gender' | 'age' | 'activityLevel'>,
  fitnessGoal: string
): GalpinMacroPlan {
  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(profile);
  const weight = profile.weight || 68;

  let calorieDelta = 0;
  let calorieDeltaDesc = '維持熱量平衡 (Maintenance)';
  let proteinMultiplier = 1.8; // g / kg

  if (fitnessGoal.includes('增肌') || fitnessGoal.includes('Hypertrophy')) {
    calorieDelta = 300;
    calorieDeltaDesc = '+300 kcal 溫和熱量盈餘 (促進肌肉合成 MPS)';
    proteinMultiplier = 2.0;
  } else if (fitnessGoal.includes('減脂') || fitnessGoal.includes('Fat Loss')) {
    calorieDelta = -400;
    calorieDeltaDesc = '-400 kcal 穩定熱量赤字 (高蛋白保肌減脂)';
    proteinMultiplier = 2.2; // higher protein during deficit to preserve lean mass
  } else if (fitnessGoal.includes('運動表現') || fitnessGoal.includes('Performance')) {
    calorieDelta = 150;
    calorieDeltaDesc = '+150 kcal 訓練肝醣補給 (耐力爆發充能)';
    proteinMultiplier = 1.8;
  } else {
    // 抗發炎長壽 / Longevity
    calorieDelta = 0;
    calorieDeltaDesc = '±0 kcal 代謝抗發炎平衡';
    proteinMultiplier = 1.6;
  }

  // Ensure target calories don't drop dangerously below BMR
  const rawTargetCalories = tdee + calorieDelta;
  const targetCalories = Math.max(rawTargetCalories, Math.round(bmr * 1.05));

  // 1. Protein calculation: Dr. Galpin's 1.6~2.2g/kg rule
  let targetProteinG = Math.round(weight * proteinMultiplier);
  // Cap between safe bounds
  targetProteinG = Math.max(Math.min(targetProteinG, 260), 75);
  const proteinKcal = targetProteinG * 4;

  // 2. Fat calculation: 25% - 30% of total target calories (anti-inflammatory fats & hormone synthesis)
  const fatKcalTarget = targetCalories * 0.28;
  const targetFatsG = Math.round(fatKcalTarget / 9);
  const fatsKcal = targetFatsG * 9;

  // 3. Carbohydrate calculation: Remaining calories
  const remainingKcalForCarbs = Math.max(targetCalories - proteinKcal - fatsKcal, 240);
  const targetCarbsG = Math.round(remainingKcalForCarbs / 4);
  const carbsKcal = targetCarbsG * 4;

  // Accurate ratio percentages
  const totalActualKcal = proteinKcal + carbsKcal + fatsKcal;
  const proteinRatioPercent = Math.round((proteinKcal / totalActualKcal) * 100);
  const carbsRatioPercent = Math.round((carbsKcal / totalActualKcal) * 100);
  const fatsRatioPercent = 100 - proteinRatioPercent - carbsRatioPercent;

  // Per meal protein recommendation (3 meals + 1 snack => approx targetProteinG / 3.5)
  const perMealProteinG = Math.round(targetProteinG / 3.5);

  const galpinNotes = `依據身高 ${profile.height}cm、體重 ${weight}kg${profile.bodyFat ? `、體脂 ${profile.bodyFat}%` : ''} 換算 TDEE 為 ${tdee} kcal。每日目標熱量設定為 ${targetCalories} kcal（${calorieDeltaDesc}）。蛋白質規劃 ${targetProteinG}g (${proteinMultiplier}g/kg)，每餐均勻攝取 ~${perMealProteinG}g 刺激亮氨酸 (Leucine) 扳機；搭配 ${targetCarbsG}g 低 GI 原型複合碳水與 ${targetFatsG}g 抗發炎好油脂。`;

  return {
    heightCm: profile.height,
    weightKg: weight,
    bodyFatPercent: profile.bodyFat,
    bmr,
    tdee,
    targetCalories,
    targetProteinG,
    targetCarbsG,
    targetFatsG,
    proteinRatioPercent,
    carbsRatioPercent,
    fatsRatioPercent,
    proteinPerKg: proteinMultiplier,
    perMealProteinG,
    calorieDelta,
    calorieDeltaDesc,
    galpinNotes,
  };
}

export function calculateDailyWaterNeed(weightKg: number): number {
  if (!weightKg || weightKg <= 0) return 2000;
  return Math.round(weightKg * 35); // 35cc per kg
}

export function getHealthGrade(netWorth: number): {
  grade: string;
  status: string;
  badgeColor: string;
  cardColor: string;
  summary: string;
} {
  if (netWorth >= 800) {
    return {
      grade: 'AAA 頂級優良',
      status: '健康資產豐厚・富足滿溢',
      badgeColor: 'bg-emerald-500 text-white',
      cardColor: 'border-emerald-300 bg-emerald-50/50',
      summary: '今天的健康管理卓越！持續累積資產，為長遠健康打下堅實基礎。',
    };
  }
  if (netWorth >= 400) {
    return {
      grade: 'AA 良好盈餘',
      status: '健康收支順暢・持續增值',
      badgeColor: 'bg-teal-500 text-white',
      cardColor: 'border-teal-300 bg-teal-50/50',
      summary: '生活習慣自律，健康資產穩步增長，體態持續朝理想目標邁進。',
    };
  }
  if (netWorth >= 0) {
    return {
      grade: 'A 收支平衡',
      status: '維持水平・仍有成長空間',
      badgeColor: 'bg-amber-500 text-white',
      cardColor: 'border-amber-300 bg-amber-50/50',
      summary: '今日資產與負債大致持平，明天試著多走1000步或多喝一杯水突破平衡！',
    };
  }
  if (netWorth >= -400) {
    return {
      grade: 'B- 輕度赤字',
      status: '健康負債偏高・留意作息',
      badgeColor: 'bg-orange-500 text-white',
      cardColor: 'border-orange-300 bg-orange-50/50',
      summary: '今日部分生活習慣累積了健康負債，今晚早點休息，明天重整旗鼓！',
    };
  }
  return {
    grade: 'C 嚴重赤字警報',
    status: '高負債警告・緊急校正',
    badgeColor: 'bg-rose-500 text-white',
    cardColor: 'border-rose-300 bg-rose-50/50',
    summary: '今日生活透支較多，請檢視飲食與久坐狀況，讓身體好好修復排毒。',
  };
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekDay = weekDays[d.getDay()];
  return `${Number(parts[1])}/${Number(parts[2])}(${weekDay})`;
}

export function isWeekend(dateStr?: string): boolean {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

// LocalStorage helpers
const STORAGE_KEYS = {
  PROFILE: 'health_balance_user_profile_v1',
  RECORDS: 'health_balance_records_v1',
  GROCERY: 'health_balance_grocery_list_v1',
};

export const DEFAULT_PROFILE: UserProfile = {
  name: '健康實踐者',
  height: 172,
  weight: 68.5,
  targetWeight: 63.0,
  bodyFat: 21.5,
  gender: 'female',
  age: 29,
  activityLevel: 'light',
  isInitialized: true,
  reminderEnabled: true,
  reminderTime: '20:30',
  servings: 1,
  healthGoal: '減脂維持 (Fat Loss & Satiety)',
  dietPreference: '原型全食物均衡 (肉/魚/蛋/穀/蔬)',
};

// Seed realistic sample history for the past 6 days so trend chart is instantly rich and inspiring
export function generateSamplePastRecords(baseWeight: number): DailyRecord[] {
  const records: DailyRecord[] = [];
  const today = new Date();

  // Create 6 past days of data
  for (let i = 6; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    // Weight gradually improving / fluctuating realistically
    const dayWeight = Number((baseWeight + (i * 0.2) + (Math.sin(i) * 0.15)).toFixed(1));
    const totalAssets = Math.round(900 + Math.sin(i * 1.5) * 250);
    const totalLiabilities = Math.round(200 + Math.cos(i * 1.2) * 150);
    const netWorth = totalAssets - totalLiabilities;

    records.push({
      date: dateStr,
      weight: dayWeight,
      bodyFat: Number((22.5 - (6 - i) * 0.15).toFixed(1)),
      answers: [],
      totalAssets,
      totalLiabilities,
      netWorth,
      completed: true,
      notes: '每日健康常規打卡完成',
    });
  }

  return records;
}

export function loadUserProfile(): UserProfile {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load profile from storage', e);
  }
  return DEFAULT_PROFILE;
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile', e);
  }
}

export function loadHealthRecords(baseWeight: number): DailyRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load records from storage', e);
  }
  const initial = generateSamplePastRecords(baseWeight);
  saveHealthRecords(initial);
  return initial;
}

export function saveHealthRecords(records: DailyRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save records', e);
  }
}

// Client-side Dr. Andy Galpin 7-day Meal Plan & Synchronized Grocery Generator
export function generateClientGalpinMealPlan(
  servings: number,
  fitnessGoal: string,
  dietPreference: string,
  userBiometrics?: {
    height?: number;
    weight?: number;
    bodyFat?: number;
    age?: number;
    gender?: string;
    activityLevel?: string;
    bmr?: number;
    tdee?: number;
    targetCalories?: number;
    targetProteinG?: number;
    targetCarbsG?: number;
    targetFatsG?: number;
  },
  varietySeed?: number,
  cookingMethods: string[] = ['電鍋', '一鍋到底', '分開料理']
) {
  const s = Math.min(Math.max(Number(servings) || 1, 1), 4);
  const height = userBiometrics?.height || 172;
  const weight = userBiometrics?.weight || 68.5;
  const bodyFat = userBiometrics?.bodyFat || 22;
  const age = userBiometrics?.age || 29;
  const gender = userBiometrics?.gender || 'female';

  let bmr = userBiometrics?.bmr;
  if (!bmr || isNaN(bmr)) {
    if (bodyFat && bodyFat >= 5 && bodyFat <= 55) {
      const lbm = weight * (1 - bodyFat / 100);
      bmr = Math.round(370 + 21.6 * lbm);
    } else {
      bmr = gender === 'male'
        ? Math.round(10 * weight + 6.25 * height - 5 * age + 5)
        : Math.round(10 * weight + 6.25 * height - 5 * age - 161);
    }
  }

  const tdee = userBiometrics?.tdee || Math.round(bmr * 1.375);

  let targetCal = userBiometrics?.targetCalories;
  let targetProt = userBiometrics?.targetProteinG;
  let targetCarb = userBiometrics?.targetCarbsG;
  let targetFat = userBiometrics?.targetFatsG;

  if (!targetCal || isNaN(targetCal)) {
    if (fitnessGoal.includes('增肌') || fitnessGoal.includes('Hypertrophy')) {
      targetCal = tdee + 300;
      targetProt = Math.round(weight * 2.0);
    } else if (fitnessGoal.includes('減脂') || fitnessGoal.includes('Fat Loss')) {
      targetCal = Math.max(tdee - 400, Math.round(bmr * 1.05));
      targetProt = Math.round(weight * 2.2);
    } else if (fitnessGoal.includes('運動表現') || fitnessGoal.includes('Performance')) {
      targetCal = tdee + 150;
      targetProt = Math.round(weight * 1.8);
    } else {
      targetCal = tdee;
      targetProt = Math.round(weight * 1.6);
    }
    const fatKcal = targetCal * 0.28;
    targetFat = Math.round(fatKcal / 9);
    const remKcal = Math.max(targetCal - (targetProt * 4) - (targetFat * 9), 200);
    targetCarb = Math.round(remKcal / 4);
  }

  const proteinRatioPercent = Math.round(((targetProt * 4) / targetCal) * 100);
  const carbsRatioPercent = Math.round(((targetCarb * 4) / targetCal) * 100);
  const fatsRatioPercent = 100 - proteinRatioPercent - carbsRatioPercent;
  const proteinPerKg = Number((targetProt / weight).toFixed(1));

  const themeIdx = typeof varietySeed === 'number' ? Math.abs(varietySeed) % 6 : 0;
  const themes = [
    {
      title: `Google 問問 AI：加爾平理論 MPS 亮氨酸超量恢復菜單 (${s}人份 / ${targetCal}kcal)`,
      summary: `此菜單依循安迪·加爾平博士的運動生理學原則，旨在透過每日約 ${targetProt} 克蛋白質攝取，並確保每餐蛋白質含量達到 30-45 克以觸發肌肉蛋白質合成 (MPS)。結合低 GI 複合碳水與優質好油脂，食材與採買清單 100% 同步。`
    },
    {
      title: `Google 問問 AI：地中海抗氧化高 Omega-3 粒線體修復菜單 (${s}人份 / ${targetCal}kcal)`,
      summary: `以深海鮭魚、鯖魚、特級冷壓初榨橄欖油、彩虹植化素與高纖全穀為核心，依 Dr. Andy Galpin 理論強化細胞粒線體修復能力並抑制肌肉微創慢性發炎，全食物與採買清單完整銜接。`
    },
    {
      title: `Google 問問 AI：彩虹植化素全原型低 GI 代謝燃脂菜單 (${s}人份 / ${targetCal}kcal)`,
      summary: `強調十字花科蘿蔔硫素、茄紅素與深色莓果多酚，搭配足量精瘦蛋白質與台農地瓜等原型主食，穩定全日血糖波動，促進肝臟第二階段代謝與健康資產積累。`
    },
    {
      title: `Google 問問 AI：神經肌肉傳導與深層夜間修復菜單 (${s}人份 / ${targetCal}kcal)`,
      summary: `強化天然鎂鉀電解質、香蕉、酪梨與放牧雞蛋卵磷脂，晚間搭配無糖希臘優格色胺酸，優化自律神經調控與夜間生長激素修復循環，採買清單精確等比換算。`
    },
    {
      title: `Google 問問 AI：全食物抗炎與高能量輸出充能菜單 (${s}人份 / ${targetCal}kcal)`,
      summary: `針對高活動量與耐力表現設計，以三色藜麥、高纖燕麥、深海魚油與精瘦牛里肌為核心，強化肌酸儲備與細胞滲透壓平衡，採買清單精準對齊 7 天備餐。`
    },
    {
      title: `Google 問問 AI：腸道微生態優化與雙植物蛋白平衡菜單 (${s}人份 / ${targetCal}kcal)`,
      summary: `融合非基改板豆腐、原味毛豆仁、綜合野菇多醣體與純濃無糖希臘優格，建立高多樣性腸道菌叢環境，加速營養吸收並全面降低內源性氧化壓力。`
    }
  ];

  const chickenQty = `${(s * (targetProt > 130 ? 0.9 : 0.75)).toFixed(1)} kg（約${s * 3}-${s * 4}餐份）`;
  const eggsQty = `${s * 8} 顆（每人每天早晨 1-2 顆）`;
  const fishQty = `${s * 2} 片（挪威鮭魚/鯖魚）`;
  const tofuQty = `${Math.max(s * 1.5, 2)} 盒`;
  const oatsQty = `${s * 300} g（無糖大燕麥片）`;
  const sweetPotatoes = `${s * 4} 條（台農57號中型地瓜）`;

  return {
    servings: s,
    themeTitle: themes[themeIdx].title,
    galpinSummary: themes[themeIdx].summary,
    nutritionTarget: {
      heightCm: height,
      weightKg: weight,
      bodyFatPercent: bodyFat,
      bmr,
      tdee,
      targetCalories: targetCal,
      targetProteinG: targetProt,
      targetCarbsG: targetCarb,
      targetFatsG: targetFat,
      proteinRatioPercent,
      carbsRatioPercent,
      fatsRatioPercent,
      proteinPerKg,
      galpinNotes: `每餐均勻分配約 ${Math.round(targetProt / 3.5)}g 高生物價蛋白質觸發亮氨酸 (Leucine) MPS 閾值，搭配低 GI 複合碳水維持胰島素與血糖穩定。`,
    },
    weeklyMealPlan: [
      {
        dayOfWeek: "週一",
        dayTitle: "亮氨酸閾值啟動日 (Leucine Trigger & MPS)",
        nutritionTip: "週一重點在於每餐充足蛋白質 (30-45g) 刺激肌肉蛋白質合成，搭配高纖低 GI 地瓜補充肝醣。",
        totalCaloriesApprox: targetCal,
        totalProteinApprox: targetProt,
        totalCarbsApprox: targetCarb,
        totalFatsApprox: targetFat,
        breakfast: {
          name: "放牧水煮蛋搭酪梨黑麥全穀吐司",
          description: "2顆溫泉蛋/水煮蛋搭配半顆新鮮酪梨切片，淋上海鹽與特級初榨橄欖油。",
          caloriesApprox: Math.round(targetCal * 0.25),
          proteinApprox: Math.round(targetProt * 0.25),
          carbsApprox: Math.round(targetCarb * 0.25),
          fatsApprox: Math.round(targetFat * 0.28),
          tags: ["#MPS亮氨酸", "#低GI全碳水", "#好油脂Omega9"],
          ingredients: ["放牧雞蛋", "酪梨", "全穀吐司", "特級初榨橄欖油"]
        },
        lunch: {
          name: "炙烤迷迭香舒肥雞胸彩虹藜麥溫沙拉",
          description: "香草醃製舒肥雞胸肉切片，搭配蒸熟三色藜麥、綠花椰菜與牛番茄。",
          caloriesApprox: Math.round(targetCal * 0.35),
          proteinApprox: Math.round(targetProt * 0.35),
          carbsApprox: Math.round(targetCarb * 0.35),
          fatsApprox: Math.round(targetFat * 0.32),
          tags: ["#高生物價蛋白", "#蘿蔔硫素", "#粒線體抗氧化"],
          ingredients: ["雞胸肉", "三色藜麥", "綠花椰菜", "牛番茄", "特級初榨橄欖油"]
        },
        dinner: {
          name: "香煎薄鹽挪威鮭魚佐清蒸地瓜與蒜炒菠菜",
          description: "豐富 Omega-3 鮭魚排乾煎出天然魚油，搭配台農57號清蒸地瓜與富含鐵鎂的菠菜。",
          caloriesApprox: Math.round(targetCal * 0.3),
          proteinApprox: Math.round(targetProt * 0.3),
          carbsApprox: Math.round(targetCarb * 0.3),
          fatsApprox: Math.round(targetFat * 0.3),
          tags: ["#Omega3抗發炎", "#低GI原型澱粉", "#鎂離子舒壓"],
          ingredients: ["挪威鮭魚", "台農57號地瓜", "菠菜", "大蒜"]
        },
        snack: {
          name: "無糖希臘優格佐藍莓奇亞籽",
          description: "無糖純濃希臘優格 150g，拌入新鮮藍莓與奇亞籽，延緩夜間蛋白質分解。",
          caloriesApprox: Math.round(targetCal * 0.1),
          proteinApprox: Math.round(targetProt * 0.1),
          carbsApprox: Math.round(targetCarb * 0.1),
          fatsApprox: Math.round(targetFat * 0.1),
          tags: ["#慢釋放酪蛋白", "#花青素", "#腸道益生菌"],
          ingredients: ["無糖希臘式優格", "新鮮藍莓", "黑奇亞籽"]
        }
      },
      {
        dayOfWeek: "週二",
        dayTitle: "粒線體修復與有氧充能 (Mitochondrial Recharge)",
        nutritionTip: "大燕麥片提供 β-葡聚醣維持胰島素平穩，深海鯖魚 EPA/DHA 抑制肌肉微創發炎。",
        totalCaloriesApprox: targetCal,
        totalProteinApprox: targetProt,
        totalCarbsApprox: targetCarb,
        totalFatsApprox: targetFat,
        breakfast: {
          name: "高蛋白肉桂大燕麥奇亞籽果碗",
          description: "無糖大燕麥片加熱水/高纖豆漿泡開，灑肉桂粉、奇亞籽與一小把無調味堅果。",
          caloriesApprox: Math.round(targetCal * 0.25),
          proteinApprox: Math.round(targetProt * 0.25),
          carbsApprox: Math.round(targetCarb * 0.25),
          fatsApprox: Math.round(targetFat * 0.28),
          tags: ["#β葡聚醣", "#神經穩定", "#抗氧化肉桂"],
          ingredients: ["無糖大燕麥片", "黑奇亞籽", "綜合堅果", "無糖高纖豆漿"]
        },
        lunch: {
          name: "清炒毛豆仁牛里肌絲佐紫米糙米飯",
          description: "精瘦牛里肌絲與高蛋白毛豆仁快炒，搭配紫米糙米飯與香煎板豆腐塊。",
          caloriesApprox: Math.round(targetCal * 0.35),
          proteinApprox: Math.round(targetProt * 0.35),
          carbsApprox: Math.round(targetCarb * 0.35),
          fatsApprox: Math.round(targetFat * 0.32),
          tags: ["#血基質鐵質", "#大豆異黃酮", "#完整胺基酸"],
          ingredients: ["精瘦牛里肌肉", "鮮凍毛豆仁", "非基改板豆腐", "紫米糙米"]
        },
        dinner: {
          name: "鹽烤挪威白腹鯖魚佐南瓜塊與綜合生菜",
          description: "高濃度天然魚油鯖魚烤至金黃酥脆，搭配清蒸栗子南瓜與初榨橄欖油彩蔬沙拉。",
          caloriesApprox: Math.round(targetCal * 0.3),
          proteinApprox: Math.round(targetProt * 0.3),
          carbsApprox: Math.round(targetCarb * 0.3),
          fatsApprox: Math.round(targetFat * 0.3),
          tags: ["#Omega3極致", "#β胡蘿蔔素", "#電解質鉀離子"],
          ingredients: ["挪威無刺鯖魚排", "栗子南瓜", "牛番茄", "特級初榨橄欖油"]
        },
        snack: {
          name: "蒸放牧茶葉蛋搭微烘核桃果仁",
          description: "一顆茶葉蛋/水煮蛋，搭配 10-12 顆核桃仁，提供天然褪黑激素前驅物與維生素 E。",
          caloriesApprox: Math.round(targetCal * 0.1),
          proteinApprox: Math.round(targetProt * 0.1),
          carbsApprox: Math.round(targetCarb * 0.1),
          fatsApprox: Math.round(targetFat * 0.1),
          tags: ["#卵磷脂", "#維生素E", "#腦力專注"],
          ingredients: ["放牧雞蛋", "綜合堅果"]
        }
      },
      {
        dayOfWeek: "週三",
        dayTitle: "多樣性植化素與抗發炎 (Rainbow Phytonutrients)",
        nutritionTip: "十字花科（綠花椰菜、高麗菜）富含蘿蔔硫素 (Sulforaphane)，大幅提升肝臟第二階段排毒酶與抗氧化能力。",
        totalCaloriesApprox: targetCal,
        totalProteinApprox: targetProt,
        totalCarbsApprox: targetCarb,
        totalFatsApprox: targetFat,
        breakfast: {
          name: "義式番茄嫩菠菜雙蛋烘蛋",
          description: "2顆雞蛋加入新鮮菠菜葉與牛番茄丁，以小火橄欖油慢煎成蓬鬆烘蛋。",
          caloriesApprox: Math.round(targetCal * 0.25),
          proteinApprox: Math.round(targetProt * 0.25),
          carbsApprox: Math.round(targetCarb * 0.25),
          fatsApprox: Math.round(targetFat * 0.28),
          tags: ["#葉黃素", "#葉酸儲備", "#優質卵磷脂"],
          ingredients: ["放牧雞蛋", "菠菜", "牛番茄", "特級初榨橄欖油"]
        },
        lunch: {
          name: "檸檬蒜香舒肥雞胸搭甘甜台農地瓜",
          description: "清爽檸檬百里香風味舒肥雞胸肉，搭配烤熟地瓜一條與蒜炒高麗菜。",
          caloriesApprox: Math.round(targetCal * 0.35),
          proteinApprox: Math.round(targetProt * 0.35),
          carbsApprox: Math.round(targetCarb * 0.35),
          fatsApprox: Math.round(targetFat * 0.32),
          tags: ["#維生素C協同", "#低脂高蛋白", "#膳食纖維"],
          ingredients: ["雞胸肉", "台農57號地瓜", "高麗菜", "大蒜"]
        },
        dinner: {
          name: "金黃板豆腐燉綜合野菇佐三色藜麥",
          description: "煎至金黃的板豆腐與鴻禧菇、金針菇同燉，搭配藜麥飯與蒸花椰菜。",
          caloriesApprox: Math.round(targetCal * 0.3),
          proteinApprox: Math.round(targetProt * 0.3),
          carbsApprox: Math.round(targetCarb * 0.3),
          fatsApprox: Math.round(targetFat * 0.3),
          tags: ["#多醣體免疫", "#植物異黃酮", "#零膽固醇"],
          ingredients: ["非基改板豆腐", "綜合菇類", "三色藜麥", "綠花椰菜"]
        },
        snack: {
          name: "高纖無糖豆漿杯拌水煮毛豆",
          description: "無糖豆漿 250ml 搭配一小碗原味鹽水煮毛豆仁，蛋白質高達 15g。",
          caloriesApprox: Math.round(targetCal * 0.1),
          proteinApprox: Math.round(targetProt * 0.1),
          carbsApprox: Math.round(targetCarb * 0.1),
          fatsApprox: Math.round(targetFat * 0.1),
          tags: ["#植物雙蛋白", "#低熱量高飽足", "#異黃酮"],
          ingredients: ["無糖高纖豆漿", "鮮凍毛豆仁"]
        }
      },
      {
        dayOfWeek: "週四",
        dayTitle: "耐力與神經傳導優化 (Neuromuscular Peak)",
        nutritionTip: "香蕉與番茄富含天然鉀離子與維生素 B 群，調節神經肌肉興奮性，避免夜間抽筋並維持體液平衡。",
        totalCaloriesApprox: targetCal,
        totalProteinApprox: targetProt,
        totalCarbsApprox: targetCarb,
        totalFatsApprox: targetFat,
        breakfast: {
          name: "香蕉花生全穀抹醬厚片佐水煮蛋",
          description: "無糖天然花生醬抹於全穀黑麥吐司，切入新鮮香蕉片，搭配1顆放牧水煮蛋。",
          caloriesApprox: Math.round(targetCal * 0.25),
          proteinApprox: Math.round(targetProt * 0.25),
          carbsApprox: Math.round(targetCarb * 0.25),
          fatsApprox: Math.round(targetFat * 0.28),
          tags: ["#電解質鉀離子", "#單元不飽和脂肪", "#複合能量"],
          ingredients: ["全穀吐司", "新鮮香蕉", "放牧雞蛋", "綜合堅果"]
        },
        lunch: {
          name: "川味蔥椒牛腱肉片佐蒸糙米飯與燙雙色蔬菜",
          description: "滷牛腱肉切薄片，搭配糙米飯、燙綠花椰與高麗菜，淋上初榨冷壓橄欖油。",
          caloriesApprox: Math.round(targetCal * 0.35),
          proteinApprox: Math.round(targetProt * 0.35),
          carbsApprox: Math.round(targetCarb * 0.35),
          fatsApprox: Math.round(targetFat * 0.32),
          tags: ["#高密度肌酸", "#支鏈胺基酸BCAA", "#飽足感持久"],
          ingredients: ["精瘦牛里肌肉", "三色藜麥", "綠花椰菜", "高麗菜"]
        },
        dinner: {
          name: "香煎鮮鱸魚柳佐清蒸地瓜與牛番茄蔬菜湯",
          description: "鮮嫩鱸魚肉易消化好吸收，搭配地瓜與番茄洋蔥排毒蔬菜湯。",
          caloriesApprox: Math.round(targetCal * 0.3),
          proteinApprox: Math.round(targetProt * 0.3),
          carbsApprox: Math.round(targetCarb * 0.3),
          fatsApprox: Math.round(targetFat * 0.3),
          tags: ["#膠原多肽", "#茄紅素抗氧化", "#極速腸道吸收"],
          ingredients: ["挪威鮭魚", "台農57號地瓜", "牛番茄", "大蒜"]
        },
        snack: {
          name: "希臘優格佐野生藍莓",
          description: "濃郁希臘優格 120g 加上新鮮藍莓，消除訓練氧化自由基。",
          caloriesApprox: Math.round(targetCal * 0.1),
          proteinApprox: Math.round(targetProt * 0.1),
          carbsApprox: Math.round(targetCarb * 0.1),
          fatsApprox: Math.round(targetFat * 0.1),
          tags: ["#大腦神經保護", "#多酚類", "#微量元素"],
          ingredients: ["無糖希臘式優格", "新鮮藍莓"]
        }
      },
      {
        dayOfWeek: "週五",
        dayTitle: "自律神經調衡與代謝微調 (Homeostasis & Glycemic Control)",
        nutritionTip: "週五晚上通常外食誘惑多，先以高蛋白質與豐富膳食纖維打底，可避免血糖雲霄飛車效應。",
        totalCaloriesApprox: targetCal,
        totalProteinApprox: targetProt,
        totalCarbsApprox: targetCarb,
        totalFatsApprox: targetFat,
        breakfast: {
          name: "經典酪梨鮮蛋全穀三明治",
          description: "成熟酪梨壓泥抹底，夾入水煮蛋切片與番茄切片，撒上海鹽黑胡椒。",
          caloriesApprox: Math.round(targetCal * 0.25),
          proteinApprox: Math.round(targetProt * 0.25),
          carbsApprox: Math.round(targetCarb * 0.25),
          fatsApprox: Math.round(targetFat * 0.28),
          tags: ["#高單元不飽和", "#維生素B6", "#全日平穩血糖"],
          ingredients: ["酪梨", "放牧雞蛋", "牛番茄", "全穀吐司"]
        },
        lunch: {
          name: "黑胡椒洋蔥舒肥雞肉塊佐栗子南瓜泥",
          description: "舒肥雞肉切丁快炒甜洋蔥與彩椒，搭配帶皮清蒸栗子南瓜泥與花椰菜。",
          caloriesApprox: Math.round(targetCal * 0.35),
          proteinApprox: Math.round(targetProt * 0.35),
          carbsApprox: Math.round(targetCarb * 0.35),
          fatsApprox: Math.round(targetFat * 0.32),
          tags: ["#槲皮素抗炎", "#葉黃素明目", "#高纖維飽足"],
          ingredients: ["雞胸肉", "栗子南瓜", "洋蔥", "綠花椰菜"]
        },
        dinner: {
          name: "日式薄鹽鯖魚燒佐毛豆豆腐炊飯",
          description: "整片白腹鯖魚烘烤出油脂香氣，搭配毛豆、板豆腐丁同煮之高纖炊飯與菠菜。",
          caloriesApprox: Math.round(targetCal * 0.3),
          proteinApprox: Math.round(targetProt * 0.3),
          carbsApprox: Math.round(targetCarb * 0.3),
          fatsApprox: Math.round(targetFat * 0.3),
          tags: ["#腦磷脂DHA", "#降三酸甘油酯", "#天然抗凝血"],
          ingredients: ["挪威無刺鯖魚排", "鮮凍毛豆仁", "非基改板豆腐", "菠菜"]
        },
        snack: {
          name: "原味烘焙無調味堅果 15g",
          description: "杏仁果、核桃、腰果黃金配比，補充微量鋅鎂與抗氧化硒元素。",
          caloriesApprox: Math.round(targetCal * 0.1),
          proteinApprox: Math.round(targetProt * 0.1),
          carbsApprox: Math.round(targetCarb * 0.1),
          fatsApprox: Math.round(targetFat * 0.1),
          tags: ["#微量元素鋅", "#細胞膜保護", "#健康油脂"],
          ingredients: ["綜合堅果"]
        }
      },
      {
        dayOfWeek: "週六",
        dayTitle: "週末運動後超量恢復 (Supercompensation Weekend)",
        nutritionTip: "運動後 45 分鐘內攝取 3:1 碳水與蛋白質比例，能達到最高效率的肌肉肝醣超量恢復與肌肉修復。",
        totalCaloriesApprox: targetCal,
        totalProteinApprox: targetProt,
        totalCarbsApprox: targetCarb,
        totalFatsApprox: targetFat,
        breakfast: {
          name: "高纖燕麥藍莓香蕉能量杯佐無糖豆漿",
          description: "無糖大燕麥片混合無糖高纖豆漿，鋪上新鮮藍莓與香蕉切片，清爽高能量。",
          caloriesApprox: Math.round(targetCal * 0.25),
          proteinApprox: Math.round(targetProt * 0.25),
          carbsApprox: Math.round(targetCarb * 0.25),
          fatsApprox: Math.round(targetFat * 0.28),
          tags: ["#肝醣迅速超補", "#抗疲勞果糖", "#腸道益生元"],
          ingredients: ["無糖大燕麥片", "新鮮藍莓", "新鮮香蕉", "無糖高纖豆漿"]
        },
        lunch: {
          name: "炙燒舒肥雞胸佐三色藜麥溫暖雙蔬碗",
          description: "鮮嫩雞胸肉搭配三色藜麥、烤洋蔥、牛番茄與清蒸綠花椰菜，淋上冷壓橄欖油。",
          caloriesApprox: Math.round(targetCal * 0.35),
          proteinApprox: Math.round(targetProt * 0.35),
          carbsApprox: Math.round(targetCarb * 0.35),
          fatsApprox: Math.round(targetFat * 0.32),
          tags: ["#精氨酸循環", "#肌肉蛋白質超補", "#彩虹植化素"],
          ingredients: ["雞胸肉", "三色藜麥", "綠花椰菜", "牛番茄", "特級初榨橄欖油"]
        },
        dinner: {
          name: "頂級香煎厚切鮭魚排佐台農地瓜與蒜香菠菜",
          description: "富含天然蝦紅素與 Omega-3 的鮭魚排，搭配高纖地瓜與蒜香菠菜。",
          caloriesApprox: Math.round(targetCal * 0.3),
          proteinApprox: Math.round(targetProt * 0.3),
          carbsApprox: Math.round(targetCarb * 0.3),
          fatsApprox: Math.round(targetFat * 0.3),
          tags: ["#天然蝦紅素", "#抗肌酸痛", "#高抗發炎指標"],
          ingredients: ["挪威鮭魚", "台農57號地瓜", "菠菜", "大蒜"]
        },
        snack: {
          name: "黑奇亞籽無糖高纖豆漿布丁",
          description: "豆漿浸泡奇亞籽形成濃稠凝膠狀，富含可溶性纖維與植物 Omega-3。",
          caloriesApprox: Math.round(targetCal * 0.1),
          proteinApprox: Math.round(targetProt * 0.1),
          carbsApprox: Math.round(targetCarb * 0.1),
          fatsApprox: Math.round(targetFat * 0.1),
          tags: ["#植物ALA", "#水溶性纖維", "#腸道健康"],
          ingredients: ["黑奇亞籽", "無糖高纖豆漿"]
        }
      },
      {
        dayOfWeek: "週日",
        dayTitle: "一週總結與備餐消化排毒 (Gut & Liver Reset)",
        nutritionTip: "週日以豐富膳食纖維、十字花科蔬菜與優質發酵乳品促進腸道蠕動，為新的一週奠定健康資產基石。",
        totalCaloriesApprox: targetCal,
        totalProteinApprox: targetProt,
        totalCarbsApprox: targetCarb,
        totalFatsApprox: targetFat,
        breakfast: {
          name: "酪梨水煮雙蛋佐蒜香烤全穀黑麥吐司",
          description: "抹上蒜香橄欖油微烤全穀麵包，鋪後半顆酪梨泥與2顆黃金熟度溫泉蛋。",
          caloriesApprox: Math.round(targetCal * 0.25),
          proteinApprox: Math.round(targetProt * 0.25),
          carbsApprox: Math.round(targetCarb * 0.25),
          fatsApprox: Math.round(targetFat * 0.28),
          tags: ["#多酚大蒜素", "#葉黃素雙倍", "#飽足抗餓"],
          ingredients: ["酪梨", "放牧雞蛋", "全穀吐司", "大蒜"]
        },
        lunch: {
          name: "鮮菇豆腐番茄嫩牛煲佐金黃栗子南瓜",
          description: "非基改板豆腐與精瘦牛里肌、綜合菇類、牛番茄燉煮成清甜湯煲，佐以南瓜塊。",
          caloriesApprox: Math.round(targetCal * 0.35),
          proteinApprox: Math.round(targetProt * 0.35),
          carbsApprox: Math.round(targetCarb * 0.35),
          fatsApprox: Math.round(targetFat * 0.32),
          tags: ["#茄紅素活化", "#多醣體", "#優質電解質"],
          ingredients: ["非基改板豆腐", "精瘦牛里肌肉", "綜合菇類", "牛番茄", "栗子南瓜"]
        },
        dinner: {
          name: "香煎無刺鯖魚柳佐蒜炒高麗菜與紫米飯",
          description: "酥脆鯖魚搭配甘甜高麗菜與紫米糙米飯，清爽零負擔。",
          caloriesApprox: Math.round(targetCal * 0.3),
          proteinApprox: Math.round(targetProt * 0.3),
          carbsApprox: Math.round(targetCarb * 0.3),
          fatsApprox: Math.round(targetFat * 0.3),
          tags: ["#Omega3極品", "#低鈉清淡", "#高纖助消化"],
          ingredients: ["挪威無刺鯖魚排", "高麗菜", "紫米糙米", "大蒜"]
        },
        snack: {
          name: "無糖希臘優格拌核桃堅果碎",
          description: "純濃希臘優格 120g 搭配微碎核桃，天然色胺酸有助夜間深層睡眠。",
          caloriesApprox: Math.round(targetCal * 0.1),
          proteinApprox: Math.round(targetProt * 0.1),
          carbsApprox: Math.round(targetCarb * 0.1),
          fatsApprox: Math.round(targetFat * 0.1),
          tags: ["#深層睡眠修復", "#色胺酸", "#酪蛋白防分解"],
          ingredients: ["無糖希臘式優格", "綜合堅果"]
        }
      }
    ],
    groceryList: [
      {
        id: `ai_g_p1_${Date.now()}`,
        category: "protein" as const,
        name: "冷藏放牧機能雞蛋",
        quantity: eggsQty,
        checked: false,
        notes: "優質蛋白質與卵磷脂核心來源，富含葉黃素",
        mealUsage: ["週一早餐", "週二早餐", "週三早餐", "週四早餐", "週五早餐", "週日早餐"]
      },
      {
        id: `ai_g_p2_${Date.now()}`,
        category: "protein" as const,
        name: "生鮮去皮清雞胸肉",
        quantity: chickenQty,
        checked: false,
        notes: "高生物價低脂蛋白質，每100g含約23g蛋白質",
        mealUsage: ["週一午餐", "週三午餐", "週五午餐", "週六午餐"]
      },
      {
        id: `ai_g_p3_${Date.now()}`,
        category: "protein" as const,
        name: "生鮮無刺挪威鮭魚排",
        quantity: fishQty,
        checked: false,
        notes: "極致抗發炎 Omega-3 (EPA/DHA) 與天然蝦紅素",
        mealUsage: ["週一晚餐", "週四晚餐", "週六晚餐"]
      },
      {
        id: `ai_g_p4_${Date.now()}`,
        category: "protein" as const,
        name: "生鮮急凍無刺鯖魚切片",
        quantity: `${s * 3} 片`,
        checked: false,
        notes: "高濃度天然魚油，護心抗氧化抗發炎",
        mealUsage: ["週二晚餐", "週五晚餐", "週日晚餐"]
      },
      {
        id: `ai_g_p5_${Date.now()}`,
        category: "protein" as const,
        name: "生鮮精瘦牛里肌肉片/牛腱",
        quantity: `${s * 300} g`,
        checked: false,
        notes: "天然肌酸與血基質鐵，提升運動爆發力與紅血球攜氧",
        mealUsage: ["週二午餐", "週四午餐", "週日午餐"]
      },
      {
        id: `ai_g_p6_${Date.now()}`,
        category: "protein" as const,
        name: "非基改傳統板豆腐",
        quantity: tofuQty,
        checked: false,
        notes: "高鈣與大豆異黃酮，質地扎實蛋白質豐富",
        mealUsage: ["週二午餐", "週三晚餐", "週五晚餐", "週日午餐"]
      },
      {
        id: `ai_g_p7_${Date.now()}`,
        category: "protein" as const,
        name: "鮮凍原味毛豆仁",
        quantity: `${s * 250} g`,
        checked: false,
        notes: "植物界蛋白質之王，豐富膳食纖維與BCAA",
        mealUsage: ["週二午餐", "週三點心", "週五晚餐"]
      },
      {
        id: `ai_g_p8_${Date.now()}`,
        category: "protein" as const,
        name: "無糖純濃希臘式優格",
        quantity: `${s * 500} g（約1大罐）`,
        checked: false,
        notes: "富含緩慢吸收之酪蛋白與腸道益生菌",
        mealUsage: ["週一點心", "週四點心", "週日點心"]
      },
      {
        id: `ai_g_v1_${Date.now()}`,
        category: "vegetable" as const,
        name: "有機綠花椰菜 (Broccoli)",
        quantity: `${s * 2} 顆`,
        checked: false,
        notes: "富含蘿蔔硫素 (Sulforaphane)，提升肝臟解毒酵素",
        mealUsage: ["週一午餐", "週三晚餐", "週四午餐", "週五午餐", "週六午餐"]
      },
      {
        id: `ai_g_v2_${Date.now()}`,
        category: "vegetable" as const,
        name: "生鮮菠菜",
        quantity: `${s * 2} 把`,
        checked: false,
        notes: "高鎂、高葉酸與硝酸鹽，放鬆血管並助深層睡眠",
        mealUsage: ["週一晚餐", "週三早餐", "週五晚餐", "週六晚餐"]
      },
      {
        id: `ai_g_v3_${Date.now()}`,
        category: "vegetable" as const,
        name: "嚴選牛番茄",
        quantity: `${s * 4} 顆`,
        checked: false,
        notes: "富含脂溶性茄紅素 (Lycopene)，心血管守護神",
        mealUsage: ["週一午餐", "週三早餐", "週四晚餐", "週五早餐", "週日午餐"]
      },
      {
        id: `ai_g_v4_${Date.now()}`,
        category: "vegetable" as const,
        name: "鮮脆高麗菜",
        quantity: `${Math.max(Math.ceil(s/2), 1)} 顆`,
        checked: false,
        notes: "含維生素 U (S-甲基甲硫氨酸) 保護胃黏膜",
        mealUsage: ["週三午餐", "週四午餐", "週日晚餐"]
      },
      {
        id: `ai_g_v5_${Date.now()}`,
        category: "vegetable" as const,
        name: "綜合有機野菇 (鴻禧菇/金針菇/香菇)",
        quantity: `${s * 2} 包`,
        checked: false,
        notes: "富含β-葡聚醣多醣體，增強免疫巨噬細胞活性",
        mealUsage: ["週三晚餐", "週日午餐"]
      },
      {
        id: `ai_g_c1_${Date.now()}`,
        category: "carb" as const,
        name: "台農57號黃金地瓜",
        quantity: sweetPotatoes,
        checked: false,
        notes: "優質低GI複合碳水，高鉀高纖維，慢速釋放葡萄糖",
        mealUsage: ["週一晚餐", "週三午餐", "週四晚餐", "週六晚餐"]
      },
      {
        id: `ai_g_c2_${Date.now()}`,
        category: "carb" as const,
        name: "無糖大燕麥片 (Rolled Oats)",
        quantity: oatsQty,
        checked: false,
        notes: "富含β-葡聚醣，穩定餐後血糖與胰島素",
        mealUsage: ["週二早餐", "週四早餐", "週六早餐"]
      },
      {
        id: `ai_g_c3_${Date.now()}`,
        category: "carb" as const,
        name: "三色有機藜麥 / 有機糙米",
        quantity: `${s * 300} g`,
        checked: false,
        notes: "全套完整必需胺基酸與豐富膳食纖維",
        mealUsage: ["週一午餐", "週二午餐", "週三晚餐", "週四午餐", "週六午餐"]
      },
      {
        id: `ai_g_c4_${Date.now()}`,
        category: "carb" as const,
        name: "栗子南瓜",
        quantity: `${Math.max(Math.ceil(s/2), 1)} 顆`,
        checked: false,
        notes: "含豐富β-胡蘿蔔素與鉀，清甜可口",
        mealUsage: ["週二晚餐", "週五午餐", "週日午餐"]
      },
      {
        id: `ai_g_f1_${Date.now()}`,
        category: "fat_seasoning" as const,
        name: "特級初榨冷壓橄欖油 (EVOO)",
        quantity: "1 瓶 (500ml)",
        checked: false,
        notes: "高單元不飽和脂肪酸 (Omega-9)，冷拌或中小火烹調",
        mealUsage: ["每日烹調與沙拉淋油"]
      },
      {
        id: `ai_g_f2_${Date.now()}`,
        category: "fat_seasoning" as const,
        name: "進口新鮮酪梨 (Avocado)",
        quantity: `${s * 2} 顆`,
        checked: false,
        notes: "護心健康油脂與鉀，切丁搭配早餐或吐司",
        mealUsage: ["週一早餐", "週五早餐", "週日早餐"]
      },
      {
        id: `ai_g_f3_${Date.now()}`,
        category: "fat_seasoning" as const,
        name: "綜合無調味堅果 (核桃/杏仁/腰果)",
        quantity: `${s * 150} g`,
        checked: false,
        notes: "核桃含植物性 Omega-3 (ALA)，每日一小把",
        mealUsage: ["週二點心", "週日點心"]
      },
      {
        id: `ai_g_f4_${Date.now()}`,
        category: "fat_seasoning" as const,
        name: "有機黑奇亞籽 (Chia Seeds)",
        quantity: "1 包 (250g)",
        checked: false,
        notes: "高纖遇水膨脹，延緩胃排空與吸收",
        mealUsage: ["週一點心", "週二早餐", "週六點心"]
      },
      {
        id: `ai_g_fr1_${Date.now()}`,
        category: "fruit_beverage" as const,
        name: "新鮮野生藍莓 / 綜合莓果",
        quantity: `${s * 2} 盒`,
        checked: false,
        notes: "高花青素低GI水果，大腦抗氧化神物",
        mealUsage: ["週一點心", "週二早餐", "週六早餐"]
      },
      {
        id: `ai_g_fr2_${Date.now()}`,
        category: "fruit_beverage" as const,
        name: "新鮮香蕉 (黃綠香蕉)",
        quantity: `${s * 4} 根`,
        checked: false,
        notes: "運動前後迅速補充肝醣與電解質鉀",
        mealUsage: ["週四早餐", "週六早餐"]
      },
      {
        id: `ai_g_fr3_${Date.now()}`,
        category: "fruit_beverage" as const,
        name: "無糖高纖豆漿",
        quantity: `${s * 1000} ml`,
        checked: false,
        notes: "補充水分與大豆卵磷脂",
        mealUsage: ["週二早餐", "週六點心"]
      }
    ]
  };
}

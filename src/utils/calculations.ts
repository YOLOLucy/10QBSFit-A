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

export function calculateBMR(profile: UserProfile): number {
  const { weight, height, age, gender } = profile;
  if (!weight || !height || !age) return 1400;
  // Mifflin-St Jeor Equation
  if (gender === 'male') {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  } else {
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  }
}

export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile);
  const multipliers: Record<UserProfile['activityLevel'], number> = {
    sedentary: 1.2, // 久坐無運動
    light: 1.375, // 輕度活動（每週運動1-3天）
    moderate: 1.55, // 中度活動（每週運動3-5天）
    very_active: 1.725, // 高度活躍（每週運動6-7天）
  };
  return Math.round(bmr * (multipliers[profile.activityLevel] || 1.375));
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
  const weekDays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  const weekDay = weekDays[d.getDay()];
  return `${Number(parts[1])}月${Number(parts[2])}日 (${weekDay})`;
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

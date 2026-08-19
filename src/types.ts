export type QuestionCategory = 'nutrition' | 'exercise' | 'hydration' | 'weight' | 'diet';
export type DBAttribute = 'asset' | 'liability';
export type DBQuestionType = 'boolean' | 'numeric';

export interface QuestionDBItem {
  question_id: string;
  category: 'nutrition' | 'exercise' | 'hydration' | 'weight';
  type: DBQuestionType;
  question_text: string;
  attribute: DBAttribute;
  weight: number;
  galpin_principle: string;
  description?: string;
  tip?: string;
}

export interface HealthQuestion {
  id: string;
  question_id?: string;
  category: 'nutrition' | 'exercise' | 'hydration' | 'weight' | 'diet';
  type?: DBQuestionType;
  title: string;
  question_text?: string;
  description: string;
  positiveAnswer: 'yes' | 'no'; // Which answer yields an asset vs liability
  attribute?: DBAttribute;
  weightPoint?: number; // Raw weight/impact factor
  assetValue: number; // e.g. 150
  liabilityValue: number; // e.g. 150
  assetLabel: string; // e.g. "優質蛋白資產"
  liabilityLabel: string; // e.g. "蛋白攝取不足負債"
  iconName: string;
  tip: string;
  galpin_principle?: string;
}

export type WeightSource = 'manual' | 'apple_health' | 'google_fit' | 'smart_scale';

export interface UserProfile {
  name: string;
  height: number; // in cm
  weight: number; // in kg
  targetWeight?: number; // in kg
  bodyFat?: number; // in % (optional)
  gender: 'male' | 'female' | 'other';
  age: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active';
  isInitialized: boolean;
  autoSyncEnabled?: boolean;
  preferredSyncSource?: WeightSource;
  reminderEnabled?: boolean;
  reminderTime?: string; // e.g. "20:00" or "08:00"
}

export interface DailyAnswer {
  questionId: string;
  category: QuestionCategory;
  questionTitle: string;
  answer: 'yes' | 'no';
  isAsset: boolean;
  assetValue: number;
  liabilityValue: number;
  assetLabel: string;
  liabilityLabel: string;
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  weight: number;
  bodyFat?: number;
  weightSource?: WeightSource;
  syncedAt?: string;
  answers: DailyAnswer[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number; // totalAssets - totalLiabilities
  completed: boolean;
  notes?: string;
}

export interface GroceryItem {
  id: string;
  category: 'protein' | 'vegetable' | 'carb' | 'fat_seasoning' | 'fruit_beverage';
  name: string;
  quantity: string;
  checked: boolean;
  notes?: string;
}

export interface MealItem {
  name: string;
  description: string;
  caloriesApprox: number;
  proteinApprox: number;
  tags: string[];
}

export interface DayMealPlan {
  dayOfWeek: string; // '週一', '週二', etc.
  dayTitle: string;
  breakfast: MealItem;
  lunch: MealItem;
  dinner: MealItem;
  snack: MealItem;
  nutritionTip: string;
}

import React, { useState } from 'react';
import { 
  X, 
  User, 
  Scale, 
  Ruler, 
  Activity, 
  Droplet, 
  Flame, 
  Check, 
  Sparkles, 
  Target, 
  Info,
  ShieldAlert,
  Smartphone,
  RefreshCw,
  Heart
} from 'lucide-react';
import { UserProfile } from '../types';
import { 
  calculateBMI, 
  getBMICategory, 
  getIdealWeightRange, 
  calculateBMR, 
  calculateTDEE, 
  calculateDailyWaterNeed 
} from '../utils/calculations';
import { HealthSyncModal } from './HealthSyncModal';
import { HealthSyncResult } from '../utils/healthSync';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaveProfile: (newProfile: UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}) => {
  const [formData, setFormData] = useState<UserProfile>({ ...profile });
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentBMI = calculateBMI(formData.height, formData.weight);
  const bmiCategory = getBMICategory(currentBMI);
  const idealRange = getIdealWeightRange(formData.height);
  const bmr = calculateBMR(formData);
  const tdee = calculateTDEE(formData);
  const waterNeed = calculateDailyWaterNeed(formData.weight);

  const handleApplySyncedData = (res: HealthSyncResult) => {
    setFormData((prev) => ({
      ...prev,
      weight: res.weight,
      bodyFat: res.bodyFat !== undefined ? res.bodyFat : prev.bodyFat,
      preferredSyncSource: res.source,
      autoSyncEnabled: true,
    }));
    setSyncNotice(`已成功自【${res.sourceName}】同步體重 ${res.weight} kg ${res.bodyFat ? `(體脂 ${res.bodyFat}%)` : ''}`);
    setIsSyncModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      ...formData,
      isInitialized: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                個人體態基本資料設定
              </h2>
              <p className="text-xs text-slate-500">
                自動計算 BMI、標準理想體重、BMR 與每日建議飲水量
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Health Metric Preview Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-300">即時 BMI 指標</span>
            </div>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border ${bmiCategory.bgColor} ${bmiCategory.textColor}`}>
              {bmiCategory.label}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400">{currentBMI || '--'}</span>
            <span className="text-xs text-slate-400">
              標準理想體重區間：<strong>{idealRange.min} ~ {idealRange.max} kg</strong> (最適約 {idealRange.mid} kg)
            </span>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/80 text-center text-xs">
            <div>
              <div className="text-[10px] text-slate-400">基礎代謝 BMR</div>
              <div className="font-bold text-amber-300">{bmr} kcal</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">每日總消耗 TDEE</div>
              <div className="font-bold text-emerald-300">{tdee} kcal</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">每日建議水份</div>
              <div className="font-bold text-cyan-300">{waterNeed} cc</div>
            </div>
          </div>
        </div>

        {/* Sync Quick Action Card */}
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">手機健康數據自動連結</div>
              <div className="text-[11px] text-emerald-700">
                {syncNotice || '支援 Apple 健康 (HealthKit)、Google Fit 與藍牙體脂計'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSyncModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 shrink-0 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>手機同步</span>
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Name */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">暱稱 / 姓名</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">生理性別</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
              >
                <option value="female">女性 (Female)</option>
                <option value="male">男性 (Male)</option>
                <option value="other">其他</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Height */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">身高 (cm) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  required
                  value={formData.height || ''}
                  onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-semibold"
                />
                <span className="text-slate-400 absolute right-2.5 top-2">cm</span>
              </div>
            </div>

            {/* Current Weight */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">當前體重 (kg) *</label>
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(true)}
                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold"
                >
                  自動同步
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.weight || ''}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-semibold"
                />
                <span className="text-slate-400 absolute right-2.5 top-2">kg</span>
              </div>
            </div>

            {/* Target Weight */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">目標體重 (kg)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder={`建議 ${idealRange.mid}`}
                  value={formData.targetWeight || ''}
                  onChange={(e) => setFormData({ ...formData, targetWeight: parseFloat(e.target.value) || undefined })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-semibold"
                />
                <span className="text-slate-400 absolute right-2.5 top-2">kg</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Body Fat % (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">體脂率 %</label>
                <span className="text-[10px] text-slate-400 font-normal">（非必須選填）</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder="例如：21.5（選填）"
                  value={formData.bodyFat || ''}
                  onChange={(e) => setFormData({ ...formData, bodyFat: parseFloat(e.target.value) || undefined })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <span className="text-slate-400 absolute right-2.5 top-2">%</span>
              </div>
            </div>

            {/* Age */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">年齡 (歲)</label>
              <input
                type="number"
                value={formData.age || ''}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value, 10) || 25 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">日常活動量級別（用以估算TDEE）</label>
            <select
              value={formData.activityLevel}
              onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white text-xs"
            >
              <option value="sedentary">久坐辦公族（幾乎很少規律運動，係數 1.2）</option>
              <option value="light">輕度活動（每週運動 1-3 天，係數 1.375）</option>
              <option value="moderate">中度規律運動（每週運動 3-5 天，係數 1.55）</option>
              <option value="very_active">高度活躍/重度訓練（每週運動 6-7 天，係數 1.725）</option>
            </select>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>儲存個人基本設定</span>
            </button>
          </div>
        </form>

        {/* Sync Modal */}
        <HealthSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          currentWeight={formData.weight}
          onApplySyncedData={handleApplySyncedData}
        />
      </div>
    </div>
  );
};


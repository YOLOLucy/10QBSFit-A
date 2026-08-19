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
  Heart,
  Bell,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle
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
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendTestReminder,
  isNotificationSupported
} from '../utils/reminder';

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
  const [formData, setFormData] = useState<UserProfile>({ 
    ...profile,
    reminderEnabled: profile.reminderEnabled ?? true,
    reminderTime: profile.reminderTime ?? '20:30'
  });
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [testNotice, setTestNotice] = useState<{ text: string; success: boolean } | null>(null);
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  if (!isOpen) return null;

  const currentBMI = calculateBMI(formData.height, formData.weight);
  const bmiCategory = getBMICategory(currentBMI);
  const idealRange = getIdealWeightRange(formData.height);
  const bmr = calculateBMR(formData);
  const tdee = calculateTDEE(formData);
  const waterNeed = calculateDailyWaterNeed(formData.weight);
  const notificationPerm = getNotificationPermission();

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

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    if (res === 'granted') {
      setTestNotice({ text: '已成功授權瀏覽器本地通知權限！', success: true });
    } else {
      setTestNotice({ text: '未獲得瀏覽器通知授權，將使用應用內橫幅作為提醒方式。', success: false });
    }
  };

  const handleSendTest = async () => {
    setIsTestingNotification(true);
    try {
      const res = await sendTestReminder(formData.reminderTime || '20:30');
      setTestNotice({ text: res.message, success: res.success });
    } catch (err) {
      console.error(err);
      setTestNotice({ text: '發送測試提醒時發生異常', success: false });
    } finally {
      setIsTestingNotification(false);
    }
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
                個人體態與問卷提醒設定
              </h2>
              <p className="text-xs text-slate-500">
                設定每日 10 題定時通知、基本身體素質與手機健康同步
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
          
          {/* Section 1: Daily Reminder Settings (每日問卷定時提醒區塊) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-blue-50/50 border border-indigo-100/90 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">每日 10 題問卷提醒設定</h3>
                  <p className="text-[11px] text-slate-500">定時在瀏覽器與手機中跳出通知，提醒您結算健康資產</p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.reminderEnabled)}
                  onChange={(e) => setFormData({ ...formData, reminderEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {formData.reminderEnabled && (
              <div className="space-y-2.5 pt-2 border-t border-indigo-100/60">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>每日提醒時間點：</span>
                  </div>

                  <input
                    type="time"
                    value={formData.reminderTime || '20:30'}
                    onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                    className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Preset Quick Time Selection Pills */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  {[
                    { label: '晨間量測 (07:30)', time: '07:30' },
                    { label: '午餐盤點 (13:00)', time: '13:00' },
                    { label: '晚間結算 (20:30)', time: '20:30' },
                    { label: '睡前盤點 (22:00)', time: '22:00' },
                  ].map((preset) => (
                    <button
                      key={preset.time}
                      type="button"
                      onClick={() => setFormData({ ...formData, reminderTime: preset.time })}
                      className={`flex-1 py-1 px-1 rounded-lg text-[10px] font-semibold border transition-all text-center ${
                        formData.reminderTime === preset.time
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Browser Notification Status & Test Action */}
                <div className="flex items-center justify-between pt-2 text-[11px] bg-white/70 p-2.5 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="font-medium">通知狀態：</span>
                    {notificationPerm === 'granted' ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 已授權瀏覽器通知
                      </span>
                    ) : notificationPerm === 'denied' ? (
                      <span className="text-rose-600 font-bold flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3 text-rose-500" /> 瀏覽器已封鎖通知
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestPermission}
                        className="text-indigo-600 font-bold underline hover:text-indigo-700"
                      >
                        點此授權瀏覽器通知
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={isTestingNotification}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-xs flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Send className={`w-3 h-3 ${isTestingNotification ? 'animate-bounce' : ''}`} />
                    <span>測試發送提醒</span>
                  </button>
                </div>

                {testNotice && (
                  <div className={`p-2 rounded-xl text-[11px] flex items-center gap-1.5 ${
                    testNotice.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{testNotice.text}</span>
                  </div>
                )}
              </div>
            )}
          </div>

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
              <span>儲存個人設定與提醒</span>
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



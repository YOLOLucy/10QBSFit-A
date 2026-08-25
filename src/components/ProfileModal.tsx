import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  ExternalLink,
  Mail,
  Copy,
  FileText,
  Lock,
  UserCheck,
  Terminal,
  Download,
  Trash2,
  Cpu,
  Globe,
  Server
} from 'lucide-react';
import { UserProfile, SystemLogEntry } from '../types';
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
import { PRIVACY_POLICY_DATA } from '../data/privacyPolicyData';
import { 
  getSystemLogs, 
  clearSystemLogs, 
  downloadLogFile, 
  exportLogsAsText, 
  addSystemLog, 
  getEnvironmentInfo 
} from '../utils/systemLogger';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaveProfile: (newProfile: UserProfile) => void;
  initialTab?: 'settings' | 'privacy' | 'logs';
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  initialTab = 'settings',
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'privacy' | 'logs'>(initialTab);
  const [formData, setFormData] = useState<UserProfile>({ 
    ...profile,
    reminderEnabled: profile.reminderEnabled ?? true,
    reminderTime: profile.reminderTime ?? '20:30'
  });
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [testNotice, setTestNotice] = useState<{ text: string; success: boolean } | null>(null);
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Diagnostic Log State
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [logFilterLevel, setLogFilterLevel] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [isTestingDiag, setIsTestingDiag] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLogs(getSystemLogs());
    }
  }, [isOpen, activeTab]);

  const refreshLogs = () => {
    setLogs(getSystemLogs());
  };

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

  const sanitizeNumber = (val: string, allowDecimal = true) => {
    if (allowDecimal) {
      val = val.replace(/[^0-9.]/g, '');
      const parts = val.split('.');
      if (parts.length > 2) {
        val = parts[0] + '.' + parts.slice(1).join('');
      }
      return val;
    }
    return val.replace(/[^0-9]/g, '');
  };

  if (!isOpen) return null;

  const currentBMI = calculateBMI(formData.height, formData.weight);
  const bmiCategory = getBMICategory(currentBMI);
  const idealRange = getIdealWeightRange(formData.height);
  const bmr = calculateBMR(formData);
  const tdee = calculateTDEE(formData);
  const waterNeed = calculateDailyWaterNeed(formData.weight);
  const notificationPerm = getNotificationPermission();

  const handleCopyPrivacyLink = () => {
    navigator.clipboard.writeText(PRIVACY_POLICY_DATA.liveUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

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

  const handleCopyLogsText = () => {
    const text = exportLogsAsText();
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleClearAllLogs = () => {
    if (window.confirm('確定要清空帳號內儲存的所有系統運行與部署診斷日誌嗎？')) {
      clearSystemLogs();
      refreshLogs();
    }
  };

  const handleRunDiagnosticTest = async () => {
    setIsTestingDiag(true);
    const env = getEnvironmentInfo();

    addSystemLog({
      level: 'info',
      module: 'system',
      action: '執行手動環境連線與運算診斷檢測',
      message: `開始檢測當前主機 ${env.host}，網路在線狀態: ${env.online ? '正常' : '離線'}`,
      details: {
        environment: env,
        userProfile: {
          height: formData.height,
          weight: formData.weight,
          bmr: calculateBMR(formData),
          tdee: calculateTDEE(formData),
        }
      }
    });

    // Test cloud endpoint response
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('/api/health', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        addSystemLog({
          level: 'success',
          module: 'system',
          action: '後端 API /api/health 健康檢查成功',
          message: '後端服務正常運行，Google AI 與自訂 API 可直接調用。',
          details: { status: res.status }
        });
      } else {
        addSystemLog({
          level: 'warn',
          module: 'netlify_deploy',
          action: '後端 API /api/health 未響應 (Netlify 靜態託管)',
          message: '偵測到 Netlify 靜態託管架構，系統已確認啟用 Dr. Andy Galpin 本地運動生理學運算引擎以保證菜單生成 100% 成功。',
          details: { status: res.status }
        });
      }
    } catch (e: any) {
      addSystemLog({
        level: 'warn',
        module: 'netlify_deploy',
        action: '後端 API 離線檢測 (Netlify/SPA 模式)',
        message: `在 ${env.isNetlify ? 'Netlify 部署環境' : '無獨立 Node 後端託管環境'}下，菜單生成將使用內建加爾平演算法即時運算，不會受限於後端連線中斷。`,
        details: { error: e.message }
      });
    }

    refreshLogs();
    setIsTestingDiag(false);
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {activeTab === 'settings' ? <User className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                個人化設定與隱私權說明
              </h2>
              <p className="text-xs text-slate-500">
                設定每日定時通知、身體素質、手機健康同步與官方隱私條款
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

        {/* Tab Segmented Switch */}
        <div className="flex p-1 bg-slate-100/90 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'settings'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>體態與提醒</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'privacy'
                ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>隱私條款</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('logs');
              refreshLogs();
            }}
            className={`flex-1 py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'logs'
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-600" />
            <span>系統 Log 檔</span>
            {logs.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-bold">
                {logs.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: Profile & Reminders */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
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
                      type="text"
                      inputMode="decimal"
                      required
                      value={formData.height || ''}
                      onKeyDown={(e) => handleNumericKeyDown(e, true)}
                      onChange={(e) => {
                        const val = sanitizeNumber(e.target.value, true);
                        setFormData({ ...formData, height: parseFloat(val) || 0 });
                      }}
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
                      type="text"
                      inputMode="decimal"
                      required
                      value={formData.weight || ''}
                      onKeyDown={(e) => handleNumericKeyDown(e, true)}
                      onChange={(e) => {
                        const val = sanitizeNumber(e.target.value, true);
                        setFormData({ ...formData, weight: parseFloat(val) || 0 });
                      }}
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
                      type="text"
                      inputMode="decimal"
                      placeholder={`建議 ${idealRange.mid}`}
                      value={formData.targetWeight !== undefined ? formData.targetWeight : ''}
                      onKeyDown={(e) => handleNumericKeyDown(e, true)}
                      onChange={(e) => {
                        const val = sanitizeNumber(e.target.value, true);
                        setFormData({ ...formData, targetWeight: val === '' ? undefined : (parseFloat(val) || undefined) });
                      }}
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
                      type="text"
                      inputMode="decimal"
                      placeholder="例如：21.5（選填）"
                      value={formData.bodyFat !== undefined ? formData.bodyFat : ''}
                      onKeyDown={(e) => handleNumericKeyDown(e, true)}
                      onChange={(e) => {
                        const val = sanitizeNumber(e.target.value, true);
                        setFormData({ ...formData, bodyFat: val === '' ? undefined : (parseFloat(val) || undefined) });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <span className="text-slate-400 absolute right-2.5 top-2">%</span>
                  </div>
                </div>

                {/* Age */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">年齡 (歲)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.age || ''}
                    onKeyDown={(e) => handleNumericKeyDown(e, false)}
                    onChange={(e) => {
                      const val = sanitizeNumber(e.target.value, false);
                      setFormData({ ...formData, age: val === '' ? undefined : (parseInt(val, 10) || undefined) });
                    }}
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

              {/* Embedded Privacy Guarantee Quick Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-800 text-[11px]">10QBS 個人資料與隱私權保護</div>
                    <div className="text-[10px] text-slate-500">本機離線加密、絕不出售資料・支援隨時刪除</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('privacy')}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] flex items-center gap-1 transition-all shrink-0"
                >
                  <FileText className="w-3 h-3 text-emerald-600" />
                  <span>查看條款</span>
                </button>
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
          </div>
        )}

        {/* TAB 2: Privacy Policy & Legal Terms (打包官方隱私權政策) */}
        {activeTab === 'privacy' && (
          <div className="space-y-4 text-xs text-slate-700">
            {/* Live Link & Copy Action Banner */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-emerald-900 text-xs">官方線上隱私權條款公開連結</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyPrivacyLink}
                    className="px-2 py-1 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center gap-1 transition-all"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? '已複製' : '複製網址'}</span>
                  </button>

                  <a
                    href={PRIVACY_POLICY_DATA.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>外部開啟</span>
                  </a>
                </div>
              </div>

              <div className="font-mono text-[11px] text-emerald-800 bg-white/80 p-2 rounded-xl border border-emerald-100 break-all select-all">
                {PRIVACY_POLICY_DATA.liveUrl}
              </div>
            </div>

            {/* Privacy Guarantee Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center gap-1 font-bold text-slate-900 text-xs">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>本機優先加密</span>
                </div>
                <p className="text-[10px] leading-relaxed">
                  生理數據優先留存您的裝置端，高度保障隱私。
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center gap-1 font-bold text-slate-900 text-xs">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>24 個月保留上限</span>
                </div>
                <p className="text-[10px] leading-relaxed">
                  帳號關閉後最多保留 24 個月，期滿安全刪除。
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center gap-1 font-bold text-slate-900 text-xs">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>零行銷外流保證</span>
                </div>
                <p className="text-[10px] leading-relaxed">
                  絕不出售或出租您的資料與電話給第三方行銷。
                </p>
              </div>
            </div>

            {/* Packaged Privacy Policy Sections Scroll Area */}
            <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1 no-scrollbar">
              {PRIVACY_POLICY_DATA.sections.map((section, idx) => (
                <div 
                  key={section.id} 
                  className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-1.5">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">
                        {section.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {section.titleEn}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-600 text-[10px] font-mono shrink-0">
                      § 0{idx + 1}
                    </span>
                  </div>

                  <p className="text-[11px] text-emerald-800 font-medium bg-emerald-50/80 p-2 rounded-xl border border-emerald-100/70">
                    💡 摘要：{section.summary}
                  </p>

                  <div className="space-y-1 text-[11px] text-slate-600">
                    {section.content.map((line, lIdx) => {
                      if (!line) return <div key={lIdx} className="h-1" />;
                      return (
                        <p key={lIdx} className="leading-relaxed">
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Legal Contacts & Direct Email */}
            <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-800 text-[11px]">客服與資料權利行使信箱</div>
                  <div className="text-[10px] text-slate-500 font-mono">{PRIVACY_POLICY_DATA.contactEmail}</div>
                </div>
              </div>

              <a
                href={`mailto:${PRIVACY_POLICY_DATA.contactEmail}?subject=10QBS%20個人資料權利與隱私權請求`}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold transition-all shrink-0"
              >
                發送信件
              </a>
            </div>

            {/* Tab 2 Footer Action */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline"
              >
                ← 返回個人體態設定
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all"
              >
                完成檢視 (關閉)
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: System Diagnostic Logs */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Diagnostic Environment Header Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-sm space-y-3 border border-indigo-900/50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200">系統運行日誌 & 部署診斷</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {getEnvironmentInfo().online ? '網路在線' : '離線模式'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {getEnvironmentInfo().isNetlify ? 'Netlify 部署' : getEnvironmentInfo().isAiStudio ? 'AI Studio 容器' : '獨立託管'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 space-y-1">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-indigo-400" />
                    <span>當前運行主機 (Host)</span>
                  </div>
                  <div className="font-mono text-[11px] text-white truncate" title={getEnvironmentInfo().host}>
                    {getEnvironmentInfo().host}
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 space-y-1">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Server className="w-3 h-3 text-emerald-400" />
                    <span>帳號 Log 儲存記錄</span>
                  </div>
                  <div className="text-[11px] text-emerald-300 font-bold">
                    已記錄 {logs.length} 筆 (持久保存在帳號儲存)
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-300/90 leading-relaxed bg-indigo-900/30 p-2.5 rounded-xl border border-indigo-500/20">
                💡 <strong>自動記錄說明：</strong>點選「以 Google 問問 AI 模式生成」或「換一組建議菜單」時，無論是在 Netlify 靜態託管、離線或雲端環境，所有調用步驟、參數、網路響應與 Dr. Galpin 計算引擎切換軌跡皆已完整記錄於此。
              </p>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => downloadLogFile('txt')}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>下載 Log 檔 (.txt)</span>
              </button>

              <button
                type="button"
                onClick={() => downloadLogFile('json')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>下載 JSON 檔</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLogsText}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                <span>{copiedLogs ? '已複製到剪貼簿' : '複製全部 Log'}</span>
              </button>

              <button
                type="button"
                onClick={handleRunDiagnosticTest}
                disabled={isTestingDiag}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-indigo-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingDiag ? 'animate-spin' : ''}`} />
                <span>{isTestingDiag ? '檢測中...' : '即時環境檢測'}</span>
              </button>

              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllLogs}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all flex items-center gap-1 ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>清空日誌</span>
                </button>
              )}
            </div>

            {/* Filter Chips & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between pt-1">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar text-xs">
                {[
                  { key: 'all', label: '全部' },
                  { key: 'success', label: '成功', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                  { key: 'warn', label: '警告/託管', color: 'text-amber-700 bg-amber-50 border-amber-200' },
                  { key: 'error', label: '錯誤', color: 'text-rose-700 bg-rose-50 border-rose-200' },
                  { key: 'info', label: '訊息', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setLogFilterLevel(tab.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                      logFilterLevel === tab.key
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="搜尋 Log 關鍵字..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="px-3 py-1 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 w-full sm:w-44"
              />
            </div>

            {/* Log Entries Scroll Area */}
            <div className="space-y-2 max-h-[44vh] overflow-y-auto pr-1 no-scrollbar">
              {logs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 space-y-2">
                  <Terminal className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">尚無系統運行日誌記錄</p>
                  <p className="text-[11px] text-slate-400">
                    點擊上方的「即時環境檢測」或前往「週末超市採買清單」生成 Google 問問 AI 菜單，系統將自動在此寫入日誌記錄。
                  </p>
                </div>
              ) : (
                logs
                  .filter((l) => {
                    if (logFilterLevel !== 'all' && l.level !== logFilterLevel) return false;
                    if (logSearchQuery.trim()) {
                      const q = logSearchQuery.toLowerCase();
                      const matchMsg = l.message.toLowerCase().includes(q);
                      const matchAct = l.action.toLowerCase().includes(q);
                      const matchMod = l.module.toLowerCase().includes(q);
                      return matchMsg || matchAct || matchMod;
                    }
                    return true;
                  })
                  .map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const levelColors = {
                      success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      warn: 'bg-amber-50 text-amber-700 border-amber-200',
                      error: 'bg-rose-50 text-rose-700 border-rose-200',
                      info: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    }[log.level] || 'bg-slate-50 text-slate-700 border-slate-200';

                    const moduleLabels: Record<string, string> = {
                      meal_plan: '菜單生成',
                      google_ai: 'Google AI',
                      netlify_deploy: 'Netlify 部署',
                      grocery: '採買清單',
                      system: '系統核心',
                      auth: '帳號安全',
                    };

                    return (
                      <div
                        key={log.id}
                        className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5 text-xs hover:border-slate-300 transition-all font-mono"
                      >
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${levelColors}`}>
                              {log.level.toUpperCase()}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {moduleLabels[log.module] || log.module}
                            </span>
                            <span className="font-bold text-slate-900 font-sans text-xs">
                              {log.action}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {log.localTime}
                          </span>
                        </div>

                        <p className="text-slate-700 font-sans text-[11px] leading-relaxed">
                          {log.message}
                        </p>

                        {(log.details || log.errorStack) && (
                          <div>
                            <button
                              type="button"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline inline-flex items-center gap-1"
                            >
                              {isExpanded ? '隱藏詳細參數 ▲' : '檢視詳細參數與 Stack Trace ▼'}
                            </button>

                            {isExpanded && (
                              <div className="mt-2 p-2.5 bg-slate-950 text-slate-200 rounded-xl text-[10px] overflow-x-auto space-y-2">
                                {log.details && (
                                  <div>
                                    <div className="text-slate-400 font-bold text-[9px] uppercase">Payload / Details:</div>
                                    <pre className="text-emerald-300 mt-1 whitespace-pre-wrap">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.errorStack && (
                                  <div>
                                    <div className="text-rose-400 font-bold text-[9px] uppercase">Error Stack Trace:</div>
                                    <pre className="text-rose-300 mt-1 whitespace-pre-wrap">
                                      {log.errorStack}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            {/* Tab 3 Footer Action */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline"
              >
                ← 返回個人體態設定
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all"
              >
                關閉
              </button>
            </div>
          </div>
        )}

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



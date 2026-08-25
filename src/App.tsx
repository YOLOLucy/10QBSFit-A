import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomeDashboard } from './components/HomeDashboard';
import { DailyCheckinCard } from './components/DailyCheckinCard';
import { BalanceSheetResult } from './components/BalanceSheetResult';
import { TrendAnalysis } from './components/TrendAnalysis';
import { WeekendGroceryMealPlan } from './components/WeekendGroceryMealPlan';
import { ProfileModal } from './components/ProfileModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { QuestionBankModal } from './components/QuestionBankModal';
import { 
  UserProfile, 
  DailyRecord, 
  HealthQuestion,
  AppLanguage
} from './types';
import { 
  loadUserProfile, 
  saveUserProfile, 
  loadHealthRecords, 
  saveHealthRecords, 
  getTodayDateString, 
  getIdealWeightRange,
  calculateBMI,
  isWeekend
} from './utils/calculations';
import { getDailyQuestionsForDate } from './data/questionBank';
import { sendLocalNotification } from './utils/reminder';
import { PRIVACY_POLICY_DATA } from './data/privacyPolicyData';
import { 
  Sparkles, 
  Smartphone, 
  ShieldCheck, 
  CreditCard, 
  HelpCircle,
  TrendingUp,
  FileSpreadsheet,
  ShoppingCart,
  LineChart,
  CheckCircle2,
  Bell,
  X,
  ArrowRight,
  ExternalLink,
  Lock,
  Mail,
  Terminal
} from 'lucide-react';

export default function App() {
  const [profile, setProfile] = useState<UserProfile>(() => loadUserProfile());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalInitialTab, setProfileModalInitialTab] = useState<'settings' | 'privacy' | 'logs'>('settings');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isQuestionBankOpen, setIsQuestionBankOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'questions' | 'balancesheet' | 'trend' | 'grocery' | 'profile'>('home');
  const [mobileViewMode, setMobileViewMode] = useState(false);
  const [reminderToast, setReminderToast] = useState<{ title: string; body: string; timestamp?: string } | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<AppLanguage>('zh-TW');

  const todayStr = getTodayDateString();
  const [records, setRecords] = useState<DailyRecord[]>(() => loadHealthRecords(profile.weight));
  const [todayQuestions, setTodayQuestions] = useState<HealthQuestion[]>(() => getDailyQuestionsForDate(todayStr));

  const handleRefreshQuestions = () => {
    setTodayQuestions(getDailyQuestionsForDate(todayStr));
  };

  // Find today's record if completed, and find latest record overall
  const todayRecord = records.find((r) => r.date === todayStr) || null;
  const todayCompleted = Boolean(todayRecord?.completed);
  const latestRecord = records.length > 0 ? records[records.length - 1] : null;

  // Listen to custom reminder events (e.g. from test button or background timer)
  useEffect(() => {
    const handleReminderTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{ title: string; body: string; timestamp?: string }>;
      if (customEvent.detail) {
        setReminderToast(customEvent.detail);
      }
    };

    window.addEventListener('health-reminder-trigger', handleReminderTrigger);
    return () => {
      window.removeEventListener('health-reminder-trigger', handleReminderTrigger);
    };
  }, []);

  // Background timer to check daily reminder time
  useEffect(() => {
    if (!profile.reminderEnabled || !profile.reminderTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      if (currentTimeStr === profile.reminderTime && !todayCompleted) {
        const lastNotifiedKey = `last_notified_${todayStr}_${profile.reminderTime}`;
        const hasNotified = sessionStorage.getItem(lastNotifiedKey);
        if (!hasNotified) {
          sessionStorage.setItem(lastNotifiedKey, 'true');
          sendLocalNotification({
            title: '📊 今日健康資產負債表定時提醒',
            body: `現在是 ${profile.reminderTime}，快來花 1 分鐘回答 10 題健康問卷，為今日存入健康資產！`,
          });
        }
      }
    }, 30000); // check every 30 seconds

    return () => clearInterval(interval);
  }, [profile.reminderEnabled, profile.reminderTime, todayCompleted, todayStr]);

  const handleCompleteCheckin = (newRecord: DailyRecord) => {
    // Upsert today's record
    const updatedRecords = records.filter((r) => r.date !== todayStr);
    updatedRecords.push(newRecord);
    setRecords(updatedRecords);
    saveHealthRecords(updatedRecords);

    // Update current weight in profile if changed
    if (newRecord.weight && newRecord.weight !== profile.weight) {
      const updatedProfile: UserProfile = {
        ...profile,
        weight: newRecord.weight,
        bodyFat: newRecord.bodyFat !== undefined ? newRecord.bodyFat : profile.bodyFat,
      };
      setProfile(updatedProfile);
      saveUserProfile(updatedProfile);
    }

    // Switch directly to the Home Dashboard to see updated results at a glance
    setActiveTab('home');
  };

  const handleSaveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    saveUserProfile(newProfile);
  };

  const handleRetakeQuestions = () => {
    setActiveTab('questions');
  };

  const weekendNow = isWeekend(todayStr);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-emerald-200">
      {/* In-app Notification Banner / Toast */}
      {reminderToast && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5 animate-pulse">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-white">{reminderToast.title}</h4>
                <span className="text-[10px] text-slate-400">{reminderToast.timestamp || '剛剛'}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {reminderToast.body}
              </p>
              <div className="pt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('questions');
                    setReminderToast(null);
                  }}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors"
                >
                  <span>立即填寫 10 題</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setReminderToast(null)}
                  className="px-2 py-1 rounded-lg text-slate-400 hover:text-white text-[11px]"
                >
                  稍後再說
                </button>
              </div>
            </div>
            <button
              onClick={() => setReminderToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profile={profile}
        onOpenProfile={() => {
          setProfileModalInitialTab('settings');
          setIsProfileModalOpen(true);
        }}
        onOpenQuestionBank={() => setIsQuestionBankOpen(true)}
        todayCompleted={todayCompleted}
        mobileViewMode={mobileViewMode}
        setMobileViewMode={setMobileViewMode}
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
      />

      {/* Main Content Area: Responsive or Simulated Mobile Frame */}
      <main className="flex-1 flex justify-center py-5 px-3 sm:px-6">
        <div className={`w-full transition-all duration-300 ${
          mobileViewMode 
            ? 'max-w-[430px] bg-slate-50 border-8 border-slate-900 rounded-[44px] shadow-2xl p-4 min-h-[780px] my-auto' 
            : 'max-w-5xl'
        }`}>
          {/* View: Home Dashboard (Latest Balance Sheet at a glance) */}
          {activeTab === 'home' && (
            <HomeDashboard
              latestRecord={latestRecord}
              todayRecord={todayRecord}
              records={records}
              profile={profile}
              onStartCheckin={() => setActiveTab('questions')}
              onViewBalanceSheet={() => setActiveTab('balancesheet')}
              onViewTrends={() => setActiveTab('trend')}
              onViewGrocery={() => setActiveTab('grocery')}
              onOpenProfile={() => {
                setProfileModalInitialTab('settings');
                setIsProfileModalOpen(true);
              }}
              onOpenQuestionBank={() => setIsQuestionBankOpen(true)}
              currentLanguage={currentLanguage}
            />
          )}

          {/* View: Questions Check-in */}
          {activeTab === 'questions' && (
            <div className="space-y-4">
              <DailyCheckinCard
                questions={todayQuestions}
                profile={profile}
                onCompleteCheckin={handleCompleteCheckin}
                existingRecord={todayRecord}
                onGoToBalanceSheet={() => setActiveTab('balancesheet')}
              />
            </div>
          )}

          {/* View: Today's Detailed Health Balance Sheet */}
          {activeTab === 'balancesheet' && (
            <div className="space-y-4">
              {todayRecord ? (
                <BalanceSheetResult
                  record={todayRecord}
                  profile={profile}
                  onRetake={handleRetakeQuestions}
                  onGoToTrends={() => setActiveTab('trend')}
                  onGoToGrocery={() => setActiveTab('grocery')}
                />
              ) : latestRecord ? (
                <BalanceSheetResult
                  record={latestRecord}
                  profile={profile}
                  onRetake={handleRetakeQuestions}
                  onGoToTrends={() => setActiveTab('trend')}
                  onGoToGrocery={() => setActiveTab('grocery')}
                />
              ) : (
                <div className="bg-white rounded-3xl p-8 text-center max-w-lg mx-auto shadow-sm border border-slate-200 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    今日健康資產負債表尚未結算
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    只需回答每日隨機抽取的 10 個簡明問答（飲食、運動、飲水與體重紀錄），立即為您結算今日健康淨值與財務報表！
                  </p>
                  <button
                    onClick={() => setActiveTab('questions')}
                    className="py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>立即開始今日 10 題問答</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* View: Trend Analysis ("圖" - 體重/資產/負債趨勢圖) */}
          {activeTab === 'trend' && (
            <TrendAnalysis
              records={records}
              profile={profile}
              onSelectRecord={(rec) => {
                // View selected day record
                setActiveTab('balancesheet');
              }}
              onGoBack={() => setActiveTab('home')}
            />
          )}

          {/* View: Weekend Supermarket Grocery & Meal Plan */}
          {activeTab === 'grocery' && (
            <WeekendGroceryMealPlan
              userProfile={profile}
              latestRecord={todayRecord || latestRecord}
            />
          )}
        </div>
      </main>

      {/* Footer Info & Privacy / Disclaimer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">10QBS</span>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] text-slate-500">
              極簡 10 題每日健康資產負債表
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => {
                setProfileModalInitialTab('privacy');
                setIsProfileModalOpen(true);
              }}
              className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold underline decoration-emerald-300 transition-colors"
              title="檢視完整官方隱私權條款與資料保護說明"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>隱私權政策與法律聲明</span>
            </button>

            <span className="text-slate-300">•</span>

            <button
              type="button"
              onClick={() => {
                setProfileModalInitialTab('logs');
                setIsProfileModalOpen(true);
              }}
              className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold underline decoration-indigo-300 transition-colors"
              title="檢視系統運行與 Netlify 部署 Log 檔"
            >
              <Terminal className="w-3.5 h-3.5 text-indigo-600" />
              <span>系統運行 Log 檔</span>
            </button>

            <span className="text-slate-300">•</span>

            <a
              href={PRIVACY_POLICY_DATA.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-600 flex items-center gap-0.5 transition-colors"
              title="前往 FreePrivacyPolicy 官方備案頁面"
            >
              <span>條款公開連結</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>

      {/* Profile Settings Modal (個人化設定與隱私權說明) */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onSaveProfile={handleSaveProfile}
        initialTab={profileModalInitialTab}
      />

      {/* Standalone Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      {/* Question Bank Manager & Expansion Packs (每次50題加購10元) Modal */}
      <QuestionBankModal
        isOpen={isQuestionBankOpen}
        onClose={() => setIsQuestionBankOpen(false)}
        onDatabaseUpdated={handleRefreshQuestions}
      />
    </div>
  );
}

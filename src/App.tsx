import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomeDashboard } from './components/HomeDashboard';
import { DailyCheckinCard } from './components/DailyCheckinCard';
import { BalanceSheetResult } from './components/BalanceSheetResult';
import { TrendAnalysis } from './components/TrendAnalysis';
import { WeekendGroceryMealPlan } from './components/WeekendGroceryMealPlan';
import { ProfileModal } from './components/ProfileModal';
import { 
  UserProfile, 
  DailyRecord, 
  HealthQuestion 
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
  CheckCircle2
} from 'lucide-react';

export default function App() {
  const [profile, setProfile] = useState<UserProfile>(() => loadUserProfile());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'questions' | 'balancesheet' | 'trend' | 'grocery' | 'profile'>('home');
  const [mobileViewMode, setMobileViewMode] = useState(false);

  const todayStr = getTodayDateString();
  const [records, setRecords] = useState<DailyRecord[]>(() => loadHealthRecords(profile.weight));
  const [todayQuestions, setTodayQuestions] = useState<HealthQuestion[]>(() => getDailyQuestionsForDate(todayStr));

  // Find today's record if completed, and find latest record overall
  const todayRecord = records.find((r) => r.date === todayStr) || null;
  const todayCompleted = Boolean(todayRecord?.completed);
  const latestRecord = records.length > 0 ? records[records.length - 1] : null;

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
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profile={profile}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        todayCompleted={todayCompleted}
        mobileViewMode={mobileViewMode}
        setMobileViewMode={setMobileViewMode}
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
              onOpenProfile={() => setIsProfileModalOpen(true)}
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

          {/* View: Trend Analysis */}
          {activeTab === 'trend' && (
            <TrendAnalysis
              records={records}
              profile={profile}
              onSelectRecord={(rec) => {
                // View selected day record
                setActiveTab('balancesheet');
              }}
            />
          )}

          {/* View: Weekend Supermarket Grocery & Meal Plan */}
          {activeTab === 'grocery' && (
            <WeekendGroceryMealPlan />
          )}
        </div>
      </main>

      {/* Footer Info & 30 NTD single purchase guarantee */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">健康資產負債表</span>
            <span className="text-slate-300">•</span>
            <span>每日 10 題評估身體健康狀況</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>本機離線隱私加密儲存</span>
            </span>
            <span className="text-slate-300">•</span>
            <span>NT$ 30 終身買斷版</span>
          </div>
        </div>
      </footer>

      {/* Profile Settings Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onSaveProfile={handleSaveProfile}
      />
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { 
  X, 
  Database, 
  Plus, 
  Search, 
  ShoppingBag, 
  Sparkles, 
  Check, 
  Trash2, 
  Filter, 
  Tag, 
  Lock, 
  Unlock, 
  Layers, 
  Zap, 
  HelpCircle, 
  Apple, 
  CreditCard, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  Flame,
  Droplet,
  Scale,
  ArrowRight,
  Smartphone,
  FileSpreadsheet,
  FileDown,
  FileUp,
  RefreshCw,
  Info,
  Globe,
  Languages,
  Loader2
} from 'lucide-react';
import { QuestionDBItem, QuestionPack, AppLanguage } from '../types';
import { 
  MARKETPLACE_QUESTION_PACKS, 
  loadCustomQuestions, 
  saveCustomQuestions, 
  loadPurchasedPackIds, 
  savePurchasedPackIds 
} from '../data/questionPacks';
import { QUESTION_DATABASE, getAllMergedQuestionDatabase } from '../data/questionBank';
import { 
  exportQuestionsToCSV, 
  downloadCSVTemplate, 
  parseQuestionsFromCSV, 
  CSVParseResult 
} from '../utils/csvHelper';
import { SUPPORTED_LANGUAGES } from '../utils/translations';

interface QuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatabaseUpdated?: () => void;
}

export const QuestionBankModal: React.FC<QuestionBankModalProps> = ({
  isOpen,
  onClose,
  onDatabaseUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'explore' | 'create' | 'csv' | 'ai' | 'store'>('explore');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'nutrition' | 'exercise' | 'hydration' | 'weight'>('all');
  const [attributeFilter, setAttributeFilter] = useState<'all' | 'asset' | 'liability'>('all');

  // Custom Questions State
  const [customQuestions, setCustomQuestions] = useState<QuestionDBItem[]>(() => loadCustomQuestions());
  const [purchasedPackIds, setPurchasedPackIds] = useState<string[]>(() => loadPurchasedPackIds());

  // Form State for creating custom question
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newCategory, setNewCategory] = useState<'nutrition' | 'exercise' | 'hydration'>('nutrition');
  const [newAttribute, setNewAttribute] = useState<'asset' | 'liability'>('asset');
  const [newWeight, setNewWeight] = useState<number>(10);
  const [newGalpinPrinciple, setNewGalpinPrinciple] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTip, setNewTip] = useState('');
  const [formNotice, setFormNotice] = useState<{ text: string; success: boolean } | null>(null);

  // CSV Import/Export State
  const [csvImportMode, setCsvImportMode] = useState<'append' | 'replace'>('append');
  const [parsedCSVPreview, setParsedCSVPreview] = useState<CSVParseResult | null>(null);
  const [isDraggingCSV, setIsDraggingCSV] = useState(false);
  const [csvNotice, setCsvNotice] = useState<{ text: string; success: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // AI Translation State
  const [aiTargetLang, setAiTargetLang] = useState<AppLanguage>('en');
  const [aiSourceScope, setAiSourceScope] = useState<'custom' | 'all' | 'csv'>('custom');
  const [isTranslatingWithAI, setIsTranslatingWithAI] = useState(false);
  const [aiTranslatedQuestions, setAiTranslatedQuestions] = useState<QuestionDBItem[] | null>(null);
  const [aiNotice, setAiNotice] = useState<{ text: string; success: boolean } | null>(null);

  // Single Question Quick Translation Modal
  const [translatingQuestionId, setTranslatingQuestionId] = useState<string | null>(null);

  // Store Checkout Modal State
  const [purchasingPack, setPurchasingPack] = useState<QuestionPack | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'apple_pay' | 'google_pay' | 'credit_card'>('apple_pay');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [purchaseSuccessMessage, setPurchaseSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Merged Question List
  const allMergedQuestions = getAllMergedQuestionDatabase(customQuestions, purchasedPackIds);

  // Filtered Questions
  const filteredQuestions = allMergedQuestions.filter((q) => {
    if (categoryFilter !== 'all' && q.category !== categoryFilter) return false;
    if (attributeFilter !== 'all' && q.attribute !== attributeFilter) return false;
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchText = q.question_text.toLowerCase().includes(kw);
      const matchPrinciple = q.galpin_principle.toLowerCase().includes(kw);
      const matchDesc = q.description?.toLowerCase().includes(kw) || false;
      if (!matchText && !matchPrinciple && !matchDesc) return false;
    }
    return true;
  });

  const totalNutrition = allMergedQuestions.filter((q) => q.category === 'nutrition').length;
  const totalExercise = allMergedQuestions.filter((q) => q.category === 'exercise').length;
  const totalHydration = allMergedQuestions.filter((q) => q.category === 'hydration').length;

  const handleCreateCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) {
      setFormNotice({ text: '請輸入問題敘述', success: false });
      return;
    }

    const customId = `CUST_${Date.now()}`;
    const newItem: QuestionDBItem = {
      question_id: customId,
      category: newCategory,
      type: 'boolean',
      question_text: newQuestionText.trim(),
      attribute: newAttribute,
      weight: Number(newWeight) || 10,
      galpin_principle: newGalpinPrinciple.trim() || 'Personalized Health Accounting Target',
      description: newDescription.trim() || newQuestionText.trim(),
      tip: newTip.trim() || '保持自律微習慣，每天為身體存入健康資產！',
      isCustom: true,
    };

    const updated = [newItem, ...customQuestions];
    setCustomQuestions(updated);
    saveCustomQuestions(updated);

    // Reset Form
    setNewQuestionText('');
    setNewGalpinPrinciple('');
    setNewDescription('');
    setNewTip('');
    setFormNotice({ text: `自訂題目已成功加入題庫！每日抽題時將隨機抽中。`, success: true });

    onDatabaseUpdated?.();
  };

  const handleDeleteCustomQuestion = (id: string) => {
    const updated = customQuestions.filter((q) => q.question_id !== id);
    setCustomQuestions(updated);
    saveCustomQuestions(updated);
    onDatabaseUpdated?.();
  };

  // CSV Import Handlers
  const processCSVFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvNotice({ text: '請上傳標準格式之 .csv 檔案', success: false });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setCsvNotice({ text: '無法讀取該 CSV 檔案內容', success: false });
        return;
      }

      const result = parseQuestionsFromCSV(text);
      if (!result.success || result.data.length === 0) {
        setCsvNotice({ 
          text: `解析失敗：${result.errors.length > 0 ? result.errors.join('；') : '未找到有效問題欄位'}`, 
          success: false 
        });
        setParsedCSVPreview(null);
      } else {
        setParsedCSVPreview(result);
        setCsvNotice({ 
          text: `成功解析 ${result.data.length} 道題目！請檢視下方預覽並點擊「確認匯入題庫」。`, 
          success: true 
        });
      }
    };
    reader.onerror = () => {
      setCsvNotice({ text: '檔案讀取發生錯誤', success: false });
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processCSVFile(file);
    }
  };

  const handleApplyCSVImport = () => {
    if (!parsedCSVPreview || parsedCSVPreview.data.length === 0) return;

    let updatedList: QuestionDBItem[] = [];
    if (csvImportMode === 'append') {
      // Append mode: avoid duplicate question_id
      const existingIds = new Set(customQuestions.map((q) => q.question_id));
      const newItems = parsedCSVPreview.data.map((item, idx) => {
        if (existingIds.has(item.question_id)) {
          return { ...item, question_id: `${item.question_id}_${idx}` };
        }
        return item;
      });
      updatedList = [...customQuestions, ...newItems];
    } else {
      // Replace mode: replace custom questions
      updatedList = parsedCSVPreview.data;
    }

    setCustomQuestions(updatedList);
    saveCustomQuestions(updatedList);
    setCsvNotice({ 
      text: `🎉 已成功將 ${parsedCSVPreview.data.length} 道題目匯入自訂題庫中！隨機抽題庫已同步更新。`, 
      success: true 
    });
    setParsedCSVPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onDatabaseUpdated?.();
  };

  const handleExportAllCSV = () => {
    const filename = `health_accounting_all_questions_${new Date().toISOString().split('T')[0]}.csv`;
    exportQuestionsToCSV(allMergedQuestions, filename);
  };

  const handleExportCustomCSV = () => {
    if (customQuestions.length === 0) {
      setCsvNotice({ text: '目前尚無自訂題目可匯出，請先新增題目或上傳 CSV。', success: false });
      return;
    }
    const filename = `health_accounting_custom_questions_${new Date().toISOString().split('T')[0]}.csv`;
    exportQuestionsToCSV(customQuestions, filename);
  };

  const handleDownloadTemplate = () => {
    downloadCSVTemplate('health_accounting_question_template.csv');
  };

  // AI Translation Handler via backend /api/gemini/translate-questions
  const handleTranslateWithAI = async (questionsToTranslate?: QuestionDBItem[]) => {
    let sourceList: QuestionDBItem[] = [];
    if (questionsToTranslate && questionsToTranslate.length > 0) {
      sourceList = questionsToTranslate;
    } else if (aiSourceScope === 'custom') {
      sourceList = customQuestions;
    } else if (aiSourceScope === 'csv' && parsedCSVPreview) {
      sourceList = parsedCSVPreview.data;
    } else {
      sourceList = allMergedQuestions.slice(0, 50); // limit batch to top 50
    }

    if (sourceList.length === 0) {
      setAiNotice({ text: '查無可翻譯的題目內容，請先新增題目、選擇 CSV 或切換題庫範圍。', success: false });
      return;
    }

    setIsTranslatingWithAI(true);
    setAiNotice(null);

    const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === aiTargetLang);
    const targetLangName = targetLangObj ? `${targetLangObj.name} (${targetLangObj.nativeName})` : aiTargetLang;

    try {
      const response = await fetch('/api/gemini/translate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: sourceList,
          targetLanguage: aiTargetLang,
          targetLanguageName: targetLangName,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.translatedQuestions)) {
        setAiTranslatedQuestions(data.translatedQuestions);
        setAiNotice({
          text: `🎉 Gemini 3.7 Flash 成功將 ${data.translatedQuestions.length} 道健康題目翻譯為 ${targetLangName}！`,
          success: true,
        });
      } else {
        throw new Error(data.message || data.error || '翻譯請求失敗');
      }
    } catch (err: any) {
      console.error('AI translation error:', err);
      // Fallback translation message
      setAiNotice({
        text: `AI 翻譯連線提示：${err.message || '請確認網路狀態後重試'}`,
        success: false,
      });
    } finally {
      setIsTranslatingWithAI(false);
    }
  };

  const handleApplyTranslatedQuestions = () => {
    if (!aiTranslatedQuestions || aiTranslatedQuestions.length === 0) return;
    const updatedList = [...customQuestions, ...aiTranslatedQuestions];
    setCustomQuestions(updatedList);
    saveCustomQuestions(updatedList);
    setAiNotice({
      text: `🎉 已將 ${aiTranslatedQuestions.length} 道翻譯後題目存入自訂題庫！`,
      success: true,
    });
    setAiTranslatedQuestions(null);
    onDatabaseUpdated?.();
  };

  const handleExportTranslatedCSV = () => {
    if (!aiTranslatedQuestions || aiTranslatedQuestions.length === 0) return;
    const filename = `health_questions_${aiTargetLang}_${new Date().toISOString().split('T')[0]}.csv`;
    exportQuestionsToCSV(aiTranslatedQuestions, filename);
  };

  const handleConfirmPurchase = () => {
    if (!purchasingPack) return;
    setIsProcessingPayment(true);

    setTimeout(() => {
      const updatedPackIds = Array.from(new Set([...purchasedPackIds, purchasingPack.id]));
      setPurchasedPackIds(updatedPackIds);
      savePurchasedPackIds(updatedPackIds);
      setIsProcessingPayment(false);
      setPurchaseSuccessMessage(`🎉 成功解鎖【${purchasingPack.title}】！50 題專業生理學題庫已立即加入每日隨機抽題池。`);
      setPurchasingPack(null);
      onDatabaseUpdated?.();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  健康題庫管理與擴充中心
                </h2>
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-2 py-0.5 rounded-full text-[10px]">
                  現有共 {allMergedQuestions.length} 題
                </span>
              </div>
              <p className="text-xs text-slate-500">
                可自由自訂問題、CSV 批次匯入/匯出、AI 智慧多語言翻譯或單次 10 元加購 50 題擴充包
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Summary Metrics Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/60 text-indigo-200">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">目前題庫資料庫分佈</div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span className="text-emerald-400">飲食: {totalNutrition} 題</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400">運動: {totalExercise} 題</span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan-400">飲水恢復: {totalHydration} 題</span>
                {customQuestions.length > 0 && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-purple-300">自訂: {customQuestions.length} 題</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">每日抽題機制</span>
            <span className="text-xs font-bold text-emerald-400">3飲食 + 3運動 + 3飲水 + 1體重</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl shrink-0 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('explore')}
            className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
              activeTab === 'explore'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>題庫檢視 ({filteredQuestions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
              activeTab === 'create'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>單筆新增</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
              activeTab === 'csv'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV 匯入/出</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
              activeTab === 'ai'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI 翻譯</span>
            <span className="bg-indigo-600 text-white text-[9px] px-1 py-0.1 rounded-full font-bold">
              AI
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('store')}
            className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
              activeTab === 'store'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
            <span>+50題擴充</span>
            <span className="bg-amber-500 text-white text-[9px] px-1 py-0.1 rounded-full font-bold">
              $10
            </span>
          </button>
        </div>

        {/* Feedback Alert if any */}
        {purchaseSuccessMessage && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{purchaseSuccessMessage}</span>
            </div>
            <button
              onClick={() => setPurchaseSuccessMessage(null)}
              className="text-emerald-600 hover:text-emerald-900 text-xs font-bold"
            >
              關閉
            </button>
          </div>
        )}

        {/* Tab 1: Explore & Search Database */}
        {activeTab === 'explore' && (
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {/* Search & Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="搜尋題目關鍵字、生理學原理（如 白胺酸、Zone 2、睡眠、咖啡因）..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden"
                />
                {searchKeyword && (
                  <button
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    清除
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-[11px]">
                <div className="flex items-center gap-1.5 shrink-0">
                  {[
                    { id: 'all', label: '全部類別' },
                    { id: 'nutrition', label: '🥗 飲食與蛋白質' },
                    { id: 'exercise', label: '🏃 運動與肌力' },
                    { id: 'hydration', label: '💧 飲水與晝夜' },
                    { id: 'weight', label: '⚖️ 體重追蹤' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategoryFilter(c.id as any)}
                      className={`px-2.5 py-1 rounded-lg border font-medium shrink-0 transition-all ${
                        categoryFilter === c.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleExportAllCSV}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold shrink-0 text-[11px] transition-colors"
                  title="匯出此題庫為 CSV 檔案"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>匯出 CSV</span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-2.5">
              {filteredQuestions.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs space-y-1">
                  <HelpCircle className="w-8 h-8 mx-auto text-slate-400" />
                  <p className="font-semibold">找不到符合條件的問題</p>
                  <p className="text-[11px]">您可以嘗試搜尋其他關鍵字，或切換到「單筆新增」或「CSV 匯入」建立問題。</p>
                </div>
              ) : (
                filteredQuestions.map((q) => {
                  const isAsset = q.attribute === 'asset';
                  return (
                    <div
                      key={q.question_id}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-semibold">
                            {q.question_id}
                          </span>
                          
                          {/* Category Badge */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            q.category === 'nutrition' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            q.category === 'exercise' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            q.category === 'hydration' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' :
                            'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {q.category === 'nutrition' ? '飲食營養' :
                             q.category === 'exercise' ? '運動訓練' :
                             q.category === 'hydration' ? '飲水與恢復' : '體重自覺'}
                          </span>

                          {/* Attribute Badge */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isAsset ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isAsset ? '＋健康資產' : '－健康負債'} (權重 {q.weight} 點)
                          </span>

                          {q.isCustom && (
                            <span className="bg-purple-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                              使用者自訂
                            </span>
                          )}

                          {q.packId && (
                            <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                              50題擴充包
                            </span>
                          )}
                        </div>

                        {q.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomQuestion(q.question_id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                            title="刪除此自訂問題"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {q.question_text}
                      </h4>

                      {/* Andy Galpin Principle Tag */}
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                        <div className="text-indigo-900 font-semibold flex items-center gap-1">
                          <Zap className="w-3 h-3 text-indigo-600" />
                          <span>生理機制 (Galpin Principle)：</span>
                          <span className="text-indigo-600 font-mono text-[10px]">{q.galpin_principle}</span>
                        </div>
                        {q.description && (
                          <p className="text-slate-600 leading-relaxed text-[11px]">
                            {q.description}
                          </p>
                        )}
                        {q.tip && (
                          <div className="text-emerald-700 text-[10px] font-medium pt-0.5">
                            💡 小撇步：{q.tip}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Custom Question Builder */}
        {activeTab === 'create' && (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-xs text-slate-700 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-indigo-950 font-bold block mb-0.5">自訂健康問卷題目指南</strong>
                您可以依據個人的訓練菜單（如做 100 個俯臥撐、不喝零卡可樂、吃益生菌、冷水澡等）自訂題目，系統會將題目永久保存在您的裝置中，並在每日隨機 10 題抽題時自動納入！
              </div>
            </div>

            <form onSubmit={handleCreateCustomQuestion} className="space-y-3.5 text-xs">
              {/* Question Text */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  題目內容（是非問答格式）*
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：今天是否完成了 100 下徒手深蹲或伏地挺身？"
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                />
              </div>

              {/* Category and Attribute */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">歸屬核心類別 *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                  >
                    <option value="nutrition">🥗 飲食與蛋白質 (Nutrition)</option>
                    <option value="exercise">🏃 運動與肌力訓練 (Exercise)</option>
                    <option value="hydration">💧 飲水與晝夜恢復 (Hydration & Recovery)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">健康財務屬性 *</label>
                  <select
                    value={newAttribute}
                    onChange={(e) => setNewAttribute(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                  >
                    <option value="asset">＋ 健康資產（回答是 = 存入健康資產）</option>
                    <option value="liability">－ 健康負債（回答是 = 增加身體負債）</option>
                  </select>
                </div>
              </div>

              {/* Weight Points & Principle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">權重積分（影響資產負債價值）</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={5}
                      max={20}
                      step={1}
                      value={newWeight}
                      onChange={(e) => setNewWeight(Number(e.target.value))}
                      className="flex-1 accent-indigo-600"
                    />
                    <span className="font-bold font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg text-xs border border-indigo-200">
                      {newWeight} 點 (約 NT${newWeight * 12})
                    </span>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Andy Galpin 生理學原理標籤</label>
                  <input
                    type="text"
                    placeholder="例如：Hypertrophy & Glycogen Depletion"
                    value={newGalpinPrinciple}
                    onChange={(e) => setNewGalpinPrinciple(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Detailed Description */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">生理機制詳細解說（選填）</label>
                <textarea
                  rows={2}
                  placeholder="說明此行為對身體代謝、荷爾蒙、心肺或神經系統帶來的具體生理影響..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Tip */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">實踐小撇步（選填）</label>
                <input
                  type="text"
                  placeholder="例如：分 4 組每組 25 下完成，早晚各 2 組最輕鬆。"
                  value={newTip}
                  onChange={(e) => setNewTip(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {formNotice && (
                <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  formNotice.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formNotice.text}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>儲存並加入每日抽題資料庫</span>
              </button>
            </form>

            {/* List of Existing Custom Questions */}
            {customQuestions.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-purple-600" />
                    <span>已自訂題目 ({customQuestions.length} 題)</span>
                  </h4>

                  <button
                    type="button"
                    onClick={handleExportCustomCSV}
                    className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>匯出自訂 CSV</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {customQuestions.map((cq) => (
                    <div
                      key={cq.question_id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-md font-bold">
                            {cq.category}
                          </span>
                          <span className={cq.attribute === 'asset' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                            {cq.attribute === 'asset' ? '＋資產' : '－負債'} ({cq.weight} 點)
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800">{cq.question_text}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomQuestion(cq.question_id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="刪除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: CSV Import & Export System */}
        {activeTab === 'csv' && (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1 text-xs">
            {/* Top Info Banner */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-950 flex items-start gap-2.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="font-bold block text-emerald-900">題庫 CSV 批次管理系統</strong>
                <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                  支援直接透過 Excel 或 Google Sheets 編輯大量健康問答題目，再整批匯入 App 抽題庫；亦支援將現有題庫（包含生理學原理與小撇步）匯出為 CSV 進行備份。
                </p>
              </div>
            </div>

            {/* Quick Action Cards: Template & Export */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                    <FileDown className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">下載</span>
                </div>
                <div className="font-bold text-slate-800 text-xs">下載 CSV 標準範本</div>
                <p className="text-[10px] text-slate-500">含標準表頭與 3 筆示範題目</p>
              </button>

              <button
                type="button"
                onClick={handleExportAllCSV}
                className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-left transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                    <Download className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold group-hover:translate-x-0.5 transition-transform">{allMergedQuestions.length} 題</span>
                </div>
                <div className="font-bold text-slate-800 text-xs">匯出完整題庫 CSV</div>
                <p className="text-[10px] text-slate-500">含 Galpin 原理與加購題庫</p>
              </button>

              <button
                type="button"
                onClick={handleExportCustomCSV}
                className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-purple-400 hover:bg-purple-50/40 text-left transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                    <Tag className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-purple-600 font-bold group-hover:translate-x-0.5 transition-transform">{customQuestions.length} 題</span>
                </div>
                <div className="font-bold text-slate-800 text-xs">僅匯出自訂題目</div>
                <p className="text-[10px] text-slate-500">備份您的個人化專屬問答</p>
              </button>
            </div>

            {/* CSV Upload Section */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <FileUp className="w-4 h-4 text-indigo-600" />
                  <span>批次上傳 / 匯入 CSV 題庫</span>
                </h4>

                {/* Import Mode Radio Switch */}
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500 font-medium">匯入方式：</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="csvImportMode"
                      checked={csvImportMode === 'append'}
                      onChange={() => setCsvImportMode('append')}
                      className="accent-indigo-600"
                    />
                    <span className={csvImportMode === 'append' ? 'font-bold text-indigo-700' : 'text-slate-600'}>
                      增量加入 (保留既有自訂)
                    </span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="csvImportMode"
                      checked={csvImportMode === 'replace'}
                      onChange={() => setCsvImportMode('replace')}
                      className="accent-indigo-600"
                    />
                    <span className={csvImportMode === 'replace' ? 'font-bold text-rose-700' : 'text-slate-600'}>
                      覆蓋自訂題庫
                    </span>
                  </label>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingCSV(true);
                }}
                onDragLeave={() => setIsDraggingCSV(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingCSV(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) processCSVFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center space-y-2 ${
                  isDraggingCSV
                    ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="p-3 rounded-full bg-white shadow-2xs text-indigo-600">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-800 text-xs">
                    點擊選擇或將 CSV 檔案拖曳至此處
                  </p>
                  <p className="text-[10px] text-slate-500">
                    支援 UTF-8 編碼之標準 .csv 檔案（Excel / Google 試算表均可正常導出）
                  </p>
                </div>
              </div>

              {/* CSV Notice Banner */}
              {csvNotice && (
                <div className={`p-3 rounded-2xl text-xs flex items-center justify-between gap-2 ${
                  csvNotice.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {csvNotice.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{csvNotice.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCsvNotice(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Parsed Preview Section */}
              {parsedCSVPreview && parsedCSVPreview.data.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-white border border-indigo-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">
                        已解析預覽（共 {parsedCSVPreview.data.length} 題）
                      </span>
                      <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        模式：{csvImportMode === 'append' ? '增量加入' : '覆蓋自訂'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setParsedCSVPreview(null)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px]"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyCSVImport}
                        className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>確認匯入題庫</span>
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Preview List */}
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {parsedCSVPreview.data.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">
                            {q.question_id}
                          </span>
                          <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">
                            {q.category}
                          </span>
                          <span className={q.attribute === 'asset' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                            {q.attribute === 'asset' ? '＋資產' : '－負債'} ({q.weight} 點)
                          </span>
                          <span className="text-slate-400 font-mono text-[9px] truncate max-w-[120px]">
                            {q.galpin_principle}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800 text-[11px]">{q.question_text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Table Column Reference Card */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-indigo-600" />
                    <span>CSV 表頭欄位格式指南：</span>
                  </div>
                  {parsedCSVPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setAiSourceScope('csv');
                        setActiveTab('ai');
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-bold text-[10px] flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      <span>以 AI 翻譯剛上傳的 CSV ({parsedCSVPreview.data.length} 題)</span>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block">題目內容 (必填)</strong>
                    <span className="text-slate-500">是非問答題型</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block">歸屬類別 (選填)</strong>
                    <span className="text-slate-500">飲食 / 運動 / 飲水</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block">財務屬性 (選填)</strong>
                    <span className="text-slate-500">資產 / 負債</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                    <strong className="text-slate-900 block">權重點數 (選填)</strong>
                    <span className="text-slate-500">預設 10 (5~20)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: AI Intelligent Translation Center */}
        {activeTab === 'ai' && (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1 text-xs">
            {/* Header info banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Gemini 3.7 Flash 生理學多語言 AI 翻譯中心</span>
                </span>
                <span className="bg-indigo-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
                  AI 智能翻譯
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                運用 Google Gemini 3.7 Flash 專業醫學與運動生理學知識庫，自動將題庫精準翻譯為目標語言（保留 Andy Galpin 生理學名詞、資產負債結構與權重分數）。
              </p>
            </div>

            {/* Translation Configuration Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              {/* Target Language Selection */}
              <div>
                <label className="font-bold text-slate-800 block mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  <span>選擇翻譯目標語言 (Target Language)：</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = lang.code === aiTargetLang;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setAiTargetLang(lang.code)}
                        className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-0.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <span className="text-base">{lang.flag}</span>
                        <span className="text-[10px] font-semibold">{lang.nativeName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Source Questions Scope */}
              <div>
                <label className="font-bold text-slate-800 block mb-1 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-indigo-600" />
                  <span>選擇翻譯題庫來源範圍：</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${
                    aiSourceScope === 'custom'
                      ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="aiScope"
                      checked={aiSourceScope === 'custom'}
                      onChange={() => setAiSourceScope('custom')}
                      className="accent-indigo-600"
                    />
                    <div className="text-[11px]">
                      <div>自訂題庫</div>
                      <div className="text-[10px] text-slate-500 font-normal">{customQuestions.length} 題</div>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${
                    aiSourceScope === 'all'
                      ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="aiScope"
                      checked={aiSourceScope === 'all'}
                      onChange={() => setAiSourceScope('all')}
                      className="accent-indigo-600"
                    />
                    <div className="text-[11px]">
                      <div>完整題庫 (前50題)</div>
                      <div className="text-[10px] text-slate-500 font-normal">現有 {allMergedQuestions.length} 題</div>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${
                    aiSourceScope === 'csv'
                      ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="aiScope"
                      checked={aiSourceScope === 'csv'}
                      onChange={() => setAiSourceScope('csv')}
                      className="accent-indigo-600"
                    />
                    <div className="text-[11px]">
                      <div>剛上傳的 CSV 內容</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        {parsedCSVPreview ? `${parsedCSVPreview.data.length} 題` : '尚未解析 CSV'}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Start Translation Button */}
              <button
                type="button"
                disabled={isTranslatingWithAI}
                onClick={() => handleTranslateWithAI()}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isTranslatingWithAI ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Gemini 3.7 Flash 正在智慧翻譯中，請稍候...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>運用 Gemini 3.7 Flash 執行 AI 題庫翻譯</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Notice Alert */}
            {aiNotice && (
              <div className={`p-3 rounded-2xl text-xs flex items-center justify-between gap-2 ${
                aiNotice.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                <div className="flex items-center gap-2">
                  {aiNotice.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{aiNotice.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAiNotice(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Translated Output List Preview & Actions */}
            {aiTranslatedQuestions && aiTranslatedQuestions.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-white border border-indigo-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">
                      AI 翻譯成果預覽（共 {aiTranslatedQuestions.length} 題）
                    </span>
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      目標：{aiTargetLang}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportTranslatedCSV}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>匯出翻譯 CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyTranslatedQuestions}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>加入自訂題庫</span>
                    </button>
                  </div>
                </div>

                {/* Preview cards */}
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {aiTranslatedQuestions.map((tq, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 hover:border-indigo-200 transition-all"
                    >
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">
                          {tq.question_id}
                        </span>
                        <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">
                          {tq.category}
                        </span>
                        <span className={tq.attribute === 'asset' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                          {tq.attribute === 'asset' ? '＋資產' : '－負債'} ({tq.weight} 點)
                        </span>
                        <span className="text-slate-500 font-mono text-[10px]">
                          {tq.galpin_principle}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 text-xs">{tq.question_text}</p>
                      {tq.tip && (
                        <p className="text-[11px] text-slate-500 bg-white p-1.5 rounded-lg border border-slate-100">
                          💡 {tq.tip}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Store Expansion Packs (每次更新 50 題付費 10 元機制) */}
        {activeTab === 'store' && (
          <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
            {/* Header info banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>50 題科學專業擴充包 (單次加購 NT$ 10)</span>
                </span>
                <span className="bg-amber-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
                  單次買斷・終身有效
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                由運動生理學權威 Dr. Andy Galpin 體系專屬設計，每次加購解鎖 50 題深層生理指標問答，全方位深化每日 10 題抽題豐富度與健康淨值精準度！
              </p>
            </div>

            {/* Expansion Packs List */}
            <div className="grid grid-cols-1 gap-3">
              {MARKETPLACE_QUESTION_PACKS.map((pack) => {
                const isPurchased = purchasedPackIds.includes(pack.id);
                return (
                  <div
                    key={pack.id}
                    className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                      isPurchased
                        ? 'bg-emerald-50/60 border-emerald-300'
                        : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {pack.badge}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            {pack.totalQuestions} 題專業問答
                          </span>
                          {isPurchased && (
                            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Check className="w-3 h-3" /> 已解鎖生效中
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{pack.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{pack.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-amber-600">NT$ {pack.priceNTD}</div>
                        <span className="text-[10px] text-slate-400">單次永久加購</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div className="text-slate-500 font-medium">
                        {pack.categoriesSummary}
                      </div>

                      {isPurchased ? (
                        <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          已完全融入每日抽題庫
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPurchasingPack(pack)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs flex items-center gap-1 transition-all active:scale-95"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>NT$ 10 立即解鎖 50 題</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0 text-xs">
          <div className="text-slate-500 text-[11px]">
            資料庫狀態：全部儲存於本地裝置，支援 CSV 備份與離線抽題
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors"
          >
            完成設定並關閉
          </button>
        </div>

        {/* Interactive Payment Checkout Simulator Modal */}
        {purchasingPack && (
          <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">單次加購題庫確認</h3>
                </div>
                <button
                  onClick={() => setPurchasingPack(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 space-y-1">
                <div className="font-bold text-slate-900 text-xs">{purchasingPack.title}</div>
                <p className="text-[11px] text-slate-600">{purchasingPack.subtitle}</p>
                <div className="pt-2 flex items-baseline justify-between border-t border-amber-200/60 font-bold">
                  <span className="text-slate-600">加購總金額：</span>
                  <span className="text-base font-black text-amber-600">NT$ {purchasingPack.priceNTD}</span>
                </div>
              </div>

              {/* Payment Methods Selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block text-[11px]">選擇單次支付方式：</label>
                <div className="space-y-1.5">
                  {[
                    { id: 'apple_pay', label: 'Apple Pay', icon: Apple },
                    { id: 'google_pay', label: 'Google Pay', icon: Smartphone },
                    { id: 'credit_card', label: '信用卡 / 簽帳金融卡', icon: CreditCard },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                          paymentMethod === m.id
                            ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-700" />
                          <span className="text-xs">{m.label}</span>
                        </div>
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === m.id}
                          onChange={() => setPaymentMethod(m.id as any)}
                          className="accent-indigo-600"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="text-[10px] text-slate-400 leading-tight">
                🔒 本次加購為單次 NT$ 10 買斷，永久無續訂扣款。付款完成後 50 題立即寫入您的本機題庫。
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPurchasingPack(null)}
                  disabled={isProcessingPayment}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPurchase}
                  disabled={isProcessingPayment}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  {isProcessingPayment ? (
                    <span>處理授權中...</span>
                  ) : (
                    <>
                      <span>確認支付 NT$ {purchasingPack.priceNTD}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

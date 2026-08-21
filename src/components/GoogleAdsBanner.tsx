import React, { useState } from 'react';
import { 
  Info, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight, 
  X, 
  Settings2,
  Tag
} from 'lucide-react';
import { AppLanguage } from '../types';
import { translate } from '../utils/translations';

interface GoogleAdsBannerProps {
  currentLanguage?: AppLanguage;
  slotId?: string;
  publisherId?: string;
}

interface SponsoredAdItem {
  id: string;
  brand: string;
  headline: string;
  description: string;
  ctaText: string;
  displayUrl: string;
  categoryTag: string;
  colorScheme: 'indigo' | 'emerald' | 'amber';
}

const ROTATING_ADS: Record<AppLanguage, SponsoredAdItem[]> = {
  'zh-TW': [
    {
      id: 'ad_galpin_gear',
      brand: 'Galpin Performance Lab',
      headline: 'Andy Galpin 生理學推薦：全光譜細胞電解質與粒線體修復包',
      description: '科學化配比無糖純淨電解質，加速 Zone 2 有氧代謝並強化肌纖維神經傳導效率。今日訂閱即享限時 85 折。',
      ctaText: '立即獲取專屬優惠',
      displayUrl: 'www.galpinperformancelab.com/electrolytes',
      categoryTag: '運動生理學營養',
      colorScheme: 'indigo',
    },
    {
      id: 'ad_smart_scale',
      brand: 'BioSync Health Metrics',
      headline: '次世代雙頻八電極智能體脂計 — 毫秒級骨骼肌與內臟脂肪精準量測',
      description: '藍牙極速同步，無縫對接健康資產負債表，掌握每日肌肉質量與體水份波動。',
      ctaText: '探索硬體功能',
      displayUrl: 'www.biosynchealth.io/smart-scale',
      categoryTag: '醫療級健康科技',
      colorScheme: 'emerald',
    },
    {
      id: 'ad_organic_market',
      brand: 'PureProtein 牧場直送',
      headline: '週末超市備餐必備：低脂草飼牛、野捕鮭魚與非基改特選毛豆',
      description: '冷鏈真空配送至府，每份精準提供 35g 優質必需胺基酸，輕鬆為健康帳戶存入優質蛋白資產。',
      ctaText: '查看本週特選食材',
      displayUrl: 'www.pureproteinmarket.tw/weekly-box',
      categoryTag: '生鮮優質蛋白質',
      colorScheme: 'amber',
    }
  ],
  'zh-CN': [
    {
      id: 'ad_galpin_gear_cn',
      brand: 'Galpin Performance Lab',
      headline: 'Andy Galpin 生理学推荐：全光谱细胞电解质与线粒体修复包',
      description: '科学化配比无糖纯净电解质，加速 Zone 2 有氧代谢并强化肌纤维神经传导效率。今日订阅享限时优惠。',
      ctaText: '立即获取优惠',
      displayUrl: 'www.galpinperformancelab.com/electrolytes',
      categoryTag: '运动生理学营养',
      colorScheme: 'indigo',
    },
    {
      id: 'ad_smart_scale_cn',
      brand: 'BioSync Health Metrics',
      headline: '次世代双频八电极智能体脂秤 — 毫秒级骨骼肌与内脏脂肪精准测量',
      description: '蓝牙极速同步，无缝对接健康资产负债表，掌握每日肌肉质量与体水分波动。',
      ctaText: '探索硬件功能',
      displayUrl: 'www.biosynchealth.io/smart-scale',
      categoryTag: '医疗级健康科技',
      colorScheme: 'emerald',
    }
  ],
  'en': [
    {
      id: 'ad_galpin_gear_en',
      brand: 'Galpin Performance Lab',
      headline: 'Andy Galpin Recommended: Full-Spectrum Cellular Electrolytes & Recovery',
      description: 'Scientifically calibrated zero-sugar electrolytes to accelerate Zone 2 aerobic density and muscle protein repair. Enjoy 15% off today.',
      ctaText: 'Claim Special Offer',
      displayUrl: 'www.galpinperformancelab.com/electrolytes',
      categoryTag: 'Physiology Nutrition',
      colorScheme: 'indigo',
    },
    {
      id: 'ad_smart_scale_en',
      brand: 'BioSync Health Metrics',
      headline: 'Next-Gen Dual Frequency Smart Body Composition Scale',
      description: 'Precision segmental muscle & visceral fat analysis. Seamless sync with your daily Health Balance Sheet.',
      ctaText: 'Explore Device',
      displayUrl: 'www.biosynchealth.io/smart-scale',
      categoryTag: 'Health Technology',
      colorScheme: 'emerald',
    }
  ],
  'ja': [
    {
      id: 'ad_galpin_gear_ja',
      brand: 'Galpin Performance Lab',
      headline: 'Andy Galpin推奨：細胞電解質＆ミトコンドリア回復サプリ',
      description: 'Zone 2 有酸素持久力を科学的に最適化する無糖ピュア電解質ブレンド。今すぐ特別割引をチェック。',
      ctaText: '詳細・特別割引',
      displayUrl: 'www.galpinperformancelab.com/jp',
      categoryTag: '運動生理学サプリ',
      colorScheme: 'indigo',
    }
  ],
  'ko': [
    {
      id: 'ad_galpin_gear_ko',
      brand: 'Galpin Performance Lab',
      headline: 'Andy Galpin 추천: 프리미엄 전해질 & 미토콘드리아 회복 포뮬러',
      description: 'Zone 2 유산소 대사를 극대화하는 무설탕 고순도 전해질. 오늘 구독 시 15% 특별 할인.',
      ctaText: '특별 혜택 확인',
      displayUrl: 'www.galpinperformancelab.com/kr',
      categoryTag: '생리학 스포츠 영양',
      colorScheme: 'indigo',
    }
  ],
  'es': [
    {
      id: 'ad_galpin_gear_es',
      brand: 'Galpin Performance Lab',
      headline: 'Recomendado por Andy Galpin: Electrolitos Puros y Recuperación Celular',
      description: 'Optimiza la densidad mitocondrial y el rendimiento aeróbico de Zona 2 sin azúcares añadidos.',
      ctaText: 'Ver Oferta Exclusiva',
      displayUrl: 'www.galpinperformancelab.com/es',
      categoryTag: 'Nutrición Deportiva',
      colorScheme: 'indigo',
    }
  ]
};

export const GoogleAdsBanner: React.FC<GoogleAdsBannerProps> = ({
  currentLanguage = 'zh-TW',
  slotId = '6829104812',
  publisherId = 'ca-pub-9182374829103847',
}) => {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [adFeedbackNotice, setAdFeedbackNotice] = useState<string | null>(null);

  const adsList = ROTATING_ADS[currentLanguage] || ROTATING_ADS['zh-TW'];
  const activeAd = adsList[currentAdIndex % adsList.length] || adsList[0];

  const handleNextAd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentAdIndex((prev) => (prev + 1) % adsList.length);
  };

  const handleAdFeedback = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAdFeedbackNotice('感謝您的意見回饋！Google Ads 將優化符合您健康目標的個人化內容。');
    setTimeout(() => setAdFeedbackNotice(null), 4000);
  };

  return (
    <section 
      aria-label="Google Ads Placement"
      className="w-full max-w-5xl mx-auto px-4 pt-6 pb-2"
    >
      <div className="bg-slate-50/90 rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs transition-all relative overflow-hidden">
        {/* Ad Header Label with official Google Ads styling */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-slate-200/60 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="bg-slate-200/90 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px] tracking-wide uppercase flex items-center gap-1">
              <span>{translate('ads.badge', currentLanguage, '廣告 (Ad)')}</span>
            </span>
            <span className="text-slate-400 font-medium hidden sm:inline">•</span>
            <span className="text-slate-500 font-medium hidden sm:inline">
              {translate('ads.googleAds', currentLanguage, 'Google Ads 廣告展示區')}
            </span>
            <span className="text-slate-300 font-mono text-[10px] hidden md:inline">
              (Slot ID: {slotId})
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <button
              type="button"
              onClick={handleNextAd}
              className="hover:text-indigo-600 font-medium text-[10px] transition-colors flex items-center gap-0.5"
              title="輪播下一則廣告"
            >
              <span>切換贊助商</span>
              <ChevronRight className="w-3 h-3" />
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={handleAdFeedback}
              className="hover:text-slate-700 transition-colors flex items-center gap-1 text-[10px]"
              title="關於此 Google 廣告"
            >
              <Info className="w-3 h-3 text-slate-400" />
              <span className="hidden sm:inline">AdChoices</span>
            </button>
          </div>
        </div>

        {/* Feedback toast if triggered */}
        {adFeedbackNotice && (
          <div className="mb-2 p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{adFeedbackNotice}</span>
            </div>
            <button onClick={() => setAdFeedbackNotice(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Responsive Google Ads Card Layout */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:border-indigo-300 transition-all">
          <div className="flex items-start gap-3.5 max-w-3xl">
            {/* Visual Icon Badge */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-slate-100 text-indigo-700 border border-indigo-100 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900">
                  {activeAd.brand}
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.2 rounded-full">
                  {activeAd.categoryTag}
                </span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  {activeAd.displayUrl}
                </span>
              </div>

              <h5 className="font-bold text-xs sm:text-sm text-slate-800 leading-snug">
                {activeAd.headline}
              </h5>

              <p className="text-xs text-slate-500 leading-relaxed">
                {activeAd.description}
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="w-full md:w-auto flex flex-row md:flex-col items-center md:items-end justify-between gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <a
              href={`https://${activeAd.displayUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
            >
              <span>{activeAd.ctaText}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <span className="text-[9px] text-slate-400 font-mono">
              Google Ads Verified Partner
            </span>
          </div>
        </div>

        {/* AdSlot Footer Details */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 mt-1">
          <span className="truncate">
            Publisher: {publisherId} • Ad Unit: responsive_leaderboard_footer
          </span>
          <a
            href="https://policies.google.com/technologies/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline text-slate-400 hover:text-slate-600 shrink-0 ml-2"
          >
            {translate('ads.privacy', currentLanguage, '廣告隱私權說明')}
          </a>
        </div>
      </div>
    </section>
  );
};

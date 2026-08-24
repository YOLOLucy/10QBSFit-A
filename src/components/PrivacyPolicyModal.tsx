import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  ExternalLink, 
  Mail, 
  FileText, 
  Lock, 
  Trash2, 
  Clock, 
  UserCheck, 
  Smartphone, 
  ChevronRight,
  Globe2,
  Copy,
  Check
} from 'lucide-react';
import { PRIVACY_POLICY_DATA } from '../data/privacyPolicyData';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeLang, setActiveLang] = useState<'zh' | 'en'>('zh');
  const [copied, setCopied] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>(PRIVACY_POLICY_DATA.sections[0].id);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(PRIVACY_POLICY_DATA.liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {PRIVACY_POLICY_DATA.title}
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  官方合規認證
                </span>
              </div>
              <p className="text-xs text-slate-500">
                10qbs 隱私承諾・本機加密・絕不出售個人資料・最高 24 個月保留上限
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Link & Quick Action Bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-emerald-50/70 border-b border-emerald-100/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-medium truncate max-w-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[11px] text-slate-600">公開連結：</span>
            <a
              href={PRIVACY_POLICY_DATA.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-emerald-700 hover:text-emerald-800 font-mono underline flex items-center gap-1 truncate"
            >
              <span>freeprivacypolicy.com/live/463ed120...</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2 py-1 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center gap-1 transition-all"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? '已複製連結' : '複製條款網址'}</span>
            </button>

            <a
              href={`mailto:${PRIVACY_POLICY_DATA.contactEmail}?subject=10QBS%20隱私權政策與資料權利詢問`}
              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold flex items-center gap-1 transition-all"
            >
              <Mail className="w-3 h-3" />
              <span>聯絡法務/客服</span>
            </a>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-slate-700 leading-relaxed no-scrollbar">
          
          {/* Key Guarantee Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>本機優先加密</span>
              </div>
              <p className="text-[11px] text-slate-500">
                身體數值與問卷作答優先留存在您的裝置端，高度保障個人健康機密。
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>24 個月保留上限</span>
              </div>
              <p className="text-[11px] text-slate-500">
                帳號關閉後最多保留 24 個月，期滿自動去識別化或永久刪除。
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>零行銷外流保證</span>
              </div>
              <p className="text-[11px] text-slate-500">
                絕不將您的電話、Email 或問卷資訊出售給第三方機構進行推銷。
              </p>
            </div>
          </div>

          {/* Quick Index Pills */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              條款章節快速索引
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRIVACY_POLICY_DATA.sections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
                >
                  {sec.title.split(' ')[0]} {sec.title.split(' ')[1]}
                </a>
              ))}
            </div>
          </div>

          {/* Section details */}
          <div className="space-y-5 pt-2">
            {PRIVACY_POLICY_DATA.sections.map((section, idx) => (
              <div 
                key={section.id} 
                id={section.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-50/60 border border-slate-200/90 space-y-2.5 transition-all hover:border-slate-300 scroll-mt-4"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {section.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {section.titleEn}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-600 text-[10px] font-mono shrink-0">
                    § 0{idx + 1}
                  </span>
                </div>

                <p className="text-xs text-emerald-800 font-medium bg-emerald-50/80 p-2 rounded-xl border border-emerald-100">
                  💡 重點摘要：{section.summary}
                </p>

                <div className="space-y-1.5 text-xs text-slate-600">
                  {section.content.map((line, lIdx) => {
                    if (!line) return <div key={lIdx} className="h-1" />;
                    return (
                      <p key={lIdx} className="leading-relaxed">
                        {line.startsWith('•') || line.startsWith('**') ? (
                          <span>{line}</span>
                        ) : (
                          <span>{line}</span>
                        )}
                      </p>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Legal Meta Footer */}
          <div className="p-4 rounded-2xl bg-slate-100/90 border border-slate-200 space-y-2 text-center text-xs text-slate-500">
            <div className="font-bold text-slate-700">
              10qbs (Taiwan) 官方隱私權保護聲明
            </div>
            <p className="text-[11px]">
              法律專屬即時查閱網址：
              <a 
                href={PRIVACY_POLICY_DATA.liveUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-emerald-700 underline font-mono ml-1"
              >
                {PRIVACY_POLICY_DATA.liveUrl}
              </a>
            </p>
            <p className="text-[10px] text-slate-400">
              客服與法務窗口：{PRIVACY_POLICY_DATA.contactEmail} ｜ 適用司法管轄：台灣 (Taiwan)
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            已完整打包進入 10QBS 系統
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs"
          >
            我知道了 (關閉)
          </button>
        </div>
      </div>
    </div>
  );
};

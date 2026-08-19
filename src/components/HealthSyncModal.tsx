import React, { useState } from 'react';
import { 
  Smartphone, 
  RefreshCw, 
  Check, 
  X, 
  Heart, 
  Activity, 
  Bluetooth, 
  Sparkles, 
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { WeightSource } from '../types';
import { 
  SYNC_PROVIDERS, 
  detectMobilePlatform, 
  syncWeightFromProvider, 
  HealthSyncResult 
} from '../utils/healthSync';

interface HealthSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeight: number;
  onApplySyncedData: (data: HealthSyncResult) => void;
}

export const HealthSyncModal: React.FC<HealthSyncModalProps> = ({
  isOpen,
  onClose,
  currentWeight,
  onApplySyncedData,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<WeightSource>('apple_health');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<HealthSyncResult | null>(null);

  if (!isOpen) return null;

  const currentPlatform = detectMobilePlatform();

  const handleStartSync = async (provider: WeightSource) => {
    setSelectedProvider(provider);
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const res = await syncWeightFromProvider(provider, currentWeight);
      setSyncResult(res);
      // Auto apply to input
      onApplySyncedData(res);
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                手機健康資料自動同步
              </h2>
              <p className="text-xs text-slate-500">
                支援 iOS Apple 健康、Android Google Fit 與藍牙智慧體脂計
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

        {/* Sync Providers List */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-slate-700">選擇您的手機健康同步來源：</div>
          
          {SYNC_PROVIDERS.map((prov) => {
            const isSelected = selectedProvider === prov.id;
            return (
              <div
                key={prov.id}
                onClick={() => !isSyncing && handleStartSync(prov.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${prov.color} shadow-xs`}>
                    {prov.id === 'apple_health' && <Heart className="w-4 h-4" />}
                    {prov.id === 'google_fit' && <Activity className="w-4 h-4" />}
                    {prov.id === 'smart_scale' && <Bluetooth className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{prov.name}</span>
                      {((currentPlatform === 'ios' && prov.id === 'apple_health') || 
                        (currentPlatform === 'android' && prov.id === 'google_fit')) && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                          本機系統推薦
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {prov.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSyncing}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0 shadow-2xs"
                >
                  {isSyncing && selectedProvider === prov.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>讀取</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Sync Feedback Result Card */}
        {syncResult && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncResult.message}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60">
              <div className="bg-white/80 p-2 rounded-xl text-center">
                <div className="text-[10px] text-slate-500">同步體重數據</div>
                <div className="text-lg font-black text-slate-900">{syncResult.weight} kg</div>
              </div>
              <div className="bg-white/80 p-2 rounded-xl text-center">
                <div className="text-[10px] text-slate-500">同步體脂率數據</div>
                <div className="text-lg font-black text-purple-700">{syncResult.bodyFat || '--'} %</div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy notice */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            所有手機健康數據皆於本機端加密讀取，絕不上傳第三方伺服器，嚴密守護隱私。
          </span>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>完成並套用數據</span>
          </button>
        </div>
      </div>
    </div>
  );
};

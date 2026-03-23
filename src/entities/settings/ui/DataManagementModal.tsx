"use client";
import React, { useEffect } from "react";
import { X, Database, Info } from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_STORAGE_MB = 500; // Change this to 1 or 10 for testing progress bar colors

const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    interfaceLanguage,
    storageInfo,
    updateStorageInfo,
    isMessageDeletionEnabled,
    isAudioDeletionEnabled,
    setMessageDeletionEnabled,
    setAudioDeletionEnabled,
  } = useLiveStore();

  const t = translations[interfaceLanguage] || translations["uk"];

  useEffect(() => {
    if (isOpen) {
      updateStorageInfo();
    }
  }, [isOpen, updateStorageInfo]);

  if (!isOpen) return null;

  const totalBytes =
    (storageInfo?.audioSize || 0) + (storageInfo?.textSize || 0);
  const totalMB = totalBytes / (1024 * 1024);
  const audioMB = (storageInfo?.audioSize || 0) / (1024 * 1024);
  const textMB = (storageInfo?.textSize || 0) / (1024 * 1024);

  const percent = Math.min((totalMB / MAX_STORAGE_MB) * 100, 100);

  const getProgressColor = () => {
    if (percent > 90) return "bg-red-700";
    if (percent > 60) return "bg-yellow-600";
    return "bg-blue-500";
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md md:max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 mx-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-100 font-bold">
            <Database className="w-5 h-5 text-blue-400" />
            {t.dataManagement}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Memory Usage Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-sm font-medium text-slate-400">
                {t.memoryUsage}
              </span>
              <span className="text-sm font-bold text-slate-100">
                {totalMB.toFixed(2)} MB / {MAX_STORAGE_MB} MB
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor()}`}
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5 text-blue-400">
                <span>
                  {t.audio}: {audioMB.toFixed(2)} MB
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 text-right">
                <span>
                  {t.text}: {textMB.toFixed(2)} MB
                </span>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-800 w-full" />

          {/* Togglers Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-100">
                  {t.allowMessageDeletion}
                </h4>
              </div>
              <button
                onClick={() =>
                  setMessageDeletionEnabled(!isMessageDeletionEnabled)
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isMessageDeletionEnabled ? "bg-blue-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isMessageDeletionEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-100">
                  {t.allowAudioDeletion}
                </h4>
              </div>
              <button
                onClick={() => setAudioDeletionEnabled(!isAudioDeletionEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAudioDeletionEnabled ? "bg-blue-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isAudioDeletionEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0" />
            <p className="text-[12px] leading-relaxed text-blue-200/80 italic">
              {t.dataManagementDesc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManagementModal;

"use client";
import React from "react";
import { X, AlertCircle } from "lucide-react";
import { useLiveStore } from "@/app/store/useLiveStore";
import { translations } from "@/shared/lib/translations";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}) => {
  const { interfaceLanguage } = useLiveStore();
  const t = translations[interfaceLanguage] || translations["uk"];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-red-500/10 rounded-full shrink-0">
              <AlertCircle className="w-6 h-6 text-red-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">{title}</h3>
              <p className="text-sm text-slate-400 mt-1">{message}</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-700 text-white text-sm font-medium transition-colors shadow-lg shadow-red-600/20"
            >
              {t.confirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

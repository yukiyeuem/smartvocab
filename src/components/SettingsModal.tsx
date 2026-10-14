import React, { useState } from 'react';
import { Settings, Download, Trash2, Shield, X, CheckCircle2, AlertTriangle, Sun, Moon, Laptop } from 'lucide-react';
import { User, UserSettings } from '../types';
import { apiRequest } from '../lib/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  settings: UserSettings;
  onSettingsUpdated: (newSettings: UserSettings) => void;
  onLogout: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  settings,
  onSettingsUpdated,
  onLogout,
}) => {
  const [themePreference, setThemePreference] = useState<'system' | 'light' | 'dark'>(settings.theme || 'system');
  const [newCardsPerDay, setNewCardsPerDay] = useState(settings.new_cards_per_day || 10);
  const [maxReviewsPerDay, setMaxReviewsPerDay] = useState(settings.max_reviews_per_day || 100);
  const [cardDirection, setCardDirection] = useState<'en_vi' | 'vi_en'>(settings.card_direction || 'en_vi');
  const [autoPronounce, setAutoPronounce] = useState(settings.auto_pronounce || false);
  const [aiEnabled, setAiEnabled] = useState(settings.ai_enabled || false);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await apiRequest<{ success: boolean; settings: UserSettings }>('/api/me/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          new_cards_per_day: newCardsPerDay,
          max_reviews_per_day: maxReviewsPerDay,
          card_direction: cardDirection,
          auto_pronounce: autoPronounce,
          ai_enabled: aiEnabled,
          theme: themePreference,
        }),
      });

      onSettingsUpdated(res.settings);
      setMsg('Đã lưu cài đặt học tập thành công!');
      setTimeout(() => setMsg(null), 2000);
    } catch (err: any) {
      setMsg(err.message || 'Lỗi lưu cài đặt.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    window.open('/api/me/export', '_blank');
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    try {
      await apiRequest('/api/me', { method: 'DELETE' });
      onLogout();
      onClose();
    } catch (err: any) {
      setMsg(err.message || 'Không thể xóa tài khoản.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <span>Cài đặt Tài khoản & Học tập</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tùy biến nhịp độ lặp lại ngắt quãng và quyền riêng tư AI
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {msg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* SRS Learning Pace */}
        <div className="space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-slate-400">
            Nhịp độ học tập (SRS Pace)
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Thẻ mới mỗi ngày:
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={newCardsPerDay}
                onChange={e => setNewCardsPerDay(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tối đa lượt ôn / ngày:
              </label>
              <input
                type="number"
                min={10}
                max={500}
                value={maxReviewsPerDay}
                onChange={e => setMaxReviewsPerDay(parseInt(e.target.value, 10) || 10)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Hướng ôn tập mặc định:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCardDirection('en_vi')}
                className={`p-2.5 rounded-xl border text-center font-medium transition-colors ${
                  cardDirection === 'en_vi'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Anh → Việt (Mặc định)
              </button>
              <button
                type="button"
                onClick={() => setCardDirection('vi_en')}
                className={`p-2.5 rounded-xl border text-center font-medium transition-colors ${
                  cardDirection === 'vi_en'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Việt → Anh (Chủ động)
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Giao diện hiển thị:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setThemePreference('system')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-medium transition-colors ${
                  themePreference === 'system'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Laptop className="w-4 h-4" />
                <span className="text-[11px]">Hệ thống</span>
              </button>

              <button
                type="button"
                onClick={() => setThemePreference('light')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-medium transition-colors ${
                  themePreference === 'light'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span className="text-[11px]">Sáng</span>
              </button>

              <button
                type="button"
                onClick={() => setThemePreference('dark')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-medium transition-colors ${
                  themePreference === 'dark'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span className="text-[11px]">Tối</span>
              </button>
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer">
            <input
              type="checkbox"
              checked={autoPronounce}
              onChange={e => setAutoPronounce(e.target.checked)}
              className="rounded text-blue-600 w-4 h-4"
            />
            <div>
              <span className="font-semibold text-slate-900 dark:text-white block">
                Tự động phát âm khi hiện thẻ mới
              </span>
              <span className="text-slate-500 text-[11px]">
                Sử dụng giọng đọc tiếng Anh Web Speech chuẩn
              </span>
            </div>
          </label>
        </div>

        {/* AI Consent & Settings */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-slate-400">
            Quyền riêng tư & Trợ lý AI (Google Gemini)
          </h3>

          <label className="flex items-start gap-3 p-3.5 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 rounded-2xl cursor-pointer">
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={e => setAiEnabled(e.target.checked)}
              className="rounded text-blue-600 w-4 h-4 mt-0.5"
            />
            <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white block text-xs">
                Bật trợ lý AI (Tra từ tự động & Sinh bài đọc)
              </span>
              <p>
                Tính năng này gửi thuật ngữ bạn nhập tới Google Gemini để tạo giải nghĩa và bài đọc. Không bao gồm thông tin cá nhân.
              </p>
            </div>
          </label>
        </div>

        {/* Data Export & Account Deletion */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-slate-400">
            Dữ liệu cá nhân (Data Ownership)
          </h3>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleExportData}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-semibold flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Tải về toàn bộ dữ liệu (JSON)</span>
            </button>

            {user.role !== 'admin' && (
              <button
                onClick={handleDeleteAccount}
                className="px-3.5 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleteConfirm ? 'Xác nhận xóa vĩnh viễn?' : 'Xóa tài khoản của tôi'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-40"
          >
            {loading ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </div>
      </div>
    </div>
  );
};

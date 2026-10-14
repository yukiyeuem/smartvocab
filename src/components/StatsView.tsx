import React, { useState, useEffect } from 'react';
import { BarChart3, Brain, CheckCircle2, AlertTriangle, Flame, RotateCw, Volume2, BookOpen } from 'lucide-react';
import { StudyStats } from '../types';
import { apiRequest } from '../lib/api';
import { speakEnglish } from '../lib/speech';

export const StatsView: React.FC = () => {
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<StudyStats>('/api/study/stats');
      setStats(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <RotateCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Đang tính toán số liệu thống kê...</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Tiến độ & Thống kê Ghi nhớ SRS
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Theo dõi độ bền của trí nhớ theo thuật toán lặp lại ngắt quãng (Spaced Repetition)
        </p>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.totalCards}
            </span>
            <span className="block text-xs text-slate-500 mt-1">Tổng từ vựng</span>
          </div>

          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/50">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.learnedCards}
            </span>
            <span className="block text-xs text-emerald-700 dark:text-emerald-300 mt-1">Đã thuộc vững</span>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/50">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.learningCards}
            </span>
            <span className="block text-xs text-blue-700 dark:text-blue-300 mt-1">Đang học ôn</span>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/50">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.dueToday}
            </span>
            <span className="block text-xs text-amber-700 dark:text-amber-300 mt-1">Đến hạn hôm nay</span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics & SRS Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Hiệu quả ghi nhớ</span>
          </h3>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
            <div>
              <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                {stats.retentionRate}%
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">Tỷ lệ đánh giá Tốt / Dễ</span>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-slate-700 dark:text-slate-300">
                {stats.totalReviews}
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">Lượt chấm bài đã thực hiện</span>
            </div>
          </div>

          {/* Visual Progress Bar Breakdown */}
          {stats.totalCards > 0 && (
            <div className="space-y-2 pt-2">
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${(stats.learnedCards / stats.totalCards) * 100}%` }}
                  className="bg-emerald-500"
                  title="Đã thuộc"
                />
                <div
                  style={{ width: `${(stats.learningCards / stats.totalCards) * 100}%` }}
                  className="bg-blue-500"
                  title="Đang học"
                />
                <div
                  style={{ width: `${(stats.newCards / stats.totalCards) * 100}%` }}
                  className="bg-slate-300 dark:bg-slate-600"
                  title="Thẻ mới"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Đã thuộc ({stats.learnedCards})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Đang học ({stats.learningCards})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                  <span>Chưa học ({stats.newCards})</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hard Words (Leeches / Lapses >= 4) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Từ hay quên cần chú ý ({stats.hardWords?.length || 0})</span>
            </h3>
            <span className="text-[11px] text-slate-400">Leech detection</span>
          </div>

          {!stats.hardWords || stats.hardWords.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              Chưa có từ nào bị đánh dấu hay quên. Bạn đang học rất tốt!
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {stats.hardWords.map(c => (
                <div
                  key={c.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white mr-2">
                      {c.term}
                    </span>
                    <span className="text-slate-500">{c.meaning_vi}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => speakEnglish(c.term)}
                    className="p-1.5 text-slate-400 hover:text-blue-600"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

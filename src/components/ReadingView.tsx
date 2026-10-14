import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Volume2, CheckCircle2, XCircle, Trash2, ArrowRight, RotateCw, AlertCircle, HelpCircle } from 'lucide-react';
import { ReadingPassage, Deck, Card } from '../types';
import { apiRequest } from '../lib/api';
import { speakEnglish } from '../lib/speech';

interface ReadingViewProps {
  decks: Deck[];
}

export const ReadingView: React.FC<ReadingViewProps> = ({ decks }) => {
  const [passages, setPassages] = useState<ReadingPassage[]>([]);
  const [selectedPassage, setSelectedPassage] = useState<ReadingPassage | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generator Options
  const [inputMode, setInputMode] = useState<'deck' | 'custom'>(decks.length > 0 ? 'deck' : 'custom');
  const [customWordsText, setCustomWordsText] = useState('perseverance, resilient, accomplish, dedicate, challenge');
  const [selectedDeckId, setSelectedDeckId] = useState<string>(decks[0]?.id || '');
  const [level, setLevel] = useState<string>('B1');
  const [topic, setTopic] = useState<string>('');
  const [deckCards, setDeckCards] = useState<Card[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  // Interactive Quiz Answers inside passage
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Word popover state
  const [activeWordPopup, setActiveWordPopup] = useState<{ word: string; meaning: string } | null>(null);

  useEffect(() => {
    loadPassages();
  }, []);

  useEffect(() => {
    if (selectedDeckId) {
      loadDeckCards(selectedDeckId);
    }
  }, [selectedDeckId]);

  const loadPassages = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ passages: ReadingPassage[] }>('/api/reading');
      setPassages(res.passages || []);
      if (res.passages && res.passages.length > 0) {
        setSelectedPassage(res.passages[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách bài đọc.');
    } finally {
      setLoading(false);
    }
  };

  const loadDeckCards = async (deckId: string) => {
    try {
      const res = await apiRequest<{ cards: Card[] }>(`/api/decks/${deckId}`);
      const cards = res.cards || [];
      setDeckCards(cards);
      // Auto select first 6 cards
      setSelectedCardIds(cards.slice(0, 6).map(c => c.id));
    } catch {
      // ignore
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await apiRequest<{ success: boolean; reading: ReadingPassage }>('/api/reading/generate', {
        method: 'POST',
        body: JSON.stringify({
          card_ids: inputMode === 'deck' ? selectedCardIds : undefined,
          custom_words: inputMode === 'custom' ? customWordsText : undefined,
          level,
          topic: topic.trim() || undefined,
        }),
      });

      setPassages(prev => [res.reading, ...prev]);
      setSelectedPassage(res.reading);
      setUserAnswers({});
      setQuizSubmitted(false);
    } catch (err: any) {
      setError(err.message || 'Không thể tạo bài đọc bằng AI.');
    } finally {
      setGenerating(false);
    }
  };

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleDeletePassage = async (id: string) => {
    try {
      await apiRequest(`/api/reading/${id}`, { method: 'DELETE' });
      setPassages(prev => prev.filter(p => p.id !== id));
      if (selectedPassage?.id === id) {
        setSelectedPassage(passages.find(p => p.id !== id) || null);
      }
      setPendingDeleteId(null);
    } catch (err: any) {
      setError(err.message || 'Không thể xóa bài đọc.');
    }
  };

  const renderPassageWithHighlights = (passageText: string, targetWords: string[]) => {
    if (!targetWords || targetWords.length === 0) return passageText;

    // Build regex for target words
    const regex = new RegExp(`\\b(${targetWords.join('|')})(?:s|ed|ing|ly)?\\b`, 'gi');
    const parts = passageText.split(regex);

    return parts.map((part, index) => {
      const isTarget = targetWords.some(w => w.toLowerCase() === part.toLowerCase());
      if (isTarget) {
        return (
          <span
            key={index}
            onClick={() => {
              const matchedCard = deckCards.find(c => c.term.toLowerCase() === part.toLowerCase());
              setActiveWordPopup({
                word: part,
                meaning: matchedCard ? matchedCard.meaning_vi : 'Từ vựng mục tiêu trong bài',
              });
            }}
            className="bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-200 transition-colors"
            title="Bấm để xem nghĩa"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Reading Passages</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Bài đọc Ngữ cảnh theo Từ vựng của bạn
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gemini AI lồng ghép chính xác các từ bạn đang học vào bài đọc tiếng Anh tự nhiên kèm câu hỏi đọc hiểu
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Generator Form & List of saved passages */}
        <div className="space-y-6">
          {/* Create New Passage Generator Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Tạo bài đọc mới</span>
            </h3>

            {/* Input Mode Selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setInputMode('deck')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  inputMode === 'deck'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Từ bộ thẻ ({decks.length})
              </button>
              <button
                type="button"
                onClick={() => setInputMode('custom')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  inputMode === 'custom'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Nhập từ tự do
              </button>
            </div>

            {inputMode === 'deck' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chọn bộ thẻ từ vựng:
                </label>
                {decks.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                    Chưa có bộ thẻ nào. Hãy chuyển sang tab "Nhập từ tự do" để tạo bài đọc ngay!
                  </p>
                ) : (
                  <select
                    value={selectedDeckId}
                    onChange={e => setSelectedDeckId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    {decks.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.totalCards || 0} từ)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Từ vựng mục tiêu (phân cách bằng dấu phẩy):
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={customWordsText}
                  onChange={e => setCustomWordsText(e.target.value)}
                  placeholder="Ví dụ: perseverance, resilient, accomplish, dedicate, challenge..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cấp độ CEFR:
                </label>
                <select
                  value={level}
                  onChange={e => setLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                >
                  <option value="A2">A2 (Cơ bản)</option>
                  <option value="B1">B1 (Trung cấp)</option>
                  <option value="B2">B2 (Khá)</option>
                  <option value="C1">C1 (Nâng cao)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chủ đề (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Ví dụ: AI, Du lịch..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Target Words Selector for Deck Mode */}
            {inputMode === 'deck' && deckCards.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Từ mục tiêu ({selectedCardIds.length}/8):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const sample = [...deckCards].sort(() => 0.5 - Math.random()).slice(0, 6);
                      setSelectedCardIds(sample.map(c => c.id));
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Ngẫu nhiên
                  </button>
                </div>
                <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2 space-y-1 bg-slate-50/50 dark:bg-slate-800/30">
                  {deckCards.map(c => {
                    const isChecked = selectedCardIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 p-1 hover:bg-white dark:hover:bg-slate-800 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              if (selectedCardIds.length >= 8) return;
                              setSelectedCardIds([...selectedCardIds, c.id]);
                            } else {
                              setSelectedCardIds(selectedCardIds.filter(id => id !== c.id));
                            }
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="font-semibold">{c.term}</span>
                        <span className="text-[11px] text-slate-400 truncate">({c.meaning_vi})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={
                generating ||
                (inputMode === 'deck' && selectedCardIds.length === 0) ||
                (inputMode === 'custom' && !customWordsText.trim())
              }
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            >
              {generating ? <RotateCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{generating ? 'Gemini đang soạn bài đọc...' : 'Sinh bài đọc với AI'}</span>
            </button>
          </div>

          {/* List of Saved Passages */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Bài đọc đã lưu ({passages.length})
            </h3>

            {passages.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Chưa có bài đọc nào. Hãy bấm "Sinh bài đọc với AI" ở trên.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {passages.map(p => {
                  const isSelected = selectedPassage?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPassage(p);
                        setUserAnswers({});
                        setQuizSubmitted(false);
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 font-semibold text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="truncate flex-1">
                        <span className="block truncate">{p.title}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {p.level} · {p.target_words?.length || 0} từ mục tiêu
                        </span>
                      </div>
                      {pendingDeleteId === p.id ? (
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleDeletePassage(p.id)}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-semibold"
                          >
                            Xóa
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(null)}
                            className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded text-[10px]"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setPendingDeleteId(p.id);
                          }}
                          title="Xóa bài đọc này"
                          className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Passage Reader & Comprehension Quiz */}
        <div className="lg:col-span-2">
          {selectedPassage ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              {/* Passage Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold rounded">
                      CEFR {selectedPassage.level}
                    </span>
                    {selectedPassage.topic && (
                      <span className="text-xs text-slate-400">
                        Chủ đề: {selectedPassage.topic}
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {selectedPassage.title}
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={() => speakEnglish(selectedPassage.passage)}
                  className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Volume2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Đọc to bài này</span>
                </button>
              </div>

              {/* Passage Text */}
              <div className="text-slate-800 dark:text-slate-200 leading-relaxed text-sm sm:text-base space-y-4 font-serif">
                <p>
                  {renderPassageWithHighlights(selectedPassage.passage, selectedPassage.target_words)}
                </p>
              </div>

              {/* Word Popup Card if clicked */}
              {activeWordPopup && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
                  <div>
                    <span className="font-bold text-sm mr-2">{activeWordPopup.word}:</span>
                    <span>{activeWordPopup.meaning}</span>
                  </div>
                  <button
                    onClick={() => setActiveWordPopup(null)}
                    className="text-blue-500 hover:text-blue-700 text-xs ml-3"
                  >
                    Đóng
                  </button>
                </div>
              )}

              {/* Target Words List Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-400 block mb-2">
                  Từ vựng mục tiêu trong bài:
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedPassage.target_words.map((w, idx) => (
                    <span
                      key={idx}
                      onClick={() => speakEnglish(w)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-slate-700 dark:text-slate-200 hover:text-blue-600 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <span>{w}</span>
                      <Volume2 className="w-3 h-3 text-slate-400" />
                    </span>
                  ))}
                </div>
              </div>

              {/* Comprehension Questions */}
              {selectedPassage.questions && selectedPassage.questions.length > 0 && (
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-blue-600" />
                    <span>Câu hỏi Đọc hiểu ({selectedPassage.questions.length} câu)</span>
                  </h3>

                  <div className="space-y-4">
                    {selectedPassage.questions.map((q, qIdx) => {
                      const selectedAns = userAnswers[qIdx];
                      const isCorrect = selectedAns === q.answer_index;

                      return (
                        <div
                          key={qIdx}
                          className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                        >
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">
                            Câu {qIdx + 1}: {q.question}
                          </p>

                          <div className="space-y-1.5 pt-1">
                            {q.options.map((opt, oIdx) => {
                              const isOptionSelected = selectedAns === oIdx;
                              let labelStyle = 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800';

                              if (quizSubmitted) {
                                if (oIdx === q.answer_index) {
                                  labelStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold';
                                } else if (isOptionSelected) {
                                  labelStyle = 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300';
                                }
                              } else if (isOptionSelected) {
                                labelStyle = 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold';
                              }

                              return (
                                <label
                                  key={oIdx}
                                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${labelStyle}`}
                                >
                                  <input
                                    type="radio"
                                    name={`q_${qIdx}`}
                                    checked={isOptionSelected}
                                    onChange={() => setUserAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                                    disabled={quizSubmitted}
                                    className="text-blue-600"
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>

                          {quizSubmitted && q.explanation && (
                            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 mt-2">
                              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                                Giải thích:
                              </span>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!quizSubmitted ? (
                    <button
                      onClick={() => setQuizSubmitted(true)}
                      disabled={Object.keys(userAnswers).length === 0}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-40"
                    >
                      Nộp bài & Xem giải thích
                    </button>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                      <span>Đã nộp bài đọc hiểu thành công!</span>
                      <button
                        onClick={() => {
                          setUserAnswers({});
                          setQuizSubmitted(false);
                        }}
                        className="text-emerald-700 hover:underline"
                      >
                        Làm lại
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Chưa có bài đọc nào được chọn
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Chọn từ danh sách bên trái hoặc bấm "Sinh bài đọc với AI" để tạo bài đọc mới.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

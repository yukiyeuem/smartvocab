import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, Undo2, RotateCw, CheckCircle2, XCircle, ArrowLeft, Brain, Headphones, HelpCircle, Shuffle, Check, Sparkles, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { StudyQueueCard, UserSettings, Deck } from '../types';
import { apiRequest } from '../lib/api';
import { speakEnglish } from '../lib/speech';

interface StudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckId?: string;
  decks: Deck[];
  settings: UserSettings | null;
  onStudyComplete: () => void;
}

export const StudyModal: React.FC<StudyModalProps> = ({
  isOpen,
  onClose,
  deckId,
  decks,
  settings,
  onStudyComplete,
}) => {
  const [mode, setMode] = useState<'flashcard' | 'dictation' | 'quiz'>('flashcard');
  const [direction, setDirection] = useState<'en_vi' | 'vi_en'>(settings?.card_direction || 'en_vi');
  const [queue, setQueue] = useState<StudyQueueCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session Statistics
  const [reviewedCount, setReviewedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [historyIds, setHistoryIds] = useState<string[]>([]);

  // Dictation Mode State
  const [dictationInput, setDictationInput] = useState('');
  const [dictationChecked, setDictationChecked] = useState(false);
  const [dictationCorrect, setDictationCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Quiz Mode State
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const currentDeck = decks.find(d => d.id === deckId);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (deckId) query.append('deck_id', deckId);
      query.append('direction', direction);

      const res = await apiRequest<{ queue: StudyQueueCard[] }>(`/api/study/queue?${query.toString()}`);
      setQueue(res.queue || []);
      setCurrentIndex(0);
      setIsFlipped(false);
      setReviewedCount(0);
      setCorrectCount(0);
      setHistoryIds([]);
    } catch (err: any) {
      setError(err.message || 'Không thể tải hàng đợi học tập.');
    } finally {
      setLoading(false);
    }
  }, [deckId, direction]);

  useEffect(() => {
    if (isOpen) {
      fetchQueue();
    }
  }, [isOpen, fetchQueue]);

  const currentCard = queue[currentIndex];

  // Auto-pronounce if enabled in settings
  useEffect(() => {
    if (currentCard && settings?.auto_pronounce && !isFlipped && direction === 'en_vi') {
      speakEnglish(currentCard.term);
    }
  }, [currentCard, isFlipped, settings?.auto_pronounce, direction]);

  // Generate Quiz Options when card changes
  useEffect(() => {
    if (mode === 'quiz' && currentCard) {
      setSelectedOption(null);
      const correctAnswer = currentCard.meaning_vi;

      // Pick 3 distractors from related words or deck
      const distractorPool = queue
        .filter(c => c.id !== currentCard.id)
        .map(c => c.meaning_vi)
        .filter(Boolean);

      const shuffledPool = [...new Set(distractorPool)].sort(() => 0.5 - Math.random());
      const choices = [correctAnswer, ...shuffledPool.slice(0, 3)].sort(() => 0.5 - Math.random());
      setQuizOptions(choices);
    }
  }, [mode, currentCard, queue]);

  // Reset dictation on card switch
  useEffect(() => {
    setDictationInput('');
    setDictationChecked(false);
    setDictationCorrect(false);
    setShowHint(false);
  }, [currentIndex, mode]);

  // Flashcard SRS Grade Handler
  const handleGrade = async (rating: 1 | 2 | 3 | 4) => {
    if (!currentCard) return;

    try {
      await apiRequest('/api/study/reviews', {
        method: 'POST',
        body: JSON.stringify({
          card_id: currentCard.id,
          direction,
          rating,
          mode: 'flashcard',
        }),
      });

      setHistoryIds(prev => [...prev, currentCard.id]);
      setReviewedCount(prev => prev + 1);
      if (rating >= 3) setCorrectCount(prev => prev + 1);

      if (rating === 1) {
        // Again: repeat card in current session queue (insert after 3-4 cards)
        const updated = [...queue];
        const insertPos = Math.min(queue.length, currentIndex + 4);
        updated.splice(insertPos, 0, currentCard);
        setQueue(updated);
      }

      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi ghi nhận lượt đánh giá.');
    }
  };

  // Undo Handler (FR-FC-04)
  const handleUndo = async () => {
    try {
      await apiRequest('/api/study/undo', { method: 'POST' });
      if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
        setIsFlipped(true);
        setReviewedCount(prev => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      setError(err.message || 'Không thể hoàn tác.');
    }
  };

  // Navigate previous card without modifying SRS (FR-FC-10, shortcuts ←)
  const handlePrevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  // Navigate next card without modifying SRS (FR-FC-10, shortcuts →)
  const handleNextCard = () => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  };

  // Dictation Check Handler
  const handleCheckDictation = () => {
    if (!currentCard) return;
    const cleanInput = dictationInput.trim().toLowerCase();
    const cleanTarget = currentCard.term.trim().toLowerCase();
    const isCorrect = cleanInput === cleanTarget;
    setDictationCorrect(isCorrect);
    setDictationChecked(true);

    if (isCorrect) {
      speakEnglish(currentCard.term);
      setTimeout(() => {
        setReviewedCount(prev => prev + 1);
        setCorrectCount(prev => prev + 1);
        setCurrentIndex(prev => prev + 1);
      }, 1200);
    }
  };

  // Quiz Option Click Handler
  const handleSelectQuizOption = (opt: string) => {
    if (!currentCard || selectedOption !== null) return;
    setSelectedOption(opt);
    const isCorrect = opt === currentCard.meaning_vi;

    setTimeout(() => {
      setReviewedCount(prev => prev + 1);
      if (isCorrect) setCorrectCount(prev => prev + 1);
      setCurrentIndex(prev => prev + 1);
    }, 1200);
  };

  // Keyboard Shortcuts (Desktop) (FR-FC-03, FR-FC-10)
  useEffect(() => {
    if (!isOpen || !currentCard || mode !== 'flashcard') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevCard();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextCard();
      } else if (isFlipped) {
        if (e.key === '1') handleGrade(1);
        else if (e.key === '2') handleGrade(2);
        else if (e.key === '3') handleGrade(3);
        else if (e.key === '4') handleGrade(4);
      }

      if (e.key.toLowerCase() === 'u') {
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentCard, isFlipped, mode, currentIndex, queue.length]);

  if (!isOpen) return null;

  const isCompleted = queue.length > 0 && currentIndex >= queue.length;
  const progressPercent = queue.length > 0 ? Math.min(100, Math.round((currentIndex / queue.length) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col justify-between text-white p-4 select-none">
      {/* Top Header & Session Controls */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between gap-4 py-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              onStudyComplete();
              onClose();
            }}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-white line-clamp-1">
              {currentDeck ? currentDeck.title : 'Tất cả các bộ thẻ'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{direction === 'en_vi' ? 'Anh → Việt' : 'Việt → Anh'}</span>
              <span>·</span>
              <span>Thẻ {Math.min(currentIndex + 1, queue.length)} / {queue.length}</span>
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setMode('flashcard')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              mode === 'flashcard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Flashcard SRS
          </button>
          <button
            onClick={() => setMode('dictation')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              mode === 'dictation' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Nghe Chép
          </button>
          <button
            onClick={() => setMode('quiz')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              mode === 'quiz' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Trắc nghiệm
          </button>
        </div>

        {/* Undo button */}
        <button
          onClick={handleUndo}
          disabled={currentIndex === 0}
          title="Hoàn tác lượt chấm trước (Phím U)"
          className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
        >
          <Undo2 className="w-4 h-4" />
          <span className="hidden sm:inline">Hoàn tác</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="max-w-4xl w-full mx-auto h-1.5 bg-slate-800 rounded-full overflow-hidden my-3">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Study Arena */}
      <div className="flex-1 max-w-2xl w-full mx-auto flex flex-col justify-center items-center my-4">
        {loading ? (
          <div className="text-center py-12">
            <RotateCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Đang chuẩn bị hàng đợi SRS...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 max-w-md">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-300 mb-4">{error}</p>
            <button
              onClick={fetchQueue}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-semibold"
            >
              Thử lại
            </button>
          </div>
        ) : queue.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/40 border border-slate-800 rounded-3xl p-8 max-w-md">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold">Tuyệt vời! Bạn đã hoàn thành hết lượt ôn hôm nay</h3>
            <p className="text-xs text-slate-400 mt-2 mb-6">
              Không còn thẻ nào đến hạn trong bộ này. Bạn có thể thêm từ mới hoặc quay lại vào ngày mai theo lịch SRS.
            </p>
            <button
              onClick={() => {
                onStudyComplete();
                onClose();
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-semibold"
            >
              Quay lại danh sách bộ thẻ
            </button>
          </div>
        ) : isCompleted ? (
          /* Session Completed Summary Screen */
          <div className="text-center py-8 bg-slate-800/60 border border-slate-800 rounded-3xl p-8 max-w-md w-full">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold">Hoàn thành phiên học!</h3>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              Kiến thức của bạn đã được cập nhật vào lịch lặp lại ngắt quãng.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
                <span className="text-2xl font-bold text-blue-400">{reviewedCount}</span>
                <span className="block text-[11px] text-slate-400 mt-0.5">Số thẻ đã ôn</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
                <span className="text-2xl font-bold text-emerald-400">
                  {reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 100}%
                </span>
                <span className="block text-[11px] text-slate-400 mt-0.5">Tỷ lệ nhớ tốt</span>
              </div>
            </div>

            <button
              onClick={() => {
                onStudyComplete();
                onClose();
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-semibold transition-all shadow-sm"
            >
              Xong phiên học
            </button>
          </div>
        ) : mode === 'flashcard' ? (
          /* Flashcard SRS Mode with Next & Back controls */
          <div className="w-full space-y-4">
            <div className="w-full flex items-center justify-center gap-1.5 sm:gap-4">
              {/* Previous Card Button (Always Visible) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevCard();
                }}
                disabled={currentIndex === 0}
                title="Xem lại thẻ trước (Phím ←)"
                className="flex p-2.5 sm:p-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 disabled:opacity-20 disabled:hover:bg-slate-800/90 text-slate-300 hover:text-white transition-all shadow-lg shrink-0 flex-col items-center justify-center gap-1 group cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium hidden sm:inline">Trước</span>
              </button>

              {/* Main Card */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex-1 w-full min-h-[340px] max-h-[500px] bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between cursor-pointer transition-all shadow-2xl relative overflow-hidden group"
              >
                {/* Front Side */}
                {!isFlipped ? (
                  <div className="flex-1 flex flex-col justify-center items-center text-center">
                    <div className="flex items-center gap-2 mb-2">
                      {currentCard.part_of_speech && (
                        <span className="text-xs text-blue-400 font-medium italic">
                          {currentCard.part_of_speech}
                        </span>
                      )}
                      {currentCard.phonetic && (
                        <span className="text-xs text-slate-400 font-mono">
                          {currentCard.phonetic}
                        </span>
                      )}
                    </div>

                    <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight my-2">
                      {direction === 'en_vi' ? currentCard.term : currentCard.meaning_vi}
                    </h2>

                    <div className="flex items-center gap-2 mt-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakEnglish(currentCard.term);
                        }}
                        className="p-2.5 rounded-full bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white transition-all"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 mt-8">
                      Chạm hoặc nhấn <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 text-[10px]">Space</kbd> để lật xem nghĩa
                    </p>
                  </div>
                ) : (
                  /* Back Side */
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-3">
                        <span className="text-sm font-semibold text-slate-400">
                          {currentCard.term} {currentCard.phonetic && `(${currentCard.phonetic})`}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakEnglish(currentCard.term);
                          }}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="text-2xl font-bold text-emerald-400 mb-2">
                        {currentCard.meaning_vi}
                      </h3>

                      {currentCard.definition_en && (
                        <p className="text-sm text-slate-300 mb-3 italic">
                          "{currentCard.definition_en}"
                        </p>
                      )}

                      {currentCard.example && (
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50 text-xs text-slate-200 mb-3">
                          <span className="text-slate-400 font-semibold block mb-0.5">Ví dụ:</span>
                          {currentCard.example}
                        </div>
                      )}

                      {(currentCard.synonyms.length > 0 || currentCard.antonyms.length > 0) && (
                        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                          {currentCard.synonyms.length > 0 && (
                            <span>Đồng nghĩa: <strong className="text-slate-200">{currentCard.synonyms.join(', ')}</strong></span>
                          )}
                          {currentCard.antonyms.length > 0 && (
                            <span>Trái nghĩa: <strong className="text-slate-200">{currentCard.antonyms.join(', ')}</strong></span>
                          )}
                        </div>
                      )}

                      {currentCard.relatedCards && currentCard.relatedCards.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-700/40 text-xs text-slate-400">
                          <span>Từ liên quan trong bộ: </span>
                          <span className="text-blue-400">
                            {currentCard.relatedCards.map(r => r.term).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 text-center">
                      Nhấn <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 text-[10px]">1</kbd>–<kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 text-[10px]">4</kbd> để chấm mức độ ghi nhớ
                    </div>
                  </div>
                )}
              </div>

              {/* Next Card Button (Always Visible) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextCard();
                }}
                disabled={currentIndex >= queue.length - 1}
                title="Xem thẻ tiếp theo (Phím →)"
                className="flex p-2.5 sm:p-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 disabled:opacity-20 disabled:hover:bg-slate-800/90 text-slate-300 hover:text-white transition-all shadow-lg shrink-0 flex-col items-center justify-center gap-1 group cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium hidden sm:inline">Tiếp</span>
              </button>
            </div>

            {/* Quick Navigation Control Bar (Next / Prev / Flip) */}
            <div className="flex items-center justify-between w-full max-w-lg mx-auto px-2 text-xs gap-2">
              <button
                type="button"
                onClick={handlePrevCard}
                disabled={currentIndex === 0}
                className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors font-semibold shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>← Thẻ trước</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <span>{isFlipped ? 'Xem mặt trước' : 'Lật xem nghĩa (Space)'}</span>
              </button>

              <button
                type="button"
                onClick={handleNextCard}
                disabled={currentIndex >= queue.length - 1}
                className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors font-semibold shadow-xs"
              >
                <span>Thẻ tiếp theo →</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : mode === 'dictation' ? (
          /* Dictation Mode (Nghe Chép) */
          <div className="w-full bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 flex flex-col justify-center items-center text-center shadow-2xl">
            <span className="text-xs text-slate-400 uppercase tracking-wider mb-2">
              Nghe phát âm và gõ lại thuật ngữ
            </span>

            <div className="flex items-center gap-3 my-6">
              <button
                type="button"
                onClick={() => speakEnglish(currentCard.term, 0.9)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm"
              >
                <Volume2 className="w-5 h-5" />
                <span>Nghe bình thường</span>
              </button>

              <button
                type="button"
                onClick={() => speakEnglish(currentCard.term, 0.65)}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-2xl text-xs font-semibold flex items-center gap-2"
              >
                <Headphones className="w-4 h-4" />
                <span>Nghe chậm (0.65x)</span>
              </button>
            </div>

            <div className="w-full max-w-md space-y-3">
              <input
                type="text"
                autoFocus
                value={dictationInput}
                onChange={e => setDictationInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCheckDictation();
                }}
                placeholder="Gõ từ bạn vừa nghe..."
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-center text-lg font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />

              {showHint && (
                <p className="text-xs text-amber-400 font-mono">
                  Gợi ý: Bắt đầu bằng chữ "{currentCard.term.charAt(0).toUpperCase()}" ({currentCard.term.length} chữ cái)
                </p>
              )}

              {dictationChecked && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 ${
                  dictationCorrect ? 'bg-emerald-950/60 text-emerald-300' : 'bg-red-950/60 text-red-300'
                }`}>
                  {dictationCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span>
                    {dictationCorrect ? 'Chính xác!' : `Chưa đúng! Đáp án đúng: ${currentCard.term}`}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Hiện gợi ý
                </button>

                <button
                  type="button"
                  onClick={handleCheckDictation}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-semibold text-white"
                >
                  Kiểm tra
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Quiz Mode */
          <div className="w-full bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 flex flex-col justify-center items-center text-center shadow-2xl">
            <span className="text-xs text-slate-400 uppercase tracking-wider mb-2">
              Chọn nghĩa đúng cho thuật ngữ
            </span>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white my-4">
              {currentCard.term}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mt-4">
              {quizOptions.map((opt, oIdx) => {
                const isSelected = selectedOption === opt;
                const isCorrect = opt === currentCard.meaning_vi;

                let btnStyle = 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-750';
                if (selectedOption !== null) {
                  if (isCorrect) btnStyle = 'bg-emerald-600 border-emerald-500 text-white font-bold';
                  else if (isSelected) btnStyle = 'bg-red-600 border-red-500 text-white';
                  else btnStyle = 'opacity-40 bg-slate-900 border-slate-800';
                }

                return (
                  <button
                    key={oIdx}
                    disabled={selectedOption !== null}
                    onClick={() => handleSelectQuizOption(opt)}
                    className={`p-4 rounded-2xl border text-sm text-left transition-all flex items-center justify-between ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {selectedOption !== null && isCorrect && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom SRS 4-Buttons Control (Flashcard Mode only) */}
      {mode === 'flashcard' && isFlipped && currentCard && !isCompleted && (
        <div className="max-w-xl w-full mx-auto grid grid-cols-4 gap-2 pt-2">
          {/* Rating 1: Again */}
          <button
            onClick={() => handleGrade(1)}
            className="p-3 bg-red-600/80 hover:bg-red-600 text-white rounded-2xl flex flex-col items-center justify-center transition-all group"
          >
            <span className="text-xs font-bold">[1] Lại</span>
            <span className="text-[10px] text-red-200 mt-0.5">1 ngày</span>
          </button>

          {/* Rating 2: Hard */}
          <button
            onClick={() => handleGrade(2)}
            className="p-3 bg-amber-600/80 hover:bg-amber-600 text-white rounded-2xl flex flex-col items-center justify-center transition-all group"
          >
            <span className="text-xs font-bold">[2] Khó</span>
            <span className="text-[10px] text-amber-200 mt-0.5">
              {currentCard.srsState?.interval_days ? `${Math.round(currentCard.srsState.interval_days * 1.2)} ngày` : '1 ngày'}
            </span>
          </button>

          {/* Rating 3: Good */}
          <button
            onClick={() => handleGrade(3)}
            className="p-3 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-2xl flex flex-col items-center justify-center transition-all group"
          >
            <span className="text-xs font-bold">[3] Tốt</span>
            <span className="text-[10px] text-emerald-200 mt-0.5">
              {currentCard.srsState?.repetitions === 0 ? '1 ngày' : currentCard.srsState?.repetitions === 1 ? '6 ngày' : `${Math.round((currentCard.srsState?.interval_days || 1) * (currentCard.srsState?.ease_factor || 2.5))} ngày`}
            </span>
          </button>

          {/* Rating 4: Easy */}
          <button
            onClick={() => handleGrade(4)}
            className="p-3 bg-blue-600/80 hover:bg-blue-600 text-white rounded-2xl flex flex-col items-center justify-center transition-all group"
          >
            <span className="text-xs font-bold">[4] Dễ</span>
            <span className="text-[10px] text-blue-200 mt-0.5">
              {currentCard.srsState?.repetitions === 0 ? '4 ngày' : `${Math.round((currentCard.srsState?.interval_days || 1) * (currentCard.srsState?.ease_factor || 2.5) * 1.3)} ngày`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

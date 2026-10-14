import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download, ArrowRight, X, Trash2 } from 'lucide-react';
import { Deck } from '../types';
import { apiRequest } from '../lib/api';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  decks: Deck[];
  onImportSuccess: () => void;
}

interface ParsedRow {
  id: string;
  term: string;
  meaning_vi: string;
  definition_en: string;
  phonetic: string;
  part_of_speech: string;
  synonyms: string;
  antonyms: string;
  example: string;
  group_name: string;
  isValid: boolean;
  errorReason?: string;
  selected: boolean;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  decks,
  onImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'csv' | 'paste'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [targetDeckId, setTargetDeckId] = useState<string>(decks[0]?.id || 'new');
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parseDelimitedText = (text: string, delimiter: string = '\t') => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];

    // Detect if first line is a header
    const firstLineLower = lines[0].toLowerCase();
    const hasHeader = firstLineLower.includes('thuật ngữ') ||
      firstLineLower.includes('term') ||
      firstLineLower.includes('nghĩa') ||
      firstLineLower.includes('meaning') ||
      firstLineLower.includes('word');

    const startIndex = hasHeader ? 1 : 0;
    const rows: ParsedRow[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      // Basic splitting handling quotes or tabs
      let cols: string[] = [];
      if (delimiter === '\t') {
        cols = line.split('\t').map(c => c.trim().replace(/^"|"$/g, ''));
      } else {
        // Simple CSV splitter
        const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
        let match;
        while ((match = regex.exec(line)) !== null && match[0] !== '') {
          let val = match[1] || '';
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1).replace(/""/g, '"');
          }
          cols.push(val.trim());
        }
      }

      if (cols.length === 0 || (!cols[0] && !cols[1])) continue;

      const term = (cols[0] || '').trim();
      const meaning_vi = (cols[1] || '').trim();
      const definition_en = (cols[2] || '').trim();
      const phonetic = (cols[3] || '').trim();
      const part_of_speech = (cols[4] || '').trim();
      const synonyms = (cols[5] || '').trim();
      const antonyms = (cols[6] || '').trim();
      const example = (cols[7] || '').trim();
      const group_name = (cols[8] || '').trim();

      const isValid = !!term && !!meaning_vi;
      let errorReason;
      if (!term) errorReason = 'Thiếu thuật ngữ';
      else if (!meaning_vi) errorReason = 'Thiếu nghĩa tiếng Việt';

      rows.push({
        id: `row_${i}`,
        term,
        meaning_vi,
        definition_en,
        phonetic,
        part_of_speech,
        synonyms,
        antonyms,
        example,
        group_name,
        isValid,
        errorReason,
        selected: isValid,
      });
    }

    return rows;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setGlobalError('File vượt quá kích thước cho phép (tối đa 2MB).');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const delimiter = file.name.endsWith('.tsv') ? '\t' : ',';
      const rows = parseDelimitedText(content, delimiter);
      setParsedRows(rows);
      setStep('preview');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleProcessPasted = () => {
    if (!pastedText.trim()) {
      setGlobalError('Vui lòng dán nội dung từ bảng.');
      return;
    }

    // Determine delimiter: tab or comma
    const delimiter = pastedText.includes('\t') ? '\t' : ',';
    const rows = parseDelimitedText(pastedText, delimiter);
    if (rows.length === 0) {
      setGlobalError('Không tìm thấy dòng dữ liệu nào hợp lệ trong nội dung đã dán.');
      return;
    }

    setParsedRows(rows);
    setStep('preview');
    setGlobalError(null);
  };

  const handleUpdateRow = (id: string, field: keyof ParsedRow, value: string) => {
    setParsedRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        const isValid = !!updated.term.trim() && !!updated.meaning_vi.trim();
        return {
          ...updated,
          isValid,
          errorReason: !updated.term.trim() ? 'Thiếu thuật ngữ' : !updated.meaning_vi.trim() ? 'Thiếu nghĩa tiếng Việt' : undefined,
          selected: isValid,
        };
      })
    );
  };

  const handleRemoveRow = (id: string) => {
    setParsedRows(prev => prev.filter(r => r.id !== id));
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setParsedRows(prev => prev.map(r => (r.isValid ? { ...r, selected: checked } : r)));
  };

  const handleConfirmImport = async () => {
    const selectedRows = parsedRows.filter(r => r.selected && r.isValid);
    if (selectedRows.length === 0) {
      setGlobalError('Vui lòng chọn ít nhất một dòng hợp lệ để nhập.');
      return;
    }

    setLoading(true);
    setGlobalError(null);

    try {
      let finalDeckId = targetDeckId;

      if (targetDeckId === 'new') {
        const titleToUse = newDeckTitle.trim() || `Bộ thẻ nhập ngày ${new Date().toLocaleDateString('vi-VN')}`;
        const newDeckRes = await apiRequest<{ deck: Deck }>('/api/decks', {
          method: 'POST',
          body: JSON.stringify({
            title: titleToUse,
            description: `Nhập từ file ${fileName || 'dán bảng'}`,
            cards: [],
          }),
        });
        finalDeckId = newDeckRes.deck.id;
      }

      // Batch import in chunks of 200 (FR-IM-09)
      const chunkSize = 200;
      for (let i = 0; i < selectedRows.length; i += chunkSize) {
        const chunk = selectedRows.slice(i, i + chunkSize);
        await apiRequest(`/api/decks/${finalDeckId}/cards/batch`, {
          method: 'POST',
          body: JSON.stringify({
            cards: chunk.map(r => ({
              term: r.term,
              meaning_vi: r.meaning_vi,
              definition_en: r.definition_en,
              phonetic: r.phonetic,
              part_of_speech: r.part_of_speech,
              synonyms: r.synonyms,
              antonyms: r.antonyms,
              example: r.example,
              group_name: r.group_name,
            })),
            mode: 'append',
          }),
        });
      }

      onImportSuccess();
      onClose();
    } catch (err: any) {
      setGlobalError(err.message || 'Không thể nhập dữ liệu vào bộ thẻ.');
    } finally {
      setLoading(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;
  const selectedCount = parsedRows.filter(r => r.selected && r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Nhập từ vựng thông minh
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hỗ trợ kéo thả CSV hoặc Copy-Paste trực tiếp từ Excel / Google Sheets
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/import/template"
              download
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải mẫu CSV</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {globalError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{globalError}</span>
            </div>
          )}

          {step === 'input' ? (
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'paste'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Dán từ bảng (Excel / Sheets / Word)</span>
                </button>
                <button
                  onClick={() => setActiveTab('csv')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'csv'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Tải lên file CSV / TSV</span>
                </button>
              </div>

              {activeTab === 'paste' ? (
                <div className="space-y-3">
                  <div className="text-xs text-slate-500">
                    Mẹo: Bạn có thể sao chép các ô từ Excel/Google Sheets (cột 1: Thuật ngữ, cột 2: Nghĩa tiếng Việt, các cột sau: Định nghĩa, Phát âm, Loại từ...) rồi dán vào khung dưới:
                  </div>
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={e => setPastedText(e.target.value)}
                    placeholder={`accept\tchấp nhận\tto receive willingly\t/ækˈsɛpt/\tverb\nacceptable\tcó thể chấp nhận\tsatisfactory\t/ækˈsɛptəbl/\tadj`}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleProcessPasted}
                    disabled={!pastedText.trim()}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  >
                    <span>Phân tích dữ liệu & Xem trước</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center bg-slate-50 dark:bg-slate-800/30">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Chọn hoặc kéo thả file CSV / TSV vào đây
                  </p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    Tối đa 2MB, mã hóa UTF-8
                  </p>
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileUpload}
                    id="file-upload"
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Chọn file từ máy tính</span>
                  </label>
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Table Preview & In-line Fix */
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                <div className="flex items-center gap-4">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Tổng số: <strong className="text-slate-900 dark:text-white">{parsedRows.length}</strong> dòng
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Hợp lệ: <strong>{validCount}</strong>
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-red-500 font-medium">
                      Lỗi: <strong>{invalidCount}</strong>
                    </span>
                  )}
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    Đã chọn để nhập: <strong>{selectedCount}</strong>
                  </span>
                </div>

                <button
                  onClick={() => setStep('input')}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Chọn lại nội dung
                </button>
              </div>

              {/* Destination Deck Selection */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nhập vào bộ thẻ:
                  </label>
                  <select
                    value={targetDeckId}
                    onChange={e => setTargetDeckId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-hidden text-slate-900 dark:text-white"
                  >
                    <option value="new">+ Tạo bộ thẻ mới</option>
                    {decks.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.totalCards || 0} từ)
                      </option>
                    ))}
                  </select>
                </div>

                {targetDeckId === 'new' && (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tên bộ thẻ mới:
                    </label>
                    <input
                      type="text"
                      value={newDeckTitle}
                      onChange={e => setNewDeckTitle(e.target.value)}
                      placeholder="Ví dụ: Từ vựng vừa nhập..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-hidden text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 font-semibold z-10">
                    <tr>
                      <th className="p-2.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCount === validCount && validCount > 0}
                          onChange={e => handleToggleSelectAll(e.target.checked)}
                          className="rounded-sm text-blue-600"
                        />
                      </th>
                      <th className="p-2.5 min-w-[140px]">Thuật ngữ *</th>
                      <th className="p-2.5 min-w-[160px]">Nghĩa tiếng Việt *</th>
                      <th className="p-2.5 min-w-[80px]">Loại từ</th>
                      <th className="p-2.5 min-w-[100px]">Phát âm</th>
                      <th className="p-2.5 w-12 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedRows.map(row => (
                      <tr
                        key={row.id}
                        className={
                          !row.isValid
                            ? 'bg-red-50/40 dark:bg-red-950/20'
                            : row.selected
                            ? 'bg-blue-50/20 dark:bg-blue-950/10'
                            : ''
                        }
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            disabled={!row.isValid}
                            onChange={e => {
                              setParsedRows(prev =>
                                prev.map(r => (r.id === row.id ? { ...r, selected: e.target.checked } : r))
                              );
                            }}
                            className="rounded-sm text-blue-600"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.term}
                            onChange={e => handleUpdateRow(row.id, 'term', e.target.value)}
                            placeholder="Thuật ngữ"
                            className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.meaning_vi}
                            onChange={e => handleUpdateRow(row.id, 'meaning_vi', e.target.value)}
                            placeholder="Nghĩa tiếng Việt"
                            className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.part_of_speech}
                            onChange={e => handleUpdateRow(row.id, 'part_of_speech', e.target.value)}
                            placeholder="noun/verb..."
                            className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.phonetic}
                            onChange={e => handleUpdateRow(row.id, 'phonetic', e.target.value)}
                            placeholder="IPA"
                            className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleRemoveRow(row.id)}
                            className="text-slate-400 hover:text-red-500 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={loading || selectedCount === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'Đang nhập...' : `Xác nhận nhập ${selectedCount} từ vựng`}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

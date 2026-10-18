import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TimelineCue } from '../../types/timeline';
import {
  generateWordToMouthReport,
  generateDetailedCueTimings,
  exportWordToMouthCsv,
  exportDetailedCuesCsv,
  exportWordToMouthJson,
  exportDetailedCuesJson,
  downloadLipSyncReportFile,
  WordMouthReportEntry,
  DetailedCueEntry,
} from '../../services/export/lipSyncReportExporter';
import {
  FileSpreadsheet,
  FileCode,
  Download,
  Search,
  Check,
  Copy,
  Layers,
  ListOrdered,
  Sparkles,
} from 'lucide-react';

export interface LipSyncReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cues: TimelineCue[];
  scriptText?: string;
  projectName?: string;
  duration?: number;
}

export const LipSyncReportModal: React.FC<LipSyncReportModalProps> = ({
  isOpen,
  onClose,
  cues,
  scriptText = '',
  projectName = 'cartoon-speaks',
  duration = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'words' | 'cues'>('words');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Generate the reports
  const wordReport: WordMouthReportEntry[] = useMemo(
    () => generateWordToMouthReport(cues, scriptText),
    [cues, scriptText]
  );

  const cuesReport: DetailedCueEntry[] = useMemo(
    () => generateDetailedCueTimings(cues),
    [cues]
  );

  // Filtered entries
  const filteredWordReport = useMemo(() => {
    if (!searchQuery.trim()) return wordReport;
    const q = searchQuery.toLowerCase();
    return wordReport.filter(
      (entry) =>
        entry.spokenText.toLowerCase().includes(q) ||
        entry.shapeSequence.toLowerCase().includes(q) ||
        entry.alignmentSource.toLowerCase().includes(q)
    );
  }, [wordReport, searchQuery]);

  const filteredCuesReport = useMemo(() => {
    if (!searchQuery.trim()) return cuesReport;
    const q = searchQuery.toLowerCase();
    return cuesReport.filter(
      (entry) =>
        entry.mouthShape.toLowerCase().includes(q) ||
        entry.associatedWord.toLowerCase().includes(q) ||
        entry.alignmentSource.toLowerCase().includes(q)
    );
  }, [cuesReport, searchQuery]);

  // Export handlers
  const handleExportWordCsv = () => {
    const csv = exportWordToMouthCsv(wordReport);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadLipSyncReportFile(
      csv,
      `${projectName}_word-to-mouth-report_${dateStr}.csv`,
      'text/csv;charset=utf-8;'
    );
  };

  const handleExportDetailedCsv = () => {
    const csv = exportDetailedCuesCsv(cuesReport);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadLipSyncReportFile(
      csv,
      `${projectName}_detailed-cue-timings_${dateStr}.csv`,
      'text/csv;charset=utf-8;'
    );
  };

  const handleExportWordJson = () => {
    const json = exportWordToMouthJson(wordReport, {
      projectName,
      scriptText,
      totalDurationSeconds: duration,
      cuesCount: cues.length,
    });
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadLipSyncReportFile(
      json,
      `${projectName}_word-to-mouth-report_${dateStr}.json`,
      'application/json;charset=utf-8;'
    );
  };

  const handleExportDetailedJson = () => {
    const json = exportDetailedCuesJson(cuesReport, {
      projectName,
      scriptText,
      totalDurationSeconds: duration,
      cuesCount: cues.length,
    });
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadLipSyncReportFile(
      json,
      `${projectName}_detailed-cue-timings_${dateStr}.json`,
      'application/json;charset=utf-8;'
    );
  };

  const handleCopyClipboard = async (type: 'csv-word' | 'csv-cues') => {
    const text =
      type === 'csv-word'
        ? exportWordToMouthCsv(wordReport)
        : exportDetailedCuesCsv(cuesReport);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.warn('Clipboard write failed', err);
    }
  };

  const renderShapeBadge = (shape: string) => {
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-300';
    if (['A', 'C', 'E'].includes(shape)) {
      colorClass = 'bg-amber-100 text-amber-800 border-amber-300'; // Open vowels
    } else if (['B', 'X'].includes(shape)) {
      colorClass = 'bg-blue-100 text-blue-800 border-blue-300'; // Closed lips / Rest
    } else if (['D', 'F', 'G', 'H'].includes(shape)) {
      colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-300'; // Consonants
    } else {
      colorClass = 'bg-purple-100 text-purple-800 border-purple-300'; // Custom shapes
    }

    return (
      <span
        key={shape}
        className={`inline-flex items-center justify-center font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border ${colorClass}`}
      >
        {shape}
      </span>
    );
  };

  const renderSourceBadge = (source: string) => {
    let color = 'bg-slate-50 text-slate-500 border-slate-200';
    let label = source;

    if (source === 'dictionary') {
      color = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
      label = 'Dictionary';
    } else if (source === 'phoneme-rule') {
      color = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold';
      label = 'Phoneme Rule';
    } else if (source === 'rhubarb') {
      color = 'bg-purple-50 text-purple-700 border-purple-200 font-semibold';
      label = 'Rhubarb';
    } else if (source === 'manual') {
      color = 'bg-sky-50 text-sky-700 border-sky-200 font-semibold';
      label = 'Manual';
    } else if (source === 'heuristic-fallback') {
      color = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
      label = 'Fallback';
    } else if (source === 'heuristic') {
      color = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
      label = 'Heuristic';
    }

    return (
      <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider ${color}`}>
        {label}
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lip-Sync Articulation & Timing Report"
      description="Inspect exactly which mouth shapes are assigned to each spoken word, evaluate articulation sequence, and export CSV/JSON for debugging."
      maxWidth="6xl"
    >
      <div className="space-y-4">
        {/* Quick Stats & Export Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <div>
              <span className="font-semibold text-slate-900">{wordReport.length}</span>{' '}
              <span className="text-slate-500">spoken words</span>
            </div>
            <div className="h-4 w-px bg-slate-300" />
            <div>
              <span className="font-semibold text-slate-900">{cues.length}</span>{' '}
              <span className="text-slate-500">mouth cues</span>
            </div>
            <div className="h-4 w-px bg-slate-300" />
            <div>
              <span className="font-semibold text-slate-900">{duration.toFixed(2)}s</span>{' '}
              <span className="text-slate-500">duration</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />}
              onClick={handleExportWordCsv}
              title="Download Word-to-Mouth Articulation Report in CSV format"
            >
              Export Word-to-Mouth (CSV)
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5 text-slate-600" />}
              onClick={handleExportDetailedCsv}
              title="Download Detailed Cue Timings in CSV format"
            >
              Export Detailed Cues (CSV)
            </Button>

            <div className="flex items-center gap-1 border-l border-slate-300 pl-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<FileCode className="w-3.5 h-3.5 text-indigo-600" />}
                onClick={activeTab === 'words' ? handleExportWordJson : handleExportDetailedJson}
                title="Export active view as JSON"
              >
                JSON
              </Button>

              <button
                onClick={() => handleCopyClipboard(activeTab === 'words' ? 'csv-word' : 'csv-cues')}
                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                title="Copy CSV to clipboard"
              >
                {copiedType ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('words')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'words'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Word-to-Mouth Report ({wordReport.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('cues')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'cues'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Detailed Cue Timings ({cuesReport.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search words, shapes, sources..."
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto max-h-[50vh] overflow-y-auto border border-slate-200 rounded-xl">
          {activeTab === 'words' ? (
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-slate-100 text-[11px] font-semibold text-slate-600 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 w-10 text-center">#</th>
                  <th className="py-2 px-3">Spoken Word</th>
                  <th className="py-2 px-3">Inferred Phonemes</th>
                  <th className="py-2 px-3">Mouth Shapes Sequence</th>
                  <th className="py-2 px-3">Start (s)</th>
                  <th className="py-2 px-3">End (s)</th>
                  <th className="py-2 px-3">Duration</th>
                  <th className="py-2 px-3">Shape Count</th>
                  <th className="py-2 px-3">Breakdown (ms)</th>
                  <th className="py-2 px-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredWordReport.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 font-sans">
                      No word-to-mouth cues matched your search.
                    </td>
                  </tr>
                ) : (
                  filteredWordReport.map((row) => (
                    <tr
                      key={`word-${row.wordIndex}-${row.spokenText}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-sans">
                        {row.wordIndex}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 font-sans">
                        {row.spokenText}
                      </td>
                      <td className="py-2 px-3 text-[10px] text-slate-600 font-sans">
                        {row.phonemes ? (
                          <div className="flex flex-col">
                            <span className="font-mono text-indigo-700 font-medium">{row.phonemes}</span>
                            {row.ipa && <span className="text-slate-400 font-serif">/{row.ipa}/</span>}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {row.shapes.map((s, idx) => (
                            <React.Fragment key={idx}>
                              {idx > 0 && <span className="text-slate-300 text-[9px] font-sans">→</span>}
                              {renderShapeBadge(s)}
                            </React.Fragment>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{row.startTime.toFixed(3)}s</td>
                      <td className="py-2 px-3 text-slate-600">{row.endTime.toFixed(3)}s</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{row.durationMs}ms</td>
                      <td className="py-2 px-3 text-slate-600">{row.shapeCount}</td>
                      <td className="py-2 px-3 text-[10px] text-slate-500 max-w-xs truncate" title={row.shapesDetail}>
                        {row.shapesDetail}
                      </td>
                      <td className="py-2 px-3 font-sans">{renderSourceBadge(row.alignmentSource)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-slate-100 text-[11px] font-semibold text-slate-600 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 w-10 text-center">#</th>
                  <th className="py-2 px-3">Start (s)</th>
                  <th className="py-2 px-3">End (s)</th>
                  <th className="py-2 px-3">Duration (ms)</th>
                  <th className="py-2 px-3">Mouth Shape</th>
                  <th className="py-2 px-3">Phoneme / IPA</th>
                  <th className="py-2 px-3">Associated Word</th>
                  <th className="py-2 px-3">Alignment Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredCuesReport.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                      No timeline cues matched your search.
                    </td>
                  </tr>
                ) : (
                  filteredCuesReport.map((row) => (
                    <tr
                      key={`cue-${row.cueIndex}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-sans">
                        {row.cueIndex}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{row.startTime.toFixed(3)}s</td>
                      <td className="py-2 px-3 text-slate-600">{row.endTime.toFixed(3)}s</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{row.durationMs}ms</td>
                      <td className="py-2 px-3">{renderShapeBadge(row.mouthShape)}</td>
                      <td className="py-2 px-3 text-[10px] font-mono text-slate-600">
                        {row.phoneme ? (
                          <span>
                            <span className="text-indigo-700">{row.phoneme}</span>{' '}
                            {row.ipa && <span className="text-slate-400 font-serif">[{row.ipa}]</span>}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 font-sans">
                        {row.associatedWord}
                      </td>
                      <td className="py-2 px-3 font-sans">{renderSourceBadge(row.alignmentSource)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer / Helper Tip */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              Tip: Use this report to verify that closed sounds (B, M, P) match shape <strong>B</strong>, and open vowels match shapes <strong>A, C, D, E</strong>.
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

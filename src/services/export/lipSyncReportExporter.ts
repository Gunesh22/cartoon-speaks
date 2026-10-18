import { TimelineCue, CueAlignmentSource } from '../../types/timeline';

export interface WordMouthReportEntry {
  wordIndex: number;
  spokenText: string;
  shapeSequence: string; // e.g. "A -> D -> B"
  shapes: string[];      // e.g. ["A", "D", "B"]
  phonemes?: string;     // e.g. "s-w-aa-g-t"
  ipa?: string;          // e.g. "sʋɑːɡt̪"
  startTime: number;     // in seconds
  endTime: number;       // in seconds
  durationMs: number;    // in milliseconds
  shapeCount: number;
  shapesDetail: string;  // e.g. "A:80ms | D:150ms | B:100ms"
  alignmentSource: CueAlignmentSource;
  cues: Array<{
    shape: string;
    phoneme?: string;
    ipa?: string;
    start: number;
    end: number;
    durationMs: number;
    source: string;
  }>;
}

export interface DetailedCueEntry {
  cueIndex: number;
  startTime: number;
  endTime: number;
  durationMs: number;
  mouthShape: string;
  phoneme?: string;
  ipa?: string;
  associatedWord: string;
  alignmentSource: CueAlignmentSource;
}

/**
 * Escapes a cell value for standard RFC 4180 CSV compliance.
 */
function escapeCsv(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Groups timeline cues by actual spoken words while preserving exact mouth shapes,
 * timestamps, and alignment sources.
 */
export function generateWordToMouthReport(
  cues: TimelineCue[],
  scriptText?: string
): WordMouthReportEntry[] {
  if (!cues || cues.length === 0) return [];

  const sorted = [...cues].sort((a, b) => a.start - b.start);
  const wordsFromScript = scriptText
    ? scriptText
        .trim()
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0)
    : [];

  const entries: WordMouthReportEntry[] = [];
  let currentGroup: TimelineCue[] = [];
  let currentWordLabel: string | null = null;
  let wordCounter = 1;
  let scriptWordIndex = 0;

  const flushGroup = () => {
    if (currentGroup.length === 0) return;

    const first = currentGroup[0];
    const last = currentGroup[currentGroup.length - 1];
    const startTime = first.start;
    const endTime = last.end;
    const durationMs = Math.round((endTime - startTime) * 1000);

    const shapes = currentGroup.map((c) => c.shape);
    const shapeSequence = shapes.join(' -> ');

    const shapesDetail = currentGroup
      .map((c) => `${c.shape}:${Math.round((c.end - c.start) * 1000)}ms`)
      .join(' | ');

    // Determine primary alignment source
    const sources = currentGroup.map((c) => c.source || 'unknown');
    const primarySource: CueAlignmentSource =
      sources.includes('manual')
        ? 'manual'
        : sources.includes('rhubarb')
        ? 'rhubarb'
        : sources.includes('dictionary')
        ? 'dictionary'
        : sources.includes('phoneme-rule')
        ? 'phoneme-rule'
        : sources.includes('heuristic-fallback')
        ? 'heuristic-fallback'
        : sources.includes('heuristic')
        ? 'heuristic'
        : 'unknown';

    // Gather distinct phonemes and IPA from cues
    const phonemesList = currentGroup
      .map((c) => c.phoneme)
      .filter((p): p is string => Boolean(p) && p !== 'silence' && p !== 'pause');
    const phonemesStr = phonemesList.length > 0 ? Array.from(new Set(phonemesList)).join(', ') : undefined;

    const ipaList = currentGroup
      .map((c) => c.ipa)
      .filter((ip): ip is string => Boolean(ip) && ip !== 'x');
    const ipaStr = ipaList.length > 0 ? Array.from(new Set(ipaList)).join('') : undefined;

    let displayLabel = currentWordLabel || '[Unknown]';
    if (displayLabel.toLowerCase() === 'pause') displayLabel = '[Pause]';
    if (displayLabel.toLowerCase() === 'silence') displayLabel = '[Silence]';

    entries.push({
      wordIndex: wordCounter++,
      spokenText: displayLabel,
      shapeSequence,
      shapes,
      phonemes: phonemesStr,
      ipa: ipaStr,
      startTime: Number(startTime.toFixed(3)),
      endTime: Number(endTime.toFixed(3)),
      durationMs,
      shapeCount: shapes.length,
      shapesDetail,
      alignmentSource: primarySource,
      cues: currentGroup.map((c) => ({
        shape: c.shape,
        phoneme: c.phoneme,
        ipa: c.ipa,
        start: Number(c.start.toFixed(3)),
        end: Number(c.end.toFixed(3)),
        durationMs: Math.round((c.end - c.start) * 1000),
        source: c.source || 'unknown',
      })),
    });

    currentGroup = [];
    currentWordLabel = null;
  };

  for (let i = 0; i < sorted.length; i++) {
    const cue = sorted[i];
    const isSilence = cue.shape.toUpperCase() === 'X' || cue.text === 'pause' || cue.text === 'silence';

    // If cue has explicit text (from phonetic aligner)
    let cueLabel: string;
    if (cue.text) {
      cueLabel = cue.text;
    } else if (isSilence) {
      cueLabel = '[Pause]';
    } else if (wordsFromScript.length > 0 && scriptWordIndex < wordsFromScript.length) {
      // If no cue text is saved on the cue (e.g. Rhubarb import), associate with script word chronologically
      cueLabel = wordsFromScript[scriptWordIndex];
    } else {
      cueLabel = '[Unknown]';
    }

    if (currentGroup.length === 0) {
      currentGroup.push(cue);
      currentWordLabel = cueLabel;
    } else {
      // Check if this cue belongs to the same word
      const sameWord = !isSilence && currentWordLabel === cueLabel && currentWordLabel !== '[Unknown]';

      if (sameWord) {
        currentGroup.push(cue);
      } else {
        // Word boundary reached: flush current word and start next
        if (!isSilence && currentWordLabel && currentWordLabel !== '[Pause]' && currentWordLabel !== '[Silence]') {
          scriptWordIndex++;
        }
        flushGroup();
        currentGroup.push(cue);
        currentWordLabel = cueLabel;
      }
    }
  }

  flushGroup();
  return entries;
}

/**
 * Builds detailed cue timings for every individual timeline cue.
 */
export function generateDetailedCueTimings(
  cues: TimelineCue[]
): DetailedCueEntry[] {
  if (!cues || cues.length === 0) return [];

  const sorted = [...cues].sort((a, b) => a.start - b.start);

  return sorted.map((cue, idx) => {
    let wordLabel = cue.text || '';
    if (!wordLabel) {
      wordLabel = cue.shape.toUpperCase() === 'X' ? '[Pause]' : '[Unknown]';
    } else if (wordLabel.toLowerCase() === 'pause') {
      wordLabel = '[Pause]';
    } else if (wordLabel.toLowerCase() === 'silence') {
      wordLabel = '[Silence]';
    }

    return {
      cueIndex: idx + 1,
      startTime: Number(cue.start.toFixed(3)),
      endTime: Number(cue.end.toFixed(3)),
      durationMs: Math.round((cue.end - cue.start) * 1000),
      mouthShape: cue.shape,
      phoneme: cue.phoneme,
      ipa: cue.ipa,
      associatedWord: wordLabel,
      alignmentSource: (cue.source || 'unknown') as CueAlignmentSource,
    };
  });
}

/**
 * Serializes Word-to-Mouth report to CSV string with schema:
 * word_index,spoken_text,inferred_phonemes,ipa,shape_sequence,start_time_s,end_time_s,total_duration_ms,shape_count,shapes_detail,alignment_source
 */
export function exportWordToMouthCsv(report: WordMouthReportEntry[]): string {
  const headers = [
    'word_index',
    'spoken_text',
    'inferred_phonemes',
    'ipa',
    'shape_sequence',
    'start_time_s',
    'end_time_s',
    'total_duration_ms',
    'shape_count',
    'shapes_detail',
    'alignment_source',
  ];

  const rows = report.map((entry) => [
    entry.wordIndex,
    escapeCsv(entry.spokenText),
    escapeCsv(entry.phonemes || ''),
    escapeCsv(entry.ipa || ''),
    escapeCsv(entry.shapeSequence),
    entry.startTime.toFixed(3),
    entry.endTime.toFixed(3),
    entry.durationMs,
    entry.shapeCount,
    escapeCsv(entry.shapesDetail),
    escapeCsv(entry.alignmentSource),
  ]);

  // Prepend UTF-8 BOM so Excel and other spreadsheet editors parse UTF-8 cleanly
  return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Serializes Detailed Cue Timings to CSV string with schema:
 * cue_index,start_time_s,end_time_s,duration_ms,mouth_shape,phoneme,ipa,associated_word,alignment_source
 */
export function exportDetailedCuesCsv(cuesReport: DetailedCueEntry[]): string {
  const headers = [
    'cue_index',
    'start_time_s',
    'end_time_s',
    'duration_ms',
    'mouth_shape',
    'phoneme',
    'ipa',
    'associated_word',
    'alignment_source',
  ];

  const rows = cuesReport.map((entry) => [
    entry.cueIndex,
    entry.startTime.toFixed(3),
    entry.endTime.toFixed(3),
    entry.durationMs,
    escapeCsv(entry.mouthShape),
    escapeCsv(entry.phoneme || ''),
    escapeCsv(entry.ipa || ''),
    escapeCsv(entry.associatedWord),
    escapeCsv(entry.alignmentSource),
  ]);

  return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export interface LipSyncReportMetadata {
  projectName?: string;
  audioDuration?: number;
  totalDurationSeconds?: number;
  scriptText?: string;
  cuesCount?: number;
  [key: string]: unknown;
}

/**
 * Serializes Word-to-Mouth report to JSON string.
 */
export function exportWordToMouthJson(
  report: WordMouthReportEntry[],
  metadata?: LipSyncReportMetadata
): string {
  const duration = metadata?.audioDuration ?? metadata?.totalDurationSeconds ?? 0;
  const payload = {
    exportedAt: new Date().toISOString(),
    projectName: metadata?.projectName || 'Cartoon Speaks',
    scriptText: metadata?.scriptText || '',
    audioDuration: duration,
    totalWords: report.filter((r) => r.spokenText !== '[Pause]' && r.spokenText !== '[Silence]').length,
    totalEntries: report.length,
    words: report,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Serializes Detailed Cue Timings to JSON string.
 */
export function exportDetailedCuesJson(
  cuesReport: DetailedCueEntry[],
  metadata?: LipSyncReportMetadata
): string {
  const duration = metadata?.audioDuration ?? metadata?.totalDurationSeconds ?? 0;
  const payload = {
    exportedAt: new Date().toISOString(),
    projectName: metadata?.projectName || 'Cartoon Speaks',
    scriptText: metadata?.scriptText || '',
    audioDuration: duration,
    totalCues: cuesReport.length,
    cues: cuesReport,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Browser-side direct download helper for CSV or JSON files.
 */
export function downloadLipSyncReportFile(
  content: string,
  filename: string,
  mimeType: 'text/csv' | 'application/json' | string = 'text/csv'
): void {
  const typeStr = mimeType.startsWith('text/csv')
    ? 'text/csv;charset=utf-8;'
    : mimeType.startsWith('application/json')
    ? 'application/json;charset=utf-8;'
    : mimeType;

  const blob = new Blob([content], {
    type: typeStr,
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

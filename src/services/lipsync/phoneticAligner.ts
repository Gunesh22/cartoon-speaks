import { TimelineCue, CueWarning } from '../../types/timeline';
import { generateId } from '../../utils/ids';
import { LipSyncTuningSettings } from '../../types/timeline';

export interface PhonemeViseme {
  shape: string; // Rhubarb shapes: X, A, B, C, D, E, F, G, H, O
  weight: number; // Proportion of the word duration (0.0 to 1.0)
}

/**
 * High-frequency dictionary mapping common spoken words (English & multilingual transliteration)
 * to natural, articulatory viseme shapes.
 *
 * Rhubarb viseme definitions:
 * - A: Closed mouth, lips pressed together (M, B, P).
 * - B: Slightly open with teeth showing (EE, D, S, T, N, Z).
 * - C: Open mouth with relaxed lips (EH, AE, K, G).
 * - D: Wide open mouth (AA, AH, AY).
 * - E: Slightly rounded open mouth (AO, ER, O).
 * - F: Upper teeth on lower lip (F, V).
 * - G: Smile with teeth showing (CH, J, SH).
 * - H: Open mouth with tongue raised (TH, L).
 * - O: Small rounded / pursed opening (W, Q, OO, U).
 * - X: Rest / Neutral idle shape (Silence, pause).
 */
const COMMON_WORD_VISEMES: Record<string, PhonemeViseme[]> = {
  // Common conversational English
  hi: [
    { shape: 'D', weight: 0.60 }, // Open vowel /aɪ/
    { shape: 'C', weight: 0.40 }, // Smiling off-glide /i/
  ],
  hello: [
    { shape: 'C', weight: 0.20 },
    { shape: 'D', weight: 0.30 },
    { shape: 'H', weight: 0.20 },
    { shape: 'E', weight: 0.30 }, // Open rounded /oʊ/
  ],
  hey: [
    { shape: 'C', weight: 0.30 },
    { shape: 'D', weight: 0.70 },
  ],
  my: [
    { shape: 'A', weight: 0.35 }, // Bilabial /m/ (lips pressed together)
    { shape: 'D', weight: 0.65 }, // Open vowel /aɪ/
  ],
  me: [
    { shape: 'A', weight: 0.35 }, // M closure
    { shape: 'C', weight: 0.65 }, // E vowel
  ],
  name: [
    { shape: 'B', weight: 0.25 }, // Alveolar /n/
    { shape: 'C', weight: 0.45 }, // Vowel /eɪ/
    { shape: 'A', weight: 0.30 }, // Bilabial /m/ closure (lips closed!)
  ],
  is: [
    { shape: 'C', weight: 0.55 }, // Vowel /ɪ/
    { shape: 'B', weight: 0.45 }, // Sibilant /z/
  ],
  it: [
    { shape: 'C', weight: 0.55 },
    { shape: 'B', weight: 0.45 },
  ],
  i: [
    { shape: 'D', weight: 0.60 },
    { shape: 'C', weight: 0.40 },
  ],
  am: [
    { shape: 'D', weight: 0.55 },
    { shape: 'A', weight: 0.45 }, // M closure
  ],
  you: [
    { shape: 'C', weight: 0.25 },
    { shape: 'O', weight: 0.75 }, // Pursed /uː/
  ],
  your: [
    { shape: 'C', weight: 0.25 },
    { shape: 'E', weight: 0.75 },
  ],
  the: [
    { shape: 'H', weight: 0.35 }, // TH
    { shape: 'C', weight: 0.65 },
  ],
  this: [
    { shape: 'H', weight: 0.25 },
    { shape: 'C', weight: 0.45 },
    { shape: 'B', weight: 0.30 },
  ],
  that: [
    { shape: 'H', weight: 0.25 },
    { shape: 'D', weight: 0.50 },
    { shape: 'B', weight: 0.25 },
  ],
  to: [
    { shape: 'B', weight: 0.30 },
    { shape: 'O', weight: 0.70 },
  ],
  and: [
    { shape: 'D', weight: 0.55 },
    { shape: 'B', weight: 0.45 },
  ],
  a: [{ shape: 'D', weight: 1.0 }],
  an: [
    { shape: 'D', weight: 0.60 },
    { shape: 'B', weight: 0.40 },
  ],
  are: [{ shape: 'D', weight: 1.0 }],
  welcome: [
    { shape: 'O', weight: 0.20 }, // W
    { shape: 'C', weight: 0.25 }, // E
    { shape: 'H', weight: 0.15 }, // L
    { shape: 'C', weight: 0.15 }, // C
    { shape: 'A', weight: 0.25 }, // M closure
  ],
  yes: [
    { shape: 'C', weight: 0.25 },
    { shape: 'C', weight: 0.45 },
    { shape: 'B', weight: 0.30 },
  ],
  no: [
    { shape: 'B', weight: 0.30 },
    { shape: 'E', weight: 0.70 },
  ],
  what: [
    { shape: 'O', weight: 0.30 },
    { shape: 'D', weight: 0.45 },
    { shape: 'B', weight: 0.25 },
  ],
  how: [
    { shape: 'C', weight: 0.25 },
    { shape: 'E', weight: 0.75 },
  ],
  good: [
    { shape: 'C', weight: 0.25 },
    { shape: 'O', weight: 0.50 },
    { shape: 'B', weight: 0.25 },
  ],
  fine: [
    { shape: 'F', weight: 0.30 }, // Labiodental /f/ (teeth on lip)
    { shape: 'D', weight: 0.45 },
    { shape: 'B', weight: 0.25 },
  ],
  very: [
    { shape: 'F', weight: 0.30 }, // Labiodental /v/ (teeth on lip)
    { shape: 'C', weight: 0.40 },
    { shape: 'C', weight: 0.30 },
  ],
  nice: [
    { shape: 'B', weight: 0.25 },
    { shape: 'D', weight: 0.50 },
    { shape: 'B', weight: 0.25 },
  ],
  meet: [
    { shape: 'A', weight: 0.30 }, // M closure
    { shape: 'C', weight: 0.50 },
    { shape: 'B', weight: 0.20 },
  ],

  // Specific phrases & Indian/South Asian vocabulary
  happy: [
    { shape: 'B', weight: 0.15 }, // H onset
    { shape: 'D', weight: 0.35 }, // Open vowel /æ/
    { shape: 'A', weight: 0.25 }, // Closed lips /p/ (bilabial)
    { shape: 'C', weight: 0.25 }, // Smiling off-glide /i/
  ],
  thoughts: [
    { shape: 'H', weight: 0.25 }, // Tongue behind teeth /θ/
    { shape: 'E', weight: 0.45 }, // Open rounded /ɔː/
    { shape: 'B', weight: 0.30 }, // Sibilant /ts/
  ],
  thought: [
    { shape: 'H', weight: 0.30 },
    { shape: 'E', weight: 0.50 },
    { shape: 'B', weight: 0.20 },
  ],
  manan: [
    { shape: 'A', weight: 0.20 }, // M (closed lips)
    { shape: 'D', weight: 0.30 }, // Open vowel /ʌ/
    { shape: 'B', weight: 0.20 }, // N dental
    { shape: 'D', weight: 0.20 }, // Open vowel /ʌ/
    { shape: 'B', weight: 0.10 }, // N closure
  ],
  ashram: [
    { shape: 'D', weight: 0.25 }, // Open vowel /ɑː/
    { shape: 'G', weight: 0.25 }, // SH sibilant (teeth smile)
    { shape: 'C', weight: 0.15 }, // R liquid
    { shape: 'D', weight: 0.15 }, // A vowel
    { shape: 'A', weight: 0.20 }, // M (closed lips)
  ],
  par: [
    { shape: 'A', weight: 0.30 }, // P (closed lips)
    { shape: 'D', weight: 0.45 }, // A open vowel
    { shape: 'B', weight: 0.25 }, // R dental/flap
  ],
  aapka: [
    { shape: 'D', weight: 0.35 }, // AA long open vowel
    { shape: 'A', weight: 0.25 }, // P (closed lips)
    { shape: 'C', weight: 0.15 }, // K velar
    { shape: 'D', weight: 0.25 }, // A vowel
  ],
  apka: [
    { shape: 'D', weight: 0.35 },
    { shape: 'A', weight: 0.25 },
    { shape: 'C', weight: 0.15 },
    { shape: 'D', weight: 0.25 },
  ],
  swagat: [
    { shape: 'B', weight: 0.15 }, // S dental
    { shape: 'O', weight: 0.20 }, // W rounded lips
    { shape: 'D', weight: 0.30 }, // A open vowel
    { shape: 'C', weight: 0.15 }, // G velar
    { shape: 'B', weight: 0.20 }, // T dental stop
  ],
  hai: [
    { shape: 'C', weight: 0.25 }, // H aspirate
    { shape: 'D', weight: 0.45 }, // AI open
    { shape: 'C', weight: 0.30 }, // Off-glide
  ],
  ho: [
    { shape: 'C', weight: 0.25 },
    { shape: 'E', weight: 0.75 },
  ],
  namaste: [
    { shape: 'B', weight: 0.15 }, // N
    { shape: 'D', weight: 0.25 }, // A
    { shape: 'A', weight: 0.20 }, // M (closed lips)
    { shape: 'D', weight: 0.20 }, // A
    { shape: 'B', weight: 0.10 }, // S/T
    { shape: 'C', weight: 0.10 }, // E
  ],
  dhanyavad: [
    { shape: 'H', weight: 0.20 }, // DH
    { shape: 'D', weight: 0.25 }, // A
    { shape: 'B', weight: 0.15 }, // N
    { shape: 'F', weight: 0.20 }, // V (teeth on lip)
    { shape: 'D', weight: 0.20 }, // D
  ],
};

/**
 * Phonetically decomposes any spoken word or transliterated name into syllable-based visemes.
 * Models physical speech articulators:
 * - Bilabial consonants (M, B, P) press lips together ('A').
 * - Labiodental consonants (F, V, PH) place upper teeth on lower lip ('F').
 * - Sibilants & affricates (SH, CH, J) show teeth with a smile ('G').
 * - Tongue behind teeth (TH, L) raise tongue ('H').
 * - Rounded lips / glides (W, QU, U, OO) purse mouth ('O').
 * - Dentals / stops (T, D, S, Z, N, R) narrow mouth with teeth visible ('B').
 * - Open vowels (AA, AH, A) open wide ('D').
 * - Smile vowels (EE, I, E, Y) open in a relaxed smile ('C').
 * - Rounded open vowels (O, AO, AW) open with rounded lips ('E').
 */
export function extractWordVisemes(rawWord: string): PhonemeViseme[] {
  const word = rawWord.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return [{ shape: 'X', weight: 1.0 }];

  // 1. Direct dictionary match
  if (COMMON_WORD_VISEMES[word]) {
    return COMMON_WORD_VISEMES[word];
  }

  // 2. Rule-based syllable and phoneme extraction
  const visemes: PhonemeViseme[] = [];
  let i = 0;
  const len = word.length;

  while (i < len) {
    const ch = word[i];
    const next = word[i + 1] || '';

    // Silent final 'e' check (e.g. 'name', 'make', 'like', 'code')
    if (ch === 'e' && i === len - 1 && i >= 2 && !'aeiou'.includes(word[i - 1])) {
      i++;
      continue;
    }

    // Bilabial consonants (M, P, B): lips closed together ('A')
    if (ch === 'm' || ch === 'p' || ch === 'b') {
      // If double consonant (e.g. 'pp', 'bb', 'mm'), advance past both
      const skip = (next === ch) ? 2 : 1;
      visemes.push({ shape: 'A', weight: 0.28 });
      i += skip;
      continue;
    }

    // Labiodental consonants (F, V, PH): upper teeth on lower lip ('F')
    if (ch === 'f' || ch === 'v' || (ch === 'p' && next === 'h')) {
      const skip = (ch === 'p' && next === 'h') ? 2 : (next === ch ? 2 : 1);
      visemes.push({ shape: 'F', weight: 0.25 });
      i += skip;
      continue;
    }

    // Sibilants and affricates (SH, CH, J, ZH): smile with teeth showing ('G')
    if (
      (ch === 's' && next === 'h') ||
      (ch === 'c' && next === 'h') ||
      (ch === 'z' && next === 'h') ||
      ch === 'j'
    ) {
      visemes.push({ shape: 'G', weight: 0.25 });
      i += (ch === 'j') ? 1 : 2;
      continue;
    }

    // Tongue behind teeth (TH, DH, L): tongue raised ('H')
    if ((ch === 't' && next === 'h') || (ch === 'd' && next === 'h') || ch === 'l') {
      const skip = (next === 'h') ? 2 : (next === 'l' ? 2 : 1);
      visemes.push({ shape: 'H', weight: 0.22 });
      i += skip;
      continue;
    }

    // Glides & pursed rounded (W, WH, QU, U after consonant)
    if (ch === 'w' || (ch === 'q' && next === 'u') || (ch === 'w' && next === 'h')) {
      const skip = (ch === 'q' || next === 'h') ? 2 : 1;
      visemes.push({ shape: 'O', weight: 0.25 });
      i += skip;
      continue;
    }

    // Long double vowels
    if (ch === 'a' && next === 'a') {
      visemes.push({ shape: 'D', weight: 0.55 });
      i += 2;
      continue;
    }
    if (ch === 'e' && next === 'e') {
      visemes.push({ shape: 'C', weight: 0.50 });
      i += 2;
      continue;
    }
    if (ch === 'o' && next === 'o') {
      visemes.push({ shape: 'O', weight: 0.50 });
      i += 2;
      continue;
    }

    // Diphthongs
    if ((ch === 'a' && (next === 'i' || next === 'y')) || (ch === 'e' && next === 'i')) {
      visemes.push({ shape: 'D', weight: 0.35 });
      visemes.push({ shape: 'C', weight: 0.30 });
      i += 2;
      continue;
    }
    if (ch === 'a' && (next === 'u' || next === 'w')) {
      visemes.push({ shape: 'D', weight: 0.35 });
      visemes.push({ shape: 'O', weight: 0.30 });
      i += 2;
      continue;
    }
    if (ch === 'o' && (next === 'u' || next === 'w')) {
      visemes.push({ shape: 'E', weight: 0.35 });
      visemes.push({ shape: 'O', weight: 0.30 });
      i += 2;
      continue;
    }
    if (ch === 'o' && (next === 'i' || next === 'y')) {
      visemes.push({ shape: 'E', weight: 0.35 });
      visemes.push({ shape: 'C', weight: 0.30 });
      i += 2;
      continue;
    }
    if (ch === 'e' && (next === 'a' || next === 'y')) {
      visemes.push({ shape: 'C', weight: 0.55 });
      i += 2;
      continue;
    }

    // Single vowels (syllable nucleus)
    if (ch === 'a') {
      visemes.push({ shape: 'D', weight: 0.45 });
      i++;
      continue;
    }
    if (ch === 'e' || ch === 'i' || ch === 'y') {
      visemes.push({ shape: 'C', weight: 0.40 });
      i++;
      continue;
    }
    if (ch === 'o') {
      visemes.push({ shape: 'E', weight: 0.45 });
      i++;
      continue;
    }
    if (ch === 'u') {
      visemes.push({ shape: 'O', weight: 0.45 });
      i++;
      continue;
    }

    // Dental / Alveolar / Sibilant consonants (S, T, D, N, Z, R)
    if (ch === 's' || ch === 't' || ch === 'd' || ch === 'z' || ch === 'n' || ch === 'r') {
      const skip = (next === ch) ? 2 : 1;
      visemes.push({ shape: 'B', weight: 0.22 });
      i += skip;
      continue;
    }

    // Velar stops & fricatives (K, G, C, Q, X, H)
    visemes.push({ shape: 'C', weight: 0.20 });
    i++;
  }

  if (visemes.length === 0) {
    return [{ shape: 'C', weight: 1.0 }];
  }

  // Merge adjacent identical shapes within the word
  const merged: PhonemeViseme[] = [];
  for (const v of visemes) {
    const prev = merged[merged.length - 1];
    if (prev && prev.shape === v.shape) {
      prev.weight += v.weight;
    } else {
      merged.push({ ...v });
    }
  }

  // Normalize weights so they sum to 1.0
  const totalWeight = merged.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight > 0) {
    for (const v of merged) {
      v.weight /= totalWeight;
    }
  }

  return merged;
}


/**
 * Computes phonetic weight for a spoken word based on syllable count,
 * consonant stops, and prosodic phrase-final lengthening.
 * Syllables dictate acoustic duration in spoken speech (not raw character count).
 */
export function getWordPhoneticWeight(rawWord: string): number {
  const clean = rawWord.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 1.0;

  // Syllables: count vowel nucleus clusters (vowels/diphthongs carry ~70% of duration)
  const vowelMatches = clean.match(/[aeiouy]+/g);
  const syllables = vowelMatches ? vowelMatches.length : 1;

  // Consonant closures take brief rapid frames
  const consonants = Math.max(0, clean.length - (clean.match(/[aeiouy]/g)?.length || 0));

  // Each syllable vowel carries ~1.6 duration units, consonants ~0.45 units
  let weight = syllables * 1.6 + consonants * 0.45;

  // Phrase-final lengthening: words ending with pause punctuation naturally elongate
  if (
    rawWord.includes(',') ||
    rawWord.includes(';') ||
    rawWord.includes(':') ||
    rawWord.includes('.') ||
    rawWord.includes('?') ||
    rawWord.includes('!')
  ) {
    weight += 0.9;
  }
  return Math.max(1.0, weight);
}

/**
/**
 * Condenses extracted visemes down to the maximum number that can fit into a word's duration
 * given minDurationMs and speed settings, preserving essential closures and primary vowels.
 */
export function condenseVisemes(visemes: PhonemeViseme[], maxCount: number): PhonemeViseme[] {
  if (visemes.length <= maxCount || maxCount <= 0) return visemes;

  if (maxCount === 1) {
    // Keep single most important articulatory shape
    const closure = visemes.find((v) => v.shape === 'A' || v.shape === 'F');
    if (closure) return [{ shape: closure.shape, weight: 1.0 }];

    const vowel = visemes.find((v) => v.shape === 'D' || v.shape === 'O' || v.shape === 'E');
    if (vowel) return [{ shape: vowel.shape, weight: 1.0 }];

    const sorted = [...visemes].sort((a, b) => b.weight - a.weight);
    return [{ shape: sorted[0].shape, weight: 1.0 }];
  }

  if (maxCount === 2) {
    const closure = visemes.find((v) => v.shape === 'A' || v.shape === 'F');
    const vowel = visemes.find((v) => v.shape === 'D' || v.shape === 'O' || v.shape === 'E') || visemes[visemes.length - 1];

    if (closure && vowel && closure !== vowel) {
      return [
        { shape: closure.shape, weight: 0.35 },
        { shape: vowel.shape, weight: 0.65 },
      ];
    }

    const first = visemes[0];
    const second = visemes[1] || visemes[visemes.length - 1];
    const totalW = first.weight + second.weight;
    return [
      { shape: first.shape, weight: first.weight / totalW },
      { shape: second.shape, weight: second.weight / totalW },
    ];
  }

  const sortedByImportance = visemes
    .map((v, idx) => ({
      v,
      idx,
      importance:
        v.shape === 'A' || v.shape === 'F' ? 10 :
        v.shape === 'D' || v.shape === 'O' || v.shape === 'E' ? 8 :
        idx === 0 || idx === visemes.length - 1 ? 5 :
        v.weight,
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, maxCount)
    .sort((a, b) => a.idx - b.idx);

  const selected = sortedByImportance.map((item) => item.v);
  const totalW = selected.reduce((sum, item) => sum + item.weight, 0);
  return selected.map((item) => ({
    shape: item.shape,
    weight: item.weight / totalW,
  }));
}

/**
 * Speech timeline cue builder:
 * - Detects punctuation clauses and maps them to acoustic speech intervals
 * - Distributes word durations based on syllable count and phonetic demand
 * - Respects LipSyncTuningSettings (minDurationMs, speed, smoothness)
 * - Tags cues with phoneme/word text and 'heuristic' source
 * - Ensures natural pauses ('X') match audio pauses
 */
export function buildSpeechTimelineCues(
  words: string[],
  speechIntervals: Array<{ start: number; end: number }>,
  totalDuration: number,
  tuning?: LipSyncTuningSettings,
  _silenceIntervals?: Array<{ start: number; end: number }>
): TimelineCue[] {
  const cues: TimelineCue[] = [];
  const minDur = Math.max(0.04, (tuning?.minDurationMs ?? 90) / 1000);
  const speed = tuning?.speed || 'natural';
  const maxOpenVowelSec = speed === 'slower' ? 0.35 : speed === 'faster' ? 0.20 : 0.26;

  // Filter valid speech intervals
  const validIntervals = speechIntervals
    .map((int) => ({
      start: Math.max(0, Math.min(totalDuration, int.start)),
      end: Math.max(0, Math.min(totalDuration, int.end)),
    }))
    .filter((int) => int.end - int.start >= 0.06);

  if (validIntervals.length === 0) {
    // If no speech intervals detected, default to full rest
    return [
      { id: generateId('cue'), start: 0, end: totalDuration, shape: 'X', text: 'silence', source: 'heuristic' },
    ];
  }

  // Pre-speech silence
  if (validIntervals[0].start >= 0.06) {
    cues.push({
      id: generateId('cue'),
      start: 0,
      end: validIntervals[0].start,
      shape: 'X',
      text: 'pause',
      source: 'heuristic',
    });
  }

  // Clean words list
  const cleanWords = words.map((w) => w.trim()).filter((w) => w.length > 0);

  // Group words into punctuation clauses (delimited by comma, semicolon, colon, period, question, exclamation)
  const clauses: string[][] = [];
  let currentClause: string[] = [];

  for (const w of cleanWords) {
    currentClause.push(w);
    const hasPunctuation =
      w.includes(',') ||
      w.includes(';') ||
      w.includes(':') ||
      w.includes('.') ||
      w.includes('?') ||
      w.includes('!');
    if (hasPunctuation) {
      clauses.push(currentClause);
      currentClause = [];
    }
  }
  if (currentClause.length > 0) {
    clauses.push(currentClause);
  }

  // Allocate words to each interval
  const wordsPerInterval: string[][] = [];

  if (clauses.length === validIntervals.length && clauses.length > 1) {
    // Exact clause-to-interval match: Clause i maps directly to Interval i
    for (let i = 0; i < validIntervals.length; i++) {
      wordsPerInterval.push(clauses[i]);
    }
  } else if (validIntervals.length === 1) {
    wordsPerInterval.push(cleanWords);
  } else {
    // Distribute words proportional to the acoustic duration of each interval
    const totalSpeechDuration = validIntervals.reduce((sum, int) => sum + (int.end - int.start), 0);
    let wordIdx = 0;

    for (let i = 0; i < validIntervals.length; i++) {
      const isLastInterval = i === validIntervals.length - 1;
      if (isLastInterval) {
        wordsPerInterval.push(cleanWords.slice(wordIdx));
      } else {
        const intervalDur = validIntervals[i].end - validIntervals[i].start;
        const durFraction = intervalDur / totalSpeechDuration;
        const targetCount = Math.max(1, Math.round(cleanWords.length * durFraction));
        const assigned = cleanWords.slice(wordIdx, wordIdx + targetCount);
        wordsPerInterval.push(assigned);
        wordIdx += targetCount;
      }
    }
  }

  for (let i = 0; i < validIntervals.length; i++) {
    const interval = validIntervals[i];
    const intervalDuration = interval.end - interval.start;
    if (intervalDuration <= 0.05) continue;

    const currentWords = wordsPerInterval[i] || [];

    if (currentWords.length === 0) {
      // Natural rhythmic speech cadence when script is empty
      const cadenceVisemes = ['B', 'D', 'C', 'A', 'B', 'D', 'E', 'B', 'C', 'A', 'O', 'D'];
      const targetStep = Math.max(0.10, Math.min(0.18, intervalDuration / Math.max(4, Math.round(intervalDuration / 0.14))));
      let curr = interval.start;
      let cIdx = 0;

      while (curr < interval.end - 0.04) {
        const nextEnd = Math.min(interval.end, curr + targetStep);
        cues.push({
          id: generateId('cue'),
          start: curr,
          end: nextEnd,
          shape: cadenceVisemes[cIdx % cadenceVisemes.length],
          source: 'heuristic',
        });
        curr = nextEnd;
        cIdx++;
      }
    } else {
      // Weight words by syllable count, vowel nuclei, and prosodic lengthening
      const wordWeights = currentWords.map((w) => getWordPhoneticWeight(w));
      const totalWeight = wordWeights.reduce((a, b) => a + b, 0);

      let currWordStart = interval.start;

      for (let w = 0; w < currentWords.length; w++) {
        const rawWord = currentWords[w];
        const cleanWord = rawWord.replace(/[^a-zA-Z]/g, '');
        const isLastWord = w === currentWords.length - 1;
        const hasPausePunctuation =
          rawWord.includes(',') ||
          rawWord.includes(';') ||
          rawWord.includes(':') ||
          rawWord.includes('.');

        // Word duration allocated from interval
        const wordAlloc = isLastWord
          ? interval.end - currWordStart
          : intervalDuration * (wordWeights[w] / totalWeight);

        const wordEnd = Math.min(interval.end, currWordStart + wordAlloc);
        const actualWordDuration = wordEnd - currWordStart;

        // If word has punctuation comma and interval allows (and no acoustic pause follows immediately), reserve micro-pause 'X'
        const hasAcousticPauseAfter = isLastWord && !!validIntervals[i + 1] && (validIntervals[i + 1].start - interval.end >= 0.08);
        const pauseAlloc = (hasPausePunctuation && !hasAcousticPauseAfter && actualWordDuration > 0.35) ? 0.10 : 0;
        const speechDuration = actualWordDuration - pauseAlloc;

        const rawVisemes = extractWordVisemes(rawWord);
        const maxShapes = Math.max(1, Math.floor(speechDuration / minDur));
        const visemes = condenseVisemes(rawVisemes, maxShapes);
        let currShapeStart = currWordStart;

        for (let v = 0; v < visemes.length; v++) {
          const viseme = visemes[v];
          const isLastViseme = v === visemes.length - 1;

          let shapeDuration = isLastViseme
            ? (currWordStart + speechDuration) - currShapeStart
            : speechDuration * viseme.weight;

          // If an open vowel is computed to be > maxOpenVowelSec,
          // split it with a natural articulatory relaxation to prevent frozen open mouths
          const isOpenVowel = viseme.shape === 'D' || viseme.shape === 'C' || viseme.shape === 'E' || viseme.shape === 'H';

          if (isOpenVowel && shapeDuration > maxOpenVowelSec) {
            // Split: main open peak, then easing off-glide
            const peakDuration = Math.min(maxOpenVowelSec * 0.7, shapeDuration * 0.65);

            // 1. Peak open shape
            cues.push({
              id: generateId('cue'),
              start: currShapeStart,
              end: currShapeStart + peakDuration,
              shape: viseme.shape,
              text: cleanWord,
              source: 'heuristic',
            });

            // 2. Easing shape (relaxing towards mouth center C or B)
            const easingShape = viseme.shape === 'D' ? 'C' : 'B';
            cues.push({
              id: generateId('cue'),
              start: currShapeStart + peakDuration,
              end: currShapeStart + shapeDuration,
              shape: easingShape,
              text: cleanWord,
              source: 'heuristic',
            });
          } else {
            cues.push({
              id: generateId('cue'),
              start: currShapeStart,
              end: currShapeStart + shapeDuration,
              shape: viseme.shape,
              text: cleanWord,
              source: 'heuristic',
            });
          }

          currShapeStart += shapeDuration;
        }

        // Add punctuation micro-pause if reserved
        if (pauseAlloc > 0) {
          cues.push({
            id: generateId('cue'),
            start: currWordStart + speechDuration,
            end: wordEnd,
            shape: 'X',
            text: 'pause',
            source: 'heuristic',
          });
        }

        currWordStart = wordEnd;
      }
    }

    // Silence between speech intervals
    const nextInterval = validIntervals[i + 1];
    if (nextInterval && nextInterval.start - interval.end >= 0.08) {
      cues.push({
        id: generateId('cue'),
        start: interval.end,
        end: nextInterval.start,
        shape: 'X',
        text: 'pause',
        source: 'heuristic',
      });
    }
  }

  // Trailing silence
  const lastCueEnd = cues.length > 0 ? cues[cues.length - 1].end : 0;
  if (lastCueEnd < totalDuration - 0.04) {
    cues.push({
      id: generateId('cue'),
      start: lastCueEnd,
      end: totalDuration,
      shape: 'X',
      text: 'pause',
      source: 'heuristic',
    });
  }

  return smoothAndFilterCues(cues, totalDuration, tuning);
}

/**
 * Normalizes, aligns, and cleans cues:
 * - Merges consecutive identical shapes
 * - Caps open mouth holds so mouths never stay frozen open
 * - Preserves essential closures (A, F, B, G)
 * - Eliminates unintended gaps or overlaps
 * - Ensures all cues end exactly at totalDuration
 */
export function smoothAndFilterCues(
  rawCues: TimelineCue[],
  totalDuration?: number,
  tuning?: LipSyncTuningSettings
): TimelineCue[] {
  if (rawCues.length === 0) return [];

  const minDur = Math.max(0.04, (tuning?.minDurationMs ?? 90) / 1000);
  const speed = tuning?.speed || 'natural';
  const maxOpenVowelSec = speed === 'slower' ? 0.35 : speed === 'faster' ? 0.20 : 0.26;

  // Sort chronologically
  const sorted = [...rawCues].sort((a, b) => a.start - b.start);

  // 1. First pass: merge adjacent cues with the exact same shape
  const merged: TimelineCue[] = [];
  for (const cue of sorted) {
    if (cue.end <= cue.start) continue;
    const prev = merged[merged.length - 1];
    if (prev && prev.shape.toUpperCase() === cue.shape.toUpperCase()) {
      prev.end = Math.max(prev.end, cue.end);
      if (!prev.text && cue.text) prev.text = cue.text;
    } else {
      merged.push({
        id: cue.id || generateId('cue'),
        start: cue.start,
        end: cue.end,
        shape: cue.shape.toUpperCase(),
        text: cue.text,
        source: cue.source,
      });
    }
  }

  // 2. Second pass: break long open mouth shapes (respecting speed tuning)
  const capped: TimelineCue[] = [];
  const openShapes = new Set(['D', 'C', 'E', 'H', 'O']);

  for (const cue of merged) {
    const dur = cue.end - cue.start;

    if (dur > maxOpenVowelSec + 0.08 && openShapes.has(cue.shape)) {
      let curr = cue.start;
      while (curr < cue.end - 0.04) {
        const segmentDur = Math.min(maxOpenVowelSec, cue.end - curr);
        const isMiddle = curr > cue.start && (cue.end - curr > maxOpenVowelSec);
        const shape = isMiddle ? (cue.shape === 'D' ? 'C' : 'B') : cue.shape;

        capped.push({
          id: generateId('cue'),
          start: curr,
          end: curr + segmentDur,
          shape,
          text: cue.text,
          source: cue.source,
        });
        curr += segmentDur;
      }
    } else {
      capped.push({ ...cue });
    }
  }

  // 3. Third pass: Enforce minDurationMs by merging sub-minimum speech shapes into adjacent dominant shapes
  const minFiltered: TimelineCue[] = [];
  for (let i = 0; i < capped.length; i++) {
    const cue = capped[i];
    const dur = cue.end - cue.start;

    // Silence 'X' is kept if it represents a pause
    if (cue.shape === 'X') {
      minFiltered.push({ ...cue });
      continue;
    }

    const isClosure = cue.shape === 'A' || cue.shape === 'F';
    const effectiveMin = isClosure ? Math.min(0.05, minDur) : minDur;

    if (dur < effectiveMin) {
      if (minFiltered.length > 0 && minFiltered[minFiltered.length - 1].shape !== 'X') {
        // Absorb into previous speech shape
        minFiltered[minFiltered.length - 1].end = cue.end;
        continue;
      } else if (i + 1 < capped.length && capped[i + 1].shape !== 'X') {
        // Expand next speech shape backwards to prevent gap
        capped[i + 1].start = cue.start;
        continue;
      }
    }

    minFiltered.push({ ...cue });
  }

  // 4. Fourth pass: Merge any newly adjacent identical shapes created by pass 3
  const reMerged: TimelineCue[] = [];
  for (const cue of minFiltered) {
    if (cue.end <= cue.start) continue;
    const prev = reMerged[reMerged.length - 1];
    if (prev && prev.shape.toUpperCase() === cue.shape.toUpperCase()) {
      prev.end = Math.max(prev.end, cue.end);
      if (!prev.text && cue.text) prev.text = cue.text;
    } else {
      reMerged.push({ ...cue });
    }
  }

  // 5. Fifth pass: Ensure contiguous timeline alignment (no gaps or overlaps)
  const contiguous: TimelineCue[] = [];
  for (let i = 0; i < reMerged.length; i++) {
    const curr = reMerged[i];
    const prev = contiguous[contiguous.length - 1];

    if (prev) {
      // Align boundaries to avoid micro-gaps or overlaps
      if (Math.abs(curr.start - prev.end) < 0.05) {
        curr.start = prev.end;
      } else if (curr.start > prev.end + 0.05) {
        // Real gap: insert rest shape X
        contiguous.push({
          id: generateId('cue'),
          start: prev.end,
          end: curr.start,
          shape: 'X',
          text: 'pause',
          source: curr.source || 'heuristic',
        });
      }
    }

    if (curr.end > curr.start + 0.03) {
      contiguous.push({
        id: generateId('cue'),
        start: parseFloat(curr.start.toFixed(3)),
        end: parseFloat(curr.end.toFixed(3)),
        shape: curr.shape,
        text: curr.text,
        source: curr.source,
      });
    }
  }

  // 4. Fourth pass: merge any newly adjacent identical shapes created by contiguous alignment
  const finalized: TimelineCue[] = [];
  for (const c of contiguous) {
    const prev = finalized[finalized.length - 1];
    if (prev && prev.shape === c.shape) {
      prev.end = c.end;
      if (!prev.text && c.text) prev.text = c.text;
    } else {
      finalized.push({ ...c });
    }
  }

  // 5. Ensure last cue covers up to totalDuration if provided
  if (totalDuration && totalDuration > 0 && finalized.length > 0) {
    const last = finalized[finalized.length - 1];
    if (last.end < totalDuration - 0.03) {
      finalized.push({
        id: generateId('cue'),
        start: last.end,
        end: parseFloat(totalDuration.toFixed(3)),
        shape: 'X',
        text: 'pause',
        source: last.source || 'heuristic',
      });
    } else if (last.end > totalDuration + 0.05) {
      last.end = parseFloat(totalDuration.toFixed(3));
    }
  }

  return finalized;
}

/**
 * Validates timeline cues and returns actionable warnings:
 * - Flags mouth shapes held longer than 500ms
 * - Flags open-mouth shapes during detected silence
 * - Flags cues extending beyond total audio duration
 * - Flags overlapping cues
 * - Flags invalid / negative durations
 */
export function validateTimelineCues(
  cues: TimelineCue[],
  totalDuration: number,
  silenceIntervals?: Array<{ start: number; end: number }>
): CueWarning[] {
  const warnings: CueWarning[] = [];
  const openShapes = new Set(['C', 'D', 'E', 'H', 'O']);

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const duration = cue.end - cue.start;

    // 1. Invalid or negative duration
    if (duration <= 0.02) {
      warnings.push({
        cueId: cue.id,
        type: 'negative-duration',
        message: `Cue duration is too short or invalid (${(duration * 1000).toFixed(0)}ms).`,
        severity: 'error',
      });
    }

    // 2. Holds open longer than 500ms (Requirement 5)
    if (duration > 0.50 && cue.shape !== 'X') {
      warnings.push({
        cueId: cue.id,
        type: 'long-duration',
        message: `Mouth shape '${cue.shape}' is held for ${(duration * 1000).toFixed(0)}ms (>500ms). Consider splitting for natural speech.`,
        severity: 'warning',
      });
    }

    // 3. Extends beyond total audio duration (Requirement 5)
    if (totalDuration > 0 && cue.end > totalDuration + 0.05) {
      warnings.push({
        cueId: cue.id,
        type: 'exceeds-duration',
        message: `Cue ends at ${cue.end.toFixed(2)}s, which extends beyond audio duration (${totalDuration.toFixed(2)}s).`,
        severity: 'error',
      });
    }

    // 4. Overlaps with previous cue (Requirement 5)
    if (i > 0) {
      const prev = cues[i - 1];
      if (cue.start < prev.end - 0.01) {
        warnings.push({
          cueId: cue.id,
          type: 'overlap',
          message: `Cue overlaps with previous cue '${prev.shape}' by ${((prev.end - cue.start) * 1000).toFixed(0)}ms.`,
          severity: 'warning',
        });
      }
    }

    // 5. Open-mouth shape during detected silence (Requirement 5)
    if (silenceIntervals && openShapes.has(cue.shape)) {
      for (const sil of silenceIntervals) {
        const overlapStart = Math.max(cue.start, sil.start);
        const overlapEnd = Math.min(cue.end, sil.end);
        if (overlapEnd - overlapStart > 0.12) {
          warnings.push({
            cueId: cue.id,
            type: 'open-in-silence',
            message: `Open mouth shape '${cue.shape}' is used during detected audio silence (${(overlapEnd - overlapStart).toFixed(2)}s).`,
            severity: 'warning',
          });
          break;
        }
      }
    }
  }

  return warnings;
}

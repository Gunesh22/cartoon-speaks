import { describe, it, expect } from 'vitest';
import { TimelineCue } from '../../types/timeline';
import {
  generateWordToMouthReport,
  generateDetailedCueTimings,
  exportWordToMouthCsv,
  exportDetailedCuesCsv,
  exportWordToMouthJson,
  exportDetailedCuesJson,
} from './lipSyncReportExporter';

describe('Lip-Sync Articulation & Timing Report Exporter', () => {
  const sampleCues: TimelineCue[] = [
    { id: '1', start: 0.0, end: 0.12, shape: 'X', text: 'pause', source: 'heuristic' },
    // "Happy" -> A (80ms), D (150ms), B (100ms)
    { id: '2', start: 0.12, end: 0.20, shape: 'A', text: 'Happy', source: 'heuristic' },
    { id: '3', start: 0.20, end: 0.35, shape: 'D', text: 'Happy', source: 'heuristic' },
    { id: '4', start: 0.35, end: 0.45, shape: 'B', text: 'Happy', source: 'heuristic' },
    // "Thoughts" -> H (120ms), C (160ms)
    { id: '5', start: 0.45, end: 0.57, shape: 'H', text: 'Thoughts', source: 'heuristic' },
    { id: '6', start: 0.57, end: 0.73, shape: 'C', text: 'Thoughts', source: 'heuristic' },
    // Pause -> X
    { id: '7', start: 0.73, end: 0.95, shape: 'X', text: 'pause', source: 'heuristic' },
    // Custom shape test: "CUSTOM_M_01" edited manually
    { id: '8', start: 0.95, end: 1.25, shape: 'CUSTOM_M_01', text: 'Manan', source: 'manual' },
  ];

  it('generates word-to-mouth report grouping shapes by spoken words', () => {
    const report = generateWordToMouthReport(sampleCues, 'Happy Thoughts Manan');

    expect(report.length).toBe(5); // Pause, Happy, Thoughts, Pause, Manan (5 entries)
    // 1. Initial Pause
    expect(report[0].spokenText).toBe('[Pause]');
    expect(report[0].shapes).toEqual(['X']);

    // 2. "Happy"
    expect(report[1].spokenText).toBe('Happy');
    expect(report[1].shapeSequence).toBe('A -> D -> B');
    expect(report[1].shapes).toEqual(['A', 'D', 'B']);
    expect(report[1].startTime).toBe(0.12);
    expect(report[1].endTime).toBe(0.45);
    expect(report[1].durationMs).toBe(330);
    expect(report[1].shapeCount).toBe(3);
    expect(report[1].alignmentSource).toBe('heuristic');

    // 3. "Thoughts"
    expect(report[2].spokenText).toBe('Thoughts');
    expect(report[2].shapeSequence).toBe('H -> C');

    // 4. Custom shape preserved exactly without alteration
    const manan = report.find((r) => r.spokenText === 'Manan');
    expect(manan).toBeDefined();
    expect(manan?.shapes).toEqual(['CUSTOM_M_01']);
    expect(manan?.alignmentSource).toBe('manual');
  });

  it('exports valid Word-to-Mouth CSV conforming to defined column schema', () => {
    const report = generateWordToMouthReport(sampleCues);
    const csv = exportWordToMouthCsv(report);

    // UTF-8 BOM check
    expect(csv.startsWith('\uFEFF')).toBe(true);

    const lines = csv.replace('\uFEFF', '').split('\r\n');
    expect(lines[0]).toBe(
      'word_index,spoken_text,shape_sequence,start_time_s,end_time_s,total_duration_ms,shape_count,shapes_detail,alignment_source'
    );

    // Verify row for "Happy"
    const happyRow = lines.find((l) => l.includes('Happy'));
    expect(happyRow).toBeDefined();
    expect(happyRow).toContain('A -> D -> B');
    expect(happyRow).toContain('0.120');
    expect(happyRow).toContain('0.450');
    expect(happyRow).toContain('330');
    expect(happyRow).toContain('heuristic');
  });

  it('exports Detailed Cue Timings containing every individual cue including pauses and custom shapes', () => {
    const detailed = generateDetailedCueTimings(sampleCues);
    expect(detailed.length).toBe(sampleCues.length);

    expect(detailed[0].mouthShape).toBe('X');
    expect(detailed[0].associatedWord).toBe('[Pause]');

    expect(detailed[1].mouthShape).toBe('A');
    expect(detailed[1].associatedWord).toBe('Happy');
    expect(detailed[1].durationMs).toBe(80);

    const customCue = detailed.find((c) => c.mouthShape === 'CUSTOM_M_01');
    expect(customCue).toBeDefined();
    expect(customCue?.alignmentSource).toBe('manual');
    expect(customCue?.associatedWord).toBe('Manan');
  });

  it('exports valid Detailed Cue Timings CSV conforming to defined column schema', () => {
    const detailed = generateDetailedCueTimings(sampleCues);
    const csv = exportDetailedCuesCsv(detailed);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    expect(lines[0]).toBe(
      'cue_index,start_time_s,end_time_s,duration_ms,mouth_shape,associated_word,alignment_source'
    );

    expect(lines.length).toBe(sampleCues.length + 1); // Header + cues
  });

  it('exports valid structured JSON format for both reports', () => {
    const report = generateWordToMouthReport(sampleCues);
    const detailed = generateDetailedCueTimings(sampleCues);

    const wordJson = JSON.parse(exportWordToMouthJson(report, { projectName: 'Test', audioDuration: 1.25 }));
    expect(wordJson.projectName).toBe('Test');
    expect(wordJson.words.length).toBe(report.length);

    const detailedJson = JSON.parse(exportDetailedCuesJson(detailed, { projectName: 'Test', audioDuration: 1.25 }));
    expect(detailedJson.totalCues).toBe(sampleCues.length);
    expect(detailedJson.cues[0].mouthShape).toBe('X');
  });

  it('labels unassociated cues as [Unknown] rather than inventing words', () => {
    const unassociatedCues: TimelineCue[] = [
      { id: 'u1', start: 0.1, end: 0.3, shape: 'C' }, // No text property
    ];

    const report = generateWordToMouthReport(unassociatedCues);
    expect(report[0].spokenText).toBe('[Unknown]');

    const detailed = generateDetailedCueTimings(unassociatedCues);
    expect(detailed[0].associatedWord).toBe('[Unknown]');
  });
});

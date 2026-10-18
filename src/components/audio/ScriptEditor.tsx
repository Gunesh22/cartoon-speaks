import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, FileText, UploadCloud, SlidersHorizontal, ChevronDown, ChevronUp, X, FileSpreadsheet } from 'lucide-react';
import { Button } from '../common/Button';
import { LipSyncTuningSettings, DEFAULT_LIPSYNC_TUNING, TransitionSmoothness } from '../../types/timeline';
import { rhubarbAdapter } from '../../services/lipsync/RhubarbAdapter';

export interface ScriptEditorProps {
  scriptText: string;
  onScriptChange: (newScript: string) => void;
  onGenerateLipSync: (overrideTuning?: LipSyncTuningSettings) => void;
  onImportRhubarbFile: (fileContent: string) => void;
  isGenerating?: boolean;
  hasAudio: boolean;
  tuningSettings?: LipSyncTuningSettings;
  onTuningChange?: (newTuning: LipSyncTuningSettings) => void;
  onExportReport?: () => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  scriptText,
  onScriptChange,
  onGenerateLipSync,
  onImportRhubarbFile,
  isGenerating = false,
  hasAudio,
  tuningSettings = DEFAULT_LIPSYNC_TUNING,
  onTuningChange,
  onExportReport,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tuningButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [showTuning, setShowTuning] = useState(false);
  const [companionEnabled, setCompanionEnabled] = useState(() => rhubarbAdapter.isCompanionEnabled());
  const [popoverPos, setPopoverPos] = useState<{
    top?: number;
    bottom?: number;
    right?: number;
    width?: number;
    maxHeight: number;
    openUpward: boolean;
  }>({ maxHeight: 380, openUpward: false });

  const wordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          onImportRhubarbFile(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const updateTuning = (patch: Partial<LipSyncTuningSettings>) => {
    if (onTuningChange) {
      onTuningChange({
        ...tuningSettings,
        ...patch,
      });
    }
  };

  const updatePopoverPosition = useCallback(() => {
    if (!tuningButtonRef.current || !containerRef.current) return;
    const buttonRect = tuningButtonRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    // Popover needs ~320px comfort height. If space below is limited and space above is larger, anchor upward
    const openUpward = spaceBelow < 340 && spaceAbove > spaceBelow;
    // Align popover with the right edge of the ScriptEditor card so it never extends over the preview
    const rightPos = Math.max(12, viewportWidth - containerRect.right);
    const popoverWidth = Math.min(380, Math.max(310, containerRect.width), viewportWidth - 24);

    if (openUpward) {
      const availableHeight = Math.max(180, spaceAbove - 16);
      setPopoverPos({
        bottom: viewportHeight - buttonRect.top + 6,
        right: rightPos,
        width: popoverWidth,
        maxHeight: Math.min(availableHeight, 480),
        openUpward: true,
      });
    } else {
      const availableHeight = Math.max(180, spaceBelow - 16);
      setPopoverPos({
        top: buttonRect.bottom + 6,
        right: rightPos,
        width: popoverWidth,
        maxHeight: Math.min(availableHeight, 480),
        openUpward: false,
      });
    }
  }, []);

  useEffect(() => {
    if (!showTuning) return;

    updatePopoverPosition();

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        tuningButtonRef.current &&
        !tuningButtonRef.current.contains(target)
      ) {
        setShowTuning(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowTuning(false);
        tuningButtonRef.current?.focus();
      }
    };

    const handleResize = () => {
      updatePopoverPosition();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [showTuning, updatePopoverPosition]);

  return (
    <div
      ref={containerRef}
      className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 flex flex-col h-full min-h-0 shadow-2xs space-y-2 relative"
    >
      {/* Dialogue Script Header */}
      <div className="flex items-center justify-between shrink-0">
        <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-indigo-600" />
          Dialogue Script
        </label>
        <span className="text-[10px] text-slate-400">
          {wordCount} words • {scriptText.length} chars
        </span>
      </div>

      {/* Dialogue Textarea - fills available vertical space without expanding card */}
      <textarea
        value={scriptText}
        onChange={(e) => onScriptChange(e.target.value)}
        placeholder="Type dialogue here (e.g. 'Hi, my name is Gunesh')..."
        className="w-full flex-1 min-h-[55px] p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white resize-none font-sans overflow-y-auto leading-relaxed"
      />

      {/* Compact Action Toolbar with Import File, Tuning, and Generate Timeline */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.tsv,.txt"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            icon={<UploadCloud className="w-3 h-3" />}
          >
            Import File
          </Button>

          <button
            ref={tuningButtonRef}
            type="button"
            onClick={() => setShowTuning((prev) => !prev)}
            aria-expanded={showTuning}
            aria-haspopup="dialog"
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all shadow-2xs ${
              showTuning
                ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200'
                : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <SlidersHorizontal className={`w-3 h-3 ${showTuning ? 'text-white' : 'text-indigo-600'}`} />
            <span>Tuning</span>
            {showTuning ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
          </button>

          {onExportReport && (
            <Button
              size="sm"
              variant="outline"
              onClick={onExportReport}
              icon={<FileSpreadsheet className="w-3 h-3 text-emerald-600" />}
              title="Inspect articulation and export Word-to-Mouth or Detailed Cue reports (CSV/JSON)"
            >
              Export Report
            </Button>
          )}
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => onGenerateLipSync(tuningSettings)}
          disabled={!hasAudio}
          loading={isGenerating}
          icon={<Sparkles className="w-3.5 h-3.5" />}
        >
          Generate Lip-Sync Timeline
        </Button>
      </div>

      {/* Floating Lip-Sync Tuning Popover (Portal to body, never clipped by parent overflow) */}
      {showTuning &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-modal="true"
            aria-label="Lip-Sync Animation Tuning"
            style={{
              position: 'fixed',
              top: popoverPos.top !== undefined ? `${popoverPos.top}px` : undefined,
              bottom: popoverPos.bottom !== undefined ? `${popoverPos.bottom}px` : undefined,
              right: `${popoverPos.right ?? 16}px`,
              width: `${popoverPos.width ?? 360}px`,
              maxHeight: `${popoverPos.maxHeight}px`,
              zIndex: 9999,
            }}
            className="bg-white rounded-xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Popover Header with Title and Close Button */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-bold text-xs text-slate-800">Lip-Sync Animation Tuning</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTuning(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                title="Close tuning panel (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrollable Popover Controls */}
            <div className="p-3.5 overflow-y-auto space-y-3.5 text-xs">
              <p className="text-[11px] text-slate-500 leading-snug">
                Fine-tune phoneme pacing, morph smoothness, and minimum mouth hold duration.
              </p>

              {/* Segmented Controls for Speed and Smoothness */}
              <div className="space-y-3">
                {/* Speed / Timing Segmented Toggle */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-slate-700 text-[11px]">Lip-Sync Timing</label>
                    <span className="text-[10px] text-slate-400 capitalize">{tuningSettings.speed} speech</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    {(['slower', 'natural', 'faster'] as const).map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => updateTuning({ speed: spd })}
                        className={`py-1 px-1.5 text-center text-[11px] font-bold rounded-md capitalize transition-all ${
                          tuningSettings.speed === spd
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        {spd}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Smoothness Segmented Toggle */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-slate-700 text-[11px]">Transition Smoothness</label>
                    <span className="text-[10px] text-slate-400">
                      {tuningSettings.smoothness === 'low'
                        ? 'Crisp cuts (0ms)'
                        : tuningSettings.smoothness === 'high'
                        ? 'Silky blend (50ms)'
                        : 'Natural morph (25ms)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    {[
                      { id: 'low', label: 'Crisp' },
                      { id: 'medium', label: 'Natural' },
                      { id: 'high', label: 'Smooth' },
                    ].map((sm) => (
                      <button
                        key={sm.id}
                        type="button"
                        onClick={() => updateTuning({ smoothness: sm.id as TransitionSmoothness })}
                        className={`py-1 px-1.5 text-center text-[11px] font-bold rounded-md transition-all ${
                          tuningSettings.smoothness === sm.id
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        {sm.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Min Duration Slider with Quick Presets */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-slate-700 text-[11px]">Min Shape Duration</label>
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">
                    {tuningSettings.minDurationMs}ms
                  </span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="180"
                  step="10"
                  value={tuningSettings.minDurationMs}
                  onChange={(e) => updateTuning({ minDurationMs: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>60ms (Snappy)</span>
                  <span>90ms (Balanced)</span>
                  <span>180ms (Slow)</span>
                </div>
              </div>

              {/* Local Rhubarb Companion Runner Toggle */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-700 block text-[11px]">
                    Local Rhubarb CLI Companion (Port 8765)
                  </span>
                  <span className="text-[10px] text-slate-400 block leading-tight">
                    Optional: Connects to <code className="bg-slate-100 px-1 py-0.5 rounded text-[9.5px]">node rhubarb-companion.mjs</code>
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={companionEnabled}
                    onChange={(e) => {
                      setCompanionEnabled(e.target.checked);
                      rhubarbAdapter.setCompanionEnabled(e.target.checked);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Instant Apply & Regenerate Button */}
              <div className="pt-2.5 border-t border-slate-200">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    onGenerateLipSync(tuningSettings);
                    setShowTuning(false);
                  }}
                  disabled={!hasAudio}
                  loading={isGenerating}
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                  className="w-full justify-center"
                >
                  Apply & Regenerate Timeline
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};


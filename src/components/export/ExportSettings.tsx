import React, { useEffect, useState } from 'react';
import { ExportSettings as ExportSettingsType, ExportFormat } from '../../types/export';
import { AspectRatioSelector } from './AspectRatioSelector';
import { checkCodecCapabilities } from '../../services/export/codecSupport';
import { CodecCapabilities } from '../../types/export';
import { AlertCircle, CheckCircle2, Volume2, VolumeX } from 'lucide-react';

export interface ExportSettingsProps {
  settings: ExportSettingsType;
  onChange: (newSettings: ExportSettingsType) => void;
}

export const ExportSettingsComponent: React.FC<ExportSettingsProps> = ({
  settings,
  onChange,
}) => {
  const [capabilities, setCapabilities] = useState<CodecCapabilities | null>(null);

  useEffect(() => {
    checkCodecCapabilities().then(setCapabilities);
  }, []);

  const handleFormatChange = (format: ExportFormat) => {
    let bgType = settings.backgroundType;
    if (format === 'webm-alpha') {
      bgType = 'transparent';
    } else if (bgType === 'transparent') {
      bgType = 'color';
    }
    onChange({
      ...settings,
      format,
      backgroundType: bgType,
    });
  };

  const isAlphaSupported = capabilities?.vp9AlphaSupported || capabilities?.vp8AlphaSupported;

  return (
    <div className="space-y-5">
      {/* Aspect Ratio */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
          1. Select Aspect Ratio & Canvas Size
        </label>
        <AspectRatioSelector
          selectedRatio={settings.aspectRatio}
          onSelect={(ratio, width, height) =>
            onChange({
              ...settings,
              aspectRatio: ratio,
              width,
              height,
            })
          }
        />
      </div>

      {/* Format Selection */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
          2. Export Format & Transparency
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* MP4 Option */}
          <div
            onClick={() => handleFormatChange('mp4')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              settings.format === 'mp4'
                ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-slate-900">Standard MP4 (H.264)</span>
              {capabilities?.mp4Supported ? (
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Hardware/WebCodecs
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">MediaRecorder Fallback</span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Universal compatibility for social media, YouTube, and video editors with a solid or image background.
            </p>
          </div>

          {/* WebM with Alpha Option */}
          <div
            onClick={() => {
              if (isAlphaSupported) {
                handleFormatChange('webm-alpha');
              }
            }}
            className={`p-3.5 rounded-xl border transition-all ${
              !isAlphaSupported
                ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200'
                : settings.format === 'webm-alpha'
                ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 cursor-pointer'
                : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-slate-900">Transparent WebM (VP9/VP8)</span>
              {isAlphaSupported ? (
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Alpha Supported
                </span>
              ) : (
                <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Not Supported
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Preserves true alpha transparency for overlaying into Premiere, Final Cut, DaVinci, or OBS.
            </p>
          </div>
        </div>
      </div>

      {/* Audio Track Option */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
          3. Audio Track
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Include Audio */}
          <div
            onClick={() => onChange({ ...settings, includeAudio: true })}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              settings.includeAudio
                ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div
              className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                settings.includeAudio ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
              }`}
            >
              {settings.includeAudio && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-indigo-600" />
                Include Audio Track
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Exports video with speech & sound synchronized into the file.
              </p>
            </div>
          </div>

          {/* Video Only */}
          <div
            onClick={() => onChange({ ...settings, includeAudio: false })}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
              !settings.includeAudio
                ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div
              className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                !settings.includeAudio ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
              }`}
            >
              {!settings.includeAudio && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <VolumeX className="w-4 h-4 text-slate-500" />
                Video Only (Muted)
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Exports pure visual animation without any audio track.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Frame Rate & Composition Details */}
      <div className="grid grid-cols-2 gap-4 pt-1">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Frame Rate (FPS)
          </label>
          <select
            value={settings.fps}
            onChange={(e) => onChange({ ...settings, fps: parseInt(e.target.value, 10) })}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={30}>30 FPS (Standard)</option>
            <option value={60}>60 FPS (Ultra Smooth)</option>
            <option value={24}>24 FPS (Cinematic Animation)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Character Framing
          </label>
          <select
            value={settings.fitMode}
            onChange={(e) => onChange({ ...settings, fitMode: e.target.value as ExportSettingsType['fitMode'] })}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="contain">Contain (Entire Character Visible)</option>
            <option value="cover">Cover (Fill Screen Crop)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

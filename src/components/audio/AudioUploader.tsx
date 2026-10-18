import React, { useRef, useState } from 'react';
import { Upload, Volume2 } from 'lucide-react';
import { validateAndInspectAudioBlob } from '../../utils/fileValidation';
import { ErrorMessage } from '../common/ErrorMessage';
import { formatTime } from '../../utils/timeUtils';

export interface AudioUploaderProps {
  onAudioLoaded: (name: string, blob: Blob, duration: number, sampleRate: number, channels: number) => void;
  currentAudioName?: string;
  currentDuration?: number;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onAudioLoaded,
  currentAudioName,
  currentDuration,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const { duration, sampleRate, channels } = await validateAndInspectAudioBlob(file);
      onAudioLoaded(file.name, file, duration, sampleRate, channels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid audio file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/wav,audio/mp3,audio/mpeg,audio/ogg,audio/webm,audio/x-m4a,audio/aac"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {currentAudioName ? (
        <div className="flex items-center justify-between p-2 px-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md shrink-0">
              <Volume2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 truncate max-w-[180px] sm:max-w-xs">
                {currentAudioName}
              </div>
              <div className="text-[10px] text-slate-500">
                Duration: {formatTime(currentDuration || 0)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 hover:border-indigo-300 px-2 py-1 rounded-md transition-colors shrink-0"
          >
            Replace
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-slate-300 hover:border-indigo-500 bg-white p-2.5 rounded-lg flex items-center justify-center gap-2 text-center cursor-pointer transition-colors"
        >
          <Upload className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-semibold text-slate-700">
            Click to upload audio (WAV, MP3, OGG)
          </span>
        </div>
      )}
    </div>
  );
};

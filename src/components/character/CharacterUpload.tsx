import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '../common/Button';
import { validateAndLoadImageBlob } from '../../utils/fileValidation';
import { ErrorMessage } from '../common/ErrorMessage';

export interface CharacterUploadProps {
  onUploadSuccess: (name: string, blob: Blob, width: number, height: number) => void;
  onCancel?: () => void;
}

export const CharacterUpload: React.FC<CharacterUploadProps> = ({
  onUploadSuccess,
  onCancel,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [selectedBlob, setSelectedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const { metadata } = await validateAndLoadImageBlob(file);
      setSelectedBlob(file);
      setDimensions(metadata);
      setPreviewUrl(URL.createObjectURL(file));
      if (!characterName) {
        // Default name from filename
        const base = file.name.replace(/\.[^/.]+$/, '');
        setCharacterName(base);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid image file');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBlob || !dimensions || !characterName.trim()) {
      setError('Please provide a character name and image.');
      return;
    }

    onUploadSuccess(characterName.trim(), selectedBlob, dimensions.width, dimensions.height);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Character Name
        </label>
        <input
          type="text"
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value)}
          placeholder="e.g. Cartoon Hero, Talking Robot..."
          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-indigo-500 bg-indigo-50/50'
            : selectedBlob
            ? 'border-emerald-300 bg-emerald-50/20'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/webp,image/jpeg"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        {previewUrl ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-32 h-32 rounded-lg bg-transparency-checker p-2 border border-slate-200 overflow-hidden flex items-center justify-center">
              <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="text-xs text-slate-500">
              {dimensions?.width} × {dimensions?.height} px • Click or drag to replace
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-white shadow-xs border border-slate-200 text-indigo-600 rounded-full">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-sm font-medium text-slate-700">
              Drag & drop character image here, or <span className="text-indigo-600">browse</span>
            </div>
            <p className="text-xs text-slate-400">PNG with transparency recommended (WebP, JPEG also supported)</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={!selectedBlob || !characterName.trim()}
          loading={loading}
          icon={<ImageIcon className="w-4 h-4" />}
        >
          Create Character
        </Button>
      </div>
    </form>
  );
};

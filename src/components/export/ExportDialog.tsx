import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ExportSettingsComponent } from './ExportSettings';
import { ExportProgressComponent } from './ExportProgress';
import { ExportSettings } from '../../types/export';
import { Character } from '../../types/character';
import { MouthAsset } from '../../types/mouth';
import { AnimationTimeline } from '../../types/timeline';
import { useVideoExport } from '../../hooks/useVideoExport';
import { audioRepository } from '../../services/storage/audioRepository';
import { projectRepository } from '../../services/storage/projectRepository';
import { Button } from '../common/Button';
import { Video } from 'lucide-react';

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exportSettings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
  character: Character;
  characterImg: CanvasImageSource;
  mouthAssets: Map<string, { img: CanvasImageSource; asset: MouthAsset }>;
  timeline: AnimationTimeline;
  bgImage?: CanvasImageSource | null;
  audioBlob?: Blob | null;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  exportSettings,
  onSettingsChange,
  character,
  characterImg,
  mouthAssets,
  timeline,
  bgImage,
  audioBlob,
}) => {
  const { progress, startExport, cancelExport, resetExport } = useVideoExport();
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [resolvedAudioBlob, setResolvedAudioBlob] = useState<Blob | null>(audioBlob || null);

  React.useEffect(() => {
    if (audioBlob) {
      setResolvedAudioBlob(audioBlob);
    } else if (timeline.projectId) {
      projectRepository.getById(timeline.projectId).then(async (proj) => {
        if (proj?.audioAssetId) {
          const asset = await audioRepository.getAudioById(proj.audioAssetId);
          if (asset?.blob) {
            setResolvedAudioBlob(asset.blob);
          }
        }
      });
    }
  }, [audioBlob, timeline.projectId]);

  const isExporting = progress.status === 'rendering' || progress.status === 'muxing';

  const handleStart = async () => {
    const effectiveAudioBlob = resolvedAudioBlob || audioBlob;
    const blob = await startExport({
      exportSettings,
      character,
      characterImg,
      mouthAssets,
      timeline,
      bgImage,
      audioBlob: effectiveAudioBlob,
    });
    if (blob) {
      setDownloadBlob(blob);
    }
  };

  const handleDownload = () => {
    const blobToSave = downloadBlob || progress.outputBlob;
    if (!blobToSave) return;

    const ext = exportSettings.format === 'mp4' ? 'mp4' : 'webm';
    const url = URL.createObjectURL(blobToSave);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${character.name.toLowerCase().replace(/\s+/g, '_')}_animation.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleModalClose = () => {
    if (isExporting) {
      cancelExport();
    }
    resetExport();
    setDownloadBlob(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Export Video"
      description="Render your animation client-side without cloud processing."
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {progress.status === 'idle' ? (
          <>
            <ExportSettingsComponent
              settings={exportSettings}
              onChange={onSettingsChange}
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={handleModalClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleStart}
                icon={<Video className="w-4 h-4" />}
              >
                Render Video ({exportSettings.width}×{exportSettings.height})
              </Button>
            </div>
          </>
        ) : (
          <ExportProgressComponent
            progress={progress}
            onCancel={cancelExport}
            onDownload={handleDownload}
            onClose={handleModalClose}
          />
        )}
      </div>
    </Modal>
  );
};

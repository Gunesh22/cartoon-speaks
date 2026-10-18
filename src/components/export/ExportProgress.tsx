import React from 'react';
import { ExportProgress as ExportProgressType } from '../../types/export';
import { ProgressBar } from '../common/ProgressBar';
import { Button } from '../common/Button';
import { Download, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { formatBytes } from '../../utils/formatBytes';

export interface ExportProgressProps {
  progress: ExportProgressType;
  onCancel: () => void;
  onDownload: () => void;
  onClose: () => void;
}

export const ExportProgressComponent: React.FC<ExportProgressProps> = ({
  progress,
  onCancel,
  onDownload,
  onClose,
}) => {
  const { status, renderedFrames, totalFrames, percentage, errorMessage, outputBlob } = progress;

  return (
    <div className="space-y-5 text-center p-2">
      {status === 'rendering' && (
        <div className="space-y-4">
          <div className="text-sm font-semibold text-slate-800">
            Rendering Animation Frames...
          </div>
          <ProgressBar
            progress={percentage}
            label={`Frame ${renderedFrames} of ${totalFrames}`}
            sublabel={`${percentage}%`}
          />
          <p className="text-xs text-slate-400">
            Incremental client-side rendering. Audio and mouth positions remain fully synchronised.
          </p>
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={onCancel} icon={<X className="w-3.5 h-3.5" />}>
              Cancel Export
            </Button>
          </div>
        </div>
      )}

      {status === 'muxing' && (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-800">
            Packaging Video Container (Muxing)...
          </div>
          <ProgressBar progress={95} color="indigo" />
          <p className="text-xs text-slate-400">Assembling final video streams in browser memory.</p>
        </div>
      )}

      {status === 'complete' && (
        <div className="space-y-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900">Video Export Complete!</h4>
            <p className="text-xs text-slate-500 mt-1">
              {outputBlob ? `File size: ${formatBytes(outputBlob.size)}` : ''}
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Done
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={onDownload}
              icon={<Download className="w-4 h-4" />}
            >
              Download Video
            </Button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-rose-900">Export Failed</h4>
            <p className="text-xs text-rose-600 mt-1 max-w-sm mx-auto">{errorMessage}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      )}

      {status === 'cancelled' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-600">Export was cancelled.</p>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
};

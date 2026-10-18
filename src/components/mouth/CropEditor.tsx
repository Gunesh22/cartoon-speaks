import React, { useRef, useEffect, useState } from 'react';
import { CropRect } from '../../types/mouth';
import { Button } from '../common/Button';
import { Check, X } from 'lucide-react';

export interface CropEditorProps {
  sourceImage: HTMLImageElement;
  initialRect: CropRect;
  label: string;
  onSave: (rect: CropRect) => void;
  onCancel: () => void;
}

export const CropEditor: React.FC<CropEditorProps> = ({
  sourceImage,
  initialRect,
  label,
  onSave,
  onCancel,
}) => {
  const [rect, setRect] = useState<CropRect>({ ...initialRect });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Zoomed crop preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Viewport around the crop with 20% margin
    const margin = 30;
    const viewX = Math.max(0, rect.x - margin);
    const viewY = Math.max(0, rect.y - margin);
    const viewWidth = Math.min(sourceImage.naturalWidth - viewX, rect.width + margin * 2);
    const viewHeight = Math.min(sourceImage.naturalHeight - viewY, rect.height + margin * 2);

    canvas.width = Math.max(300, viewWidth * 2);
    canvas.height = Math.max(300, viewHeight * 2);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw source region magnified
    ctx.drawImage(
      sourceImage,
      viewX,
      viewY,
      viewWidth,
      viewHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Draw crop bounding box in canvas coordinates
    const scaleX = canvas.width / viewWidth;
    const scaleY = canvas.height / viewHeight;

    const boxX = (rect.x - viewX) * scaleX;
    const boxY = (rect.y - viewY) * scaleY;
    const boxW = rect.width * scaleX;
    const boxH = rect.height * scaleY;

    // Dim area outside crop
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    // Top
    ctx.fillRect(0, 0, canvas.width, boxY);
    // Bottom
    ctx.fillRect(0, boxY + boxH, canvas.width, canvas.height - (boxY + boxH));
    // Left
    ctx.fillRect(0, boxY, boxX, boxH);
    // Right
    ctx.fillRect(boxX + boxW, boxY, canvas.width - (boxX + boxW), boxH);

    // Bounding stroke
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
  }, [sourceImage, rect]);

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-slate-800 flex items-center justify-between">
        <span>Adjust Crop Boundaries for Shape: <strong className="text-indigo-600">{label}</strong></span>
        <span className="text-xs text-slate-400 font-normal">
          {Math.round(rect.width)} × {Math.round(rect.height)} px
        </span>
      </div>

      <div className="w-full flex justify-center bg-transparency-checker p-2 rounded-xl border border-slate-200">
        <canvas ref={canvasRef} className="max-w-full max-h-[350px] object-contain rounded" />
      </div>

      {/* Manual boundary inputs */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div>
          <label className="text-slate-500 font-medium">X (px)</label>
          <input
            type="number"
            value={Math.round(rect.x)}
            onChange={(e) => setRect({ ...rect, x: parseInt(e.target.value, 10) || 0 })}
            className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5"
          />
        </div>
        <div>
          <label className="text-slate-500 font-medium">Y (px)</label>
          <input
            type="number"
            value={Math.round(rect.y)}
            onChange={(e) => setRect({ ...rect, y: parseInt(e.target.value, 10) || 0 })}
            className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5"
          />
        </div>
        <div>
          <label className="text-slate-500 font-medium">Width (px)</label>
          <input
            type="number"
            value={Math.round(rect.width)}
            onChange={(e) => setRect({ ...rect, width: Math.max(5, parseInt(e.target.value, 10) || 10) })}
            className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5"
          />
        </div>
        <div>
          <label className="text-slate-500 font-medium">Height (px)</label>
          <input
            type="number"
            value={Math.round(rect.height)}
            onChange={(e) => setRect({ ...rect, height: Math.max(5, parseInt(e.target.value, 10) || 10) })}
            className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <Button variant="outline" size="sm" onClick={onCancel} icon={<X className="w-4 h-4" />}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={() => onSave(rect)} icon={<Check className="w-4 h-4" />}>
          Apply Crop
        </Button>
      </div>
    </div>
  );
};

import React, { useRef, useEffect } from 'react';
import { CropRect } from '../../types/mouth';

export interface CropOverlayItem {
  id: string;
  label: string;
  rect: CropRect;
  warning?: string;
}

export interface SpriteSheetPreviewProps {
  sourceImage: HTMLImageElement | null;
  crops: CropOverlayItem[];
  selectedCropId?: string | null;
  onSelectCrop?: (id: string) => void;
  onUpdateCropRect?: (id: string, newRect: CropRect) => void;
}

export const SpriteSheetPreview: React.FC<SpriteSheetPreviewProps> = ({
  sourceImage,
  crops,
  selectedCropId,
  onSelectCrop,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = sourceImage.naturalWidth;
    canvas.height = sourceImage.naturalHeight;

    // Draw sprite sheet
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sourceImage, 0, 0);

    // Draw crop overlays
    for (const crop of crops) {
      const isSelected = crop.id === selectedCropId;
      const { x, y, width, height } = crop.rect;

      // Fill tint
      ctx.fillStyle = isSelected
        ? 'rgba(79, 70, 229, 0.22)'
        : crop.warning
        ? 'rgba(245, 158, 11, 0.15)'
        : 'rgba(59, 130, 246, 0.08)';
      ctx.fillRect(x, y, width, height);

      // Border
      ctx.strokeStyle = isSelected
        ? '#4f46e5'
        : crop.warning
        ? '#d97706'
        : '#3b82f6';
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.strokeRect(x, y, width, height);

      // Label badge
      ctx.fillStyle = isSelected ? '#4f46e5' : crop.warning ? '#d97706' : '#1e293b';
      const badgeHeight = 22;
      const badgeWidth = Math.max(30, crop.label.length * 9 + 12);
      ctx.fillRect(x, y, badgeWidth, badgeHeight);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(crop.label, x + 6, y + 15);
    }
  }, [sourceImage, crops, selectedCropId]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onSelectCrop) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Find clicked crop
    for (let i = crops.length - 1; i >= 0; i--) {
      const c = crops[i];
      if (
        clickX >= c.rect.x &&
        clickX <= c.rect.x + c.rect.width &&
        clickY >= c.rect.y &&
        clickY <= c.rect.y + c.rect.height
      ) {
        onSelectCrop(c.id);
        return;
      }
    }
  };

  return (
    <div className="relative w-full overflow-auto max-h-[500px] bg-transparency-checker rounded-xl border border-slate-200 p-2 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="max-w-full h-auto cursor-pointer shadow-xs rounded"
      />
    </div>
  );
};

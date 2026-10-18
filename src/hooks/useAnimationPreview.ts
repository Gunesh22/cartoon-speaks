import { useEffect, useRef, useCallback } from 'react';
import { Character } from '../types/character';
import { MouthAsset } from '../types/mouth';
import { TimelineCue } from '../types/timeline';
import { ExportSettings } from '../types/export';
import { renderAnimationFrame } from '../services/animation/frameRenderer';
import { getActiveCueAtTime } from '../services/animation/mouthPlacement';
import { audioService } from '../services/audio/audioService';

import { LipSyncTuningSettings } from '../types/timeline';

interface AnimationPreviewParams {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  character: Character | null;
  characterImg: CanvasImageSource | null;
  mouthAssets: Map<string, { img: CanvasImageSource; asset: MouthAsset }>;
  cues: TimelineCue[];
  currentTime: number;
  exportSettings: ExportSettings;
  isPlaying?: boolean;
  bgImage?: CanvasImageSource | null;
  showAlignmentGuides?: boolean;
  activeShapeOverride?: string;
  tuningSettings?: LipSyncTuningSettings;
}

export function resolveMouthEntryForShape(
  mouthAssets: Map<string, { img: CanvasImageSource; asset: MouthAsset }>,
  targetShape: string,
  mouthMapping?: Record<string, string>
): { img: CanvasImageSource; asset: MouthAsset } | undefined {
  if (!mouthAssets || mouthAssets.size === 0) return undefined;
  const upper = targetShape.toUpperCase().trim();

  // 1. By character mapping
  if (mouthMapping) {
    const mappedId = mouthMapping[targetShape] || mouthMapping[upper];
    if (mappedId && mouthAssets.has(mappedId)) {
      return mouthAssets.get(mappedId);
    }
  }

  // 2. Direct match by asset.label
  for (const entry of mouthAssets.values()) {
    if (entry.asset.label.toUpperCase().trim() === upper) return entry;
  }

  // 3. Prefix/fuzzy match
  for (const entry of mouthAssets.values()) {
    const l = entry.asset.label.toUpperCase().trim();
    if (l.startsWith(upper) || l.includes(`_${upper}`) || l.includes(`-${upper}`)) return entry;
  }

  // 4. Neutral fallbacks
  for (const entry of mouthAssets.values()) {
    if (entry.asset.label.toUpperCase().trim() === 'X') return entry;
  }
  for (const entry of mouthAssets.values()) {
    if (entry.asset.label.toUpperCase().trim() === 'A') return entry;
  }

  // 5. Prefer any non-extra, non-blank asset over blank shapes
  for (const entry of mouthAssets.values()) {
    const l = entry.asset.label.toUpperCase().trim();
    if (!l.startsWith('EXTRA_') && !entry.asset.warning?.includes('transparent')) {
      return entry;
    }
  }

  return Array.from(mouthAssets.values())[0];
}

export function isSnapMouthShape(shape: string): boolean {
  const upper = shape.toUpperCase().trim();
  // Closed-lip / stop shapes MUST snap with 0ms blend to eliminate double-mouth ghosting
  return upper === 'A' || upper === 'X' || upper === 'F';
}

export function useAnimationPreview({
  canvasRef,
  character,
  characterImg,
  mouthAssets,
  cues,
  currentTime,
  exportSettings,
  isPlaying = false,
  bgImage,
  showAlignmentGuides = false,
  activeShapeOverride,
  tuningSettings,
}: AnimationPreviewParams) {
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const cuesRef = useRef(cues);
  cuesRef.current = cues;

  const characterRef = useRef(character);
  characterRef.current = character;

  const characterImgRef = useRef(characterImg);
  characterImgRef.current = characterImg;

  const mouthAssetsRef = useRef(mouthAssets);
  mouthAssetsRef.current = mouthAssets;

  const exportSettingsRef = useRef(exportSettings);
  exportSettingsRef.current = exportSettings;

  const bgImageRef = useRef(bgImage);
  bgImageRef.current = bgImage;

  const showGuidesRef = useRef(showAlignmentGuides);
  showGuidesRef.current = showAlignmentGuides;

  const overrideRef = useRef(activeShapeOverride);
  overrideRef.current = activeShapeOverride;

  const tuningSettingsRef = useRef(tuningSettings);
  tuningSettingsRef.current = tuningSettings;

  const renderFrameAtTime = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentExport = exportSettingsRef.current;
    if (canvas.width !== currentExport.width || canvas.height !== currentExport.height) {
      canvas.width = currentExport.width;
      canvas.height = currentExport.height;
    }

    const currentChar = characterRef.current;
    const currentCharImg = characterImgRef.current;

    if (!currentChar || !currentCharImg) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (currentExport.backgroundType === 'color') {
        ctx.fillStyle = currentExport.backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const currentCues = cuesRef.current;
    const activeCue = getActiveCueAtTime(currentCues, time);
    const activeShape = overrideRef.current || (activeCue ? activeCue.shape : 'X');
    const activeMouthEntry = resolveMouthEntryForShape(
      mouthAssetsRef.current,
      activeShape,
      currentChar.mouthMapping
    );

    // Cross-fade: snap for closures (A, X, F); dynamic ease for vowel morphs based on smoothness tuning
    let prevMouthEntry: { img: CanvasImageSource; asset: MouthAsset } | undefined;
    let transitionAlpha = 1.0;
    const smoothness = tuningSettingsRef.current?.smoothness || 'medium';
    const transitionWindowSec = smoothness === 'low' ? 0 : smoothness === 'high' ? 0.050 : 0.025;

    if (!overrideRef.current && activeCue && currentCues.length > 1 && transitionWindowSec > 0) {
      const cueIndex = currentCues.findIndex((c) => c.id === activeCue.id);
      const prevCue = cueIndex > 0 ? currentCues[cueIndex - 1] : null;

      if (
        prevCue &&
        prevCue.shape.toUpperCase().trim() !== activeCue.shape.toUpperCase().trim() &&
        !isSnapMouthShape(activeCue.shape) &&
        !isSnapMouthShape(prevCue.shape)
      ) {
        const timeSinceStart = time - activeCue.start;
        if (timeSinceStart >= 0 && timeSinceStart < transitionWindowSec) {
          prevMouthEntry = resolveMouthEntryForShape(
            mouthAssetsRef.current,
            prevCue.shape,
            currentChar.mouthMapping
          );
          transitionAlpha = timeSinceStart / transitionWindowSec;
        }
      }
    }

    renderAnimationFrame({
      ctx,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      exportSettings: currentExport,
      characterImg: currentCharImg,
      charOriginalWidth: currentChar.imageWidth,
      charOriginalHeight: currentChar.imageHeight,
      mouthImg: activeMouthEntry?.img,
      mouthOriginalWidth: activeMouthEntry?.asset.width || 0,
      mouthOriginalHeight: activeMouthEntry?.asset.height || 0,
      mouthAssetAnchor: {
        anchorX: activeMouthEntry?.asset.anchorX,
        anchorY: activeMouthEntry?.asset.anchorY,
      },
      placement: currentChar.placement,
      bgImage: bgImageRef.current,
      showAlignmentGuides: showGuidesRef.current,
      prevMouthImg: prevMouthEntry?.img,
      prevMouthWidth: prevMouthEntry?.asset.width,
      prevMouthHeight: prevMouthEntry?.asset.height,
      prevMouthAnchor: {
        anchorX: prevMouthEntry?.asset.anchorX,
        anchorY: prevMouthEntry?.asset.anchorY,
      },
      transitionAlpha,
    });
  }, [canvasRef]);

  // Direct Audio Clock rAF Loop during playback (eliminates React render latency)
  useEffect(() => {
    let rafId: number | null = null;

    if (isPlaying) {
      const loop = () => {
        const directTime = audioService.getCurrentTime();
        renderFrameAtTime(directTime);
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    } else {
      renderFrameAtTime(currentTime);
    }

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isPlaying, currentTime, renderFrameAtTime]);
}

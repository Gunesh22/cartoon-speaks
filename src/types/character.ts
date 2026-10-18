import { STANDARD_MOUTH_ANCHOR_X, STANDARD_MOUTH_ANCHOR_Y } from './mouth';

export interface MouthPlacement {
  /** Character anchor X relative to character canvas [0.0 - 1.0] (e.g. 0.50 = 50%) */
  normalizedX: number;
  /** Character anchor Y relative to character canvas [0.0 - 1.0] (e.g. 0.65 = 65%) */
  normalizedY: number;
  /** Rendered mouth width as percentage of character canvas width (e.g. 25.0 = 25%) */
  mouthWidthPercent?: number;
  /** Legacy scale factor for backwards compatibility (1.0 = base size) */
  scale?: number;
  /** Rotation in degrees (clockwise around the anchor point) */
  rotation: number;
  /** Default mouth anchor X [0.0 - 1.0], default 0.5 */
  anchorX?: number;
  /** Default mouth anchor Y [0.0 - 1.0], default 0.46875 (centre of upper lip) */
  anchorY?: number;
}

export const DEFAULT_MOUTH_PLACEMENT: MouthPlacement = {
  normalizedX: 0.5000,
  normalizedY: 0.34375,
  mouthWidthPercent: 25.0,
  scale: 1.0,
  rotation: 0,
  anchorX: STANDARD_MOUTH_ANCHOR_X,
  anchorY: STANDARD_MOUTH_ANCHOR_Y,
};

export interface Character {
  id: string;
  name: string;
  imageBlob: Blob;
  imageWidth: number;
  imageHeight: number;
  mouthCollectionId?: string;
  /** Maps shape label (e.g. 'A', 'B', 'X') to mouth asset ID */
  mouthMapping: Record<string, string>;
  placement: MouthPlacement;
  createdAt: number;
  updatedAt: number;
}

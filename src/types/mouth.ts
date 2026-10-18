export type RhubarbShape = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'X' | 'O';

export interface StandardMouthDefinition {
  label: RhubarbShape | string;
  name: string;
  description: string;
  phoneticSounds: string;
  defaultRow?: number;
  defaultCol?: number;
}

export const STANDARD_RHUBARB_SHAPES: StandardMouthDefinition[] = [
  { label: 'X', name: 'Rest / Neutral', description: 'Default idle / resting mouth shape', phoneticSounds: 'Silence, pause' },
  { label: 'A', name: 'Closed / Smile', description: 'Closed mouth, lips touching or slightly smiling', phoneticSounds: 'M, B, P' },
  { label: 'B', name: 'Slightly Open', description: 'Slightly open with teeth showing', phoneticSounds: 'EE, D, S, T, N, Z' },
  { label: 'C', name: 'Open', description: 'Open mouth with relaxed lips', phoneticSounds: 'EH, AE, K, G, L' },
  { label: 'D', name: 'Wide Open', description: 'Wide open mouth for open vowels', phoneticSounds: 'AA, AH, AY' },
  { label: 'E', name: 'Slightly Rounded', description: 'Slightly rounded open mouth', phoneticSounds: 'AO, ER, O' },
  { label: 'F', name: 'Teeth Visible', description: 'Upper teeth resting on lower lip', phoneticSounds: 'F, V' },
  { label: 'G', name: 'Smile with Teeth', description: 'Smiling mouth with teeth visible', phoneticSounds: 'CH, J, SH' },
  { label: 'H', name: 'Tongue Behind Teeth', description: 'Open mouth with tongue raised', phoneticSounds: 'TH, L' },
  { label: 'O', name: 'Pursed / Rounded', description: 'Small rounded pursed mouth opening', phoneticSounds: 'W, Q, OO' },
];

export interface CropRect {
  x: number;      // Pixel coordinate in source image
  y: number;      // Pixel coordinate in source image
  width: number;  // Pixel width
  height: number; // Pixel height
}

export const STANDARD_MOUTH_ANCHOR_X = 0.5;
export const STANDARD_MOUTH_ANCHOR_Y = 0.46875; // 240 / 512

export interface MouthAsset {
  id: string;
  collectionId: string;
  label: string;
  imageBlob: Blob;
  cropRect: CropRect;
  width: number;
  height: number;
  /** Normalized anchor X coordinate within mouth canvas [0.0 - 1.0], default 0.5 */
  anchorX?: number;
  /** Normalized anchor Y coordinate within mouth canvas [0.0 - 1.0], default 0.46875 (240/512) */
  anchorY?: number;
  warning?: string;
  createdAt: number;
}

export interface MouthCollection {
  id: string;
  name: string;
  description?: string;
  sourceSheetBlob?: Blob;
  sourceSheetWidth?: number;
  sourceSheetHeight?: number;
  templateType: 'standard-template' | 'standard-4x3' | 'grid' | 'detected' | 'manifest';
  assetIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MouthSheetTemplate {
  name: string;
  columns: number;
  rows: number;
  cellWidth?: number;
  cellHeight?: number;
  anchorX: number;
  anchorY: number;
  expectedOrder: string[];
  description: string;
}

export const STANDARD_4X3_TEMPLATE: MouthSheetTemplate = {
  name: 'Standard 4×3 Anime Grid (2048×1536)',
  columns: 4,
  rows: 3,
  cellWidth: 512,
  cellHeight: 512,
  anchorX: 0.5,
  anchorY: 0.46875, // pixel (256, 240) in 512x512
  expectedOrder: ['X', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'O', 'EXTRA_1', 'EXTRA_2'],
  description: 'Fixed 4 columns by 3 rows (2048×1536) with 512×512 cells and anchor at (256, 240)',
};

export const DEFAULT_STANDARD_TEMPLATE: MouthSheetTemplate = {
  name: 'Standard 3×3 Rhubarb Grid',
  columns: 3,
  rows: 3,
  anchorX: 0.5,
  anchorY: 0.46875,
  expectedOrder: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X'],
  description: 'Fixed 3 columns by 3 rows grid with shapes ordered A through X',
};

export const STANDARD_MOUTH_SHEET_PROMPT = `Create a high-resolution 2D cartoon lip-sync mouth sprite sheet matching the supplied character's art style.

**Canvas and layout**

- Total sheet: 2048 × 1536 pixels.
- Transparent background with genuine alpha transparency.
- A fixed 4-column × 3-row grid.
- Each cell is exactly 512 × 512 pixels.
- Keep each mouth entirely inside its own cell, with generous transparent padding.
- Do not include a face, head, skin, nose, glasses, labels, or decorative elements.

**Critical anchor alignment**
The character's mouth anchor is located at normalized character coordinates X = 0.5000 and Y = 0.34375.

Create every mouth with a consistent attachment anchor at cell coordinate X = 256 px, Y = 240 px, measured from the cell's top-left corner.

The anchor represents the centre of the upper lip line where the mouth attaches to the character's face. Keep this point consistent across every mouth shape. Open mouths should extend primarily downward from this anchor.

Do not centre mouths according to their overall visible bounding boxes. Do not shift the anchor between expressions. Do not include a visible green dot or crosshair in the artwork.

**Required mouth shapes**

- X: closed neutral mouth.
- A: slight smile.
- B: lips pressed together (P, B, M).
- C: narrow mouth (T, D, N, L).
- D: wide-open mouth (A, E).
- E: rounded open mouth (O, U).
- F: upper teeth visible (V, F).
- G: smiling mouth with visible teeth.
- H: tongue visible.
- O: small rounded, pursed mouth (W, Q).

Maintain consistent line thickness, shading, proportions, and front-facing orientation.

**Important:** preserve the exact grid dimensions and cell boundaries. If individual PNGs are also produced, each must be 1024 × 1024 pixels with its anchor at (512, 480).

The sprite sheet is intended for automatic cropping and anchor-based placement in a lip-sync application. Prioritise predictable alignment over artistic variation in positioning.`;


/**
 * Applies chroma-keying to convert a solid background color to transparent alpha.
 */
export function removeSolidBackground(
  imageData: ImageData,
  targetColor: { r: number; g: number; b: number },
  tolerance: number = 30
): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const outData = output.data;

  const tr = targetColor.r;
  const tg = targetColor.g;
  const tb = targetColor.b;

  for (let i = 0; i < outData.length; i += 4) {
    const r = outData[i];
    const g = outData[i + 1];
    const b = outData[i + 2];

    const dist = Math.sqrt(
      Math.pow(r - tr, 2) + Math.pow(g - tg, 2) + Math.pow(b - tb, 2)
    );

    if (dist <= tolerance) {
      // Fully transparent
      outData[i + 3] = 0;
    } else if (dist <= tolerance + 15) {
      // Feathered edge
      const alphaFactor = (dist - tolerance) / 15;
      outData[i + 3] = Math.round(outData[i + 3] * alphaFactor);
    }
  }

  return output;
}

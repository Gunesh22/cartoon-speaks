export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const SUPPORTED_AUDIO_TYPES = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/webm', 'audio/x-m4a', 'audio/aac'];

export interface ImageMetadata {
  width: number;
  height: number;
  hasAlpha?: boolean;
}

export async function validateAndLoadImageBlob(blob: Blob): Promise<{ img: HTMLImageElement; metadata: ImageMetadata }> {
  if (!SUPPORTED_IMAGE_TYPES.includes(blob.type) && !blob.type.startsWith('image/')) {
    throw new Error(`Unsupported image type: ${blob.type}. Please use PNG, JPEG, or WebP.`);
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        img,
        metadata: {
          width: img.naturalWidth,
          height: img.naturalHeight,
        },
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image. The file may be corrupt.'));
    };
    img.src = url;
  });
}

export async function validateAndInspectAudioBlob(blob: Blob): Promise<{ duration: number; sampleRate: number; channels: number }> {
  const OfflineCtx =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!OfflineCtx && !AudioCtx) {
    throw new Error('Web Audio API is not supported in this browser.');
  }

  const audioContext = OfflineCtx ? new OfflineCtx(1, 1, 44100) : new AudioCtx();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
    };
  } catch (err) {
    throw new Error(`Failed to decode audio: ${err instanceof Error ? err.message : 'Invalid audio file'}`);
  } finally {
    if ('close' in audioContext && typeof audioContext.close === 'function') {
      audioContext.close().catch(() => {});
    }
  }
}

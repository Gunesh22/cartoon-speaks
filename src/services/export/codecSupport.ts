import { CodecCapabilities } from '../../types/export';

export async function checkCodecCapabilities(): Promise<CodecCapabilities> {
  const result: CodecCapabilities = {
    webCodecsSupported: typeof window !== 'undefined' && 'VideoEncoder' in window,
    mp4Supported: false,
    vp9AlphaSupported: false,
    vp8AlphaSupported: false,
    mediaRecorderSupported: typeof window !== 'undefined' && 'MediaRecorder' in window,
  };

  if (result.webCodecsSupported) {
    try {
      const mp4Check = await VideoEncoder.isConfigSupported({
        codec: 'avc1.42001f', // H.264 baseline
        width: 1280,
        height: 720,
      });
      result.mp4Supported = !!mp4Check.supported;
    } catch {
      result.mp4Supported = false;
    }

    try {
      const vp9Check = await VideoEncoder.isConfigSupported({
        codec: 'vp09.00.10.08',
        width: 1280,
        height: 720,
        alpha: 'keep',
      });
      result.vp9AlphaSupported = !!vp9Check.supported;
    } catch {
      result.vp9AlphaSupported = false;
    }

    try {
      const vp8Check = await VideoEncoder.isConfigSupported({
        codec: 'vp8',
        width: 1280,
        height: 720,
        alpha: 'keep',
      });
      result.vp8AlphaSupported = !!vp8Check.supported;
    } catch {
      result.vp8AlphaSupported = false;
    }
  }

  return result;
}

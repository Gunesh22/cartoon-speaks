import { describe, it, expect } from 'vitest';
import { checkCodecCapabilities } from './codecSupport';

describe('Codec Capabilities Detection', () => {
  it('safely evaluates capabilities without throwing in any environment', async () => {
    const caps = await checkCodecCapabilities();
    expect(typeof caps.webCodecsSupported).toBe('boolean');
    expect(typeof caps.mp4Supported).toBe('boolean');
    expect(typeof caps.vp9AlphaSupported).toBe('boolean');
    expect(typeof caps.mediaRecorderSupported).toBe('boolean');
  });
});

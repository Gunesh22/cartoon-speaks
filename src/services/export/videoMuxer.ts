import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmArrayBufferTarget } from 'webm-muxer';
import { ExportFormat } from '../../types/export';

export interface MuxerWrapper {
  addVideoChunk(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata): void;
  addAudioChunk?(chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata): void;
  finalize(): Blob;
}

export function createVideoMuxer(
  format: ExportFormat,
  width: number,
  height: number,
  hasAudio: boolean,
  sampleRate: number = 44100,
  numberOfChannels: number = 2,
  videoCodec: string = 'vp9'
): MuxerWrapper {
  if (format === 'mp4') {
    const target = new Mp4ArrayBufferTarget();
    const muxer = new Mp4Muxer({
      target,
      video: {
        codec: 'avc',
        width,
        height,
      },
      audio: hasAudio
        ? {
            codec: 'aac',
            numberOfChannels,
            sampleRate,
          }
        : undefined,
      fastStart: 'in-memory',
    });

    return {
      addVideoChunk(chunk, meta) {
        muxer.addVideoChunk(chunk, meta);
      },
      addAudioChunk(chunk, meta) {
        if (hasAudio) {
          const rawDuration = chunk.duration;
          // AAC standard frame size is 1024 samples per frame: duration in micros = (1024 / sampleRate) * 1_000_000
          const fallbackDuration = Math.round((1024 / sampleRate) * 1_000_000);
          const duration =
            rawDuration !== null &&
            rawDuration !== undefined &&
            Number.isFinite(rawDuration) &&
            rawDuration > 0
              ? rawDuration
              : fallbackDuration;

          const data = new Uint8Array(chunk.byteLength);
          chunk.copyTo(data);
          muxer.addAudioChunkRaw(data, chunk.type, chunk.timestamp, duration, meta);
        }
      },
      finalize() {
        muxer.finalize();
        return new Blob([target.buffer], { type: 'video/mp4' });
      },
    };
  } else {
    // webm or webm-alpha
    const target = new WebmArrayBufferTarget();
    const isVp8 = videoCodec.toLowerCase().includes('vp8');
    const muxer = new WebmMuxer({
      target,
      video: {
        codec: isVp8 ? 'V_VP8' : 'V_VP9',
        width,
        height,
        alpha: format === 'webm-alpha',
      },
      audio: hasAudio
        ? {
            codec: 'A_OPUS',
            numberOfChannels,
            sampleRate,
          }
        : undefined,
    });

    return {
      addVideoChunk(chunk, meta) {
        muxer.addVideoChunk(chunk, meta);
      },
      addAudioChunk(chunk, meta) {
        if (hasAudio) {
          const data = new Uint8Array(chunk.byteLength);
          chunk.copyTo(data);
          muxer.addAudioChunkRaw(data, chunk.type, chunk.timestamp, meta);
        }
      },
      finalize() {
        muxer.finalize();
        return new Blob([target.buffer], { type: 'video/webm' });
      },
    };
  }
}

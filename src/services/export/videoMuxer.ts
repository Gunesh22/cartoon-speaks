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
  numberOfChannels: number = 2
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
        if (hasAudio && muxer.addAudioChunk) {
          muxer.addAudioChunk(chunk, meta);
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
    const isVp9 = true;
    const muxer = new WebmMuxer({
      target,
      video: {
        codec: isVp9 ? 'V_VP9' : 'V_VP8',
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
        if (hasAudio && muxer.addAudioChunk) {
          muxer.addAudioChunk(chunk, meta);
        }
      },
      finalize() {
        muxer.finalize();
        return new Blob([target.buffer], { type: 'video/webm' });
      },
    };
  }
}

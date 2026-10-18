import { ExportSettings, ExportProgress } from '../../types/export';
import { Character } from '../../types/character';
import { MouthAsset } from '../../types/mouth';
import { AnimationTimeline } from '../../types/timeline';
import { renderAnimationFrame } from '../animation/frameRenderer';
import { getActiveCueAtTime } from '../animation/mouthPlacement';
import { generateFrameTimeSteps } from '../animation/timelineRenderer';
import { createVideoMuxer } from './videoMuxer';
import { checkCodecCapabilities } from './codecSupport';
import { audioRepository } from '../storage/audioRepository';
import { projectRepository } from '../storage/projectRepository';

export interface ExportJobOptions {
  exportSettings: ExportSettings;
  character: Character;
  characterImg: CanvasImageSource;
  mouthAssets: Map<string, { img: CanvasImageSource; asset: MouthAsset }>;
  timeline: AnimationTimeline;
  bgImage?: CanvasImageSource | null;
  audioBlob?: Blob | null;
  onProgress: (progress: ExportProgress) => void;
  signal?: AbortSignal;
}

function resolveMouthEntryForShape(
  mouthAssets: Map<string, { img: CanvasImageSource; asset: MouthAsset }>,
  shape: string,
  mouthMapping?: Record<string, string>
) {
  if (!mouthAssets || mouthAssets.size === 0) return undefined;
  const targetShape = shape.toUpperCase().trim();

  // 1. Character explicit mapping
  if (mouthMapping) {
    const id = mouthMapping[targetShape];
    if (id && mouthAssets.has(id)) return mouthAssets.get(id);
  }

  // 2. Direct match by asset.label
  for (const entry of mouthAssets.values()) {
    if (entry.asset.label.toUpperCase().trim() === targetShape) return entry;
  }

  // 3. Prefix / fuzzy match
  for (const entry of mouthAssets.values()) {
    const l = entry.asset.label.toUpperCase().trim();
    if (l.startsWith(targetShape) || l.includes(`_${targetShape}`) || l.includes(`-${targetShape}`)) {
      return entry;
    }
  }

  // 4. Fallbacks
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

function safeCloseEncoder(encoder?: VideoEncoder | null) {
  if (!encoder) return;
  try {
    if (encoder.state !== 'closed') {
      encoder.close();
    }
  } catch (err) {
    console.warn('VideoEncoder close ignored:', err);
  }
}

async function resampleAudioBuffer(
  audioBuffer: AudioBuffer,
  targetSampleRate: number
): Promise<AudioBuffer> {
  if (audioBuffer.sampleRate === targetSampleRate) {
    return audioBuffer;
  }

  const OfflineCtxClass =
    typeof window !== 'undefined'
      ? window.OfflineAudioContext ||
        (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext
      : null;

  if (!OfflineCtxClass) {
    console.warn('OfflineAudioContext not available; using original sample rate');
    return audioBuffer;
  }

  const numberOfChannels = audioBuffer.numberOfChannels;
  const targetLength = Math.max(1, Math.ceil(audioBuffer.duration * targetSampleRate));
  const offlineCtx = new OfflineCtxClass(
    numberOfChannels,
    targetLength,
    targetSampleRate
  );

  const bufferSource = offlineCtx.createBufferSource();
  bufferSource.buffer = audioBuffer;
  bufferSource.connect(offlineCtx.destination);
  bufferSource.start(0);

  return await offlineCtx.startRendering();
}

function safeCloseAudioEncoder(encoder?: AudioEncoder | null) {
  if (!encoder) return;
  try {
    if (encoder.state !== 'closed') {
      encoder.close();
    }
  } catch (err) {
    console.warn('AudioEncoder close ignored:', err);
  }
}

async function resolveEncoderConfig(
  format: ExportSettings['format'],
  width: number,
  height: number,
  fps: number,
  bitrate: number = 4_000_000
): Promise<VideoEncoderConfig> {
  const isAlpha = format === 'webm-alpha';

  if (format === 'mp4') {
    const candidates = [
      'avc1.64002a', // High Profile, Level 4.2 (supports up to 1080p60)
      'avc1.640033', // High Profile, Level 5.1 (supports up to 4K)
      'avc1.4d002a', // Main Profile, Level 4.2
      'avc1.42002a', // Baseline Profile, Level 4.2
      'avc1.42001f', // Baseline Profile, Level 3.1 (720p)
    ];

    for (const codec of candidates) {
      try {
        const config: VideoEncoderConfig = {
          codec,
          width,
          height,
          bitrate,
          framerate: fps,
        };
        const res = await VideoEncoder.isConfigSupported(config);
        if (res.supported && res.config) {
          return res.config;
        }
      } catch {
        // try next
      }
    }
    return {
      codec: 'avc1.42001f',
      width,
      height,
      bitrate,
      framerate: fps,
    };
  }

  // WebM / VP9 / VP8
  const webmCandidates = ['vp09.00.10.08', 'vp09.02.10.10', 'vp8'];

  for (const codec of webmCandidates) {
    try {
      const config: VideoEncoderConfig = {
        codec,
        width,
        height,
        bitrate,
        framerate: fps,
        alpha: isAlpha ? 'keep' : 'discard',
      };
      const res = await VideoEncoder.isConfigSupported(config);
      if (res.supported && res.config) {
        return res.config;
      }
    } catch {
      // try next
    }
  }

  return {
    codec: 'vp09.00.10.08',
    width,
    height,
    bitrate,
    framerate: fps,
    alpha: isAlpha ? 'keep' : 'discard',
  };
}

export class ExportService {
  async exportVideo(options: ExportJobOptions): Promise<Blob> {
    const {
      exportSettings,
      character,
      characterImg,
      mouthAssets,
      timeline,
      bgImage,
      audioBlob,
      onProgress,
      signal,
    } = options;

    // Auto-resolve audio blob from IndexedDB if not directly in memory
    let activeAudioBlob = audioBlob;
    if (!activeAudioBlob && timeline.projectId) {
      try {
        const proj = await projectRepository.getById(timeline.projectId);
        if (proj?.audioAssetId) {
          const asset = await audioRepository.getAudioById(proj.audioAssetId);
          if (asset?.blob) {
            activeAudioBlob = asset.blob;
          }
        }
      } catch (err) {
        console.warn('Could not auto-load persisted audio asset from IndexedDB:', err);
      }
    }

    const effectiveSettings: ExportSettings = {
      ...exportSettings,
      includeAudio: exportSettings.includeAudio !== false,
    };

    const capabilities = await checkCodecCapabilities();
    const duration = Math.max(0.5, timeline.duration);
    const fps = effectiveSettings.fps || 30;
    // Ensure even dimensions for video codecs
    const width = Math.floor(effectiveSettings.width / 2) * 2;
    const height = Math.floor(effectiveSettings.height / 2) * 2;
    const format = effectiveSettings.format;

    // Validate format against capabilities
    if (format === 'webm-alpha' && !capabilities.vp9AlphaSupported && !capabilities.vp8AlphaSupported) {
      throw new Error(
        'Alpha transparent WebM encoding is not supported in this browser. Please use standard MP4 or WebM with a solid/image background.'
      );
    }

    if (format === 'mp4' && !capabilities.mp4Supported && !capabilities.webCodecsSupported) {
      // If WebCodecs is not supported, check MediaRecorder fallback
      if (!capabilities.mediaRecorderSupported) {
        throw new Error('Neither WebCodecs nor MediaRecorder are supported in this browser.');
      }
    }

    const timeSteps = generateFrameTimeSteps(duration, fps);

    // Use OffscreenCanvas or DOM Canvas
    const canvas = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    if (!ctx) throw new Error('Could not create 2D canvas context for rendering');

    // If WebCodecs VideoEncoder is available, use it for frame-accurate offline rendering!
    if (capabilities.webCodecsSupported) {
      try {
        return await this.exportWithWebCodecs({
          canvas,
          ctx,
          width,
          height,
          fps,
          format,
          duration,
          timeSteps,
          character,
          characterImg,
          mouthAssets,
          timeline,
          bgImage,
          audioBlob: activeAudioBlob,
          exportSettings: effectiveSettings,
          onProgress,
          signal,
        });
      } catch (err) {
        if (signal?.aborted) {
          throw err;
        }
        console.warn('WebCodecs export encountered an error, falling back to MediaRecorder:', err);
        if (capabilities.mediaRecorderSupported) {
          return await this.exportWithMediaRecorder({
            canvas,
            ctx,
            width,
            height,
            fps,
            duration,
            timeSteps,
            character,
            characterImg,
            mouthAssets,
            timeline,
            bgImage,
            audioBlob: activeAudioBlob,
            exportSettings: effectiveSettings,
            onProgress,
            signal,
          });
        }
        throw err;
      }
    } else {
      // Fallback: Realtime MediaRecorder
      return this.exportWithMediaRecorder({
        canvas,
        ctx,
        width,
        height,
        fps,
        duration,
        timeSteps,
        character,
        characterImg,
        mouthAssets,
        timeline,
        bgImage,
        audioBlob: activeAudioBlob,
        exportSettings: effectiveSettings,
        onProgress,
        signal,
      });
    }
  }

  private async exportWithWebCodecs(params: {
    canvas: OffscreenCanvas | HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    width: number;
    height: number;
    fps: number;
    format: ExportSettings['format'];
    duration: number;
    timeSteps: Array<{ frameIndex: number; timestamp: number; timestampMicros: number }>;
    character: Character;
    characterImg: CanvasImageSource;
    mouthAssets: Map<string, { img: CanvasImageSource; asset: MouthAsset }>;
    timeline: AnimationTimeline;
    bgImage?: CanvasImageSource | null;
    audioBlob?: Blob | null;
    exportSettings: ExportSettings;
    onProgress: (progress: ExportProgress) => void;
    signal?: AbortSignal;
  }): Promise<Blob> {
    const {
      canvas,
      ctx,
      width,
      height,
      fps,
      format,
      duration,
      timeSteps,
      character,
      characterImg,
      mouthAssets,
      timeline,
      bgImage,
      audioBlob,
      exportSettings,
      onProgress,
      signal,
    } = params;

    // Check if audio track should be included and prepare decoded audio data
    let decodedAudio: {
      buffer: AudioBuffer;
      sampleRate: number;
      numberOfChannels: number;
      config: AudioEncoderConfig;
      chunkSize: number;
    } | null = null;

    if (exportSettings.includeAudio && audioBlob && typeof AudioEncoder !== 'undefined') {
      try {
        const AudioCtxClass =
          typeof window !== 'undefined'
            ? window.AudioContext ||
              (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
            : null;

        if (AudioCtxClass) {
          const audioCtx = new AudioCtxClass();
          const arrayBuffer = await audioBlob.arrayBuffer();
          const rawBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          audioCtx.close().catch(() => {});

          const isMp4 = format === 'mp4';
          const codec = isMp4 ? 'mp4a.40.2' : 'opus';

          // Opus strictly requires 48000, 24000, 16000, 12000, or 8000 Hz. 48000 is universal.
          // AAC supports 44100 or 48000 Hz.
          const targetSampleRate = isMp4
            ? (rawBuffer.sampleRate === 48000 ? 48000 : 44100)
            : 48000;

          // Opus standard 20ms frame = 960 samples @ 48kHz. AAC frame = 1024 samples.
          const chunkSize = isMp4 ? 1024 : 960;

          const buffer = await resampleAudioBuffer(rawBuffer, targetSampleRate);
          const numberOfChannels = Math.min(2, buffer.numberOfChannels);

          const config: AudioEncoderConfig = {
            codec,
            sampleRate: targetSampleRate,
            numberOfChannels,
            bitrate: 128_000,
          };

          const support = await AudioEncoder.isConfigSupported(config);
          if (support.supported) {
            decodedAudio = {
              buffer,
              sampleRate: targetSampleRate,
              numberOfChannels,
              config,
              chunkSize,
            };
          } else {
            console.warn(`AudioEncoder configuration not supported for ${codec}:`, config);
          }
        }
      } catch (err) {
        console.warn('Could not decode or configure audio for AudioEncoder:', err);
      }
    }

    const encoderConfig = await resolveEncoderConfig(format, width, height, fps);
    const hasAudio = !!decodedAudio;
    const muxer = createVideoMuxer(
      format,
      width,
      height,
      hasAudio,
      decodedAudio?.sampleRate || (format === 'mp4' ? 44100 : 48000),
      decodedAudio?.numberOfChannels || 2,
      encoderConfig.codec
    );

    let encoderError: Error | null = null;
    let encoder: VideoEncoder | null = null;
    let audioEncoder: AudioEncoder | null = null;

    let nextAudioOffset = 0;
    let totalAudioFrames = 0;
    let ch0: Float32Array = new Float32Array(0);
    let ch1: Float32Array = new Float32Array(0);
    let audioChunkSize = 1024;
    let audioSampleRate = 44100;
    let audioChannels = 2;

    if (decodedAudio) {
      audioSampleRate = decodedAudio.sampleRate;
      audioChannels = decodedAudio.numberOfChannels;
      audioChunkSize = decodedAudio.chunkSize;
      totalAudioFrames = decodedAudio.buffer.length;
      ch0 = decodedAudio.buffer.getChannelData(0);
      ch1 = audioChannels > 1 ? decodedAudio.buffer.getChannelData(1) : ch0;

      try {
        audioEncoder = new AudioEncoder({
          output: (chunk, meta) => {
            muxer.addAudioChunk?.(chunk, meta);
          },
          error: (e) => {
            console.error('AudioEncoder error:', e);
            encoderError = e;
          },
        });
        audioEncoder.configure(decodedAudio.config);
      } catch (err) {
        console.warn('Failed to configure AudioEncoder:', err);
        safeCloseAudioEncoder(audioEncoder);
        audioEncoder = null;
      }
    }

    const encodeAudioUpTo = (targetTimestampMicros: number) => {
      if (!audioEncoder || audioEncoder.state !== 'configured') return;

      while (nextAudioOffset < totalAudioFrames) {
        const chunkTimestampMicros = Math.round((nextAudioOffset / audioSampleRate) * 1_000_000);
        if (chunkTimestampMicros > targetTimestampMicros) {
          break;
        }

        const framesInChunk = Math.min(audioChunkSize, totalAudioFrames - nextAudioOffset);
        const planarData = new Float32Array(audioChunkSize * audioChannels);
        planarData.set(ch0.subarray(nextAudioOffset, nextAudioOffset + framesInChunk), 0);
        if (audioChannels > 1) {
          planarData.set(ch1.subarray(nextAudioOffset, nextAudioOffset + framesInChunk), audioChunkSize);
        }

        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate: audioSampleRate,
          numberOfFrames: audioChunkSize,
          numberOfChannels: audioChannels,
          timestamp: chunkTimestampMicros,
          data: planarData,
        });

        audioEncoder.encode(audioData);
        audioData.close();
        nextAudioOffset += audioChunkSize;
      }
    };

    try {
      encoder = new VideoEncoder({
        output: (chunk, meta) => {
          muxer.addVideoChunk(chunk, meta);
        },
        error: (e) => {
          encoderError = e;
        },
      });

      encoder.configure(encoderConfig);

      const totalFrames = timeSteps.length;

      for (let i = 0; i < totalFrames; i++) {
        if (signal?.aborted) {
          throw new Error('Export was cancelled by user');
        }

        if (encoderError) {
          throw encoderError;
        }

        if (encoder.state !== 'configured') {
          throw new Error(`VideoEncoder is not configured (current state: ${encoder.state})`);
        }

        const step = timeSteps[i];

        // Interleave audio encoding up to this video frame's upcoming end
        const nextTimestampMicros =
          i + 1 < totalFrames
            ? timeSteps[i + 1].timestampMicros
            : Math.round(duration * 1_000_000);
        encodeAudioUpTo(nextTimestampMicros);

        const activeCue = getActiveCueAtTime(timeline.cues, step.timestamp);
        const targetShape = activeCue ? activeCue.shape : 'X';
        const mouthEntry = resolveMouthEntryForShape(mouthAssets, targetShape, character.mouthMapping);

        // Snap-to-closure for A, X, F (stops/bilabials); 20ms quick ease for open vowels
        const isSnapShape = (s: string) => {
          const u = s.toUpperCase().trim();
          return u === 'A' || u === 'X' || u === 'F';
        };

        let prevMouthEntry: { img: CanvasImageSource; asset: MouthAsset } | undefined;
        let transitionAlpha = 1.0;
        const transitionWindowSec = 0.020;

        if (activeCue && timeline.cues.length > 1) {
          const cueIndex = timeline.cues.findIndex((c) => c.id === activeCue.id);
          const prevCue = cueIndex > 0 ? timeline.cues[cueIndex - 1] : null;

          if (
            prevCue &&
            prevCue.shape.toUpperCase().trim() !== activeCue.shape.toUpperCase().trim() &&
            !isSnapShape(activeCue.shape) &&
            !isSnapShape(prevCue.shape)
          ) {
            const timeSinceStart = step.timestamp - activeCue.start;
            if (timeSinceStart >= 0 && timeSinceStart < transitionWindowSec) {
              prevMouthEntry = resolveMouthEntryForShape(mouthAssets, prevCue.shape, character.mouthMapping);
              transitionAlpha = timeSinceStart / transitionWindowSec;
            }
          }
        }

        // Render frame
        renderAnimationFrame({
          ctx,
          canvasWidth: width,
          canvasHeight: height,
          exportSettings,
          characterImg,
          charOriginalWidth: character.imageWidth,
          charOriginalHeight: character.imageHeight,
          mouthImg: mouthEntry?.img,
          mouthOriginalWidth: mouthEntry?.asset.width || 0,
          mouthOriginalHeight: mouthEntry?.asset.height || 0,
          mouthAssetAnchor: {
            anchorX: mouthEntry?.asset.anchorX,
            anchorY: mouthEntry?.asset.anchorY,
          },
          placement: character.placement,
          bgImage,
          prevMouthImg: prevMouthEntry?.img,
          prevMouthWidth: prevMouthEntry?.asset.width,
          prevMouthHeight: prevMouthEntry?.asset.height,
          prevMouthAnchor: {
            anchorX: prevMouthEntry?.asset.anchorX,
            anchorY: prevMouthEntry?.asset.anchorY,
          },
          transitionAlpha,
        });

        // Construct VideoFrame
        const frame = new VideoFrame(canvas as CanvasImageSource, {
          timestamp: step.timestampMicros,
          duration: Math.round((1 / fps) * 1_000_000),
          alpha: format === 'webm-alpha' ? 'keep' : 'discard',
        });

        const isKeyFrame = i % (fps * 2) === 0;
        try {
          encoder.encode(frame, { keyFrame: isKeyFrame });
        } finally {
          frame.close();
        }

        // Report progress
        const progressPercent = Math.round(((i + 1) / totalFrames) * 90);
        onProgress({
          status: 'rendering',
          renderedFrames: i + 1,
          totalFrames,
          percentage: progressPercent,
        });

        // Yield event loop occasionally to avoid blocking the main thread
        if (i % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      if (encoderError) {
        throw encoderError;
      }

      // Encode any remaining audio chunks (if audio extends slightly past animation)
      if (audioEncoder && audioEncoder.state === 'configured') {
        encodeAudioUpTo(Infinity);
      }

      onProgress({
        status: 'muxing',
        renderedFrames: totalFrames,
        totalFrames,
        percentage: 95,
      });

      const flushPromises: Promise<void>[] = [];
      if (encoder.state === 'configured') {
        flushPromises.push(encoder.flush());
      }
      if (audioEncoder && audioEncoder.state === 'configured') {
        flushPromises.push(audioEncoder.flush());
      }
      await Promise.all(flushPromises);

      safeCloseEncoder(encoder);
      safeCloseAudioEncoder(audioEncoder);

      const outputBlob = muxer.finalize();

      onProgress({
        status: 'complete',
        renderedFrames: totalFrames,
        totalFrames,
        percentage: 100,
        outputBlob,
      });

      return outputBlob;
    } catch (err) {
      safeCloseEncoder(encoder);
      safeCloseAudioEncoder(audioEncoder);
      throw err;
    }
  }

  private async exportWithMediaRecorder(params: {
    canvas: OffscreenCanvas | HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    width: number;
    height: number;
    fps: number;
    duration: number;
    timeSteps: Array<{ frameIndex: number; timestamp: number }>;
    character: Character;
    characterImg: CanvasImageSource;
    mouthAssets: Map<string, { img: CanvasImageSource; asset: MouthAsset }>;
    timeline: AnimationTimeline;
    bgImage?: CanvasImageSource | null;
    audioBlob?: Blob | null;
    exportSettings: ExportSettings;
    onProgress: (progress: ExportProgress) => void;
    signal?: AbortSignal;
  }): Promise<Blob> {
    const {
      canvas,
      ctx,
      width,
      height,
      fps,
      timeSteps,
      character,
      characterImg,
      mouthAssets,
      timeline,
      bgImage,
      audioBlob,
      exportSettings,
      onProgress,
      signal,
    } = params;

    const domCanvas = canvas instanceof HTMLCanvasElement ? canvas : document.createElement('canvas');
    domCanvas.width = width;
    domCanvas.height = height;

    let audioCtx: AudioContext | null = null;
    let sourceNode: AudioBufferSourceNode | null = null;
    let audioTrack: MediaStreamTrack | null = null;

    if (exportSettings.includeAudio && audioBlob) {
      try {
        const AudioCtxClass =
          typeof window !== 'undefined'
            ? window.AudioContext ||
              (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
            : null;

        if (AudioCtxClass) {
          audioCtx = new AudioCtxClass();
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          const destNode = audioCtx.createMediaStreamDestination();
          sourceNode = audioCtx.createBufferSource();
          sourceNode.buffer = audioBuffer;
          sourceNode.connect(destNode);

          audioTrack = destNode.stream.getAudioTracks()[0] || null;
        }
      } catch (err) {
        console.warn('Failed to prepare audio track for MediaRecorder:', err);
      }
    }

    const canvasStream = domCanvas.captureStream(fps);
    const videoTracks = canvasStream.getVideoTracks();
    const tracksToRecord: MediaStreamTrack[] = [...videoTracks];
    if (audioTrack) {
      tracksToRecord.push(audioTrack);
    }
    const combinedStream = new MediaStream(tracksToRecord);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(combinedStream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.start();
    if (sourceNode) {
      sourceNode.start(0);
    }

    const totalFrames = timeSteps.length;
    const frameIntervalMs = 1000 / fps;

    for (let i = 0; i < totalFrames; i++) {
      if (signal?.aborted) {
        try {
          sourceNode?.stop();
          audioCtx?.close().catch(() => {});
        } catch {
          // ignore
        }
        recorder.stop();
        throw new Error('Export was cancelled by user');
      }

      const step = timeSteps[i];

      const activeCue = getActiveCueAtTime(timeline.cues, step.timestamp);
      const targetShape = activeCue ? activeCue.shape : 'X';
      const mouthEntry = resolveMouthEntryForShape(mouthAssets, targetShape, character.mouthMapping);

      // Snap-to-closure for A, X, F (stops/bilabials); 20ms quick ease for open vowels
      const isSnapShape = (s: string) => {
        const u = s.toUpperCase().trim();
        return u === 'A' || u === 'X' || u === 'F';
      };

      let prevMouthEntry: { img: CanvasImageSource; asset: MouthAsset } | undefined;
      let transitionAlpha = 1.0;
      const transitionWindowSec = 0.020;

      if (activeCue && timeline.cues.length > 1) {
        const cueIndex = timeline.cues.findIndex((c) => c.id === activeCue.id);
        const prevCue = cueIndex > 0 ? timeline.cues[cueIndex - 1] : null;

        if (
          prevCue &&
          prevCue.shape.toUpperCase().trim() !== activeCue.shape.toUpperCase().trim() &&
          !isSnapShape(activeCue.shape) &&
          !isSnapShape(prevCue.shape)
        ) {
          const timeSinceStart = step.timestamp - activeCue.start;
          if (timeSinceStart >= 0 && timeSinceStart < transitionWindowSec) {
            prevMouthEntry = resolveMouthEntryForShape(mouthAssets, prevCue.shape, character.mouthMapping);
            transitionAlpha = timeSinceStart / transitionWindowSec;
          }
        }
      }

      renderAnimationFrame({
        ctx,
        canvasWidth: width,
        canvasHeight: height,
        exportSettings,
        characterImg,
        charOriginalWidth: character.imageWidth,
        charOriginalHeight: character.imageHeight,
        mouthImg: mouthEntry?.img,
        mouthOriginalWidth: mouthEntry?.asset.width || 0,
        mouthOriginalHeight: mouthEntry?.asset.height || 0,
        mouthAssetAnchor: {
          anchorX: mouthEntry?.asset.anchorX,
          anchorY: mouthEntry?.asset.anchorY,
        },
        placement: character.placement,
        bgImage,
        prevMouthImg: prevMouthEntry?.img,
        prevMouthWidth: prevMouthEntry?.asset.width,
        prevMouthHeight: prevMouthEntry?.asset.height,
        prevMouthAnchor: {
          anchorX: prevMouthEntry?.asset.anchorX,
          anchorY: prevMouthEntry?.asset.anchorY,
        },
        transitionAlpha,
      });

      const progressPercent = Math.round(((i + 1) / totalFrames) * 95);
      onProgress({
        status: 'rendering',
        renderedFrames: i + 1,
        totalFrames,
        percentage: progressPercent,
      });

      await new Promise((resolve) => setTimeout(resolve, frameIntervalMs));
    }

    return new Promise((resolve) => {
      recorder.onstop = () => {
        try {
          sourceNode?.stop();
          audioCtx?.close().catch(() => {});
        } catch {
          // ignore
        }
        const outputBlob = new Blob(chunks, { type: mimeType });
        onProgress({
          status: 'complete',
          renderedFrames: totalFrames,
          totalFrames,
          percentage: 100,
          outputBlob,
        });
        resolve(outputBlob);
      };
      recorder.stop();
    });
  }
}

export const exportService = new ExportService();

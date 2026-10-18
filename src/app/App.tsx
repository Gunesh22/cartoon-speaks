import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ActiveTab } from '../components/layout/Sidebar';
import { CharacterLibrary } from '../components/character/CharacterLibrary';
import { MouthCollectionLibrary } from '../components/mouth/MouthCollectionLibrary';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import { AnimationPreview } from '../components/preview/AnimationPreview';
import { PreviewControls } from '../components/preview/PreviewControls';
import { AudioUploader } from '../components/audio/AudioUploader';
import { AudioPlayer } from '../components/audio/AudioPlayer';
import { ScriptEditor } from '../components/audio/ScriptEditor';
import { TimelineEditor } from '../components/timeline/TimelineEditor';
import { ExportDialog } from '../components/export/ExportDialog';
import { ExportSettingsComponent } from '../components/export/ExportSettings';
import { Button } from '../components/common/Button';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { useCharacters } from '../hooks/useCharacters';
import { useMouthCollections } from '../hooks/useMouthCollections';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useTimeline } from '../hooks/useTimeline';
import { projectRepository } from '../services/storage/projectRepository';
import { characterRepository } from '../services/storage/characterRepository';
import { audioRepository } from '../services/storage/audioRepository';
import { mouthRepository } from '../services/storage/mouthRepository';
import { imageCache } from '../services/image/imageLoader';
import { manualLipSyncEngine } from '../services/lipsync/ManualLipSyncEngine';
import { rhubarbAdapter } from '../services/lipsync/RhubarbAdapter';
import { audioService, WaveformData } from '../services/audio/audioService';
import { Project } from '../types/project';
import { Character } from '../types/character';
import { MouthAsset, STANDARD_RHUBARB_SHAPES } from '../types/mouth';
import { AudioAsset, LipSyncTuningSettings } from '../types/timeline';
import { CharacterEditor } from '../components/character/CharacterEditor';
import { MouthAlignmentDebugger } from '../components/debugger/MouthAlignmentDebugger';
import { Modal } from '../components/common/Modal';
import { LipSyncDiagnosticsPanel } from '../components/debugger/LipSyncDiagnosticsPanel';
import {
  Video,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Crosshair,
  AlertCircle,
  Activity,
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('characters');
  const [project, setProject] = useState<Project | null>(null);
  const [currentAudio, setCurrentAudio] = useState<AudioAsset | null>(null);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isGeneratingLipSync, setIsGeneratingLipSync] = useState(false);
  const [isEditingPlacementModal, setIsEditingPlacementModal] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Loaded media references for preview & export
  const [charImg, setCharImg] = useState<HTMLImageElement | null>(null);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [mouthImageMap, setMouthImageMap] = useState<
    Map<string, { img: CanvasImageSource; asset: MouthAsset }>
  >(new Map());
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(false);
  const [activeTestShape, setActiveTestShape] = useState<string | null>(null);

  // Data hooks
  const {
    characters,
    loadCharacters,
    createCharacter,
    updateCharacterPlacement,
    updateCharacterMouthMapping,
    duplicateCharacter,
    deleteCharacter,
  } = useCharacters();

  const {
    collections: mouthCollections,
    loadCollections,
    getAssetsForCollection,
    deleteCollection,
  } = useMouthCollections();

  const audioPlayer = useAudioPlayer();
  const timeline = useTimeline(5.0);

  // Initialize or load current active project
  useEffect(() => {
    projectRepository.getAll().then(async (projects) => {
      if (projects.length > 0) {
        setProject(projects[0]);
      } else {
        const newProj = await projectRepository.create('My Cartoon Animation');
        setProject(newProj);
      }
    });
  }, []);

  // Sync project state changes to IndexedDB
  const handleUpdateProject = useCallback(
    async (updates: Partial<Project>) => {
      if (!project) return;
      const updated = { ...project, ...updates, updatedAt: Date.now() };
      setProject(updated);
      await projectRepository.update(project.id, updates);
    },
    [project]
  );

  // Smart animation play/pause toggle that auto-generates lip-sync cues if empty
  const handleTogglePlay = useCallback(async () => {
    const totalDuration = audioPlayer.duration || currentAudio?.duration || timeline.duration || 5.0;
    if (!audioPlayer.isPlaying && audioPlayer.currentTime >= totalDuration - 0.05) {
      audioPlayer.seek(0);
    }
    if (!audioPlayer.isPlaying && currentAudio && timeline.cues.length <= 1) {
      try {
        setIsGeneratingLipSync(true);
        const result = await manualLipSyncEngine.generateLipSync(
          currentAudio.blob,
          project?.scriptText || '',
          currentAudio.duration
        );
        timeline.loadCues(result.cues, result.duration);
        if (project) {
          await audioRepository.saveTimeline(project.id, result.duration, result.cues);
        }
      } catch (err) {
        console.warn('Auto lip-sync generation error on play', err);
      } finally {
        setIsGeneratingLipSync(false);
      }
    }
    audioPlayer.togglePlay();
  }, [audioPlayer, currentAudio, timeline, project]);

  // Global spacebar shortcut for animation play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const activeEl = document.activeElement;
        const isInput =
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            (activeEl as HTMLElement).isContentEditable);
        if (!isInput) {
          e.preventDefault();
          handleTogglePlay();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay]);

  // Selected character
  const selectedCharacter = useMemo(
    () => characters.find((c) => c.id === project?.characterId) || characters[0] || null,
    [characters, project?.characterId]
  );

  // Active mouth collection for project / character
  const activeMouthCollection = useMemo(
    () =>
      mouthCollections.find((c) => c.id === selectedCharacter?.mouthCollectionId) ||
      mouthCollections[0] ||
      null,
    [mouthCollections, selectedCharacter?.mouthCollectionId]
  );

  const [debuggerAssets, setDebuggerAssets] = useState<MouthAsset[]>([]);

  const loadDebuggerAssets = useCallback(async () => {
    if (!activeMouthCollection?.id) {
      setDebuggerAssets([]);
      return;
    }
    const assets = await mouthRepository.getAssetsByCollectionId(activeMouthCollection.id);
    setDebuggerAssets(assets);
  }, [activeMouthCollection?.id]);

  useEffect(() => {
    loadDebuggerAssets();
  }, [loadDebuggerAssets]);

  // Load character image when selected character changes
  useEffect(() => {
    let active = true;
    if (selectedCharacter) {
      imageCache.getLoadedImage(selectedCharacter.id, selectedCharacter.imageBlob).then((img) => {
        if (active) setCharImg(img);
      });
    } else {
      setCharImg(null);
    }
    return () => {
      active = false;
    };
  }, [selectedCharacter]);

  // Clear active test shape override when playback starts
  useEffect(() => {
    if (audioPlayer.isPlaying) {
      setActiveTestShape(null);
    }
  }, [audioPlayer.isPlaying]);

  // Load mouth assets when selected character or available mouth collections change
  useEffect(() => {
    let active = true;

    // Determine target collection ID: explicitly configured on character, or default to first available
    const targetCollectionId =
      selectedCharacter?.mouthCollectionId ||
      (mouthCollections.length > 0 ? mouthCollections[0].id : null);

    if (!targetCollectionId) {
      setMouthImageMap(new Map());
      return;
    }

    mouthRepository.getAssetsByCollectionId(targetCollectionId).then(async (assets) => {
      if (!active) return;
      if (!assets || assets.length === 0) {
        setMouthImageMap(new Map());
        return;
      }

      // If character doesn't have a linked collection or has missing mappings, auto-link & populate
      if (selectedCharacter) {
        const autoMapping: Record<string, string> = { ...(selectedCharacter.mouthMapping || {}) };
        let hasChanges = selectedCharacter.mouthCollectionId !== targetCollectionId;
        for (const a of assets) {
          const upper = a.label.toUpperCase().trim();
          if (!autoMapping[upper]) {
            autoMapping[upper] = a.id;
            hasChanges = true;
          }
          if (!autoMapping[a.label]) {
            autoMapping[a.label] = a.id;
            hasChanges = true;
          }
        }
        if (hasChanges) {
          await updateCharacterMouthMapping(selectedCharacter.id, targetCollectionId, autoMapping);
        }
      }

      const map = new Map<string, { img: CanvasImageSource; asset: MouthAsset }>();
      for (const a of assets) {
        try {
          const img = await imageCache.getLoadedImage(a.id, a.imageBlob);
          map.set(a.id, { img, asset: a });
        } catch (e) {
          console.warn('Failed to load mouth asset for preview', e);
        }
      }
      if (active) setMouthImageMap(map);
    });

    return () => {
      active = false;
    };
  }, [selectedCharacter?.id, selectedCharacter?.mouthCollectionId, mouthCollections, updateCharacterMouthMapping]);

  // Load audio asset and timeline for the project
  useEffect(() => {
    if (!project) return;

    if (project.audioAssetId) {
      audioRepository.getAudioById(project.audioAssetId).then(async (audio) => {
        if (audio) {
          setCurrentAudio(audio);
          await audioPlayer.loadAudio(audio.blob);
          timeline.setDuration(audio.duration);
          try {
            const wf = await audioService.generateWaveformData(audio.blob);
            setWaveformData(wf);
          } catch (e) {
            console.warn('Waveform generation error', e);
          }

          // Check if timeline cues already exist; if not, automatically generate them
          const existingTimeline = await audioRepository.getTimelineByProjectId(project.id);
          if (existingTimeline && existingTimeline.cues.length > 1) {
            timeline.loadCues(existingTimeline.cues, existingTimeline.duration);
          } else {
            try {
              const lipResult = await manualLipSyncEngine.generateLipSync(
                audio.blob,
                project.scriptText || '',
                audio.duration
              );
              timeline.loadCues(lipResult.cues, lipResult.duration);
              await audioRepository.saveTimeline(project.id, lipResult.duration, lipResult.cues);
            } catch (err) {
              console.warn('Auto lip-sync initial generation error', err);
            }
          }
        }
      });
    }
  }, [project?.id, project?.audioAssetId]);

  // Handle Audio Upload
  const handleAudioLoaded = async (
    name: string,
    blob: Blob,
    duration: number,
    sampleRate: number,
    channels: number
  ) => {
    if (!project) return;
    try {
      const audioAsset = await audioRepository.createAudio(name, blob, duration, sampleRate, channels);
      setCurrentAudio(audioAsset);
      await audioPlayer.loadAudio(blob);
      timeline.setDuration(duration);

      await handleUpdateProject({ audioAssetId: audioAsset.id });

      const wf = await audioService.generateWaveformData(blob);
      setWaveformData(wf);

      // Auto generate speech lip-sync timeline immediately
      try {
        const lipResult = await manualLipSyncEngine.generateLipSync(blob, project.scriptText || '', duration, {
          tuning: project.lipSyncSettings,
        });
        timeline.loadCues(lipResult.cues, lipResult.duration);
        await audioRepository.saveTimeline(project.id, lipResult.duration, lipResult.cues);
      } catch (err) {
        console.warn('Auto lip-sync on audio upload error', err);
      }

      setGlobalMessage('Audio uploaded and lip-sync timeline generated successfully!');
      setTimeout(() => setGlobalMessage(null), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load audio');
    }
  };

  // Generate Lip Sync Cues (automatic Rhubarb local companion or browser phonetic aligner)
  const handleGenerateLipSync = async (customTuning?: LipSyncTuningSettings) => {
    if (!currentAudio || !project) {
      setErrorMessage('Please upload dialogue audio first.');
      return;
    }

    const activeTuning = customTuning || project.lipSyncSettings;
    setIsGeneratingLipSync(true);
    setErrorMessage(null);
    try {
      // 1. Check if Rhubarb companion runner is running locally on user's machine
      const isRhubarbRunnerUp = await rhubarbAdapter.isAvailable();
      let result;

      if (isRhubarbRunnerUp) {
        result = await rhubarbAdapter.generateLipSync(
          currentAudio.blob,
          project.scriptText,
          currentAudio.duration
        );
        setGlobalMessage(`Lip-sync generated using local Rhubarb runner (${result.cues.length} cues)!`);
      } else {
        // 2. Built-in browser phonetic and audio energy envelope engine
        result = await manualLipSyncEngine.generateLipSync(
          currentAudio.blob,
          project.scriptText,
          currentAudio.duration,
          { tuning: activeTuning }
        );
        const tuningInfo = activeTuning
          ? `${activeTuning.speed}, min ${activeTuning.minDurationMs}ms`
          : 'natural';
        setGlobalMessage(`Generated ${result.cues.length} mouth cues (${tuningInfo})!`);
      }

      timeline.loadCues(result.cues, result.duration);
      await audioRepository.saveTimeline(project.id, result.duration, result.cues);
      setTimeout(() => setGlobalMessage(null), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Lip-sync generation failed');
    } finally {
      setIsGeneratingLipSync(false);
    }
  };

  // Import Rhubarb file directly (.json / .tsv)
  const handleImportRhubarbFile = async (fileContent: string) => {
    if (!project) return;
    try {
      const parsed = rhubarbAdapter.parseFileContent(fileContent, currentAudio?.duration || 5.0);
      timeline.loadCues(parsed.cues, parsed.duration);
      await audioRepository.saveTimeline(project.id, parsed.duration, parsed.cues);
      setGlobalMessage(`Imported ${parsed.cues.length} Rhubarb mouth cues!`);
      setTimeout(() => setGlobalMessage(null), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid Rhubarb file format');
    }
  };

  // Export project backup
  const handleExportProjectBackup = async () => {
    if (!project) return;
    try {
      const json = await projectRepository.exportProjectBackup(project.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_backup.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to export backup');
    }
  };

  // Import project backup
  const handleImportProjectBackup = async (fileContent: string) => {
    try {
      const newProjectId = await projectRepository.importProjectBackup(fileContent);
      const loaded = await projectRepository.getById(newProjectId);
      if (loaded) {
        setProject(loaded);
        await loadCharacters();
        await loadCollections();
        setGlobalMessage('Project backup restored successfully!');
        setTimeout(() => setGlobalMessage(null), 3000);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to restore project');
    }
  };

  const handleUpdateCharacterDetails = async (
    id: string,
    placement: Character['placement'],
    mapping: Record<string, string>,
    mouthCollectionId?: string,
    name?: string,
    newImage?: {
      blob: Blob;
      width: number;
      height: number;
    }
  ) => {
    await updateCharacterPlacement(id, placement);
    if (mouthCollectionId) {
      await updateCharacterMouthMapping(id, mouthCollectionId, mapping);
    }
    const updates: Partial<Character> = {};
    if (name) updates.name = name;
    if (newImage) {
      updates.imageBlob = newImage.blob;
      updates.imageWidth = newImage.width;
      updates.imageHeight = newImage.height;
      imageCache.release(id);
    }
    if (Object.keys(updates).length > 0) {
      await characterRepository.update(id, updates);
      await loadCharacters();
    }
  };

  return (
    <AppShell
      topBarProps={{
        project,
        onUpdateProjectName: (name) => handleUpdateProject({ name }),
        onOpenExportDialog: () => setIsExportDialogOpen(true),
        onExportProjectBackup: handleExportProjectBackup,
        onImportProjectBackup: handleImportProjectBackup,
        canExportVideo: !!selectedCharacter && timeline.cues.length > 0,
      }}
      sidebarProps={{
        activeTab,
        onTabChange: setActiveTab,
        characterCount: characters.length,
        mouthCount: mouthCollections.length,
      }}
      isFullHeightLayout={activeTab === 'lipsync'}
    >
      {/* Notifications */}
      {globalMessage && (
        <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{globalMessage}</span>
          </div>
          <button onClick={() => setGlobalMessage(null)} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-2 shrink-0">
          <ErrorMessage message={errorMessage} onDismiss={() => setErrorMessage(null)} />
        </div>
      )}

      {/* 1. Character Library View */}
      {activeTab === 'characters' && (
        <CharacterLibrary
          characters={characters}
          mouthCollections={mouthCollections}
          getAssetsForCollection={getAssetsForCollection}
          onCreateCharacter={async (name, blob, width, height) => {
            const char = await createCharacter(name, blob, width, height);
            if (project) await handleUpdateProject({ characterId: char.id });
            return char;
          }}
          onUpdateCharacter={handleUpdateCharacterDetails}
          onDuplicateCharacter={duplicateCharacter}
          onDeleteCharacter={deleteCharacter}
          selectedCharacterId={selectedCharacter?.id}
          onSelectCharacter={(char) => {
            if (project) handleUpdateProject({ characterId: char.id });
            setActiveTab('lipsync');
          }}
        />
      )}

      {/* 2. Mouth Importer View */}
      {activeTab === 'mouths' && (
        <MouthCollectionLibrary
          collections={mouthCollections}
          getAssetsForCollection={getAssetsForCollection}
          onRefresh={loadCollections}
          onSaveCollection={async (payload) => {
            const col = await mouthRepository.createCollection(
              payload.name,
              payload.templateType,
              payload.sourceSheetBlob,
              payload.sourceSheetWidth,
              payload.sourceSheetHeight
            );
            const savedAssets: MouthAsset[] = [];
            for (const asset of payload.assets) {
              const a = await mouthRepository.addMouthAsset(
                col.id,
                asset.label,
                asset.imageBlob,
                asset.cropRect,
                asset.width,
                asset.height,
                asset.warning,
                asset.anchorX,
                asset.anchorY
              );
              savedAssets.push(a);
            }
            await loadCollections();
            if (selectedCharacter) {
              const mapping: Record<string, string> = {};
              for (const a of savedAssets) {
                mapping[a.label.toUpperCase()] = a.id;
                mapping[a.label] = a.id;
              }
              await updateCharacterMouthMapping(selectedCharacter.id, col.id, mapping);
            }
            setGlobalMessage(`Saved mouth collection "${payload.name}" with ${payload.assets.length} mouths!`);
            setTimeout(() => setGlobalMessage(null), 3000);
          }}
          onReplaceCollection={async (collectionId, payload) => {
            const replacedAssets = await mouthRepository.replaceCollectionAssets(
              collectionId,
              payload.assets,
              payload.sourceSheetBlob,
              payload.sourceSheetWidth,
              payload.sourceSheetHeight
            );
            await loadCollections();
            if (selectedCharacter && selectedCharacter.mouthCollectionId === collectionId) {
              const mapping: Record<string, string> = {};
              for (const a of replacedAssets) {
                mapping[a.label.toUpperCase()] = a.id;
                mapping[a.label] = a.id;
              }
              await updateCharacterMouthMapping(selectedCharacter.id, collectionId, mapping);
            }
            setGlobalMessage(`Replaced mouths in "${payload.name}" while preserving IDs!`);
            setTimeout(() => setGlobalMessage(null), 3000);
          }}
          onDeleteCollection={deleteCollection}
        />
      )}

      {/* 3. Mouth Alignment Debugger View */}
      {activeTab === 'alignment' && (
        <div className="space-y-4 max-w-6xl mx-auto">
          {activeMouthCollection && debuggerAssets.length > 0 ? (
            <MouthAlignmentDebugger
              collection={activeMouthCollection}
              assets={debuggerAssets}
              character={selectedCharacter}
              characterImg={charImg}
              onAssetsUpdated={async () => {
                await loadDebuggerAssets();
                await loadCollections();
                if (selectedCharacter && activeMouthCollection) {
                  const refreshedAssets = await mouthRepository.getAssetsByCollectionId(activeMouthCollection.id);
                  const map = new Map<string, { img: CanvasImageSource; asset: MouthAsset }>();
                  for (const a of refreshedAssets) {
                    try {
                      const img = await imageCache.getLoadedImage(a.id, a.imageBlob);
                      map.set(a.id, { img, asset: a });
                    } catch (e) {
                      console.warn('Failed to reload mouth image', e);
                    }
                  }
                  setMouthImageMap(map);
                }
              }}
            />
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4 max-w-lg mx-auto shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
                <Crosshair className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">No Mouth Collection Available</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Please import or generate a mouth collection first using the Mouth Importer before running the alignment debugger.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => setActiveTab('mouths')}>
                Go to Mouth Importer
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 4. Lip-Sync & Timeline Workspace View */}
      {activeTab === 'lipsync' && project && (() => {
        const totalDur = audioPlayer.duration || currentAudio?.duration || timeline.duration || 5.0;
        const isAtEnd = totalDur > 0 && audioPlayer.currentTime >= totalDur - 0.05;

        return (
          <WorkspaceLayout
            leftPanel={
              <div className="flex flex-col gap-1.5 w-full h-full min-h-0 overflow-hidden">
                {/* Compact Aspect Ratio, Fit, Background & Guide Controls */}
                <PreviewControls
                  currentAspectRatio={project.exportSettings.aspectRatio}
                  fitMode={project.exportSettings.fitMode}
                  onAspectRatioChange={(ratio, width, height) =>
                    handleUpdateProject({
                      exportSettings: {
                        ...project.exportSettings,
                        aspectRatio: ratio,
                        width,
                        height,
                      },
                    })
                  }
                  onFitModeChange={(fitMode) =>
                    handleUpdateProject({
                      exportSettings: {
                        ...project.exportSettings,
                        fitMode,
                      },
                    })
                  }
                  showAlignmentGuides={showAlignmentGuides}
                  onToggleAlignmentGuides={() => setShowAlignmentGuides((prev) => !prev)}
                  onOpenAlignmentDebugger={() => setActiveTab('alignment')}
                  backgroundType={project.exportSettings.backgroundType}
                  backgroundColor={project.exportSettings.backgroundColor}
                  onBackgroundTypeChange={(backgroundType) =>
                    handleUpdateProject({
                      exportSettings: {
                        ...project.exportSettings,
                        backgroundType,
                      },
                    })
                  }
                  onBackgroundColorChange={(backgroundColor) =>
                    handleUpdateProject({
                      exportSettings: {
                        ...project.exportSettings,
                        backgroundColor,
                      },
                    })
                  }
                  onBackgroundImageLoaded={(blob) => {
                    const url = URL.createObjectURL(blob);
                    const img = new Image();
                    img.onload = () => setBgImg(img);
                    img.src = url;
                    handleUpdateProject({
                      exportSettings: {
                        ...project.exportSettings,
                        backgroundType: 'image',
                        backgroundImageBlob: blob,
                      },
                    });
                  }}
                />

                {/* Central Animation Studio Box */}
                <div className="w-full flex-1 min-h-0 bg-white p-2 rounded-xl border border-slate-200 flex flex-col justify-between shadow-2xs overflow-hidden">
                  {mouthImageMap.size === 0 && (
                    <div className="w-full mb-1 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-800 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>No mouth sprite sheet loaded yet. Go to Step 2 to import mouths!</span>
                      </div>
                      <button
                        onClick={() => setActiveTab('mouths')}
                        className="px-2 py-0.5 font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px]"
                      >
                        Step 2
                      </button>
                    </div>
                  )}

                  {/* Canvas Viewport */}
                  <div className="flex-1 min-h-0 w-full flex items-center justify-center relative overflow-hidden my-0.5">
                    <AnimationPreview
                      character={selectedCharacter}
                      characterImg={charImg}
                      mouthAssets={mouthImageMap}
                      cues={timeline.cues}
                      currentTime={audioPlayer.currentTime}
                      exportSettings={project.exportSettings}
                      isPlaying={audioPlayer.isPlaying}
                      bgImage={bgImg}
                      showAlignmentGuides={showAlignmentGuides}
                      activeShapeOverride={activeTestShape || undefined}
                      tuningSettings={project.lipSyncSettings}
                    />
                  </div>

                  {/* Compact Animation Transport & Quick Test Bar */}
                  <div className="w-full pt-1.5 border-t border-slate-100 flex flex-col gap-1.5 shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      {/* Play / Pause / Rewind / Time */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleTogglePlay}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                            audioPlayer.isPlaying
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100 active:scale-95'
                          }`}
                          title={audioPlayer.isPlaying ? 'Pause Animation (Space)' : isAtEnd ? 'Play Again (Space)' : 'Play Animation (Space)'}
                        >
                          {audioPlayer.isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          <span>{audioPlayer.isPlaying ? 'Pause' : isAtEnd ? 'Play Again' : 'Play'}</span>
                        </button>

                        <button
                          onClick={() => audioPlayer.seek(0)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          title="Rewind to Beginning (0.0s)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-100 rounded-md text-slate-700">
                          {audioPlayer.currentTime.toFixed(2)}s / {totalDur.toFixed(2)}s
                        </span>

                        <button
                          onClick={audioPlayer.toggleMute}
                          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100"
                          title={audioPlayer.isMuted ? 'Unmute Audio' : 'Mute Audio'}
                        >
                          {audioPlayer.isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setShowDiagnostics(!showDiagnostics)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
                            showDiagnostics
                              ? 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                          title="Toggle frame-by-frame lip-sync diagnostics and A-B looper"
                        >
                          <Activity className="w-3 h-3 text-indigo-600" />
                          <span>Diagnostics</span>
                        </button>

                        {selectedCharacter && (
                          <button
                            onClick={() => setIsEditingPlacementModal(true)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                            title="Fine-tune mouth attachment crosshairs and numeric coordinates"
                          >
                            <Crosshair className="w-3 h-3 text-indigo-600" />
                            <span>Anchor</span>
                          </button>
                        )}

                        <button
                          onClick={() => setIsExportDialogOpen(true)}
                          className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs"
                          title="Export animated video (MP4 or WebM with alpha)"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Export Video</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Mouth Shape Test Row */}
                    <div className="flex items-center justify-between gap-1 p-1 px-2 bg-slate-50 rounded-lg border border-slate-150 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Test Shape:
                        </span>
                        {activeTestShape && (
                          <span className="text-[9px] font-bold px-1 rounded bg-indigo-100 text-indigo-700">
                            {activeTestShape}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {STANDARD_RHUBARB_SHAPES.map((s) => (
                          <button
                            key={s.label}
                            onClick={() => {
                              setActiveTestShape(s.label);
                            }}
                            className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold rounded border transition-all ${
                              activeTestShape === s.label
                                ? 'bg-indigo-600 text-white border-indigo-600 ring-1 ring-indigo-300'
                                : 'bg-white hover:bg-indigo-50 text-slate-700 border-slate-200'
                            }`}
                            title={`Click to preview ${s.label} (${s.name}) on character`}
                          >
                            {s.label}
                          </button>
                        ))}
                        {activeTestShape && (
                          <button
                            onClick={() => setActiveTestShape(null)}
                            className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-200 rounded transition-colors"
                            title="Return to timeline lip-sync cues"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
            rightPanel={
              <div className="flex flex-col gap-2 w-full h-full min-h-0 overflow-hidden">
                {/* Audio Uploader & Player */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2 w-full min-w-0 shadow-2xs shrink-0">
                  <AudioUploader
                    onAudioLoaded={handleAudioLoaded}
                    currentAudioName={currentAudio?.name}
                    currentDuration={currentAudio?.duration}
                  />

                  <AudioPlayer
                    isPlaying={audioPlayer.isPlaying}
                    currentTime={audioPlayer.currentTime}
                    duration={audioPlayer.duration || currentAudio?.duration || 5.0}
                    isMuted={audioPlayer.isMuted}
                    onTogglePlay={handleTogglePlay}
                    onSeek={(t) => audioPlayer.seek(t)}
                    onToggleMute={audioPlayer.toggleMute}
                  />
                </div>

                {/* Script Editor & Lip-Sync Trigger */}
                <div className="w-full min-w-0 flex-1 min-h-0 flex flex-col">
                  <ScriptEditor
                    scriptText={project.scriptText}
                    onScriptChange={(scriptText) => handleUpdateProject({ scriptText })}
                    onGenerateLipSync={handleGenerateLipSync}
                    onImportRhubarbFile={handleImportRhubarbFile}
                    isGenerating={isGeneratingLipSync}
                    hasAudio={!!currentAudio}
                    tuningSettings={project.lipSyncSettings}
                    onTuningChange={(tuning) => handleUpdateProject({ lipSyncSettings: tuning })}
                  />
                </div>
              </div>
            }
            bottomPanel={
              <div className="bg-white p-2 rounded-xl border border-slate-200 space-y-1 shadow-2xs w-full min-w-0 shrink-0">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Mouth Cue Timeline
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDiagnostics(!showDiagnostics)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${
                        showDiagnostics
                          ? 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                      title="Toggle frame-by-frame lip-sync diagnostics and A-B looper"
                    >
                      <Activity className="w-3 h-3 text-indigo-600" />
                      <span>{showDiagnostics ? 'Hide Diagnostics' : 'Diagnostics Panel'}</span>
                    </button>
                    <span className="text-[11px] text-slate-400">
                      {timeline.cues.length} cues timed
                    </span>
                  </div>
                </div>

                {showDiagnostics && (
                  <div className="pt-1 pb-1">
                    <LipSyncDiagnosticsPanel
                      currentTime={audioPlayer.currentTime}
                      duration={audioPlayer.duration || currentAudio?.duration || 5.0}
                      cues={timeline.cues}
                      isPlaying={audioPlayer.isPlaying}
                      waveformData={waveformData}
                      onSeek={(t) => audioPlayer.seek(t)}
                      onTogglePlay={handleTogglePlay}
                      onClose={() => setShowDiagnostics(false)}
                    />
                  </div>
                )}

                <TimelineEditor
                  duration={audioPlayer.duration || currentAudio?.duration || 5.0}
                  currentTime={audioPlayer.currentTime}
                  zoom={timeline.zoom}
                  cues={timeline.cues}
                  selectedCueId={timeline.selectedCueId}
                  waveformData={waveformData}
                  isPlaying={audioPlayer.isPlaying}
                  onTogglePlay={handleTogglePlay}
                  onRewind={() => audioPlayer.seek(0)}
                  onZoomChange={timeline.setZoom}
                  onSelectCue={timeline.setSelectedCueId}
                  onUpdateCueShape={async (id, shape) => {
                    timeline.setCueShape(id, shape);
                    if (project) {
                      await audioRepository.updateCue(project.id, id, { shape });
                    }
                  }}
                  onUpdateCueTiming={(id, start, end) => {
                    timeline.updateCueTiming(id, start, end);
                  }}
                  onAdjustDuration={async (id, delta) => {
                    timeline.adjustCueDuration(id, delta);
                    if (project) {
                      await audioRepository.saveTimeline(project.id, timeline.duration, timeline.cues);
                    }
                  }}
                  onSetDuration={async (id, dur) => {
                    timeline.setCueDuration(id, dur);
                    if (project) {
                      await audioRepository.saveTimeline(project.id, timeline.duration, timeline.cues);
                    }
                  }}
                  onTimingChangeEnd={async () => {
                    if (project) {
                      await audioRepository.saveTimeline(project.id, timeline.duration, timeline.cues);
                    }
                  }}
                  onDeleteSelectedCue={async () => {
                    if (timeline.selectedCueId) {
                      timeline.deleteCue(timeline.selectedCueId);
                      if (project) {
                        await audioRepository.saveTimeline(
                          project.id,
                          timeline.duration,
                          timeline.cues.filter((c) => c.id !== timeline.selectedCueId)
                        );
                      }
                    }
                  }}
                  onAddCueAtPlayhead={async (shape = 'A') => {
                    const t = audioPlayer.currentTime;
                    const newCue = {
                      id: 'cue_' + Date.now(),
                      start: t,
                      end: Math.min(timeline.duration, t + 0.25),
                      shape,
                    };
                    timeline.addCue(t, Math.min(timeline.duration, t + 0.25), shape);
                    if (project) {
                      await audioRepository.saveTimeline(
                        project.id,
                        timeline.duration,
                        [...timeline.cues, newCue]
                      );
                    }
                  }}
                  onSeek={(t) => audioPlayer.seek(t)}
                />
              </div>
            }
          />
        );
      })()}

      {/* 4. Video Export Dedicated Tab */}
      {activeTab === 'export' && project && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 max-w-3xl mx-auto space-y-6 shadow-2xs">
          <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Video Export Studio</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your video output format, resolution, frame rate, and transparency.
              </p>
            </div>
            <Button
              variant="primary"
              disabled={!selectedCharacter || timeline.cues.length === 0}
              onClick={() => setIsExportDialogOpen(true)}
              icon={<Video className="w-4 h-4" />}
            >
              Start Export
            </Button>
          </div>

          <ExportSettingsComponent
            settings={project.exportSettings}
            onChange={(exportSettings) => handleUpdateProject({ exportSettings })}
          />
        </div>
      )}

      {/* Export Dialog Modal */}
      {project && selectedCharacter && (
        <ExportDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          exportSettings={project.exportSettings}
          onSettingsChange={(exportSettings) => handleUpdateProject({ exportSettings })}
          character={selectedCharacter}
          characterImg={charImg || new Image()}
          mouthAssets={mouthImageMap}
          timeline={{
            id: project.timelineId || 'tl_temp',
            projectId: project.id,
            duration: timeline.duration,
            cues: timeline.cues,
            smoothing: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }}
          bgImage={bgImg}
          audioBlob={currentAudio?.blob}
        />
      )}

      {/* In-Place Mouth Anchor Tuning Modal */}
      {isEditingPlacementModal && selectedCharacter && (
        <Modal
          isOpen={isEditingPlacementModal}
          onClose={() => setIsEditingPlacementModal(false)}
          title={`Fine-tune Mouth Anchor: ${selectedCharacter.name}`}
          maxWidth="4xl"
        >
          <CharacterEditor
            character={selectedCharacter}
            mouthCollections={mouthCollections}
            getAssetsForCollection={getAssetsForCollection}
            onSave={async (placement, mouthMapping, mouthCollectionId, name, newImage) => {
              await handleUpdateCharacterDetails(
                selectedCharacter.id,
                placement,
                mouthMapping,
                mouthCollectionId,
                name,
                newImage
              );
              setIsEditingPlacementModal(false);
            }}
            onClose={() => setIsEditingPlacementModal(false)}
          />
        </Modal>
      )}
    </AppShell>
  );
};

'use client';

import { use, useState, useEffect } from 'react';
import { generateEpisodeScript, getEpisodes, deleteEpisode } from '@/app/actions/episodeActions';
import { generateSceneFrame } from '@/app/actions/sceneImageActions';
import { generateDialogueAudio } from '@/app/actions/audioActions';
import { compileEpisodeVideo, generateFullEpisodePipeline } from '@/app/actions/videoActions';
import { Episode } from '@/repositories/local/episodeDB';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function EpisodesPage({ params }: PageProps) {
  const { projectId } = use(params); // Next.js 15 Client Promise unwrapping [4]

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [renderingSceneId, setRenderingSceneId] = useState<string | null>(null);
  const [vocalizingId, setVocalizingId] = useState<string | null>(null);
  
  // Master Render Queue States [1]
  const [masterRendering, setMasterRendering] = useState<string | null>(null); // tracks active episodeId
  const [renderStatus, setRenderStatus] = useState<string>('');

  const [compilingVideo, setCompilingVideo] = useState(false);
  const [error, setError] = useState('');
  const [cacheKey, setCacheKey] = useState<number>(Date.now()); // State to force-bust browser cache [14]

  useEffect(() => {
    async function loadEpisodes() {
      const data = await getEpisodes(projectId);
      setEpisodes(data);
    }
    loadEpisodes();
  }, [projectId]);

  async function handleWriteScript() {
    setLoading(true);
    setError('');
    try {
      await generateEpisodeScript(projectId);
      const updated = await getEpisodes(projectId);
      setEpisodes(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to construct episode scripts.');
    } finally {
      setLoading(false);
    }
  }

  // 1. Trigger the Master Queue Orchestrator [1]
  async function handleMasterRender(episodeId: string) {
    setMasterRendering(episodeId);
    setError('');
    try {
      setRenderStatus('Phase 7: Synthesizing Character Neural Voice Dialogues...');
      // Automated background loops running sequentially on the server
      await generateFullEpisodePipeline(projectId, episodeId, (status) => setRenderStatus(status));
      
      setRenderStatus('Success! Dynamic compilation complete.');
      const updated = await getEpisodes(projectId);
      setEpisodes(updated);
      setCacheKey(Date.now()); // Clear cache-buster references [14]
    } catch (err: any) {
      setError(err.message || 'Master Render run failed.');
    } finally {
      setMasterRendering(null);
      setRenderStatus('');
    }
  }

  async function handleRenderFrame(episodeId: string, sceneNumber: number) {
    const key = `${episodeId}_${sceneNumber}`;
    setRenderingSceneId(key);
    setError('');
    try {
      await generateSceneFrame(projectId, episodeId, sceneNumber);
      const updated = await getEpisodes(projectId);
      setEpisodes(updated);
      setCacheKey(Date.now()); // Update cache-buster key on completion [14]
    } catch (err: any) {
      setError(err.message || 'Failed to render scene image.');
    } finally {
      setRenderingSceneId(null);
    }
  }

  async function handleVocalize(episodeId: string, sceneNumber: number, dialogueIdx: number) {
    const key = `${episodeId}_${sceneNumber}_${dialogueIdx}`;
    setVocalizingId(key);
    setError('');
    try {
      await generateDialogueAudio(projectId, episodeId, sceneNumber, dialogueIdx);
      const updated = await getEpisodes(projectId);
      setEpisodes(updated);
      setCacheKey(Date.now()); // Update cache-buster key on completion [14]
    } catch (err: any) {
      setError(err.message || 'Failed to synthesize speech.');
    } finally {
      setVocalizingId(null);
    }
  }

  async function handleCompileVideo(episodeId: string) {
    setCompilingVideo(true);
    setError('');
    try {
      await compileEpisodeVideo(projectId, episodeId);
      const updated = await getEpisodes(projectId);
      setEpisodes(updated);
      setCacheKey(Date.now()); // Update cache-buster key on completion [14]
    } catch (err: any) {
      setError(err.message || 'Failed to compile final anime video.');
    } finally {
      setCompilingVideo(false);
    }
  }

  async function handleDeleteEpisode(episodeId: string) {
    try {
      await deleteEpisode(episodeId, projectId);
      const updated = await getEpisodes(projectId);
      setEpisodes(updated);
    } catch (err: any) {
      setError('Failed to delete episode record.');
    }
  }

  const nextEpisodeNumber = episodes.length + 1;

  return (
    <main className="max-w-5xl mx-auto p-8 space-y-8">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
            Episode Director
          </h1>
          <p className="text-slate-400 text-sm mt-1">Phase 9: Multi-Episode Narrative Continuity & State Tracking [1]</p>
        </div>
        <button
          onClick={handleWriteScript}
          disabled={loading || !!renderingSceneId || !!vocalizingId || compilingVideo || !!masterRendering}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold py-2.5 px-5 rounded-lg transition text-sm shadow-md"
        >
          {loading 
            ? `Drafting Episode ${nextEpisodeNumber} Screenplay...` 
            : `Generate Episode ${nextEpisodeNumber} Script`
          }
        </button>
      </header>

      {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

      {/* Main Screenplay Layout */}
      {episodes.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-850 py-20 px-6 rounded-xl text-center space-y-4">
          <h3 className="text-lg font-bold text-slate-300">Screenplay Drafts Empty</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Script blocks are the master controllers for rendering images, background tracks, and speaking voices. Click the generate button above to compile your lore and characters into Episode 1.
          </p>
        </div>
      ) : (
        <div className="space-y-16">
          {episodes.map((ep) => {
            const isMasterRenderingThis = masterRendering === ep.id;

            return (
              <div key={ep.id} className="space-y-8 border-b border-slate-850 pb-12 last:border-0 last:pb-0">
                {/* Episode Header Card */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                  
                  {/* Master Progress overlay */}
                  {isMasterRenderingThis && (
                    <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 space-y-2 z-35 animate-fade-in">
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-indigo-400 font-extrabold text-sm uppercase tracking-wider">
                          Orchestrator rendering episode...
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 italic">{renderStatus}</p>
                    </div>
                  )}

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                        Episode {ep.episodeNumber} Screenplay
                      </span>
                      {ep.episodeNumber > 1 && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded">
                          ✓ Continuity Bound [1]
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-100">{ep.title}</h2>
                    <p className="text-slate-400 text-sm italic leading-relaxed">
                      Synopsis: &quot;{ep.summary}&quot;
                    </p>
                  </div>
                  
                  {/* Master Compile & Delete Actions */}
                  <div className="flex flex-col items-center gap-3 w-full md:w-auto z-20">
                    <button
                      onClick={() => handleMasterRender(ep.id)}
                      disabled={loading || !!renderingSceneId || !!vocalizingId || compilingVideo || !!masterRendering}
                      className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 disabled:from-neutral-800 disabled:to-neutral-900 text-white font-extrabold py-3 px-6 rounded-xl transition shadow-xl text-xs uppercase tracking-widest"
                    >
                      🚀 Automate Master Render
                    </button>
                    
                    <div className="flex items-center gap-3 w-full">
                      <button
                        onClick={() => handleCompileVideo(ep.id)}
                        disabled={loading || !!renderingSceneId || !!vocalizingId || compilingVideo || !!masterRendering}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold py-2 px-3 rounded-lg border border-slate-700 transition"
                      >
                        {compilingVideo ? 'Stitching...' : 'Manual Stitch'}
                      </button>
                      <button
                        onClick={() => handleDeleteEpisode(ep.id)}
                        disabled={loading || !!renderingSceneId || !!vocalizingId || compilingVideo || !!masterRendering}
                        className="text-xs text-red-400 hover:text-red-300 bg-red-950/30 border border-red-900/30 py-2 px-4 rounded-md transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Final Rendered Video Player viewport */}
                {ep.videoPath && (
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 shadow-xl">
                    <h3 className="text-lg font-bold tracking-tight text-indigo-400 border-b border-slate-800 pb-2">
                      Episode {ep.episodeNumber} Widescreen Preview Viewer
                    </h3>
                    <div className="aspect-video max-w-2xl mx-auto rounded-lg overflow-hidden border border-slate-950 bg-black shadow-inner">
                      <video 
                        src={`${ep.videoPath}?v=${cacheKey}`} // Cache-busted video path [14]
                        controls 
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                )}

                {/* Sequential Scenes List */}
                <div className="space-y-12">
                  {ep.scenes.map((scene) => {
                    const currentRenderKey = `${ep.id}_${scene.sceneNumber}`;
                    const isRenderingThis = renderingSceneId === currentRenderKey;

                    return (
                      <section
                        key={scene.sceneNumber}
                        className="grid md:grid-cols-12 gap-8 bg-slate-900/60 border border-slate-850 p-6 rounded-xl relative"
                      >
                        {/* Storyboard Widescreen Thumbnail */}
                        <div className="md:col-span-4 space-y-3 flex flex-col">
                          <div className="aspect-video bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-center text-slate-650 text-xs italic relative overflow-hidden">
                            {scene.imagePath ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={`${scene.imagePath}?v=${cacheKey}`} // Cache-busted image path [14]
                                alt={`Scene ${scene.sceneNumber}`}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <span>Storyboard Frame {scene.sceneNumber}</span>
                            )}

                            {/* Loading Indicator */}
                            {isRenderingThis && (
                              <div className="absolute inset-0 bg-slate-950/85 flex items-center justify-center text-indigo-400 font-bold text-xs">
                                Rendering Scene {scene.sceneNumber}...
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={() => handleRenderFrame(ep.id, scene.sceneNumber)}
                            disabled={!!renderingSceneId || !!vocalizingId || compilingVideo || loading || !!masterRendering}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 border border-indigo-500/20 text-white font-bold text-xs py-2 px-4 rounded-lg shadow transition"
                          >
                            {scene.imagePath ? '🔄 Re-render Frame' : '🎨 Render Widescreen Frame'}
                          </button>

                          <div className="text-xs text-slate-500 text-center font-medium pt-1">
                            Widescreen (16:9) Viewport
                          </div>
                        </div>

                        {/* Scene Description & Screenplay Transcript */}
                        <div className="md:col-span-8 space-y-4 border-l border-slate-800/60 pl-6">
                          {/* Setting Title Bar */}
                          <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                            <h3 className="font-extrabold text-slate-200">
                              SCENE {scene.sceneNumber}: {scene.setting.toUpperCase()}
                            </h3>
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                              EXT. / INT.
                            </span>
                          </div>

                          {/* Visual Description Block */}
                          <div className="text-sm text-slate-400 italic leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                            {scene.visualDescription}
                          </div>

                          {/* Traditional Script Dialogue Box */}
                          <div className="space-y-4 pt-2">
                            {scene.dialogue.map((dial, dialIdx) => {
                              const currentVoiceKey = `${ep.id}_${scene.sceneNumber}_${dialIdx}`;
                              const isVocalizingThis = vocalizingId === currentVoiceKey;

                              return (
                                <div key={dialIdx} className="max-w-md mx-auto text-center space-y-2 bg-slate-950/30 p-4 rounded-lg border border-slate-850/40">
                                  <span className="block text-xs font-bold uppercase tracking-widest text-indigo-400">
                                    {dial.speaker}
                                  </span>
                                  <p className="text-sm text-slate-100 italic leading-relaxed font-serif">
                                    &quot;{dial.text}&quot;
                                  </p>
                                  
                                  {/* Speech controls */}
                                  <div className="pt-2 flex items-center justify-center gap-3">
                                    {dial.audioPath ? (
                                      <audio 
                                        src={`${dial.audioPath}?v=${cacheKey}`} // Cache-busted audio path [14]
                                        controls 
                                        className="h-8 max-w-xs rounded-lg text-xs"
                                      />
                                    ) : (
                                      <span className="text-xs text-slate-500 italic">No voice synthesized</span>
                                    )}
                                    
                                    <button
                                      onClick={() => handleVocalize(ep.id, scene.sceneNumber, dialIdx)}
                                      disabled={!!renderingSceneId || !!vocalizingId || compilingVideo || loading || !!masterRendering}
                                      className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 border border-indigo-900/40 px-2.5 py-1 rounded bg-indigo-950/20 transition disabled:text-slate-600 disabled:border-slate-850"
                                    >
                                      {isVocalizingThis ? 'Synthesizing...' : dial.audioPath ? 'Re-generate Voice' : 'Vocalize Line'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createAnimeProject, getProjects, deleteProject } from '@/app/actions/projectActions';
import { Project } from '@/repositories/local/fileDB';

export default function Page() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [serverActive, setServerActive] = useState(false);

  // 1. Initial State Load & Ollama Connection Check [1]
  useEffect(() => {
    async function loadData() {
      try {
        const data = await getProjects();
        setProjects(data);

        // Ping local Ollama instance to display actual live GPU connection state
        const ping = await fetch('http://localhost:11434', { method: 'GET' }).catch(() => null);
        setServerActive(!!ping);
      } catch (err) {
        console.error('Error reading project list:', err);
      }
    }
    loadData();
  }, []);

  // 2. Premium Generation Handler with transition locks
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError('');

    try {
      await createAnimeProject(prompt);
      setPrompt('');
      const updated = await getProjects();
      setProjects(updated);
    } catch (err: any) {
      setError(err.message || 'GPU Pipeline timeout. Verify Ollama is running.');
    } finally {
      setLoading(false);
    }
  }

  // 3. Optimistic Deletion Handler
  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteProject(id);
      const updated = await getProjects();
      setProjects(updated);
    } catch (err) {
      setError('Failed to purge project record.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-[#f5f5f7] p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Top Editorial Header */}
        <header className="flex flex-col md:flex-row justify-between md:items-end border-b border-white/5 pb-8 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                v1.0 Local Engine
              </span>
              
              {/* Dynamic GPU Connection Status Indicator [1] */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/5">
                <span className={`w-1.5 h-1.5 rounded-full ${serverActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-[9px] uppercase font-bold text-neutral-400">
                  {serverActive ? 'GPU Server: Ready' : 'GPU Server: Offline'}
                </span>
              </div>
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-none">
              AI Anime Studio
            </h1>
            <p className="text-neutral-400 text-sm max-w-md">
              A high-performance environment for automated storyboard creation and script compilation [1].
            </p>
          </div>

          {/* Project Count Metric */}
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 block">Total Universes</span>
            <span className="text-3xl font-extrabold text-white">{projects.length}</span>
          </div>
        </header>

        {/* Dynamic Concept Input Area */}
        <section className="bg-neutral-900/30 border border-white/5 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden shadow-2xl">
          <form onSubmit={handleGenerate} className="space-y-5">
            <div className="flex justify-between items-center">
              <label htmlFor="prompt" className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                Universe Conception Matrix
              </label>
              <span className="text-[10px] text-neutral-500 font-medium">Model: Qwen 2.5 (Local)</span>
            </div>

            <textarea
              id="prompt"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A lone demon slayer with a fractured katana walks the high-altitude frozen passes of Mt. Fuji, hunting the shadow elemental that stole his family's relic..."
              className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-[#f5f5f7] placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-sm leading-relaxed"
              disabled={loading}
            />

            {error && (
              <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs font-semibold p-3.5 rounded-lg flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="w-full bg-[#f5f5f7] hover:bg-white disabled:bg-neutral-850 text-black font-bold py-3.5 px-4 rounded-xl transition duration-300 text-sm shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Running GPU Inference Pipeline...
                </>
              ) : (
                'Conceive New Anime Universe'
              )}
            </button>
          </form>
        </section>

        {/* Saved Projects Dashboard Grid */}
        <section className="space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500 border-b border-white/5 pb-2">
            Active Storyboard Directories
          </h2>

          {projects.length === 0 ? (
            <div className="border border-dashed border-white/5 py-16 px-6 rounded-2xl text-center space-y-3">
              <h3 className="text-base font-bold text-neutral-400">No Storyboards Found</h3>
              <p className="text-neutral-500 text-xs max-w-sm mx-auto leading-relaxed">
                Your directory vault is empty. Input a creative anime concept inside the conception matrix above to start compiling your first screenplay.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {projects.map((proj) => {
                const isDeleting = deletingId === proj.id;
                return (
                  <article
                    key={proj.id}
                    className="bg-neutral-900/20 border border-white/5 p-6 rounded-2xl hover:border-white/10 transition duration-300 flex flex-col justify-between shadow-lg relative"
                  >
                    <div className="space-y-4">
                      {/* Project Header card */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <h3 className="text-lg font-bold text-white tracking-tight">{proj.title}</h3>
                          <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 bg-indigo-950/20 border border-indigo-900/30 px-2 py-0.5 rounded">
                            {proj.genre}
                          </span>
                        </div>

                        {/* Action buttons with absolute alignments */}
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/studio/${proj.id}/universe`}
                            className="text-[10px] font-bold uppercase tracking-widest text-black bg-[#f5f5f7] hover:bg-white border border-white/10 px-3.5 py-2 rounded-lg shadow-sm transition"
                          >
                            Launch Workspace
                          </Link>
                          <button
                            onClick={() => handleDelete(proj.id)}
                            disabled={!!deletingId || loading}
                            className="text-[10px] font-bold uppercase tracking-widest text-rose-400 hover:text-rose-300 bg-rose-950/20 border border-rose-900/20 px-3.5 py-2 rounded-lg transition"
                          >
                            {isDeleting ? 'Purging...' : 'Purge'}
                          </button>
                        </div>
                      </div>

                      {/* Summary Blocks */}
                      <div className="space-y-3 text-xs text-neutral-400 border-t border-white/5 pt-4 leading-relaxed">
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">
                            Script Synopsis
                          </h4>
                          <p className="text-neutral-300 line-clamp-2">{proj.summary}</p>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">
                            Lore & Mechanics
                          </h4>
                          <p className="text-neutral-300 line-clamp-2">{proj.worldDescription}</p>
                        </div>
                        <div className="text-[9px] text-neutral-600 pt-2 italic line-clamp-1">
                          Source Prompt: &quot;{proj.userPrompt}&quot;
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
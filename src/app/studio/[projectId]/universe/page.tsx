'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { generateUniverseLore, getUniverse } from '@/app/actions/universeActions';
import { getProjects } from '@/app/actions/projectActions';
import { Project } from '@/repositories/local/fileDB';
import { Universe } from '@/repositories/local/universeDB';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function UniversePage({ params }: PageProps) {
  const { projectId } = use(params); // Next.js 15 Client Promise unwrapping [4]
  
  const [project, setProject] = useState<Project | null>(null);
  const [universe, setUniverse] = useState<Universe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      const projects = await getProjects();
      const matchedProj = projects.find((p) => p.id === projectId) || null;
      setProject(matchedProj);

      const matchedUni = await getUniverse(projectId);
      setUniverse(matchedUni);
    }
    loadData();
  }, [projectId]);

  async function handleBuildUniverse() {
    setLoading(true);
    setError('');
    try {
      const updatedUni = await generateUniverseLore(projectId);
      setUniverse(updatedUni);
    } catch (err: any) {
      setError(err.message || 'Failed to expand world properties.');
    } finally {
      setLoading(false);
    }
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
        <p className="text-slate-400 italic">Loading project workspace...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-indigo-400 font-semibold">
          <Link href="/" className="hover:underline">Dashboard</Link>
          <span className="text-slate-600">/</span>
          <span className="text-slate-300">{project.title}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-100">Universe Engine</span>
        </nav>

        {/* Header Block */}
        <header className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
                {project.title} — World Settings
              </h1>
              <p className="text-slate-400 text-sm mt-1">{project.genre}</p>
            </div>
            <button
              onClick={handleBuildUniverse}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold py-2.5 px-5 rounded-lg transition text-sm"
            >
              {loading ? 'Expanding World Matrix (Local GPU)...' : universe ? 'Re-generate Universe' : 'Generate World Lore & Locations'}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm font-medium mt-4">{error}</p>}
        </header>

        {/* Dynamic Display Area */}
        {!universe ? (
          <div className="bg-slate-900/40 border border-slate-850 py-16 px-6 rounded-xl text-center space-y-4">
            <h3 className="text-lg font-bold text-slate-300">Universe Memory is Empty</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Most AI models forget the setting parameters between episodes. Click the generate button above to permanently lock this project&apos;s kingdoms, locations, and magical historical context.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Geographical Areas */}
            <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6">
              <h2 className="text-xl font-bold tracking-tight border-b border-slate-800 pb-2 text-indigo-400">
                Geographical Kingdoms & Locations
              </h2>
              <div className="space-y-4">
                {universe.locations.map((loc, idx) => (
                  <div key={idx} className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/40">
                    <h3 className="font-bold text-slate-200">{loc.name}</h3>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">{loc.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Right: World Histories and Power Rules */}
            <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6">
              <h2 className="text-xl font-bold tracking-tight border-b border-slate-800 pb-2 text-cyan-400">
                Ancient Events & Arcane Systems
              </h2>
              <div className="space-y-4">
                {universe.lore.map((item, idx) => (
                  <div key={idx} className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/40">
                    <h4 className="font-bold text-slate-200 uppercase text-xs tracking-wider text-cyan-500 mb-1">
                      {item.topic}
                    </h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{item.details}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
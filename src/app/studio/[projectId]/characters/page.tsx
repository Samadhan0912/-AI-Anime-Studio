'use client';

import { use, useState, useEffect } from 'react';
import { generateCoreCharacters, getCharacters } from '@/app/actions/characterActions';
import { generateCharacterConceptArt } from '@/app/actions/imageActions';
import { Character } from '@/repositories/local/characterDB';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function CharactersPage({ params }: PageProps) {
  const { projectId } = use(params); // Next.js 15 Client Promise unwrapping [4]

  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [renderingId, setRenderingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false); // Hydration mismatch lock
  const [cacheKey, setCacheKey] = useState<number>(Date.now()); // Browser cache buster [14]

  // 1. Hydration mounting lock to bypass browser extensions [14]
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Fetch characters
  useEffect(() => {
    if (!mounted) return;
    async function loadCharacters() {
      const data = await getCharacters(projectId);
      setCharacters(data);
    }
    loadCharacters();
  }, [projectId, mounted]);

  async function handleSpawnCast() {
    setLoading(true);
    setError('');
    try {
      const generated = await generateCoreCharacters(projectId);
      setCharacters(generated);
    } catch (err: any) {
      setError(err.message || 'Failed to spawn character cast.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateArt(charId: string) {
    setRenderingId(charId);
    setError('');
    try {
      await generateCharacterConceptArt(charId);
      const updated = await getCharacters(projectId);
      setCharacters(updated);
      setCacheKey(Date.now()); // Update cache-key to force browser reload [14]
    } catch (err: any) {
      setError(err.message || 'Failed to generate character art.');
    } finally {
      setRenderingId(null);
    }
  }

  const roleColors = {
    Hero: 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30',
    Companion: 'text-indigo-400 bg-indigo-950/20 border-indigo-900/30',
    Villain: 'text-rose-400 bg-rose-950/20 border-rose-900/30',
  };

  // Render a premium minimalist loader skeleton while mounting [1]
  if (!mounted) {
    return (
      <main className="max-w-5xl mx-auto p-8 space-y-8 animate-pulse">
        <div className="h-24 bg-neutral-900/35 border border-white/5 rounded-2xl" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="h-[450px] bg-neutral-900/20 border border-white/5 rounded-2xl" />
          <div className="h-[450px] bg-neutral-900/20 border border-white/5 rounded-2xl" />
          <div className="h-[450px] bg-neutral-900/20 border border-white/5 rounded-2xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-8 space-y-8 text-[#f5f5f7]">
      {/* Premium Header Block */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900/30 border border-white/5 p-6 rounded-2xl backdrop-blur-md shadow-2xl">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white leading-none">
            Character Engine
          </h1>
          <p className="text-neutral-400 text-xs">
            Generate, profile, and compile consistent visual seed assets for your cast [1].
          </p>
        </div>
        <button
          onClick={handleSpawnCast}
          disabled={loading || !!renderingId}
          className="bg-[#f5f5f7] hover:bg-white disabled:bg-neutral-850 text-black font-bold py-2.5 px-5 rounded-xl transition text-xs shadow-md"
        >
          {loading ? 'Assembling Cast Data...' : characters.length > 0 ? 'Purge & Re-generate Cast' : 'Generate Core Cast'}
        </button>
      </header>

      {error && (
        <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs font-semibold p-4 rounded-xl flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          {error}
        </div>
      )}

      {/* Main Cast Display */}
      {characters.length === 0 ? (
        <div className="border border-dashed border-white/5 py-20 px-6 rounded-2xl text-center space-y-4">
          <h3 className="text-lg font-bold text-neutral-300">No Cast Members Found</h3>
          <p className="text-neutral-500 text-xs max-w-sm mx-auto leading-relaxed">
            Every great storyboard requires actors to drive the conflict. Click the generate button above to conceive your project&apos;s core cast.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {characters.map((char) => (
            <article
              key={char.id}
              className="bg-neutral-900/20 border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between hover:border-white/10 transition duration-300"
            >
              {/* Premium Image Viewport */}
              <div className="relative h-72 bg-black/40 border-b border-white/5 flex flex-col justify-end overflow-hidden">
                {char.avatarPath ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`${char.avatarPath}?v=${cacheKey}`} // Dynamically force refresh [14]
                    alt={char.name}
                    className="absolute inset-0 w-full h-full object-cover select-none"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-neutral-600 text-xs italic">
                    Avatar generation pending
                  </div>
                )}
                
                {/* Micro-Interaction Button Overlay [1] */}
                <div className="absolute top-4 right-4 z-20">
                  <button
                    onClick={() => handleGenerateArt(char.id)}
                    disabled={!!renderingId || loading}
                    className="bg-black/60 hover:bg-black/80 disabled:bg-neutral-900/40 text-[#f5f5f7] font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-lg border border-white/5 shadow-md backdrop-blur-md transition"
                  >
                    {renderingId === char.id ? 'Generating...' : char.avatarPath ? 'Re-render' : 'Render Portrait'}
                  </button>
                </div>

                {/* Linear Name & Role Overlay */}
                <div className="relative z-10 bg-gradient-to-t from-black via-black/60 to-transparent p-6 pt-24">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 border rounded-md ${roleColors[char.role]}`}>
                      {char.role}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-bold">Age: {char.age}</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">{char.name}</h2>
                </div>
              </div>

              {/* Character Details Body */}
              <div className="p-6 space-y-4 text-xs text-neutral-350 flex-grow leading-relaxed">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">Personality</h4>
                  <p className="text-neutral-300">{char.personality}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">Motivations</h4>
                  <p className="text-neutral-300">{char.goals}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">Power / Combat Skills</h4>
                  <p className="text-neutral-300">{char.skills}</p>
                </div>
              </div>

              {/* Visual Prompt Spec Sheet */}
              <div className="p-6 bg-black/40 border-t border-white/5">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">
                  Style Spec Sheet
                </h4>
                <div className="bg-black/50 border border-white/5 p-3 rounded-lg text-[10px] font-mono text-neutral-400 break-words leading-relaxed max-h-24 overflow-y-auto">
                  {char.visualPrompt}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
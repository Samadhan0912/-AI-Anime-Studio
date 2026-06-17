'use server';

import { revalidatePath } from 'next/cache';
import { readProjects } from '@/repositories/local/fileDB';
import { readUniverses, writeUniverses, Universe } from '@/repositories/local/universeDB';

export async function generateUniverseLore(projectId: string) {
  // 1. Get parent project context
  const projects = await readProjects();
  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    throw new Error('Associated anime project not found');
  }

  const url = `${process.env.LOCAL_OLLAMA_URL || 'http://localhost:11434'}/api/generate`;
  const model = process.env.LOCAL_OLLAMA_MODEL || 'qwen2.5:7b-instruct';

  const systemInstructions = `
    You are an expert anime world builder. Expand on the lore and geography of the provided anime premise.
    You must output strictly in JSON format. Do not write any normal text, conversational words, or explanations. Only return raw JSON.
    JSON structure template:
    {
      "locations": [
        { "name": "Name of Location 1", "description": "Highly vivid visual description of this location (architecture, weather, vibe)" },
        { "name": "Name of Location 2", "description": "Highly vivid visual description of this location" },
        { "name": "Name of Location 3", "description": "Highly vivid visual description of this location" }
      ],
      "lore": [
        { "topic": "Ancient Event or War", "details": "A major event that changed history in this world" },
        { "topic": "System of Magic/Power or Sacred Relic", "details": "The details of how power works or a legendary weapon" }
      ]
    }
  `;

  // 2. Query Ollama to generate rich details
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      prompt: `Title: ${project.title}\nSummary: ${project.summary}\nPremise: ${project.worldDescription}\nInstructions: Expand world locations and lore strictly in JSON format.`,
      system: systemInstructions,
      format: 'json',
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to communicate with local Ollama server');
  }

  const data = await response.json();
  const expandedWorld = JSON.parse(data.response);

  // 3. Save to universes.json
  const universes = await readUniverses();
  const existingIndex = universes.findIndex((u) => u.projectId === projectId);

  const newUniverse: Universe = {
    id: crypto.randomUUID(),
    projectId,
    locations: expandedWorld.locations,
    lore: expandedWorld.lore,
    createdAt: new Date().toISOString(),
  };

  if (existingIndex > -1) {
    universes[existingIndex] = newUniverse; // Overwrite if exists
  } else {
    universes.push(newUniverse);
  }

  await writeUniverses(universes);
  revalidatePath(`/studio/${projectId}/universe`);
  return newUniverse;
}

export async function getUniverse(projectId: string) {
  const universes = await readUniverses();
  return universes.find((u) => u.projectId === projectId) || null;
}
'use server';

import { revalidatePath } from 'next/cache';
import { readProjects } from '@/repositories/local/fileDB';
import { getUniverse } from '@/app/actions/universeActions';
import { readCharacters, writeCharacters, Character } from '@/repositories/local/characterDB';

export async function generateCoreCharacters(projectId: string) {
  // 1. Load parent story & world details to ensure complete narrative alignment
  const projects = await readProjects();
  const project = projects.find((p) => p.id === projectId);
  if (!project) throw new Error('Project context not found');

  const universe = await getUniverse(projectId);
  const worldSummary = universe 
    ? `World Geography: ${JSON.stringify(universe.locations)}. World Lore: ${JSON.stringify(universe.lore)}` 
    : 'No geography details declared yet.';

  const url = `${process.env.LOCAL_OLLAMA_URL || 'http://localhost:11434'}/api/generate`;
  const model = process.env.LOCAL_OLLAMA_MODEL || 'qwen2.5:7b-instruct';

  const systemInstructions = `
    You are an expert anime character designer and writer. Generate 3 core characters (Hero, Companion, and Villain) aligned to the project and world premise.
    For each character, generate highly specific physical descriptors in their "visualPrompt" property. These visual descriptions must avoid emotional keywords and contain objective details (hair length/color, eye shape/color, clothing style, accessories) optimized as visual prompts for text-to-image generator prompts.
    You must output strictly in JSON format. Do not write any normal text, conversational words, or explanations. Only return raw JSON.
    JSON structure template:
    {
      "characters": [
        {
          "name": "Character Name",
          "role": "Hero",
          "age": "e.g., 17",
          "personality": "A concise summary of behavior and attitude",
          "goals": "Core motivation or target in the story",
          "skills": "Primary combat skills, magic, or talents",
          "visualPrompt": "1guy (or 1girl), detailed visual indicators (hair type/color, eye color, complete garment description, body type), cinematic lighting, high-contrast, anime key visual, highly detailed"
        },
        {
          "name": "Character Name",
          "role": "Companion",
          "age": "e.g., 19",
          "personality": "Summary of behavior",
          "goals": "Why they follow the hero or their personal objective",
          "skills": "Primary skills",
          "visualPrompt": "1guy (or 1girl), detailed visual indicators, anime styling details"
        },
        {
          "name": "Character Name",
          "role": "Villain",
          "age": "e.g., Unknown / 200",
          "personality": "Traits making them highly intimidating",
          "goals": "Their master plan or corrupt drive",
          "skills": "Overpowering techniques/abilities",
          "visualPrompt": "1guy (or 1girl), intimidating visual parameters, detailed armor/garments, dark thematic lighting, anime style"
        }
      ]
    }
  `;

  // 2. Query local GPU to spawn characters
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      prompt: `Anime Project Title: ${project.title}\nStory Summary: ${project.summary}\nWorld Lore Context: ${worldSummary}\nInstructions: Generate exactly 3 core characters matching the template strictly in JSON.`,
      system: systemInstructions,
      format: 'json',
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to communicate with local Ollama server');
  }

  const data = await response.json();
  const parsed = JSON.parse(data.response);

  // 3. Format and save to characters.json database
  const characters = await readCharacters();
  const filtered = characters.filter((c) => c.projectId !== projectId); // Remove previous configuration for this project if generating again

  const newCharacters: Character[] = parsed.characters.map((char: any) => ({
    id: crypto.randomUUID(),
    projectId,
    name: char.name,
    role: char.role,
    age: char.age,
    personality: char.personality,
    goals: char.goals,
    skills: char.skills,
    visualPrompt: char.visualPrompt,
  }));

  const updatedCharactersList = [...filtered, ...newCharacters];
  await writeCharacters(updatedCharactersList);

  revalidatePath(`/studio/${projectId}/characters`);
  return newCharacters;
}

export async function getCharacters(projectId: string) {
  const characters = await readCharacters();
  return characters.filter((c) => c.projectId === projectId);
}
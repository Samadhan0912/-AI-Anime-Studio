'use server';

import { revalidatePath } from 'next/cache';
import { readProjects } from '@/repositories/local/fileDB';
import { getUniverse } from '@/app/actions/universeActions';
import { getCharacters } from '@/app/actions/characterActions';
import { readEpisodes, writeEpisodes, Episode } from '@/repositories/local/episodeDB';

export async function generateEpisodeScript(projectId: string) {
  // 1. Gather upstream world data
  const projects = await readProjects();
  const project = projects.find((p) => p.id === projectId);
  if (!project) throw new Error('Project context not found');

  const universe = await getUniverse(projectId);
  if (!universe) throw new Error('Generate world setting in the Universe Engine before scripting');

  const characters = await getCharacters(projectId);
  if (characters.length === 0) throw new Error('Generate characters in the Character Engine before scripting');

  const castList = characters.map((c) => `Name: ${c.name} (Role: ${c.role}). Visual details: ${c.visualPrompt}`).join('\n');
  const locationList = universe.locations.map((l) => `Location: ${l.name}. Description: ${l.description}`).join('\n');

  // 2. Read existing episodes to calculate next sequence and build memory context
  const episodes = await readEpisodes();
  const projectEpisodes = episodes.filter((ep) => ep.projectId === projectId)
    .sort((a, b) => a.episodeNumber - b.episodeNumber);

  const nextEpisodeNumber = projectEpisodes.length + 1;

  // Build a strict narrative timeline context if we are past Episode 1 [1]
  let historicalMemoryPrompt = '';
  if (projectEpisodes.length > 0) {
    historicalMemoryPrompt = `
      NARRATIVE CONTINUTY MEMORY RECORD (DO NOT CONTRADICT):
      You are writing Episode ${nextEpisodeNumber}. You must directly continue the plot lines from previous episodes:
      ${projectEpisodes.map(ep => `- Episode ${ep.episodeNumber}: "${ep.title}" - Summary: ${ep.summary}`).join('\n')}
      Ensure character relationships, dead/alive statuses, power levels, and world changes from these episodes are fully respected [1].
    `;
  } else {
    historicalMemoryPrompt = 'This is Episode 1. Establish the main plot hook, introducing core characters and settings.';
  }

  const url = `${process.env.LOCAL_OLLAMA_URL || 'http://localhost:11434'}/api/generate`;
  const model = process.env.LOCAL_OLLAMA_MODEL || 'qwen2.5:7b-instruct';

  const systemInstructions = `
    You are an expert anime screenwriter. Generate Episode ${nextEpisodeNumber} of an anime based on the world, characters, and previous episode summaries.
    The episode must contain exactly 4 chronological scenes to map out a clear dramatic sequence: Hook, Conflict, Confrontation, and Resolution.
    Each scene must use one of the defined geographic locations, describe the visual action in the frame, and include a clear back-and-forth conversation.
    You must output strictly in JSON format. Do not write any normal text, conversational words, or explanations. Only return raw JSON.
    JSON structure template:
    {
      "title": "Episode ${nextEpisodeNumber} Title",
      "summary": "Brief episode plot summary detailing the direct progression from previous events",
      "scenes": [
        {
          "sceneNumber": 1,
          "setting": "Must exactly match one of the defined geographical locations",
          "visualDescription": "Detailed visual summary of the frame including characters present and backdrop rules",
          "dialogue": [
            { "speaker": "Must exactly match a character name", "text": "What they say in the scene" },
            { "speaker": "Must exactly match a character name", "text": "Their response" }
          ]
        },
        {
          "sceneNumber": 2,
          "setting": "Defined geographical location",
          "visualDescription": "Detailed visual summary of the second scene",
          "dialogue": [
            { "speaker": "Character Name", "text": "Their spoken line" }
          ]
        },
        {
          "sceneNumber": 3,
          "setting": "Defined geographical location",
          "visualDescription": "Detailed visual summary of the third scene",
          "dialogue": [
            { "speaker": "Character Name", "text": "Their spoken line" }
          ]
        },
        {
          "sceneNumber": 4,
          "setting": "Defined geographical location",
          "visualDescription": "Detailed visual summary of the final scene",
          "dialogue": [
            { "speaker": "Character Name", "text": "Their spoken line" }
          ]
        }
      ]
    }
  `;

  // 3. Query local model with memory context
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      prompt: `Project: ${project.title}\nTheme: ${project.summary}\nLocations Available:\n${locationList}\nCharacter Cast:\n${castList}\n${historicalMemoryPrompt}\nInstructions: Generate Episode ${nextEpisodeNumber} script matching the JSON schema.`,
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

  // 4. Create and append the new episode record
  const newEpisode: Episode = {
    id: crypto.randomUUID(),
    projectId,
    episodeNumber: nextEpisodeNumber,
    title: parsed.title,
    summary: parsed.summary,
    scenes: parsed.scenes,
    createdAt: new Date().toISOString(),
  };

  // Keep other episodes and append new one
  const filtered = episodes.filter((ep) => ep.id !== newEpisode.id); 
  const updatedEpisodesList = [...filtered, newEpisode];
  await writeEpisodes(updatedEpisodesList);

  revalidatePath(`/studio/${projectId}/episodes`);
  return newEpisode;
}

export async function getEpisodes(projectId: string) {
  const episodes = await readEpisodes();
  return episodes
    .filter((ep) => ep.projectId === projectId)
    .sort((a, b) => a.episodeNumber - b.episodeNumber);
}

export async function deleteEpisode(episodeId: string, projectId: string) {
  const episodes = await readEpisodes();
  const filtered = episodes.filter((ep) => ep.id !== episodeId);
  await writeEpisodes(filtered);
  revalidatePath(`/studio/${projectId}/episodes`);
}
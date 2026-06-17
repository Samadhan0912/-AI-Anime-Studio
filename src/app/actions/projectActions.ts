'use server';

import { revalidatePath } from 'next/cache';
import { readProjects, writeProjects, Project } from '@/repositories/local/fileDB';
import { generateAnimeStory } from '@/lib/ollama';

export async function createAnimeProject(prompt: string) {
  if (!prompt.trim()) {
    throw new Error('Prompt cannot be empty');
  }

  // 1. Generate story using Ollama
  const story = await generateAnimeStory(prompt);

  // 2. Read existing projects from JSON database
  const projects = await readProjects();

  // 3. Create new project object
  const newProject: Project = {
    id: crypto.randomUUID(),
    userPrompt: prompt,
    title: story.title,
    genre: story.genre,
    summary: story.summary,
    worldDescription: story.worldDescription,
    createdAt: new Date().toISOString(),
  };

  // 4. Save back to local projects.json file
  projects.unshift(newProject);
  await writeProjects(projects);

  // 5. Force Next.js to update the page UI
  revalidatePath('/');
  return newProject;
}

export async function getProjects() {
  return await readProjects();
}

export async function deleteProject(id: string) {
  const projects = await readProjects();
  const filtered = projects.filter((p) => p.id !== id);
  await writeProjects(filtered);
  revalidatePath('/');
}
import fs from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'projects.json');

export interface Project {
  id: string;
  userPrompt: string;
  title: string;
  genre: string;
  summary: string;
  worldDescription: string;
  styleGuide: string;       // Added for next-level visual detailing [1]
  cinematicFocus: string;   // Added for advanced camera-work tracking [1]
  createdAt: string;
}

export async function readProjects(): Promise<Project[]> {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function writeProjects(projects: Project[]): Promise<void> {
  const dir = path.dirname(DATA_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(projects, null, 2), 'utf-8');
}
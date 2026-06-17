import fs from 'fs/promises';
import path from 'path';

const EPISODES_FILE = path.join(process.cwd(), 'data', 'episodes.json');

export interface DialogueLine {
  speaker: string;
  text: string;
  audioPath?: string;
}

export interface Scene {
  sceneNumber: number;
  setting: string;
  visualDescription: string;
  dialogue: DialogueLine[];
  imagePath?: string;
}

export interface Episode {
  id: string;
  projectId: string;
  episodeNumber: number;
  title: string;
  summary: string;
  scenes: Scene[];
  createdAt: string;
  videoPath?: string; // Compiled complete MP4 episode path
}

export async function readEpisodes(): Promise<Episode[]> {
  try {
    const data = await fs.readFile(EPISODES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function writeEpisodes(episodes: Episode[]): Promise<void> {
  const dir = path.dirname(EPISODES_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(EPISODES_FILE, JSON.stringify(episodes, null, 2), 'utf-8');
}
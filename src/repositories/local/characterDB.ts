import fs from 'fs/promises';
import path from 'path';

const CHARACTERS_FILE = path.join(process.cwd(), 'data', 'characters.json');

export interface Character {
  id: string;
  projectId: string;
  name: string;
  role: 'Hero' | 'Companion' | 'Villain';
  age: string;
  personality: string;
  goals: string;
  skills: string;
  visualPrompt: string;
  avatarPath?: string; // Optional generated image output path
}

export async function readCharacters(): Promise<Character[]> {
  try {
    const data = await fs.readFile(CHARACTERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function writeCharacters(characters: Character[]): Promise<void> {
  const dir = path.dirname(CHARACTERS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CHARACTERS_FILE, JSON.stringify(characters, null, 2), 'utf-8');
}
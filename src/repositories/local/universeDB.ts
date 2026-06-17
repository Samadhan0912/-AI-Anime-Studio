import fs from 'fs/promises';
import path from 'path';

const UNIVERSES_FILE = path.join(process.cwd(), 'data', 'universes.json');

export interface Location {
  name: string;
  description: string;
}

export interface Lore {
  topic: string;
  details: string;
}

export interface Universe {
  id: string;
  projectId: string;
  locations: Location[];
  lore: Lore[];
  createdAt: string;
}

export async function readUniverses(): Promise<Universe[]> {
  try {
    const data = await fs.readFile(UNIVERSES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function writeUniverses(universes: Universe[]): Promise<void> {
  const dir = path.dirname(UNIVERSES_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(UNIVERSES_FILE, JSON.stringify(universes, null, 2), 'utf-8');
}
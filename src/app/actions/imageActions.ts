'use server';

import { revalidatePath } from 'next/cache';
import { readCharacters, writeCharacters } from '@/repositories/local/characterDB';
import { generateComfyImage } from '@/lib/comfyui';

export async function generateCharacterConceptArt(characterId: string) {
  const characters = await readCharacters();
  const charIdx = characters.findIndex((c) => c.id === characterId);

  if (charIdx === -1) {
    throw new Error('Character profile not found in database');
  }

  const character = characters[charIdx];
  const outputFileName = `char_${characterId}.png`;

  // Dynamic style injection for high-end character sheets
  const characterStyleConfig = `
    anime key visual, character concept art, solid background, 
    solo leveling aesthetic, ufotable studio style, sharp details, glowing highlights, 
    finely rendered shadows, digital illustration, sharp focus, masterpiece, high quality
  `;

  const finalPrompt = `${character.visualPrompt}, ${characterStyleConfig}`;

  // Generate square character avatar (512x512)
  const imageRelativePath = await generateComfyImage(finalPrompt, outputFileName, 512, 512);

  const updatedChar = {
    ...character,
    avatarPath: imageRelativePath,
  };

  characters[charIdx] = updatedChar as any;
  await writeCharacters(characters);

  revalidatePath(`/studio/${character.projectId}/characters`);
  return updatedChar;
}
'use server';

import { revalidatePath } from 'next/cache';
import { readEpisodes, writeEpisodes } from '@/repositories/local/episodeDB';
import { getCharacters } from '@/app/actions/characterActions';
import { generateComfyImage } from '@/lib/comfyui';

export async function generateSceneFrame(
  projectId: string, 
  episodeId: string, 
  sceneNumber: number
) {
  const episodes = await readEpisodes();
  const epIdx = episodes.findIndex((e) => e.id === episodeId && e.projectId === projectId);
  if (epIdx === -1) throw new Error('Episode not found');

  const episode = episodes[epIdx];
  const sceneIdx = episode.scenes.findIndex((s) => s.sceneNumber === sceneNumber);
  if (sceneIdx === -1) throw new Error('Scene not found');

  const scene = episode.scenes[sceneIdx];
  const characters = await getCharacters(projectId);
  
  // Find which of our core characters are present in this scene
  const activeSpeakers = scene.dialogue.map(d => d.speaker.toLowerCase());
  const presentCharacters = characters.filter((c) => 
    activeSpeakers.includes(c.name.toLowerCase()) || 
    scene.visualDescription.toLowerCase().includes(c.name.toLowerCase())
  );

  let characterPromptBlock = '';
  let activeAvatarPath: string | undefined = undefined;

  if (presentCharacters.length > 0) {
    characterPromptBlock = presentCharacters.map(c => `${c.visualPrompt.split(',')[0]} (${c.name})`).join(' and ') + ' standing in scene, ';
    
    // Select the first active character's avatar photo as our IP-Adapter face reference! [1]
    const charWithAvatar = presentCharacters.find((c) => c.avatarPath);
    if (charWithAvatar) {
      activeAvatarPath = charWithAvatar.avatarPath;
    }
  }

  const premiumAnimeStyle = `
    masterpiece, high quality, highly detailed, 
    ufotable style, solo leveling aesthetic, 
    cinematic lighting, dynamic contrast, sharp shadows, deep dramatic colors, 
    glowing energy particle effects, digital cel-shading, 
    ultra-crisp digital illustrations, detailed focus, widescreen composition, 16:9 aspect ratio
  `;

  const finalPrompt = `${characterPromptBlock}${scene.visualDescription}, ${premiumAnimeStyle}, background setting: ${scene.setting}`;
  const outputFileName = `scene_${episodeId}_s${sceneNumber}.png`;

  // 3. Trigger ComfyUI, passing the face avatar reference path if it exists [1]
  const imageRelativePath = await generateComfyImage(
    finalPrompt, 
    outputFileName, 
    640, 
    360, 
    activeAvatarPath
  );

  episode.scenes[sceneIdx] = {
    ...scene,
    imagePath: imageRelativePath,
  };

  episodes[epIdx] = episode;
  await writeEpisodes(episodes);

  revalidatePath(`/studio/${projectId}/episodes`);
  return imageRelativePath;
}
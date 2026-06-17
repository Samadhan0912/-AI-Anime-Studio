'use server';

import { revalidatePath } from 'next/cache';
import { readEpisodes, writeEpisodes } from '@/repositories/local/episodeDB';
import { getCharacters } from '@/app/actions/characterActions';
import { generateSpeech, NEURAL_VOICES } from '@/lib/tts';

export async function generateDialogueAudio(
  projectId: string,
  episodeId: string,
  sceneNumber: number,
  dialogueIdx: number
) {
  const episodes = await readEpisodes();
  const epIdx = episodes.findIndex((e) => e.id === episodeId && e.projectId === projectId);
  if (epIdx === -1) throw new Error('Episode record not found');

  const episode = episodes[epIdx];
  const sceneIdx = episode.scenes.findIndex((s) => s.sceneNumber === sceneNumber);
  if (sceneIdx === -1) throw new Error('Scene record not found');

  const scene = episode.scenes[sceneIdx];
  const dialogue = scene.dialogue[dialogueIdx];

  // 1. Fetch character cast list to map profiles
  const characters = await getCharacters(projectId);
  const speaker = dialogue.speaker.toLowerCase();

  // 2. Select human-dubbed neural voice pack
  let assignedVoice = NEURAL_VOICES.MaleWarrior;

  if (speaker === 'narrator') {
    assignedVoice = NEURAL_VOICES.Narrator;
  } else {
    const matchedCharacter = characters.find(c => c.name.toLowerCase() === speaker);
    if (matchedCharacter) {
      const visualDetails = matchedCharacter.visualPrompt.toLowerCase();
      const isFemale = visualDetails.includes('1girl') || visualDetails.includes('female') || visualDetails.includes('woman') || visualDetails.includes('girl');

      if (isFemale) {
        assignedVoice = matchedCharacter.role === 'Companion' 
          ? NEURAL_VOICES.FemaleVivid   // Highly expressive, warm speaking voice
          : NEURAL_VOICES.FemaleSoft;    // Soft, articulate female voice
      } else {
        assignedVoice = matchedCharacter.role === 'Villain'
          ? NEURAL_VOICES.Narrator       // Intimidating, deep British speaking voice
          : matchedCharacter.age && parseInt(matchedCharacter.age) < 22
          ? NEURAL_VOICES.MaleYoung      // Young male adolescent voice
          : NEURAL_VOICES.MaleWarrior;    // Standard heroic masculine voice
      }
    }
  }

  const outputFileName = `voice_${episodeId}_s${sceneNumber}_d${dialogueIdx}.wav`;

  // 3. Compile dialogue
  const audioRelativePath = await generateSpeech(dialogue.text, outputFileName, assignedVoice);

  episode.scenes[sceneIdx].dialogue[dialogueIdx] = {
    ...dialogue,
    audioPath: audioRelativePath,
  };

  episodes[epIdx] = episode;
  await writeEpisodes(episodes);

  revalidatePath(`/studio/${projectId}/episodes`);
  return audioRelativePath;
}
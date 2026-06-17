'use server';

import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { readEpisodes, writeEpisodes } from '@/repositories/local/episodeDB';
import { generateSceneFrame } from './sceneImageActions';
import { generateDialogueAudio } from './audioActions';

const execPromise = util.promisify(exec);

// Programmatically calculate standard WAV duration via its byte header [10]
async function getAudioDuration(filePath: string): Promise<number> {
  const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
  
  try {
    const { stdout } = await execPromise(cmd);
    return parseFloat(stdout.trim());
  } catch {
    try {
      const buffer = await fs.readFile(filePath);
      const byteRate = buffer.readUInt32LE(28); 
      
      let dataOffset = 36;
      while (dataOffset < buffer.length - 8) {
        const chunkId = buffer.toString('utf-8', dataOffset, dataOffset + 4);
        if (chunkId === 'data') {
          const dataSize = buffer.readUInt32LE(dataOffset + 4);
          return dataSize / byteRate; 
        }
        dataOffset++;
      }
    } catch {
      // safe recovery
    }
    return 4.0;
  }
}

// 1. THE ENHANCED FFMPEG CINEMATIC CAMERA COMPILER [1]
// Translates flat storyboard frames into dynamic cinematic movements with 0% extra GPU cost
function getCinematicCameraFilter(sceneNumber: number): string {
  switch (sceneNumber) {
    case 1:
      // DOLLY-IN ZOOM: Slow, smooth camera zoom-in toward center frame [1]
      return `scale=1280:720,zoompan=z='min(zoom+0.0006,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=125:s=1280x720,fps=25`;
    
    case 2:
      // HORIZONTAL PAN: Smooth horizontal tracking shot (Left to Right) [1]
      return `scale=1600:900,zoompan=z=1.20:x='(on*1.2)':y='ih/2-(ih/zoom/2)':d=125:s=1280x720,fps=25`;
    
    case 3:
      // ACTION SHAKE: Violent camera vibration + fast zoom for combat/conflict scenes [1]
      return `scale=1280:720,zoompan=z='min(zoom+0.0015,1.15)':x='iw/2-(iw/zoom/2)+sin(on*8)*4':y='ih/2-(ih/zoom/2)+cos(on*8)*4':d=125:s=1280x720,fps=25`;
    
    case 4:
    default:
      // VERTICAL TILT: Slow vertical tilt upward, simulating traditional handheld camera panning [1]
      return `scale=1280:960,zoompan=z=1.25:x='iw/2-(iw/zoom/2)':y='ih-(ih/zoom)-(on*0.8)':d=125:s=1280x720,fps=25`;
  }
}

export async function compileEpisodeVideo(projectId: string, episodeId: string) {
  const episodes = await readEpisodes();
  const epIdx = episodes.findIndex((e) => e.id === episodeId && e.projectId === projectId);
  if (epIdx === -1) throw new Error('Episode record not found');

  const episode = episodes[epIdx];
  const outputVideoDir = path.join(process.cwd(), 'public', 'output', 'videos');
  const finalVideoFileName = `episode_${episodeId}.mp4`;
  const finalVideoPath = path.join(outputVideoDir, finalVideoFileName);

  await fs.mkdir(outputVideoDir, { recursive: true });

  const tempFolder = path.join(process.cwd(), 'public', 'output', 'videos', `temp_${episodeId}`);
  await fs.mkdir(tempFolder, { recursive: true });

  const sceneClips: string[] = [];

  try {
    for (const scene of episode.scenes) {
      if (!scene.imagePath) {
        throw new Error(`Scene ${scene.sceneNumber} does not have a rendered frame image. Generate all frames first.`);
      }

      const absImagePath = path.join(process.cwd(), 'public', scene.imagePath);
      const sceneAudioPaths = scene.dialogue
        .filter((d) => d.audioPath)
        .map((d) => path.join(process.cwd(), 'public', d.audioPath!));

      if (sceneAudioPaths.length === 0) {
        throw new Error(`Scene ${scene.sceneNumber} has no synthesized voice tracks. Vocalize dialogue lines first.`);
      }

      let totalDuration = 0;
      for (const audioPath of sceneAudioPaths) {
        totalDuration += await getAudioDuration(audioPath);
      }
      
      if (totalDuration === 0) totalDuration = 3;

      const tempMergedAudio = path.join(tempFolder, `scene_${scene.sceneNumber}_audio.wav`);
      const tempSceneClip = path.join(tempFolder, `scene_${scene.sceneNumber}_clip.mp4`);

      // Merge dialogue files for this scene into one audio track
      const mergeAudioCmd = `ffmpeg -y ${sceneAudioPaths.map(p => `-i "${p}"`).join(' ')} -filter_complex concat=n=${sceneAudioPaths.length}:v=0:a=1 "${tempMergedAudio}"`;
      await execPromise(mergeAudioCmd);

      // Select distinct camera movement filter based on the scene position [1]
      const cameraFilter = getCinematicCameraFilter(scene.sceneNumber);

      // Render image + camera movement + merged audio into a 16:9 mp4 scene clip [1]
      const buildClipCmd = `ffmpeg -y -loop 1 -i "${absImagePath}" -i "${tempMergedAudio}" -t ${totalDuration} -vf "${cameraFilter}" -c:v libx264 -c:a aac -b:a 192k -pix_fmt yuv420p "${tempSceneClip}"`;
      await execPromise(buildClipCmd);

      sceneClips.push(tempSceneClip);
    }

    // Stitch all individual scene video clips into the final video file [1]
    const listFilePath = path.join(tempFolder, 'list.txt');
    const listContent = sceneClips.map((c) => `file '${c.replace(/\\/g, '/')}'`).join('\n');
    await fs.writeFile(listFilePath, listContent, 'utf-8');

    const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${listFilePath}" -c copy "${finalVideoPath}"`;
    await execPromise(concatCmd);

    // Update the database record with the final relative output link [1]
    episode.videoPath = `/output/videos/${finalVideoFileName}`;
    episodes[epIdx] = episode;
    await writeEpisodes(episodes);

    // Cleanup temporary work folders
    await fs.rm(tempFolder, { recursive: true, force: true });

    revalidatePath(`/studio/${projectId}/episodes`);
    return episode.videoPath;
  } catch (error: any) {
    await fs.rm(tempFolder, { recursive: true, force: true });
    throw new Error(error.message || 'FFmpeg failed to compile. Verify FFmpeg installation.');
  }
}

// 2. THE MASTER QUEUE ORCHESTRATOR [1]
// Sequentially automates voice synthesis, image generation, and video compiling with one click
export async function generateFullEpisodePipeline(
  projectId: string, 
  episodeId: string, 
  progressCallback: (status: string) => void
) {
  const episodes = await readEpisodes();
  const episode = episodes.find((e) => e.id === episodeId && e.projectId === projectId);
  if (!episode) throw new Error('Episode not found');

  try {
    // Phase 7: Automate Dialogue Voice Generation (Speech Synth) [1]
    for (const scene of episode.scenes) {
      for (let idx = 0; idx < scene.dialogue.length; idx++) {
        const line = scene.dialogue[idx];
        console.log(`[Orchestrator] Vocalizing Scene ${scene.sceneNumber} - Line ${idx}: "${line.text}"`);
        await generateDialogueAudio(projectId, episodeId, scene.sceneNumber, idx);
      }
    }

    // Phase 6: Automate Widescreen Storyboard Image Generation (ComfyUI with IP-Adapter) [1]
    for (const scene of episode.scenes) {
      console.log(`[Orchestrator] Rendering Widescreen Storyboard for Scene ${scene.sceneNumber}`);
      await generateSceneFrame(projectId, episodeId, scene.sceneNumber);
    }

    // Phase 8: Compile all assets into final widescreen MP4 with camera pans [1]
    console.log(`[Orchestrator] Compiling Widescreen Cinematic MP4 Video using FFmpeg`);
    const finalVideoPath = await compileEpisodeVideo(projectId, episodeId);

    revalidatePath(`/studio/${projectId}/episodes`);
    return finalVideoPath;
  } catch (error: any) {
    throw new Error(`Master Render failed: ${error.message}`);
  }
}
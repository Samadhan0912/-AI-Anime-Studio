import fs from 'fs/promises';
import path from 'path';

// Premium high-fidelity Microsoft Neural Voices available via FreeTTS REST API
export const NEURAL_VOICES = {
  MaleWarrior: 'en-US-GuyNeural',         // Epic, clear heroic male warrior voice
  MaleYoung: 'en-US-ChristopherNeural',   // Energetic, young male voice
  FemaleVivid: 'en-US-AriaNeural',       // Highly expressive, emotional female voice
  FemaleSoft: 'en-US-JennyNeural',       // Warm, soft, clean female voice
  Narrator: 'en-GB-RyanNeural'           // Deep, cinematic British male voice (Perfect for Villain/Narrator)
};

export async function generateSpeech(text: string, fileName: string, voiceName: string): Promise<string> {
  const localOutputPath = path.join(process.cwd(), 'public', 'output', 'audio', fileName);
  await fs.mkdir(path.dirname(localOutputPath), { recursive: true });

  try {
    // 1. Send dialogue to FreeTTS REST compiler
    const response = await fetch('https://freetts.org/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        voice: voiceName,
        rate: '+0%',
        pitch: '+0Hz'
      })
    });

    if (!response.ok) throw new Error('FreeTTS server offline or busy');

    const data = await response.json();
    const fileId = data.file_id;

    // 2. Fetch the compiled high-quality MP3/WAV file
    const audioRes = await fetch(`https://freetts.org/api/audio/${fileId}`);
    if (!audioRes.ok) throw new Error('Failed to retrieve synthesized voice stream');

    const buffer = Buffer.from(await audioRes.arrayBuffer());
    await fs.writeFile(localOutputPath, buffer);

    return `/output/audio/${fileName}`;
  } catch (error: any) {
    console.warn(`FreeTTS API failed: ${error.message}. Running local fallback...`);

    // Bulletproof Fallback: Generate a clean tone if network drops entirely [10]
    const sampleRate = 44100;
    const durationSeconds = 2;
    const numSamples = sampleRate * durationSeconds;
    const buffer = Buffer.alloc(44 + numSamples * 2);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + numSamples * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); 
    buffer.writeUInt16LE(1, 20);  
    buffer.writeUInt16LE(1, 22);  
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28); 
    buffer.writeUInt16LE(2, 32);  
    buffer.writeUInt16LE(16, 34); 
    buffer.write('data', 36);
    buffer.writeUInt32LE(numSamples * 2, 40);

    const frequency = 440; 
    const period = Math.floor(sampleRate / frequency);
    for (let i = 0; i < numSamples; i++) {
      const isHigh = Math.floor(i / (period / 2)) % 2 === 0;
      const value = isHigh ? 12000 : -12000;
      buffer.writeInt16LE(value, 44 + i * 2);
    }
    await fs.writeFile(localOutputPath, buffer);
    return `/output/audio/${fileName}`;
  }
}
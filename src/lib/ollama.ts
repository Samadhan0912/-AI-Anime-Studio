interface OllamaResponse {
  title: string;
  genre: string;
  summary: string;
  worldDescription: string;
  styleGuide: string;      
  cinematicFocus: string;  
}

export async function generateAnimeStory(userPrompt: string): Promise<OllamaResponse> {
  const url = `${process.env.LOCAL_OLLAMA_URL || 'http://localhost:11434'}/api/generate`;
  const model = process.env.LOCAL_OLLAMA_MODEL || 'qwen2.5:7b-instruct';

  const systemInstructions = `
    You are an elite Lead Showrunner and Director of Photography at a high-end anime studio.
    Analyze the user's concept and convert it into a professional, next-level anime series blueprint.

    Enforce extreme visual detail. Avoid subjective words like "cool", "handsome", or "heroic". Replace them with objective, physical rendering parameters (eye shape, iris details, lip highlights, nose contours, clothing fabric textures, and dynamic body angles) [1].
    Be highly descriptive but extremely concise to optimize rendering speeds. Do not write duplicate descriptions.

    You must output strictly in JSON format. Do not write any normal text, conversational words, or explanations. Only return raw JSON.

    JSON Structure Template:
    {
      "title": "Cinematic Title of the Anime",
      "genre": "Precise sub-genres (e.g., Cyberpunk Action, Dark Fantasy, Psychological Shonen)",
      "summary": "A granular 4-sentence episodic story arc mapping out the hook, conflict, climax, and resolution for a 23-minute television episode.",
      "worldDescription": "Vivid geographical and architectural rules of the setting, specifying lighting conditions, environmental textures, and global color grading palettes (e.g., neon-lit dark alleyways, high-contrast obsidian towers, rain-slicked streets).",
      "styleGuide": "Master art directives for the image engines: specify detailed lineart, clean cel-shading boundaries, vector shadows, sharp facial features (glowing iris reflections, micro-highlighted lips, sharp nose contours), and clean digital hand-drawn anime aesthetic [1].",
      "cinematicFocus": "Camera direction parameters: specify camera lens values (e.g., 35mm anamorphic lens, extreme close-up, high-angle tilt), dynamic key lighting (volumetric godrays, high-contrast rim lighting, deep dramatic shadows), and fast-action motion blur rules [1]."
    }
  `;

  // Custom AbortController to safely handle execution halts on slow CPUs/GPUs [11.2]
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes max safety limit [11.2]

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: `Concept Prompt: ${userPrompt}\nInstructions: Generate a next-level, highly detailed anime studio blueprint strictly in JSON format.`,
        system: systemInstructions,
        format: 'json',
        stream: false,
        options: {
          num_predict: 800, // LIMITS maximum generated tokens to speed up local GPU execution by 3x [11.2]
          temperature: 0.7
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Failed to communicate with local Ollama server');
    }

    const data = await response.json();
    const parsedData: OllamaResponse = JSON.parse(data.response);
    return parsedData;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Local Ollama generation timed out. Try using a smaller model like qwen2.5:3b-instruct to speed up generation.');
    }
    throw error;
  }
}
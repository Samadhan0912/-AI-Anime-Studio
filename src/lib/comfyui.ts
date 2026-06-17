import fs from 'fs/promises';
import path from 'path';

export async function generateComfyImage(
  prompt: string, 
  fileName: string,
  width: number = 512,
  height: number = 512,
  refImagePath?: string
): Promise<string> {
  const comfyUrl = process.env.LOCAL_COMFYUI_URL || 'http://127.0.0.1:8188';
  const ckptName = process.env.LOCAL_COMFY_CKPT || 'counterfeitV30_v30.safetensors';
  
  const folder = width > 512 ? 'scenes' : 'characters';
  const localOutputPath = path.join(process.cwd(), 'public', 'output', folder, fileName);

  let finalRefImageName = "";

  // 1. Programmatically copy the character's reference portrait to ComfyUI's input directory [1.1.8]
  if (refImagePath && process.env.LOCAL_COMFY_PATH) {
    try {
      const absoluteRefPath = path.join(process.cwd(), 'public', refImagePath);
      finalRefImageName = path.basename(refImagePath);
      const comfyInputPath = path.join(process.env.LOCAL_COMFY_PATH, 'input', finalRefImageName);
      
      await fs.mkdir(path.dirname(comfyInputPath), { recursive: true });
      await fs.copyFile(absoluteRefPath, comfyInputPath);
    } catch (err: any) {
      console.warn("Failed to copy reference image to ComfyUI inputs:", err.message);
      finalRefImageName = ""; 
    }
  }

  // 2. Dynamic Node Linker (Based on your working screenshot) [1]
  // If IP-Adapter is active, route the KSampler model input through IPAdapterAdvanced (Node "13")
  const modelConnection = finalRefImageName ? ["13", 0] : ["4", 0];

  const workflow: any = {
    "3": {
      "class_type": "KSampler",
      "inputs": {
        "cfg": 8.0,
        "denoise": 1.00,
        "latent_image": [ "5", 0 ],
        "model": modelConnection, // Connected dynamically based on avatar existense [1]
        "negative": [ "7", 0 ],
        "positive": [ "6", 0 ],
        "sampler_name": "euler", 
        "scheduler": "simple", // Matches your screenshot
        "seed": Math.floor(Math.random() * 1000000),
        "steps": 20 // Widescreen rendering pass count
      }
    },
    "4": {
      "class_type": "CheckpointLoaderSimple",
      "inputs": {
        "ckpt_name": ckptName
      }
    },
    "5": {
      "class_type": "EmptyLatentImage",
      "inputs": {
        "batch_size": 1,
        "height": height,
        "width": width
      }
    },
    "6": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "clip": [ "4", 1 ],
        "text": `${prompt}` 
      }
    },
    "7": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "clip": [ "4", 1 ],
        "text": "low quality, blurry, bad anatomy, realistic, photo, 3d render, sketch, monochrome, low resolution, deformed"
      }
    },
    "8": {
      "class_type": "VAEDecode",
      "inputs": {
        "samples": [ "3", 0 ],
        "vae": [ "4", 2 ]
      }
    },
    "9": {
      "class_type": "SaveImage",
      "inputs": {
        "filename_prefix": "studio_render",
        "images": [ "8", 0 ]
      }
    }
  };

  // 3. Inject your exact working IP-Adapter node topology if reference portrait exists [1]
  if (finalRefImageName) {
    workflow["10"] = {
      "class_type": "IPAdapterModelLoader", // Loads ip-adapter_sd15.safetensors [1.2.8]
      "inputs": {
        "ipadapter_file": "ip-adapter_sd15.safetensors"
      }
    };
    workflow["11"] = {
      "class_type": "CLIPVisionLoader", // Loads your CLIP Vision Model [1.2.8]
      "inputs": {
        "clip_name": "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors"
      }
    };
    workflow["12"] = {
      "class_type": "LoadImage", // Loads copied character filename [1.1.8]
      "inputs": {
        "image": finalRefImageName
      }
    };
    workflow["13"] = {
      "class_type": "IPAdapterAdvanced", // Integrates all references [1]
      "inputs": {
        "model": [ "4", 0 ],
        "ipadapter": [ "10", 0 ],
        "image": [ "12", 0 ],
        "clip_vision": [ "11", 0 ],
        "weight": 1.00,
        "weight_type": "linear",
        "combine_embeds": "concat",
        "start_at": 0.000,
        "end_at": 1.000,
        "embeds_scaling": "V only"
      }
    };
  }

  try {
    const promptResponse = await fetch(`${comfyUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
    });

    if (!promptResponse.ok) throw new Error('ComfyUI offline');

    const promptData = await promptResponse.json();
    const promptId = promptData.prompt_id;

    let filename = '';
    let completed = false;
    
    for (let i = 0; i < 150; i++) { 
      await new Promise((r) => setTimeout(r, 2000));
      const historyRes = await fetch(`${comfyUrl}/history/${promptId}`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        if (historyData[promptId]) {
          const outputs = historyData[promptId].outputs;
          const imageOutput = outputs["9"].images[0];
          filename = imageOutput.filename;
          completed = true;
          break;
        }
      }
    }

    if (!completed) throw new Error('Image generation timed out');

    const viewRes = await fetch(`${comfyUrl}/view?filename=${filename}&type=output`);
    const buffer = Buffer.from(await viewRes.arrayBuffer());

    await fs.mkdir(path.dirname(localOutputPath), { recursive: true });
    await fs.writeFile(localOutputPath, buffer);

    return `/output/${folder}/${fileName}`;
  } catch (error: any) {
    throw new Error(`ComfyUI execution failed: ${error.message}`);
  }
}
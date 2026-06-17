# AI Anime Studio 🎬

A high-performance, local-first production suite for procedural anime storyboarding, screenplay scripting, character-consistent visual asset rendering, and cinematic camera compiling.
<img width="1920" height="1020" alt="Screenshot 2026-06-17 234021" src="https://github.com/user-attachments/assets/d3254170-b2d8-4cb8-a779-785e125c0e1b" />
<img width="1920" height="1020" alt="Screenshot 2026-06-18 000342" src="https://github.com/user-attachments/assets/0e6877b3-e5a0-4a88-ad4b-9ad99c1d4450" />

<img width="1920" height="1020" alt="Screenshot 2026-06-17 234100" src="https://github.com/user-attachments/assets/6879d8bb-7feb-4fe0-b910-aa87daf6aaae" />

---

## 🚀 Key Features

*   **Story & Cast Engine (Ollama):** Generates structured screenplays and detailed character specs using local LLM inference (Qwen 2.5) [1].
*   **Widescreen Storyboard Renderer (ComfyUI):** Renders widescreen scenic frames and consistent character concept art using Stable Diffusion (Counterfeit V3) and IP-Adapter nodes [1].
*   **Dialogue Vocalizer (Neural Speech):** Synthesizes lifelike, gender-matched speaking voice WAV tracks for each dialogue segment [1].
*   **Cinematic Camera Compiler (FFmpeg):** Combines frames and audio while programmatically applying panning, vertical tilting, and dynamic combat shakes [1].
*   **Continuity Memory:** Evaluates past episode plot lines to prevent narrative drift or logical timeline errors in subsequent episode scripts [1].

<img width="1920" height="1020" alt="Screenshot 2026-06-17 234144" src="https://github.com/user-attachments/assets/c145ff6f-e86a-4146-af1a-401cbb73daa4" />

<img width="1920" height="1020" alt="Screenshot 2026-06-18 000105" src="https://github.com/user-attachments/assets/91e3dbf9-1545-43a9-8ce0-36249a91f6ab" />
<img width="1920" height="1020" alt="Screenshot 2026-06-18 000115" src="https://github.com/user-attachments/assets/8f678f38-b2d0-4c55-8b79-08e9ec20231e" />
<img width="1920" height="1020" alt="Screenshot 2026-06-18 000120" src="https://github.com/user-attachments/assets/3b11b3b7-e728-4790-a46e-d653140b5825" />
<img width="1920" height="1020" alt="Screenshot 2026-06-18 000125" src="https://github.com/user-attachments/assets/7ef909e1-2fc5-4a49-9f07-2545448e68e7" />

---

## 🛠️ Tech Stack

*   **Framework:** Next.js 15 (React 19, TypeScript, Tailwind CSS)
*   **Database:** Local JSON File Repositories (Prepared for Supabase Cloud migration) [1, 2]
*   **AI Inference Servers:** Ollama (`localhost:11434`) & ComfyUI (`localhost:8188`)
*   **Media Compilers:** FFmpeg CLI & FreeTTS REST API

---

## 📦 Quick Setup

### 1. Configure Environment Variables
Create a `.env` file in your root folder:
```ini
DATA_SOURCE_MODE=local
LOCAL_COMFY_CKPT=counterfeitV30_v30.safetensors
LOCAL_COMFY_PATH=C:\Your\Path\To\ComfyUI

LOCAL_COMFY_STEPS=20
LOCAL_COMFY_CFG=8.0
LOCAL_COMFY_SAMPLER=euler
LOCAL_COMFY_SCHEDULER=simple

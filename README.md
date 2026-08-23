# AI Speaking Assistant

AI-powered desktop assistant for oral exams and interviews. Captures system audio, transcribes examiner questions in real time, and generates spoken answers you can read aloud — while keeping the window invisible to screen sharing.

## Features

- **Real-time speech transcription** — captures system audio loopback, transcribes examiner questions via DashScope ASR
- **AI-generated spoken answers** — uses vision and text models to generate natural, stage-appropriate responses
- **Configurable stage presets** — built-in ELLT Speaking and Tech Interview templates; create your own stages with custom context rules
- **Screenshot context extraction** — automatically reads exam materials, photographs, and diagrams from screen captures
- **Auto-voice mode** — silence detection triggers answer generation without manual input
- **Command mode** — triple-semicolon activation for single-key shortcuts (no visible keystrokes)
- **Screen capture protection** — window content is hidden from screen sharing via Electron content protection
- **No taskbar or tray icon** — runs invisibly in the background

## How It Works

```
Examiner speaks → System audio captured → ASR transcription → AI generates answer → You read it aloud
```

1. Press `;;;R` to start transcription (triple semicolon, then R)
2. The app captures system audio and transcribes the examiner's speech
3. After ~1 second of silence, the transcribed question is sent to the AI
4. The AI generates a spoken answer based on the current stage context
5. Read the answer aloud — the window stays invisible to screen sharing

## Stage Presets

Each stage defines what context the AI uses when generating answers. Switch stages with `;;;,` and `;;;.`

### ELLT Speaking (default)

| Stage | Context |
|-------|---------|
| Introduction | Personal profile |
| Reading | Screenshot + personal profile fallback |
| Writing Q&A | Essay content + personal profile fallback |
| Photograph | Screenshot only |

### Tech Interview

| Stage | Context |
|-------|---------|
| 自我介绍 | Personal profile |
| 技术问答 | Screenshot + personal profile fallback |
| 项目经验 | Written content + personal profile fallback |
| 行为面试 | Personal profile |

You can create, edit, and reorder stages in the Settings page.

## Setup

### Prerequisites

- Node.js 22+
- Windows (primary target) or macOS

### Install

```bash
npm install
```

### Configure API Keys

Copy the example environment file and fill in your keys:

```bash
cp .env.example .env
```

Required services:

| Service | Purpose | Provider |
|---------|---------|----------|
| Vision model | Screenshot analysis, essay preprocessing | Any OpenAI-compatible API |
| Text model | Spoken answer generation | Any OpenAI-compatible API |
| ASR | Real-time speech transcription | [DashScope](https://help.aliyun.com/zh/model-studio/get-api-key) |

```env
# Main vision/text model provider
API_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
API_KEY="your-key"
MODEL="qwen-vl-max"

# Optional dedicated model for spoken answers (falls back to main)
VOICE_API_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
VOICE_API_KEY="your-key"
VOICE_MODEL="qwen-turbo"

# Real-time speech recognition
DASHSCOPE_API_KEY="your-key"
```

You can also configure API keys in the app Settings page after launch.

### Run

Development mode:

```bash
npm run dev
```

Production preview:

```bash
npm run build
npm start
```

Build Windows installer:

```bash
npm run build:win
```

Outputs: `dist/system-helper-<version>-setup.exe` and `dist/win-unpacked/`

## Command Mode Shortcuts

Press `;;;` (three semicolons) to enter command mode, then press a single key:

| Key | Action |
|-----|--------|
| `,` | Previous stage |
| `.` | Next stage |
| `S` | Take screenshot |
| `A` | Append screenshot |
| `R` | Toggle transcription |
| `C` | Clear context |
| `H` | Hide/show window |
| `M` | Toggle mouse passthrough |
| `J` / `K` | Scroll up/down |

Press `;;;` again to exit command mode.

## Personal Data

The public repository contains no personal profiles, essays, or API keys. Configure your own in the app Settings page:

- **Personal Profile** — your background, education, hobbies, etc. for Stage 1
- **Writing Content** — your fixed essay or written response for Stage 3
- **Stage Presets** — customize stage names, colors, context rules, and prompts

This data is stored locally in your browser's localStorage and Electron user data directory. It is never uploaded or shared.

## Screen Capture Protection

The app uses Electron's `setContentProtection` to hide window content from screen sharing. The window has no title, no taskbar button, and no tray icon. Results depend on your OS, graphics driver, and conferencing software. Some applications (e.g., certain Zoom versions) may still show a blank or black card in the share picker. Test before use.

## License

[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) — free for non-commercial use. Commercial use requires written permission.

## Credits

Based on [interview-coder-cn](https://github.com/ooboqoo/interview-coder-cn) by [ooboqoo](https://github.com/ooboqoo).

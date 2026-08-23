<p align="center">
  <a href="https://api.lmxww.xyz">
    <img src="https://img.shields.io/badge/赞助-API中转站-ff69b4?style=for-the-badge&logo=rocket" alt="赞助" />
  </a>
  <br/>
  <sub><b>api.lmxww.xyz</b> — 稳定低价 · OpenAI 兼容 · 百炼/硅基流动即开即用</sub>
</p>

# AI 口语助手

基于 AI 的口语考试和面试辅助工具。实时捕获系统音频并转录考官提问，生成你可以直接念出的口语回答。窗口对屏幕分享软件隐身。

## 功能

- **实时语音转录** — 捕获系统音频回环，通过 DashScope ASR 实时转写考官讲话
- **AI 生成口语回答** — 结合视觉和文本模型，生成自然、符合当前阶段的回答
- **可配置阶段预设** — 内置 ELLT 口语和技术面试模板，可自定义阶段和上下文规则
- **截图内容识别** — 自动提取屏幕中的阅读材料、图片和图表
- **自动语音模式** — 静音检测自动触发回答生成，无需手动操作
- **命令模式** — 三次分号激活单键快捷键，无可见按键操作
- **屏幕捕获保护** — 通过 Electron 内容保护隐藏窗口像素
- **无任务栏和托盘图标** — 后台静默运行

## 工作流程

```
考官说话 → 系统音频捕获 → 语音转文字 → AI 生成回答 → 你念出来
```

1. 按 `;;;R` 开始转录（三次分号，再按 R）
2. 应用捕获系统音频并转写考官讲话
3. 静音约 1 秒后，转录文字自动发送给 AI
4. AI 根据当前阶段上下文生成口语回答
5. 念出回答——窗口对屏幕分享不可见

## 阶段预设

每个阶段定义了 AI 生成回答时使用的上下文。按 `;;;,` 和 `;;;.` 切换阶段。

### ELLT 口语（默认）

| 阶段 | 上下文 |
|------|--------|
| Introduction | 个人资料 |
| Reading | 截图 + 个人资料兜底 |
| Writing Q&A | 作文内容 + 个人资料兜底 |
| Photograph | 截图 |

### 技术面试

| 阶段 | 上下文 |
|------|--------|
| 自我介绍 | 个人资料 |
| 技术问答 | 截图 + 个人资料兜底 |
| 项目经验 | 写作内容 + 个人资料兜底 |
| 行为面试 | 个人资料 |

可在设置页面创建、编辑和排序阶段。

## 环境要求

- Node.js 22+
- Windows（主要支持）或 macOS

## 安装

```bash
npm install
```

## 配置 API Key

复制环境变量模板并填入你的密钥：

```bash
cp .env.example .env
```

所需服务：

| 服务 | 用途 | 提供商 |
|------|------|--------|
| 视觉模型 | 截图分析、作文预处理 | 任意 OpenAI 兼容 API |
| 文本模型 | 口语回答生成 | 任意 OpenAI 兼容 API |
| 语音识别 | 实时语音转文字 | [百炼平台](https://help.aliyun.com/zh/model-studio/get-api-key) |

```env
# 主视觉/文本模型
API_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
API_KEY="你的密钥"
MODEL="qwen-vl-max"

# 可选：口语回答专用模型（不填则复用主模型）
VOICE_API_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
VOICE_API_KEY="你的密钥"
VOICE_MODEL="qwen-turbo"

# 实时语音识别
DASHSCOPE_API_KEY="你的密钥"
```

也可以在应用启动后的设置页面中配置。

## 运行

开发模式：

```bash
npm run dev
```

生产预览：

```bash
npm run build
npm start
```

Windows 打包：

```bash
npm run build:win
```

输出：`dist/system-helper-<version>-setup.exe` 和 `dist/win-unpacked/`

## 命令模式快捷键

按 `;;;`（三次分号）进入命令模式，然后按单个键：

| 按键 | 功能 |
|------|------|
| `,` | 上一阶段 |
| `.` | 下一阶段 |
| `S` | 截图 |
| `A` | 追加截图 |
| `R` | 开关转录 |
| `C` | 清除上下文 |
| `H` | 隐藏/显示窗口 |
| `M` | 鼠标穿透 |
| `J` / `K` | 上下翻页 |

再按 `;;;` 退出命令模式。

## 个人数据

公开仓库不包含任何真实个人资料、作文或 API 密钥。请在应用设置页自行配置：

- **个人资料** — 你的背景、学历、爱好等，用于 Stage 1
- **写作内容** — 固定作文或书面回答，用于 Stage 3
- **阶段预设** — 自定义阶段名称、颜色、上下文规则和提示词

这些数据存储在浏览器 localStorage 和 Electron 用户数据目录中，不会被上传或分享。

## 屏幕捕获保护说明

应用使用 Electron `setContentProtection` 隐藏窗口内容。窗口无标题、无任务栏按钮、无托盘图标。实际效果取决于操作系统、显卡驱动和会议软件。部分软件（如某些 Zoom 版本）可能在分享选择器中显示空白或黑色卡片。正式使用前请自行测试。

## 许可证

[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.zh) — 免费用于非商业用途，商业使用需书面授权。

## 致谢

基于 [interview-coder-cn](https://github.com/ooboqoo/interview-coder-cn) 由 [ooboqoo](https://github.com/ooboqoo) 开发。

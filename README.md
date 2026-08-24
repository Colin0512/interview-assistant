# 面试助手 / 口语考试助手

基于 AI 的面试和口语考试辅助工具。实时捕获系统音频并转录考官提问，流式生成口语回答，让你从容应对任何面试和口语考试。窗口对屏幕分享软件隐身。

## ❤️ 赞助

<table>
<tr>
<td width="200" align="center">
  <a href="https://api.lmxww.xyz">
    <b>🚀 极智 中转站</b><br/>
    <b><big>api.lmxww.xyz</big></b>
  </a>
</td>
<td>
  稳定低价的 OpenAI 兼容 API 中转服务，支持百炼、硅基流动等国内模型，即开即用。一个 Key 通吃所有模型，无需分别注册多个平台。
</td>
</tr>
</table>

## 项目简介

这是一个面向口语面试和在线考试场景的桌面辅助工具。按下快捷键即可实时捕获系统音频，AI 自动转录并生成口语回答，你只需照着念出来即可。窗口对屏幕分享软件隐身，且不会抢占焦点。适配国内 AI 生态，简单易用。

> 本项目基于 [interview-coder-cn](https://github.com/ooboqoo/interview-coder-cn) 二次开发，在保留原项目优点的基础上，专门针对口语面试和考试场景做了大量优化。

### 核心能力

- **实时语音转录**：捕获系统音频回环，通过百炼 ASR 实时转写考官讲话，无需麦克风
- **AI 生成口语回答**：结合视觉模型和文本模型，根据当前阶段上下文自动生成自然的口语回答，流式展示
- **可配置阶段预设**：内置 ELLT 口语考试和技术面试两套模板，支持自定义阶段、上下文规则和提示词，适配任何面试流程
- **截图内容识别**：自动提取屏幕中的阅读材料、图片和图表，智能过滤考官头像、平台按钮等无关元素
- **自动语音模式**：静音检测自动触发回答生成，全程无需手动操作
- **命令模式**：三次分号激活单键快捷键，操作无按键痕迹
- **屏幕捕获保护**：使用 Electron 内容保护隐藏窗口像素，无标题栏、无任务栏、无托盘图标

### 适用场景

- **口语考试**：ELLT、雅思口语、多邻国等，切换到对应场景即可
- **技术面试**：自我介绍、技术问答、项目经验、行为面试，按阶段切换
- **编程面试 / 笔试**：分析屏幕上的题目，实时给出解题思路和代码，支持 Python、JavaScript、Java、C++ 等
- **英语机试**：切换到「英语考试」场景，结合语音转录处理听力题
- **在线考试**：单选、多选、解答等通用题型
- **其他场景**：自定义阶段和提示词，扩展到任意面试流程

### 相比原项目的改进

本项目在 [interview-coder-cn](https://github.com/ooboqoo/interview-coder-cn) 的基础上增加了以下能力：

- ✅ **可配置阶段预设系统**：不再写死阶段，ELLT 口语、技术面试、自定义场景一键切换
- ✅ **自适应回答长度**：不同阶段、不同问题类型自动调整回答长度，不会每题都 3-5 句
- ✅ **作文档案预处理**：Writing Q&A 阶段自动将作文转成结构化档案，精准定位"第二部分"、"第二个例子"等题目指代
- ✅ **截图专注识别**：Stage 4 全屏截图自动忽略考官头像、平台按钮，只识别考试材料
- ✅ **语音转录自动重连**：百炼 ASR 长连接断开后自动无感重建，不影响考试
- ✅ **候选人档案系统**：结构化个人资料，支持多维度追问，不会每次重复同样的自我介绍
- ✅ **阶段主动切换**：命令模式下按 `,` `.` 即可切换阶段，阶段边界清晰

### 原项目优点

- 窗口透明置顶，不抢占焦点，规避"跳出网页"检测
- 截图 + 对话历史保持上下文连续
- 全局快捷键，随时触发
- 支持 OpenAI 兼容 API，百炼、硅基流动、OpenRouter 等都能用
- Frameless 窗口，简洁干净
- 支持追加截图和追问

## 如何使用

> 注意：详细的使用教程请参考下方说明。首次使用前请务必完成配置。

### 1. 安装依赖

项目运行依赖 Node.js 环境，如未安装请先安装 [Node.js](https://nodejs.org/zh-cn/download)。

```bash
npm install
```

### 2. 启动程序

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

安装包输出到 `dist/system-helper-<version>-setup.exe`，免安装目录输出到 `dist/win-unpacked/`。

### 3. 配置 API Key

启动程序后，进入「设置」页面，配置以下信息。

API 地址和 API Key 需要从支持 OpenAI API 的代理服务商处获取。如国内的 [硅基流动](https://cloud.siliconflow.cn/i/SG8C0772) 或国外的 [OpenRouter](https://openrouter.ai/) 等服务商。

> 也可以复制仓库内的 `.env.example` 为 `.env` 进行本地预配置。`.env` 已被 Git 忽略，请勿提交真实密钥。

```bash
cp .env.example .env
```

主要配置项：

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

建议优先在应用设置页填写 API Key。不要在源码、README、Issue、截图或提交记录中粘贴真实密钥。

### 4. 配置语音转录

语音转录功能可以实时将电脑播放的声音（如考官讲话、听力音频）转为文字，自动触发 AI 回答。

目前该功能使用 Fun-ASR 模型（约 0.02 元/分钟，新用户有 10 小时免费额度），需要配置阿里云百炼平台的 API Key：

1. 访问 [百炼平台控制台](https://help.aliyun.com/zh/model-studio/get-api-key) 注册并创建 API Key
2. 在应用「设置」页面的「语音转录」部分填入 API Key
3. 使用快捷键（默认 `Alt+T` / `Ctrl+T`）或命令模式 `R` 开始/暂停语音转录

### 5. 配置个人资料和阶段

在「设置」页面中：

- **个人资料**：填写你的背景、学历、爱好等，用于自我介绍阶段
- **写作内容**：粘贴固定作文或书面回答，用于 Writing Q&A 阶段
- **阶段预设**：选择 ELLT 口语或技术面试模板，也可以自定义阶段名称、颜色、上下文规则和提示词

### 6. 命令模式快捷键

按 `;;;`（三次分号）进入命令模式，然后按单个键：

| 按键 | 功能 |
|------|------|
| `,` | 上一阶段 |
| `.` | 下一阶段 |
| `S` | 截图 |
| `A` | 追加截图 |
| `R` | 开关语音转录 |
| `C` | 清除上下文 |
| `H` | 隐藏/显示窗口 |
| `M` | 鼠标穿透 |
| `J` / `K` | 上下翻页 |

再按 `;;;` 退出命令模式。

## 工作流程

```
考官说话 → 系统音频捕获 → 语音转文字 → AI 生成回答 → 你念出来
```

1. 选择当前面试的阶段预设
2. 按 `R` 开始语音转录
3. 考官开始提问，系统自动捕获音频并转录
4. 静音约 1 秒后，自动生成 AI 回答
5. 照着念出回答即可

## 关于屏幕捕获保护

应用使用 Electron `setContentProtection`、空窗口标题和 `skipTaskbar` 等能力保护窗口内容。该能力依赖操作系统、显卡驱动和会议软件实现，不能保证所有环境表现一致。部分软件（例如某些 Zoom 版本）仍可能在分享选择器中列出一个黑色或空白窗口卡片。正式使用前请在目标设备和目标会议软件中自行测试。

## 个人数据说明

公开仓库不包含任何真实个人资料、作文或 API 密钥。所有个人数据存储在浏览器 localStorage 和 Electron 用户数据目录中，不会被上传或分享。请勿在 Issue、PR 或截图中粘贴真实个人信息。

## 目录结构

```
src/
├── main/                     # Electron 主进程
│   ├── ellt/                 # ELLT 口语考试专用模块
│   │   ├── writing-profile.ts      # 作文档案生成与缓存
│   │   ├── stage4-vision.ts        # Stage 4 专用视觉识别
│   │   └── default-writing-content.ts  # 默认作文内容
│   ├── ai.ts                 # AI 模型调用（Vercel AI SDK）
│   ├── shortcuts.ts          # 全局快捷键 + 语音回答编排
│   ├── transcription.ts      # 百炼 ASR 实时语音识别
│   ├── main-window.ts        # 窗口创建与隐身控制
│   ├── settings.ts           # 应用设置 + 阶段配置
│   └── take-screenshot.ts    # 屏幕截图
├── preload/
│   └── index.ts              # IPC 桥接
└── renderer/                 # React 前端
    └── src/
        ├── coder/            # 主页面（截图、回答、状态栏、转录栏）
        ├── settings/         # 设置页面（API、阶段预设、提示词）
        ├── help/             # 帮助页面
        ├── components/       # UI 组件（shadcn/ui）
        └── lib/              # 状态管理、工具函数、音频采集
```

## 许可协议

本项目采用 **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.zh)** 协议许可。

您可以自由使用、复制、修改本项目代码，但 **禁止任何形式的商业用途**，包括但不限于售卖、集成入商业产品、SaaS 服务等。

如需商业授权，请联系作者获得书面许可。

## 致谢

- 原项目 [interview-coder-cn](https://github.com/ooboqoo/interview-coder-cn) 由 [ooboqoo](https://github.com/ooboqoo) 开发
- 灵感来源于 [Interview-Coder](https://github.com/ibttf/interview-coder)

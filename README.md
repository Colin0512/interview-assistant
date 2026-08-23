# System Helper /

![使用演示](https://github.com/user-attachments/assets/19781594-3108-4711-a54b-9d36496787bc)

## 项目简介

这是一个面向中文用户的System Helper：按下快捷键截取屏幕，AI 实时分析屏幕上的题目并给出解答。窗口对屏幕分享软件隐身，且不会抢占焦点。适配国内 AI 生态，简单易用。

### 核心能力

- **截屏解题**：通过快捷键抓取屏幕内容（可附带电脑声音的实时转录文字），发送给视觉大模型分析，流式展示解答；支持追加截图和追问，保持对话上下文连续
- **场景化提示词**：预置「解算法题」「英语考试」「通用问答」三个场景，一键切换；也可以添加自定义场景，扩展到任意题型
- **屏幕捕获保护**：使用 Electron 内容保护隐藏窗口像素；不同会议软件和系统版本表现可能不同
- **不抢占焦点**：窗口置顶半透明展示，不会导致原页面失焦，可规避“跳出网页”检测

### 适用场景

- **编程面试 / 笔试**：分析屏幕上的题目，实时给出解题思路和代码，支持 Python、JavaScript、Java、C++ 等主流编程语言
- **英语机试**：切换到「英语考试」场景，还可结合语音转录处理听力题
- **在线考试**：单选、多选、解答等通用题型，切换到「通用问答」场景即可
- **其他场景**：添加自定义提示词场景，自行扩展

## 如何使用

> 注意：项目有编译安装包，你也可以直接下载安装包使用（如何安装，以及安装完后如何配置，请参考 [Wiki 教程](https://github.com/ooboqoo/system-helper/wiki/%E7%9B%B4%E6%8E%A5%E4%B8%8B%E8%BD%BD%E5%AE%89%E8%A3%85%E5%8C%85%E4%BD%BF%E7%94%A8)）。

> 注意：详细的使用教程请移步本项目的 [Wiki](https://github.com/ooboqoo/system-helper/wiki) 页面查看。

### 1. 安装依赖

注：项目运行依赖 Node.js 环境，如未安装请先安装 [下载地址](https://nodejs.org/zh-cn/download)。

```bash
$ npm install
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

> 注意，应大家的要求，从 1.6 版本开始，添加了对「硅基流动」API 的支持，方便大家使用国内模型。

启动程序后，进入「设置」页面，配置 `API Base URL` 和 `API Key`。

API 地址和 API Key 需要从支持 OpenAI API 的代理服务商处获取。如国内的 [硅基流动](https://cloud.siliconflow.cn/i/SG8C0772) 或国外的 [OpenRouter](https://openrouter.ai/) 等服务商，支持支付宝付款。

当然，如果你（人在海外）可以直接使用 OpenAI 官方的 API 更好，只需要配置 `API Key` 就够了。

> 也可以复制仓库内的 `.env.example` 为 `.env` 进行本地预配置。`.env` 已被 Git 忽略，请勿提交真实密钥。

```bash
cp .env.example .env
```

主要变量：

```env
API_BASE_URL="https://openrouter.ai/api/v1"
API_KEY="replace-with-your-key"
MODEL="replace-with-your-model"

VOICE_API_BASE_URL="https://example.com/v1"
VOICE_API_KEY="replace-with-your-key"
VOICE_MODEL="replace-with-your-fast-text-model"

DASHSCOPE_API_KEY="replace-with-your-dashscope-key"
```

建议优先在应用设置页填写 API Key。不要在源码、README、Issue、截图或提交记录中粘贴真实密钥。

### 4. （可选）配置语音转录

语音转录功能可以实时将电脑播放的声音（如面试官讲话、听力音频）转为文字，并在截图时一起提交给 AI 辅助分析题意。

目前该功能固定使用 Fun-ASR 模型 (0.02元/分钟，新用户有10小时免费额度)，需要配置阿里云百炼平台的 API Key：

1. 访问 [百炼平台控制台](https://help.aliyun.com/zh/model-studio/get-api-key) 注册并创建 API Key
2. 在应用「设置」页面的「语音转录」部分填入 API Key
3. 使用快捷键（默认 `Alt+T` / `Ctrl+T`）开始/暂停语音转录

## ELLT 口语配置

ELLT 场景支持个人资料、固定作文、阅读材料和图片上下文。公开仓库默认不包含任何真实个人资料或作文，请在本机应用设置页填写：

- **个人资料**：只填写愿意保存在本机的信息，不要填写护照号、生日、密码或 API Key
- **写作内容**：粘贴需要在 Writing Q&A 阶段讨论的固定作文

运行时生成的作文档案保存在 Electron 用户数据目录，不应复制到公开仓库。

## 关于屏幕捕获保护

应用使用 Electron `setContentProtection`、空窗口标题和 `skipTaskbar` 等能力保护窗口内容。该能力依赖操作系统、显卡驱动和会议软件实现，不能保证所有环境表现一致。部分软件（例如某些 Zoom 版本）仍可能在分享选择器中列出一个黑色或空白窗口卡片。正式使用前请在目标设备和目标会议软件中自行测试。

## 视频教程

具体可到 [Wiki](https://github.com/ooboqoo/system-helper/wiki) 页面查看。

## 许可协议（License）

本项目采用 **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.zh)** 协议许可。

您可以自由使用、复制、修改本项目代码，但 **禁止任何形式的商业用途**，包括但不限于售卖、集成入商业产品、SaaS 服务等。

如需商业授权，请联系作者获得书面许可。

## 类似项目

原 [Interview-Coder](https://github.com/ibttf/interview-coder) 项目在网络上爆火之后，出现了很多类似的项目（本项目也是其中一个），每个项目都各有特色，这里列举一些比较火的项目供参考。

- https://github.com/sohzm/cheating-daddy 作者是前段时间在硅谷大热的争议程序员 Soham Parekh
- https://github.com/pickle-com/glass
- https://github.com/j4wg/interview-coder-withoupaywall-opensource

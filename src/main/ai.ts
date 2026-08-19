import { streamText, type ModelMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { settings, AppSettings } from './settings'

// The system prompt is fully managed by the renderer (prompt scenes in the
// settings store) and synced here via updateAppSettings on app startup
function getSystemPrompt(extra?: string) {
  return [settings.customPrompt, extra].filter(Boolean).join('\n\n') || undefined
}

function getModel(_settings: AppSettings) {
  const fallbackModel = settings.apiBaseURL.includes('siliconflow')
    ? 'Qwen/Qwen3-VL-32B-Instruct'
    : 'gpt-5-mini'
  return _settings.model || fallbackModel
}

export function getSolutionStream(messages: ModelMessage[], abortSignal?: AbortSignal) {
  const openai = createOpenAI({
    baseURL: settings.apiBaseURL,
    apiKey: settings.apiKey
  })

  const { textStream } = streamText({
    model: openai.chat(getModel(settings)),
    system: getSystemPrompt(),
    messages,
    abortSignal,
    onError: (err) => {
      throw err.error ?? err
    }
  })
  return textStream
}

export function getFollowUpStream(
  messages: ModelMessage[],
  userQuestion: string,
  abortSignal?: AbortSignal
) {
  const openai = createOpenAI({
    baseURL: settings.apiBaseURL,
    apiKey: settings.apiKey
  })

  // Add the user's follow-up question to the conversation
  const updatedMessages: ModelMessage[] = [
    ...messages,
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: userQuestion
        }
      ]
    }
  ]

  const { textStream } = streamText({
    model: openai.chat(getModel(settings)),
    system: getSystemPrompt(),
    messages: updatedMessages,
    abortSignal,
    onError: (err) => {
      throw err.error ?? err
    }
  })
  return textStream
}

function resolveVoiceProvider() {
  const useDedicatedProvider = Boolean(settings.voiceApiBaseURL && settings.voiceApiKey)
  return {
    baseURL: useDedicatedProvider ? settings.voiceApiBaseURL : settings.apiBaseURL,
    apiKey: useDedicatedProvider ? settings.voiceApiKey : settings.apiKey,
    model: useDedicatedProvider ? settings.voiceModel || 'qwen3.7-flash' : getModel(settings)
  }
}

export function hasVoiceProviderCredentials(): boolean {
  return Boolean(resolveVoiceProvider().apiKey)
}

export function getVisualExtractionStream(image: string, abortSignal?: AbortSignal) {
  const openai = createOpenAI({
    baseURL: settings.apiBaseURL,
    apiKey: settings.apiKey
  })

  const { textStream } = streamText({
    model: openai.chat(getModel(settings)),
    system:
      '分析这张截图，可能是阅读材料（文字）或图片；若主要是文字/阅读材料，忠实转写或提取关键内容，不评论、不解答；若包含图片，客观详细地描述图片内容；输出一段简洁文字作为后续口语问答的上下文依据；用英语输出（英语考试场景），必要时可夹杂简短中文说明。',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: '这是屏幕截图，请按上述要求识别并输出上下文。' },
          { type: 'image', image }
        ]
      }
    ],
    abortSignal,
    onError: (err) => {
      throw err.error ?? err
    }
  })
  return textStream
}

export function getVoiceAnswerStream(
  question: string,
  visualContext: string | undefined,
  writingContext: string | undefined,
  abortSignal?: AbortSignal
) {
  const provider = resolveVoiceProvider()
  const openai = createOpenAI({
    baseURL: provider.baseURL,
    apiKey: provider.apiKey
  })

  const visualSection = visualContext ? `\n\n截图上下文：\n${visualContext}` : ''
  const writingSection = writingContext
    ? `\n\n用户在写作部分写了以下内容（考官可能就此提问）：\n${writingContext}`
    : ''

  const { textStream } = streamText({
    model: openai.chat(provider.model),
    system: getSystemPrompt(
      '你正在辅助一场口语考试。回答必须简短（3-5句），口语化，可直接念出。用英语回答（这是英语考试）。'
    ),
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: `考官提问：${question}${visualSection}${writingSection}` }]
      }
    ],
    abortSignal,
    onError: (err) => {
      throw err.error ?? err
    }
  })
  return textStream
}

export function getGeneralStream(messages: ModelMessage[], abortSignal?: AbortSignal) {
  const openai = createOpenAI({
    baseURL: settings.apiBaseURL,
    apiKey: settings.apiKey
  })

  const { textStream } = streamText({
    model: openai.chat(getModel(settings)),
    system: getSystemPrompt(
      '注意：如果有多张截图，请结合所有截图内容进行完整分析，不要遗漏任何部分。'
    ),
    messages,
    abortSignal,
    onError: (err) => {
      throw err.error ?? err
    }
  })
  return textStream
}

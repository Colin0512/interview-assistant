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

export function getVoiceStream(
  transcriptionText: string,
  writingContent: string | undefined,
  abortSignal?: AbortSignal
) {
  const provider = resolveVoiceProvider()
  const openai = createOpenAI({
    baseURL: provider.baseURL,
    apiKey: provider.apiKey
  })

  const extraContext = writingContent
    ? `\n\n用户在写作部分写了以下内容（考官可能就此提问）：\n${writingContent}`
    : ''

  const messages: ModelMessage[] = [
    {
      role: 'user',
      content: [{ type: 'text', text: `考官提问：${transcriptionText}${extraContext}` }]
    }
  ]

  const { textStream } = streamText({
    model: openai.chat(provider.model),
    system: getSystemPrompt(
      '你正在辅助一场口语考试。回答必须简短（3-5句），口语化，可直接念出。用英语回答（这是英语考试）。'
    ),
    messages,
    abortSignal,
    onError: (err) => {
      throw err.error ?? err
    }
  })
  return textStream
}

export function getVoiceContextStream(messages: ModelMessage[], abortSignal?: AbortSignal) {
  const openai = createOpenAI({
    baseURL: settings.apiBaseURL,
    apiKey: settings.apiKey
  })

  const { textStream } = streamText({
    model: openai.chat(getModel(settings)),
    system: getSystemPrompt(
      '结合已有截图和考官刚才的问题，直接输出可念的英文回答。回答必须简短（3-5句），不要重复题目或添加中文解释。'
    ),
    messages,
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

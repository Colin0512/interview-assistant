import { streamText, type ModelMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getActiveStages, settings, type AppSettings, type StageDef } from './settings'
import { getStage4VisionPrompt } from './ellt/stage4-vision'

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

function getStageRule(stage: StageDef | undefined): string {
  if (stage?.customPrompt?.trim()) return stage.customPrompt
  return 'Output ONLY the spoken answer — no explanations, no commentary. Use natural spoken English, like talking to a friend. One idea per sentence. Use common everyday words (B1-B2 level). Avoid: utilize, leverage, implement, demonstrate, extensive, facilitate, optimize. Use natural connectors: Well, Actually, I think. Do NOT use First/Second/Finally. Short sentences, direct answer. You ARE the candidate.'
}

function resolveVoiceProvider() {
  const useDedicatedProvider = Boolean(settings.voiceApiBaseURL && settings.voiceApiKey)
  return {
    baseURL: useDedicatedProvider ? settings.voiceApiBaseURL : settings.apiBaseURL,
    apiKey: useDedicatedProvider ? settings.voiceApiKey : settings.apiKey,
    model: useDedicatedProvider ? settings.voiceModel || 'qwen-turbo' : getModel(settings)
  }
}

export function hasVoiceProviderCredentials(): boolean {
  return Boolean(resolveVoiceProvider().apiKey)
}

export function getVisualExtractionStream(
  image: string,
  stageIndex: number,
  abortSignal?: AbortSignal
) {
  const openai = createOpenAI({
    baseURL: settings.apiBaseURL,
    apiKey: settings.apiKey
  })

  const stage4Prompt = stageIndex === 3 ? getStage4VisionPrompt() : null
  const { textStream } = streamText({
    model: openai.chat(getModel(settings)),
    system:
      stage4Prompt?.system ||
      '这是在线英语口语考试的完整屏幕截图。只定位并提取考官展示给考生阅读的主要材料，忽略考官/考生视频小窗、头像、平台 logo、标题栏、按钮、状态栏和其他界面元素。只输出一个 JSON 对象，不要输出其他内容：{"kind":"reading","text":"忠实提取主要阅读材料的标题、正文、关键观点和例子"}。text 内避免双引号，使用英语。',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              stage4Prompt?.user ||
              'Locate and extract only the main reading material being shared in this full exam screenshot.'
          },
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

export interface VoiceTurn {
  question: string
  answer: string
}

interface ReferenceProfile {
  majorParts?: {
    index: number
    label: string
    mainIdea: string
    structureIndexes: number[]
    expansionPaths: string[]
  }[]
  structure?: {
    index: number
    label: string
    sourceSummary: string
    purpose: string
    mainClaim: string
    examples: string[]
    expansionPaths: string[]
  }[]
  originalExamples?: string[]
}

function getOrdinalIndex(question: string): number | 'last' | null {
  const q = question.toLowerCase()
  if (/\b(final|last)\b/.test(q)) return 'last'
  const ordinals = [
    /\b(first|1st)\b/,
    /\b(second|2nd)\b/,
    /\b(third|3rd)\b/,
    /\b(fourth|4th)\b/,
    /\b(fifth|5th)\b/
  ]
  const index = ordinals.findIndex((pattern) => pattern.test(q))
  return index >= 0 ? index : null
}

function resolveWritingReference(question: string, writingProfile?: string): string {
  if (!writingProfile) return ''
  const q = question.toLowerCase()
  if (!/\b(part|point|paragraph|example|sentence)\b/.test(q)) return ''
  const ordinal = getOrdinalIndex(q)
  if (ordinal === null) return ''
  try {
    const profile = JSON.parse(writingProfile) as ReferenceProfile
    const select = <T>(items: T[] | undefined): T | undefined => {
      if (!items?.length) return undefined
      return ordinal === 'last' ? items.at(-1) : items[ordinal]
    }
    if (/\bpart\b/.test(q)) {
      const part = select(profile.majorParts)
      if (!part) return ''
      const details = (profile.structure || []).filter((item) =>
        part.structureIndexes.includes(item.index)
      )
      return JSON.stringify({ referenceType: 'major part', target: part, details })
    }
    if (/\bexample\b/.test(q)) {
      const example = select(profile.originalExamples)
      return example ? JSON.stringify({ referenceType: 'example', target: example }) : ''
    }
    const point = select(profile.structure)
    return point ? JSON.stringify({ referenceType: 'detailed point', target: point }) : ''
  } catch {
    return ''
  }
}

export function getVoiceAnswerStream(
  question: string,
  stageIndex: number,
  visualContext: string | undefined,
  writingContext: string | undefined,
  writingProfile: string | undefined,
  personalContext: string | undefined,
  history: VoiceTurn[],
  abortSignal?: AbortSignal
) {
  const provider = resolveVoiceProvider()
  const openai = createOpenAI({
    baseURL: provider.baseURL,
    apiKey: provider.apiKey
  })

  const historySection = history.length
    ? '以下历史对话仅供理解上下文（不要复述，直接回答当前问题）：\n' +
      history.map((turn) => '考官：' + turn.question + '\n考生：' + turn.answer).join('\n') +
      '\n\n'
    : ''
  const personalSection = personalContext
    ? '\n\nYou are the candidate taking this exam. The following is YOUR personal information. Answer in first person as this candidate, in English. Do NOT say you are an AI assistant:\n' +
      personalContext
    : ''
  const visualSection = visualContext ? `\n\n截图上下文：\n${visualContext}` : ''
  const writingSection = writingContext
    ? `\n\nOriginal essay written by the candidate:\n${writingContext}`
    : ''
  const resolvedWritingReference = resolveWritingReference(question, writingProfile)
  const resolvedWritingReferenceSection = resolvedWritingReference
    ? `\n\nAUTHORITATIVE RESOLVED TARGET FOR THIS QUESTION:\n${resolvedWritingReference}\nAnswer only this target.`
    : ''
  const writingProfileSection = writingProfile
    ? `\n\nPreprocessed Writing Profile. It separates original material from valid extensions:\n${writingProfile}`
    : ''
  const stage = getActiveStages()[stageIndex]

  const { textStream } = streamText({
    model: openai.chat(provider.model),
    system: getSystemPrompt(getStageRule(stage)),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${historySection}考官提问：${question}${resolvedWritingReferenceSection}${personalSection}${visualSection}${writingSection}${writingProfileSection}`
          }
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

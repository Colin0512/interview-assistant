import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { settings } from '../settings'

export interface WritingSection {
  index: number
  label: string
  sourceSummary: string
  purpose: string
  mainClaim: string
  examples: string[]
  expansionPaths: string[]
}

export interface WritingMajorPart {
  index: number
  label: string
  mainIdea: string
  structureIndexes: number[]
  expansionPaths: string[]
}

export interface WritingProfile {
  topic: string
  thesis: string
  stance: string
  majorParts: WritingMajorPart[]
  structure: WritingSection[]
  originalArguments: string[]
  originalExamples: string[]
  unexploredAngles: string[]
  possibleNewExamples: string[]
  possibleImprovements: string[]
  writingExperience: {
    difficulty: string
    easiestPart: string
    hardestPart: string
  }
  keywords: string[]
}

interface CachedWritingProfile {
  version: number
  essay: string
  profile: WritingProfile
}

const WRITING_PROFILE_VERSION = 5

let memoryCache: CachedWritingProfile | null = null
const activeRequests = new Map<string, Promise<WritingProfile | null>>()

function getCachePath() {
  return join(app.getPath('userData'), 'writing-profile.json')
}

function parseProfile(raw: string): WritingProfile {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('Writing profile response did not contain JSON')
  const profile = JSON.parse(raw.slice(start, end + 1)) as WritingProfile
  if (
    !Array.isArray(profile.majorParts) ||
    profile.majorParts.length < 2 ||
    profile.majorParts.some(
      (part) =>
        typeof part?.index !== 'number' ||
        typeof part?.label !== 'string' ||
        typeof part?.mainIdea !== 'string' ||
        !Array.isArray(part?.structureIndexes) ||
        !Array.isArray(part?.expansionPaths)
    ) ||
    !Array.isArray(profile.structure) ||
    profile.structure.length < 2
  ) {
    throw new Error('Writing profile did not contain a valid ordered structure')
  }
  return profile
}

async function readCachedProfile(essay: string): Promise<WritingProfile | null> {
  if (memoryCache?.version === WRITING_PROFILE_VERSION && memoryCache.essay === essay) {
    return memoryCache.profile
  }
  try {
    const cached = JSON.parse(await readFile(getCachePath(), 'utf8')) as CachedWritingProfile
    if (cached.version === WRITING_PROFILE_VERSION && cached.essay === essay && cached.profile) {
      memoryCache = cached
      return cached.profile
    }
  } catch {
    // Missing or invalid cache is regenerated below.
  }
  return null
}

async function generateWritingProfile(
  essay: string,
  abortSignal?: AbortSignal
): Promise<WritingProfile> {
  if (!settings.apiKey) throw new Error('Cannot preprocess writing without an API key')
  const provider = createOpenAI({ baseURL: settings.apiBaseURL, apiKey: settings.apiKey })
  const model =
    settings.model ||
    (settings.apiBaseURL.includes('siliconflow') ? 'Qwen/Qwen3-VL-32B-Instruct' : 'gpt-5-mini')
  let lastError: unknown
  let profile: WritingProfile | null = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (abortSignal?.aborted) throw new Error('Writing profile generation was aborted')
    try {
      const { textStream } = streamText({
        model: provider.chat(model),
        system: [
          'Create a reusable understanding profile for an English speaking examiner to question the candidate about this fixed essay.',
          'Return exactly one valid JSON object and nothing else.',
          'The required fields are topic, thesis, stance, majorParts, structure, originalArguments, originalExamples, unexploredAngles, possibleNewExamples, possibleImprovements, writingExperience with difficulty/easiestPart/hardestPart, and keywords.',
          'majorParts must be an ordered array of two to four objects dividing the essay into broad argumentative sections, such as benefits, limitations, application and conclusion. Every object requires index, label, mainIdea, structureIndexes and expansionPaths. This is the authoritative map for first part, second part and final part references.',
          'structureIndexes must list the one-based indexes of all detailed structure items belonging to that major part. Do not output majorParts as strings.',
          'The structure field must be a finer ordered array mapping individual claims and examples. This is the map for point, example, sentence and paragraph references. Each item requires index starting at 1, a short label, sourceSummary, purpose, mainClaim, examples and expansionPaths.',
          'Preserve the order in which ideas appear. A part is one distinct claim-and-example unit, even when the source is written as one physical paragraph.',
          'Make positional references resolvable: second part means majorParts index 2; second point means structure index 2; second example means originalExamples item 2; final part means the final majorParts item; final paragraph means the final matching structure item.',
          'For every structure item, expansionPaths must add possible reasons, mechanisms, implications, limitations, distinctions or follow-up examples that explain that specific part without summarizing unrelated parts.',
          'Original arguments and original examples must contain only ideas or examples explicitly present in the essay. Never invent or infer an original example; use an empty array when none is explicitly given.',
          'Clearly distinguish original material from plausible new material. All invented suggestions belong only in unexploredAngles, possibleNewExamples or possibleImprovements.',
          'Possible new examples and improvements must be concrete, natural, consistent with the essay stance, and suitable for a university student to explain aloud.',
          'Do not merely summarize the essay. Anticipate questions about difficulty, keywords, new examples, revisions, weaknesses, exceptions and personal application.',
          'Write all field values in concise English.'
        ].join(' '),
        messages: [
          {
            role: 'user',
            content:
              'ESSAY:\n' +
              essay +
              '\n\nGenerate the complete compact JSON profile. Do not stop before every required field and array is closed.'
          }
        ],
        maxOutputTokens: 4096,
        abortSignal,
        onError: (error) => {
          throw error.error ?? error
        }
      })
      let raw = ''
      for await (const chunk of textStream) raw += chunk
      profile = parseProfile(raw)
      break
    } catch (error) {
      lastError = error
      console.warn(`Writing profile generation attempt ${attempt} failed:`, error)
    }
  }
  if (!profile) throw lastError || new Error('Writing profile generation failed')
  const cached = { version: WRITING_PROFILE_VERSION, essay, profile }
  memoryCache = cached
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(getCachePath(), JSON.stringify(cached, null, 2), 'utf8')
  return profile
}

export async function getWritingProfile(
  essay: string,
  abortSignal?: AbortSignal
): Promise<WritingProfile | null> {
  const normalized = essay.trim()
  if (!normalized) return null
  const cached = await readCachedProfile(normalized)
  if (cached) return cached
  const existing = activeRequests.get(normalized)
  if (existing) return existing
  const request = generateWritingProfile(normalized, abortSignal).finally(() => {
    activeRequests.delete(normalized)
  })
  activeRequests.set(normalized, request)
  return request
}

export async function getWritingProfileText(
  essay: string,
  abortSignal?: AbortSignal
): Promise<string | undefined> {
  const profile = await getWritingProfile(essay, abortSignal)
  return profile ? JSON.stringify(profile) : undefined
}

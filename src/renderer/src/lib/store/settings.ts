import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import codingPrompt from './prompts/coding.md?raw'
import englishExamPrompt from './prompts/english-exam.md?raw'
import generalQaPrompt from './prompts/general-qa.md?raw'
import oxfordElltSpeakingPrompt from './prompts/oxford-ellt-speaking.md?raw'
import candidateProfile from './prompts/candidate-profile.md?raw'
import writingContent from './prompts/writing-content.md?raw'

export interface PromptScene {
  id: string
  name: string
  prompt: string
  isPreset: boolean
}

export type ContextMode = 'off' | 'primary' | 'fallback'

export interface StageContextConfig {
  personalInfo: ContextMode
  writingContent: ContextMode
  visualContext: ContextMode
}

export interface StageDef {
  id: string
  name: string
  color: string
  contextConfig: StageContextConfig
  customPrompt: string
}

export interface StagePreset {
  id: string
  name: string
  stages: StageDef[]
  isPreset: boolean
}

export const CODING_SCENE_ID = 'coding'
export const DEFAULT_STAGE_PRESET_ID = 'oxford-ellt-speaking'

/** Default prompts for all preset scenes, maintained as Markdown files under ./prompts */
export const PRESET_SCENE_PROMPTS: Record<string, string> = {
  [CODING_SCENE_ID]: codingPrompt,
  'english-exam': englishExamPrompt,
  'general-qa': generalQaPrompt,
  'oxford-ellt-speaking': oxfordElltSpeakingPrompt
}

const contextConfig = (
  personalInfo: ContextMode,
  writingContent: ContextMode,
  visualContext: ContextMode
): StageContextConfig => ({ personalInfo, writingContent, visualContext })

const createDefaultStagePresets = (): StagePreset[] => [
  {
    id: DEFAULT_STAGE_PRESET_ID,
    name: 'ELLT Speaking',
    isPreset: true,
    stages: [
      {
        id: 'introduction',
        name: 'Introduction',
        color: 'blue',
        contextConfig: contextConfig('primary', 'off', 'off'),
        customPrompt: ''
      },
      {
        id: 'reading',
        name: 'Reading',
        color: 'green',
        contextConfig: contextConfig('fallback', 'off', 'primary'),
        customPrompt: ''
      },
      {
        id: 'writing-qa',
        name: 'Writing Q&A',
        color: 'orange',
        contextConfig: contextConfig('fallback', 'primary', 'off'),
        customPrompt: ''
      },
      {
        id: 'photograph',
        name: 'Photograph',
        color: 'purple',
        contextConfig: contextConfig('fallback', 'off', 'primary'),
        customPrompt: ''
      }
    ]
  },
  {
    id: 'tech-interview',
    name: 'Tech Interview',
    isPreset: true,
    stages: [
      {
        id: 'self-introduction',
        name: '自我介绍',
        color: 'blue',
        contextConfig: contextConfig('primary', 'off', 'off'),
        customPrompt: ''
      },
      {
        id: 'technical-qa',
        name: '技术问答',
        color: 'green',
        contextConfig: contextConfig('fallback', 'off', 'primary'),
        customPrompt: ''
      },
      {
        id: 'project-experience',
        name: '项目经验',
        color: 'orange',
        contextConfig: contextConfig('fallback', 'primary', 'off'),
        customPrompt: ''
      },
      {
        id: 'behavioral-interview',
        name: '行为面试',
        color: 'purple',
        contextConfig: contextConfig('primary', 'off', 'off'),
        customPrompt: ''
      }
    ]
  }
]

const createPresetScenes = (): PromptScene[] => [
  {
    id: CODING_SCENE_ID,
    name: '解算法题',
    prompt: PRESET_SCENE_PROMPTS[CODING_SCENE_ID],
    isPreset: true
  },
  {
    id: 'english-exam',
    name: '英语考试',
    prompt: PRESET_SCENE_PROMPTS['english-exam'],
    isPreset: true
  },
  {
    id: 'general-qa',
    name: '通用问答',
    prompt: PRESET_SCENE_PROMPTS['general-qa'],
    isPreset: true
  },
  {
    id: 'oxford-ellt-speaking',
    name: 'ELLT 口语',
    prompt: PRESET_SCENE_PROMPTS['oxford-ellt-speaking'],
    isPreset: true
  }
]

function composeCustomPrompt(scenes: PromptScene[], activeSceneId: string): string {
  const scene = scenes.find((item) => item.id === activeSceneId)
  if (!scene) return PRESET_SCENE_PROMPTS[CODING_SCENE_ID]
  return scene.prompt.trim() || PRESET_SCENE_PROMPTS[scene.id] || ''
}

interface Settings {
  apiBaseURL: string
  apiKey: string
  model: string
  voiceApiBaseURL: string
  voiceApiKey: string
  voiceModel: string
  customModels: string[]
  customPrompt: string
  scenes: PromptScene[]
  activeSceneId: string
  stagePresets: StagePreset[]
  activeStagePresetId: string
  opacity: number
  screenshotAutoSave: boolean
  screenshotDir: string
  dashscopeApiKey: string
  hideDockIcon: boolean
  audioInputDeviceId: string
  audioOutputDeviceId: string
  writingContent: string
  personalInfo: string
}

interface SettingsStore extends Settings {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  syncSettings: (settings: Partial<Settings>) => void
  setActiveScene: (id: string) => void
  updateScenePrompt: (id: string, prompt: string) => void
  addScene: (name: string) => string
  removeScene: (id: string) => void
  addStagePreset: (name: string) => string
  removeStagePreset: (id: string) => void
  updateStagePreset: (id: string, updates: Partial<Pick<StagePreset, 'name' | 'stages'>>) => void
  setActiveStagePreset: (id: string) => void
  addStage: (presetId: string) => string
  removeStage: (presetId: string, stageId: string) => void
  updateStage: (presetId: string, stageId: string, updates: Partial<Omit<StageDef, 'id'>>) => void
  reorderStages: (presetId: string, fromIndex: number, toIndex: number) => void
}

const defaultSettings: Settings = {
  apiBaseURL: '',
  apiKey: '',
  model: '',
  voiceApiBaseURL: '',
  voiceApiKey: '',
  voiceModel: '',
  customModels: [],
  customPrompt: PRESET_SCENE_PROMPTS[CODING_SCENE_ID],
  scenes: createPresetScenes(),
  activeSceneId: CODING_SCENE_ID,
  stagePresets: createDefaultStagePresets(),
  activeStagePresetId: DEFAULT_STAGE_PRESET_ID,
  opacity: 0.8,
  screenshotAutoSave: false,
  screenshotDir: '',
  dashscopeApiKey: '',
  hideDockIcon: false,
  audioInputDeviceId: '',
  audioOutputDeviceId: '',
  writingContent,
  personalInfo: candidateProfile
}

const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      updateSetting: (key, value) => set({ [key]: value }),
      syncSettings: (settings) => set(settings),
      setActiveScene: (id) =>
        set((state) => ({
          activeSceneId: id,
          customPrompt: composeCustomPrompt(state.scenes, id)
        })),
      updateScenePrompt: (id, prompt) =>
        set((state) => {
          const scenes = state.scenes.map((scene) =>
            scene.id === id ? { ...scene, prompt } : scene
          )
          return { scenes, customPrompt: composeCustomPrompt(scenes, state.activeSceneId) }
        }),
      addScene: (name) => {
        const id = makeId('custom')
        set((state) => {
          const scenes = [...state.scenes, { id, name, prompt: '', isPreset: false }]
          return { scenes, activeSceneId: id, customPrompt: composeCustomPrompt(scenes, id) }
        })
        return id
      },
      removeScene: (id) => {
        const scene = get().scenes.find((item) => item.id === id)
        if (!scene || scene.isPreset) return
        set((state) => {
          const scenes = state.scenes.filter((item) => item.id !== id)
          const activeSceneId = state.activeSceneId === id ? CODING_SCENE_ID : state.activeSceneId
          return { scenes, activeSceneId, customPrompt: composeCustomPrompt(scenes, activeSceneId) }
        })
      },
      addStagePreset: (name) => {
        const id = makeId('stage-preset')
        set((state) => ({
          stagePresets: [...state.stagePresets, { id, name, stages: [], isPreset: false }],
          activeStagePresetId: id
        }))
        return id
      },
      removeStagePreset: (id) => {
        if (id === DEFAULT_STAGE_PRESET_ID) return
        set((state) => {
          const stagePresets = state.stagePresets.filter((preset) => preset.id !== id)
          return {
            stagePresets,
            activeStagePresetId:
              state.activeStagePresetId === id ? DEFAULT_STAGE_PRESET_ID : state.activeStagePresetId
          }
        })
      },
      updateStagePreset: (id, updates) =>
        set((state) => ({
          stagePresets: state.stagePresets.map((preset) =>
            preset.id === id ? { ...preset, ...updates, id, isPreset: preset.isPreset } : preset
          )
        })),
      setActiveStagePreset: (id) =>
        set((state) =>
          state.stagePresets.some((preset) => preset.id === id)
            ? { activeStagePresetId: id }
            : state
        ),
      addStage: (presetId) => {
        const id = makeId('stage')
        const stage: StageDef = {
          id,
          name: '新阶段',
          color: 'blue',
          contextConfig: contextConfig('off', 'off', 'off'),
          customPrompt: ''
        }
        set((state) => ({
          stagePresets: state.stagePresets.map((preset) =>
            preset.id === presetId ? { ...preset, stages: [...preset.stages, stage] } : preset
          )
        }))
        return id
      },
      removeStage: (presetId, stageId) =>
        set((state) => ({
          stagePresets: state.stagePresets.map((preset) =>
            preset.id === presetId
              ? { ...preset, stages: preset.stages.filter((stage) => stage.id !== stageId) }
              : preset
          )
        })),
      updateStage: (presetId, stageId, updates) =>
        set((state) => ({
          stagePresets: state.stagePresets.map((preset) =>
            preset.id === presetId
              ? {
                  ...preset,
                  stages: preset.stages.map((stage) =>
                    stage.id === stageId ? { ...stage, ...updates, id: stage.id } : stage
                  )
                }
              : preset
          )
        })),
      reorderStages: (presetId, fromIndex, toIndex) =>
        set((state) => ({
          stagePresets: state.stagePresets.map((preset) => {
            if (preset.id !== presetId || fromIndex === toIndex) return preset
            if (
              fromIndex < 0 ||
              toIndex < 0 ||
              fromIndex >= preset.stages.length ||
              toIndex >= preset.stages.length
            )
              return preset
            const stages = [...preset.stages]
            const [stage] = stages.splice(fromIndex, 1)
            stages.splice(toIndex, 0, stage)
            return { ...preset, stages }
          })
        }))
    }),
    {
      name: 'interview-coder-settings',
      version: 12,
      migrate: (persisted, version) => {
        const state = persisted as Partial<Settings> & Record<string, unknown>
        delete state.codeLanguage
        if (version < 5) {
          const scenes = createPresetScenes()
          let activeSceneId = CODING_SCENE_ID
          const legacyPrompt = (state.customPrompt ?? '').trim()
          if (legacyPrompt) {
            const id = makeId('custom')
            scenes.push({ id, name: '自定义场景', prompt: legacyPrompt, isPreset: false })
            activeSceneId = id
          }
          state.scenes = scenes
          state.activeSceneId = activeSceneId
        }
        if (version < 11) {
          const scenes = state.scenes
          if (Array.isArray(scenes)) {
            const ellt = scenes.find((scene) => scene.id === 'oxford-ellt-speaking')
            if (ellt?.isPreset) ellt.prompt = PRESET_SCENE_PROMPTS['oxford-ellt-speaking']
          }
          state.personalInfo = candidateProfile
          state.writingContent = writingContent
        }
        if (version < 12) {
          const legacyStages = Array.isArray(state.stages)
            ? (state.stages as StageDef[])
            : undefined
          const presets = createDefaultStagePresets()
          if (legacyStages?.length) presets[0] = { ...presets[0], stages: legacyStages }
          state.stagePresets = presets
          state.activeStagePresetId = DEFAULT_STAGE_PRESET_ID
          delete state.stages
        }
        return state
      },
      merge: (persisted, current) => {
        const state = { ...current, ...(persisted as Partial<Settings>) }
        const persistedScenes = Array.isArray(state.scenes) ? state.scenes : []
        state.scenes = [
          ...createPresetScenes().map((preset) => {
            const saved = persistedScenes.find((scene) => scene.id === preset.id)
            return saved?.prompt.trim() ? saved : preset
          }),
          ...persistedScenes.filter((scene) => !scene.isPreset)
        ]
        if (!state.scenes.some((scene) => scene.id === state.activeSceneId))
          state.activeSceneId = CODING_SCENE_ID
        state.customPrompt = composeCustomPrompt(state.scenes, state.activeSceneId)

        const savedPresets = Array.isArray(state.stagePresets) ? state.stagePresets : []
        const defaultPresets = createDefaultStagePresets()
        const ellt = savedPresets.find((preset) => preset.id === DEFAULT_STAGE_PRESET_ID)
        state.stagePresets = [
          ellt ?? defaultPresets[0],
          ...savedPresets.filter((preset) => preset.id !== DEFAULT_STAGE_PRESET_ID)
        ]
        if (!state.stagePresets.some((preset) => preset.id === state.activeStagePresetId))
          state.activeStagePresetId = DEFAULT_STAGE_PRESET_ID
        return state
      }
    }
  )
)

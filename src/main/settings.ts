import { app, dialog, ipcMain } from 'electron'
import { DEFAULT_WRITING_CONTENT } from './ellt/default-writing-content'

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

ipcMain.handle('getAppSettings', () => {
  return settings
})

ipcMain.handle('updateAppSettings', (_event, _settings) => {
  Object.assign(settings, _settings)
  if ('hideDockIcon' in _settings) {
    applyDockVisibility(settings.hideDockIcon)
  }
  if ('writingContent' in _settings && settings.writingContent.trim()) {
    void import('./ellt/writing-profile')
      .then(({ getWritingProfile }) => getWritingProfile(settings.writingContent))
      .catch((error) => console.error('Failed to prewarm writing profile:', error))
  }
})

/** Show/hide the macOS dock icon. No-op on other platforms. */
export function applyDockVisibility(hidden: boolean): void {
  if (process.platform !== 'darwin') return
  if (hidden) {
    app.dock?.hide()
  } else {
    app.dock?.show()
  }
}

ipcMain.handle('selectScreenshotDir', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: '选择截图保存目录'
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
})

export const settings = {
  apiBaseURL: process.env.API_BASE_URL || '',
  apiKey: process.env.API_KEY || '',
  model: process.env.MODEL || '',
  voiceApiBaseURL: process.env.VOICE_API_BASE_URL || '',
  voiceApiKey: process.env.VOICE_API_KEY || '',
  voiceModel: process.env.VOICE_MODEL || '',
  customPrompt: '',
  screenshotAutoSave: false,
  screenshotDir: '',
  dashscopeApiKey: process.env.DASHSCOPE_API_KEY || '',
  hideDockIcon: false,
  audioInputDeviceId: '',
  audioOutputDeviceId: '',
  writingContent: DEFAULT_WRITING_CONTENT,
  showPauseMarkers: true,
  personalInfo: process.env.PERSONAL_INFO || '',
  stagePresets: [] as StagePreset[],
  activeStagePresetId: ''
}

export function getActiveStages(): StageDef[] {
  const preset = settings.stagePresets?.find((item) => item.id === settings.activeStagePresetId)
  return preset?.stages ?? []
}

export type AppSettings = typeof settings

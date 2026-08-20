import { app, dialog, ipcMain } from 'electron'

ipcMain.handle('getAppSettings', () => {
  return settings
})

ipcMain.handle('updateAppSettings', (_event, _settings) => {
  Object.assign(settings, _settings)
  if ('hideDockIcon' in _settings) {
    applyDockVisibility(settings.hideDockIcon)
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
  writingContent: '',
  personalInfo: ''
}

export type AppSettings = typeof settings

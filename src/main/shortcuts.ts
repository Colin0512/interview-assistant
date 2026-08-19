import { globalShortcut, ipcMain, screen } from 'electron'
import type { BrowserWindow, Rectangle } from 'electron'
import type { ModelMessage } from 'ai'
import { applyContentProtection } from './main-window'
import { takeScreenshot } from './take-screenshot'
import { saveScreenshotToDisk } from './save-screenshot'
import {
  getSolutionStream,
  getFollowUpStream,
  getGeneralStream,
  getVisualExtractionStream,
  getVoiceAnswerStream,
  hasVoiceProviderCredentials
} from './ai'
import { state } from './state'
import { settings } from './settings'
import {
  getTranscriptionText,
  clearTranscriptionText,
  getLastSentenceTime,
  setPreserveTextOnTermination
} from './transcription'

/**
 * Extract meaningful error message from API errors
 */
function extractErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error) || '未知错误'
  }

  // Try to extract responseBody from AI SDK errors
  const apiError = error as Error & {
    responseBody?: string
    statusCode?: number
    data?: unknown
  }

  // Try to parse responseBody for detailed message
  if (apiError.responseBody) {
    try {
      const body = JSON.parse(apiError.responseBody)
      if (body.message) {
        return body.message
      }
      if (body.error?.message) {
        return body.error.message
      }
    } catch {
      // If parsing fails, use responseBody as is
      if (typeof apiError.responseBody === 'string' && apiError.responseBody.length < 200) {
        return apiError.responseBody
      }
    }
  }

  // Fallback to error message
  return error.message || '未知错误'
}

type Shortcut = {
  action: string
  key: string
  status: ShortcutStatus
  registeredKeys: string[]
}

enum ShortcutStatus {
  Registered = 'registered',
  Failed = 'failed',
  /** Shortcut is available to register but not registered. */
  Available = 'available'
}

const MOVE_STEP = 200
const shortcuts: Record<string, Shortcut> = {}

type AbortReason = 'user' | 'new-request'

interface StreamContext {
  controller: AbortController
  reason: AbortReason | null
  kind?: 'voice'
}

let currentStreamContext: StreamContext | null = null

// Conversation history tracking
let conversationMessages: ModelMessage[] = []
let recentScreenshots: string[] = [] // 最近截图，水平预览 (限5张)
let hasAppendSeparator = false
let isCapturingScreenshot = false
let screenshotCaptureGeneration = 0
let pendingVoiceQuestion: string | null = null
let visualContextText: string | null = null

// Auto voice mode for ELLT speaking
let autoVoiceMode = false
let autoVoiceTimer: NodeJS.Timeout | null = null
const AUTO_VOICE_SILENCE_MS = 1000
const AUTO_VOICE_POLL_MS = 500

// Command mode: triple-semicolon activation for single-letter shortcuts
let commandMode = false
let semicolonPressCount = 0
let semicolonPressTimer: NodeJS.Timeout | null = null
// Randomized time window (300-700ms) to avoid detection as regular shortcut
const SEMICOLON_TRIPLE_PRESS_WINDOW_MIN = 300
const SEMICOLON_TRIPLE_PRESS_WINDOW_MAX = 700
let currentTriplePressWindow = 500
const commandModeKeys = ['S', 'A', 'Q', 'R', 'C', 'H', 'M', 'J', 'K']

const FRONT_REASSERT_DURATION = 8000
const FRONT_REASSERT_INTERVAL = 100
const FRONT_RELATIVE_LEVEL = 100
const BACKGROUND_GUARD_INTERVAL = 2000
let frontReassertTimer: NodeJS.Timeout | null = null
let backgroundGuardTimer: NodeJS.Timeout | null = null
let isWindowSoftHidden = false
let softHiddenBounds: Rectangle | null = null

/**
 * Reassert always-on-top. `aggressive` also calls moveTop() which
 * brings the window above everything — only use on explicit user actions
 * (show, screenshot, etc.) to avoid disturbing interaction with other apps.
 */
function applyTopMost(win: BrowserWindow, aggressive = true) {
  if (!win || win.isDestroyed()) return
  win.setAlwaysOnTop(true, 'screen-saver', FRONT_RELATIVE_LEVEL)
  if (aggressive) win.moveTop()
}

/**
 * Start a persistent low-frequency background guard that continuously
 * re-asserts always-on-top while the window is visible.
 * Uses the non-aggressive variant so it won't steal focus or
 * interfere with the user's interaction with other windows.
 */
function startBackgroundGuard(window: BrowserWindow) {
  if (backgroundGuardTimer) return // already running
  backgroundGuardTimer = setInterval(() => {
    if (!window || window.isDestroyed() || !window.isVisible()) {
      stopBackgroundGuard()
      return
    }
    applyTopMost(window, false)
  }, BACKGROUND_GUARD_INTERVAL)
}

function stopBackgroundGuard() {
  if (backgroundGuardTimer) {
    clearInterval(backgroundGuardTimer)
    backgroundGuardTimer = null
  }
}

function stopFrontReassert() {
  if (frontReassertTimer) {
    clearInterval(frontReassertTimer)
    frontReassertTimer = null
  }
}

function getOffscreenBounds(window: BrowserWindow): Rectangle {
  const displays = screen.getAllDisplays()
  const maxRight = Math.max(...displays.map((display) => display.bounds.x + display.bounds.width))
  const topMost = Math.min(...displays.map((display) => display.bounds.y))
  const [width, height] = window.getSize()

  return {
    x: maxRight + 2000,
    y: topMost,
    width,
    height
  }
}

function softHideWindow(window: BrowserWindow) {
  if (isWindowSoftHidden || window.isDestroyed()) return

  stopFrontReassert()
  stopBackgroundGuard()
  softHiddenBounds = window.getBounds()
  isWindowSoftHidden = true

  window.setOpacity(0)
  window.setIgnoreMouseEvents(true)
  window.setBounds(getOffscreenBounds(window))
}

function restoreSoftHiddenWindow(window: BrowserWindow) {
  if (!isWindowSoftHidden || !softHiddenBounds || window.isDestroyed()) return

  applyContentProtection(window, true)
  window.setBounds(softHiddenBounds)
  window.setIgnoreMouseEvents(state.ignoreMouse)
  window.setOpacity(1)

  isWindowSoftHidden = false
  softHiddenBounds = null
  keepWindowInFront(window)
}

function showMainWindow(window: BrowserWindow) {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    window.showInactive()
  } else {
    window.show()
  }

  applyContentProtection(window, process.platform === 'win32')
  keepWindowInFront(window)
}

function keepWindowInFront(window: BrowserWindow) {
  if (!window || window.isDestroyed()) return
  if (frontReassertTimer) {
    clearInterval(frontReassertTimer)
    frontReassertTimer = null
  }

  const start = Date.now()
  const reassert = () => {
    if (!window.isVisible() || window.isDestroyed()) return false
    applyTopMost(window)
    return true
  }

  if (!reassert()) return

  // Aggressive burst: rapid reasserts for a short period
  frontReassertTimer = setInterval(() => {
    const shouldStop = Date.now() - start > FRONT_REASSERT_DURATION
    if (shouldStop || !reassert()) {
      if (frontReassertTimer) {
        clearInterval(frontReassertTimer)
        frontReassertTimer = null
      }
    }
  }, FRONT_REASSERT_INTERVAL)

  // Ensure background guard is running for persistent protection
  startBackgroundGuard(window)
}

function abortCurrentStream(reason: AbortReason) {
  if (!currentStreamContext) return
  currentStreamContext.reason = reason
  currentStreamContext.controller.abort()
}

async function extractVisualContext(screenshotData: string) {
  const mainWindow = global.mainWindow
  if (!mainWindow || mainWindow.isDestroyed()) return

  const streamContext: StreamContext = {
    controller: new AbortController(),
    reason: null
  }
  currentStreamContext = streamContext
  mainWindow.webContents.send('ai-loading-start')

  let accumulated = ''
  let succeeded = false
  const MAX_RETRIES = 3

  try {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (streamContext.controller.signal.aborted) break
      try {
        const extractionStream = getVisualExtractionStream(
          screenshotData,
          streamContext.controller.signal
        )
        for await (const chunk of extractionStream) {
          if (streamContext.controller.signal.aborted) break
          accumulated += chunk
          mainWindow.webContents.send('solution-chunk', chunk)
        }
        if (streamContext.controller.signal.aborted) break
        succeeded = true
        break
      } catch (error) {
        if (streamContext.controller.signal.aborted) break
        if (attempt === MAX_RETRIES) {
          console.error('Error extracting visual context:', error)
          mainWindow.webContents.send('solution-error', '视觉识别失败，请重新截图')
          break
        }
        console.warn(`Visual extraction attempt ${attempt} failed, retrying...`, error)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    const ownsStream = currentStreamContext === streamContext
    if (streamContext.controller.signal.aborted) {
      if (streamContext.reason === 'user') {
        mainWindow.webContents.send('solution-stopped')
      }
    } else if (succeeded && ownsStream) {
      visualContextText = accumulated
      mainWindow.webContents.send('solution-complete')
    }
  } finally {
    const ownsStream = currentStreamContext === streamContext
    if (ownsStream) {
      currentStreamContext = null
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ai-loading-end')
      }
    }
  }
}

async function captureScreenshotForRequest(): Promise<string | null> {
  if (isCapturingScreenshot) {
    console.warn('Screenshot capture already in progress, ignoring new request')
    return null
  }

  isCapturingScreenshot = true
  const generation = ++screenshotCaptureGeneration
  abortCurrentStream('new-request')
  try {
    const screenshotData = await Promise.race([
      takeScreenshot(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
    ])
    if (generation !== screenshotCaptureGeneration || !state.inCoderPage) return null
    // A manual action may have started a stream while native capture was pending.
    abortCurrentStream('new-request')
    return screenshotData || null
  } finally {
    isCapturingScreenshot = false
  }
}

/**
 * Toggle command mode on/off
 */
function toggleCommandMode() {
  commandMode = !commandMode

  if (commandMode) {
    // Register single-letter shortcuts
    commandModeKeys.forEach((key) => {
      const action = getActionForKey(key)
      if (action && callbacks[action]) {
        globalShortcut.register(key, callbacks[action])
      }
    })
  } else {
    // Unregister single-letter shortcuts
    commandModeKeys.forEach((key) => {
      globalShortcut.unregister(key)
    })
  }
}

/**
 * Map single letter to action
 */
function getActionForKey(key: string): string | null {
  const keyMap: Record<string, string> = {
    S: 'takeScreenshot',
    A: 'appendScreenshot',
    Q: 'stopSolutionStream',
    R: 'toggleTranscription',
    C: 'clearTranscription',
    H: 'hideOrShowMainWindow',
    M: 'ignoreOrEnableMouse',
    J: 'pageDown',
    K: 'pageUp'
  }
  return keyMap[key] || null
}

/**
 * Handle semicolon press for triple-press detection
 */
function handleSemicolonPress() {
  semicolonPressCount++

  if (semicolonPressTimer) {
    clearTimeout(semicolonPressTimer)
  }

  if (semicolonPressCount >= 3) {
    toggleCommandMode()
    semicolonPressCount = 0
    if (semicolonPressTimer) {
      clearTimeout(semicolonPressTimer)
      semicolonPressTimer = null
    }
    // Randomize next time window to avoid detection pattern
    currentTriplePressWindow = Math.floor(
      Math.random() * (SEMICOLON_TRIPLE_PRESS_WINDOW_MAX - SEMICOLON_TRIPLE_PRESS_WINDOW_MIN) +
        SEMICOLON_TRIPLE_PRESS_WINDOW_MIN
    )
  } else {
    semicolonPressTimer = setTimeout(() => {
      semicolonPressCount = 0
      semicolonPressTimer = null
    }, currentTriplePressWindow)
  }
}

const callbacks: Record<string, () => void> = {
  hideOrShowMainWindow: async () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed()) return

    if (process.platform === 'win32') {
      if (isWindowSoftHidden) {
        restoreSoftHiddenWindow(mainWindow)
        return
      }

      if (!mainWindow.isVisible()) {
        showMainWindow(mainWindow)
        return
      }

      softHideWindow(mainWindow)
      return
    }

    if (mainWindow.isVisible()) {
      stopBackgroundGuard()
      mainWindow.hide()
    } else {
      // 重新显示时不断重申置顶属性，抵消其他前台软件持续抢占
      showMainWindow(mainWindow)
    }
  },

  takeScreenshot: async () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage || !settings.apiKey) return

    pendingVoiceQuestion = null
    let loadingStarted = false
    const screenshotData = await captureScreenshotForRequest()
    if (screenshotData && mainWindow && !mainWindow.isDestroyed()) {
      saveScreenshotToDisk(screenshotData)
      if (autoVoiceMode) {
        recentScreenshots = [screenshotData]
        hasAppendSeparator = false
        mainWindow.webContents.send('solution-clear')
        mainWindow.webContents.send('screenshots-updated', recentScreenshots)
        mainWindow.webContents.send('screenshot-taken', screenshotData)
        extractVisualContext(screenshotData)
        return
      }
      const transcriptionText = getTranscriptionText()
      if (transcriptionText) {
        clearTranscriptionText()
        mainWindow.webContents.send('transcription-cleared')
      }
      conversationMessages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: transcriptionText
                ? `这是语音转录内容：\n${transcriptionText}\n\n同时附上屏幕截图：`
                : '这是屏幕截图'
            },
            {
              type: 'image',
              image: screenshotData
            }
          ]
        }
      ]

      const streamContext: StreamContext = {
        controller: new AbortController(),
        reason: null
      }
      currentStreamContext = streamContext
      recentScreenshots = [screenshotData]
      hasAppendSeparator = false
      mainWindow.webContents.send('solution-clear')
      mainWindow.webContents.send('screenshots-updated', recentScreenshots)
      mainWindow.webContents.send('screenshot-taken', screenshotData)
      mainWindow.webContents.send('ai-loading-start')
      loadingStarted = true
      let endedNaturally = true
      let streamStarted = false
      let assistantResponse = ''
      try {
        const solutionStream = getSolutionStream(
          conversationMessages,
          streamContext.controller.signal
        )
        streamStarted = true
        try {
          for await (const chunk of solutionStream) {
            if (streamContext.controller.signal.aborted) {
              endedNaturally = false
              break
            }
            assistantResponse += chunk
            mainWindow.webContents.send('solution-chunk', chunk)
          }
        } catch (error) {
          if (!streamContext.controller.signal.aborted) {
            endedNaturally = false
            console.error('Error streaming solution:', error)
            mainWindow.webContents.send('solution-error', extractErrorMessage(error))
          } else {
            endedNaturally = false
          }
        }

        const ownsStream = currentStreamContext === streamContext
        if (streamContext.controller.signal.aborted) {
          if (streamContext.reason === 'user') {
            mainWindow.webContents.send('solution-stopped')
          }
        } else if (ownsStream && endedNaturally) {
          // Add assistant response to conversation history
          if (assistantResponse) {
            conversationMessages.push({
              role: 'assistant',
              content: assistantResponse
            })
          }
          mainWindow.webContents.send('solution-complete')
        }
      } catch (error) {
        if (streamContext.controller.signal.aborted) {
          if (streamContext.reason === 'user') {
            mainWindow.webContents.send('solution-stopped')
          }
        } else {
          endedNaturally = false
          console.error('Error streaming solution:', error)
          mainWindow.webContents.send('solution-error', extractErrorMessage(error))
        }
      } finally {
        const ownsStream = currentStreamContext === streamContext
        if (ownsStream) {
          currentStreamContext = null
        }
        if (!streamStarted && streamContext.reason === 'user') {
          mainWindow.webContents.send('solution-stopped')
        }
        if (ownsStream && loadingStarted && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('ai-loading-end')
        }
      }
    }
  },

  // Append screenshot for continuous capture (if conversation exists)
  appendScreenshot: async () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage || !settings.apiKey) return

    // Fallback to first screenshot if no conversation
    if (conversationMessages.length === 0) {
      callbacks.takeScreenshot()
      return
    }

    let loadingStarted = false

    const screenshotData = await captureScreenshotForRequest()
    if (screenshotData && mainWindow && !mainWindow.isDestroyed()) {
      saveScreenshotToDisk(screenshotData)
      const transcriptionText = getTranscriptionText()
      if (transcriptionText) {
        clearTranscriptionText()
        mainWindow.webContents.send('transcription-cleared')
      }
      // Append new image message to conversation
      const newUserMessage: ModelMessage = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: transcriptionText
              ? `这是下一部分截图和语音转录内容：\n${transcriptionText}\n请结合之前所有截图和分析，继续分析解答，不要遗漏任何信息。`
              : '这是下一部分截图，请结合之前所有截图和分析，继续分析解答，不要遗漏任何信息。'
          },
          {
            type: 'image',
            image: screenshotData
          }
        ]
      }
      conversationMessages = [
        ...conversationMessages.filter((message) => message.role === 'user').slice(-4),
        newUserMessage
      ]

      const streamContext: StreamContext = {
        controller: new AbortController(),
        reason: null
      }
      currentStreamContext = streamContext

      recentScreenshots.push(screenshotData)
      recentScreenshots = recentScreenshots.slice(-5) // 限5张
      mainWindow.webContents.send('screenshot-taken', screenshotData)
      mainWindow.webContents.send('screenshots-updated', recentScreenshots)
      if (!hasAppendSeparator) {
        mainWindow.webContents.send('solution-chunk', '\n\n---\n\n')
        hasAppendSeparator = true
      } else {
        mainWindow.webContents.send('solution-chunk', '\n\n')
      }
      mainWindow.webContents.send('ai-loading-start')
      loadingStarted = true

      let endedNaturally = true
      let streamStarted = false
      let assistantResponse = ''
      try {
        const solutionStream = getGeneralStream(
          conversationMessages,
          streamContext.controller.signal
        )
        streamStarted = true
        try {
          for await (const chunk of solutionStream) {
            if (streamContext.controller.signal.aborted) {
              endedNaturally = false
              break
            }
            assistantResponse += chunk
            mainWindow.webContents.send('solution-chunk', chunk)
          }
        } catch (error) {
          if (!streamContext.controller.signal.aborted) {
            endedNaturally = false
            console.error('Error streaming continuous solution:', error)
            mainWindow.webContents.send('solution-error', extractErrorMessage(error))
          } else {
            endedNaturally = false
          }
        }

        const ownsStream = currentStreamContext === streamContext
        if (streamContext.controller.signal.aborted) {
          if (streamContext.reason === 'user') {
            mainWindow.webContents.send('solution-stopped')
          }
        } else if (ownsStream && endedNaturally) {
          // Add assistant response to conversation history
          if (assistantResponse) {
            conversationMessages.push({
              role: 'assistant',
              content: assistantResponse
            })
          }
          mainWindow.webContents.send('solution-complete')
        }
      } catch (error) {
        if (streamContext.controller.signal.aborted) {
          if (streamContext.reason === 'user') {
            mainWindow.webContents.send('solution-stopped')
          }
        } else {
          endedNaturally = false
          console.error('Error streaming continuous solution:', error)
          mainWindow.webContents.send('solution-error', extractErrorMessage(error))
        }
      } finally {
        const ownsStream = currentStreamContext === streamContext
        if (ownsStream) {
          currentStreamContext = null
        }
        if (!streamStarted && streamContext.reason === 'user') {
          mainWindow.webContents.send('solution-stopped')
        }
        if (ownsStream && loadingStarted && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('ai-loading-end')
        }
      }
    }
  },

  // Stop current AI solution stream
  stopSolutionStream: () => {
    abortCurrentStream('user')
  },

  ignoreOrEnableMouse: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage) return
    state.ignoreMouse = !state.ignoreMouse
    mainWindow.setIgnoreMouseEvents(state.ignoreMouse)
    mainWindow.webContents.send('sync-app-state', state)
  },
  pageUp: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage) return
    mainWindow.webContents.send('scroll-page-up')
  },

  pageDown: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage) return
    mainWindow.webContents.send('scroll-page-down')
  },

  moveMainWindowUp: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed()) return
    const [x, y] = mainWindow.getPosition()
    mainWindow.setPosition(x, y - MOVE_STEP)
  },

  moveMainWindowDown: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed()) return
    const [x, y] = mainWindow.getPosition()
    mainWindow.setPosition(x, y + MOVE_STEP)
  },

  moveMainWindowLeft: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed()) return
    const [x, y] = mainWindow.getPosition()
    mainWindow.setPosition(x - MOVE_STEP, y)
  },

  moveMainWindowRight: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed()) return
    const [x, y] = mainWindow.getPosition()
    mainWindow.setPosition(x + MOVE_STEP, y)
  },

  toggleTranscription: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage) return
    mainWindow.webContents.send('toggle-transcription')
  },

  clearTranscription: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage) return
    clearTranscriptionText()
    clearPendingVoiceQuestion()
    mainWindow.webContents.send('transcription-cleared')
  },

  // Voice trigger: reuse screenshots when available, otherwise use the low-latency text model.
  voiceTrigger: async () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage || isCapturingScreenshot) {
      return
    }

    const transcriptionText = getTranscriptionText().trim()
    const hasApiCredentials = hasVoiceProviderCredentials()

    if (transcriptionText) {
      if (!hasApiCredentials) {
        // Surface a clear error instead of silently dropping the question.
        clearTranscriptionText()
        mainWindow.webContents.send('transcription-cleared')
        mainWindow.webContents.send('solution-error', '请先在设置中配置 API Key')
        return
      }
      pendingVoiceQuestion = transcriptionText
      clearTranscriptionText()
      mainWindow.webContents.send('transcription-cleared')
    }
    if (!pendingVoiceQuestion) return

    abortCurrentStream('new-request')
    const question = pendingVoiceQuestion
    const streamContext: StreamContext = {
      controller: new AbortController(),
      reason: null,
      kind: 'voice'
    }
    currentStreamContext = streamContext

    mainWindow.webContents.send('solution-clear')
    if (recentScreenshots.length > 0) {
      mainWindow.webContents.send('screenshots-updated', recentScreenshots)
    }
    mainWindow.webContents.send('ai-loading-start')

    let receivedContent = false
    try {
      const voiceStream = getVoiceAnswerStream(
        question,
        visualContextText ?? undefined,
        settings.writingContent,
        streamContext.controller.signal
      )

      for await (const chunk of voiceStream) {
        if (streamContext.controller.signal.aborted) break
        if (chunk) receivedContent = true
        mainWindow.webContents.send('solution-chunk', chunk)
      }

      const ownsStream = currentStreamContext === streamContext
      if (streamContext.controller.signal.aborted) {
        if (streamContext.reason === 'user') {
          mainWindow.webContents.send('solution-stopped')
        }
      } else if (ownsStream) {
        if (receivedContent) {
          pendingVoiceQuestion = null
          mainWindow.webContents.send('solution-complete')
        } else {
          mainWindow.webContents.send('solution-error', '模型未返回内容，请按 V 重试')
        }
      }
    } catch (error) {
      if (streamContext.controller.signal.aborted) {
        if (streamContext.reason === 'user') {
          mainWindow.webContents.send('solution-stopped')
        }
      } else {
        console.error('Error streaming voice response:', error)
        mainWindow.webContents.send('solution-error', extractErrorMessage(error))
      }
    } finally {
      const ownsStream = currentStreamContext === streamContext
      if (ownsStream) {
        currentStreamContext = null
      }
      if (ownsStream && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ai-loading-end')
      }
    }
  },

  clearVoiceContext: () => {
    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage) return

    abortCurrentStream('new-request')
    screenshotCaptureGeneration++
    conversationMessages = []
    recentScreenshots = []
    hasAppendSeparator = false
    pendingVoiceQuestion = null
    visualContextText = null
    clearTranscriptionText()
    mainWindow.webContents.send('transcription-cleared')
    mainWindow.webContents.send('solution-clear')
    mainWindow.webContents.send('screenshots-updated', recentScreenshots)
  }
}

function startAutoVoiceMode() {
  if (autoVoiceMode) return
  autoVoiceMode = true
  setPreserveTextOnTermination(true)

  autoVoiceTimer = setInterval(() => {
    if (!autoVoiceMode) return

    const mainWindow = global.mainWindow
    if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage) return

    const lastTime = getLastSentenceTime()
    if (lastTime > 0 && Date.now() - lastTime >= AUTO_VOICE_SILENCE_MS) {
      const text = getTranscriptionText()
      if (text.trim()) {
        // New transcription came in while generating: abort and restart.
        // Only preempt voice streams; leave manual screenshot/follow-up streams alone.
        if (currentStreamContext?.kind === 'voice') {
          abortCurrentStream('new-request')
        }
        callbacks.voiceTrigger()
      }
    }
  }, AUTO_VOICE_POLL_MS)
}

export function stopAutoVoiceMode() {
  autoVoiceMode = false
  setPreserveTextOnTermination(false)
  if (autoVoiceTimer) {
    clearInterval(autoVoiceTimer)
    autoVoiceTimer = null
  }
  clearPendingVoiceQuestion()
  screenshotCaptureGeneration++
  abortCurrentStream('new-request')
}

function clearPendingVoiceQuestion() {
  pendingVoiceQuestion = null
}

function endVoiceSession() {
  stopAutoVoiceMode()
  clearPendingVoiceQuestion()
  screenshotCaptureGeneration++
  conversationMessages = []
  recentScreenshots = []
  hasAppendSeparator = false
  visualContextText = null
  clearTranscriptionText()

  const mainWindow = global.mainWindow
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('transcription-cleared')
  mainWindow.webContents.send('solution-clear')
  mainWindow.webContents.send('screenshots-updated', recentScreenshots)
}

function unregisterShortcut(action: string) {
  const shortcut = shortcuts[action]
  if (!shortcut) return
  if (shortcut.registeredKeys.length) {
    shortcut.registeredKeys.forEach((registeredKey) => {
      globalShortcut.unregister(registeredKey)
    })
  } else {
    globalShortcut.unregister(shortcut.key)
  }
  shortcut.status = ShortcutStatus.Available
  shortcut.registeredKeys = []
}

function getShortcutRegistrationKeys(key: string) {
  const keys = [key]
  if (process.platform !== 'win32') {
    return keys
  }
  const parts = key.split('+')
  const hasAlt = parts.includes('Alt')
  const hasCtrl = parts.includes('CommandOrControl') || parts.includes('Control')
  if (hasAlt && !hasCtrl) {
    const aliasParts = [...parts]
    const altIndex = aliasParts.indexOf('Alt')
    if (altIndex >= 0) {
      aliasParts.splice(altIndex, 0, 'CommandOrControl')
      const aliasKey = aliasParts.join('+')
      if (!keys.includes(aliasKey)) {
        keys.push(aliasKey)
      }
    }
  }
  return keys
}

function registerShortcut(action: string, key: string) {
  if (shortcuts[action]) {
    unregisterShortcut(action)
  }

  const keysToRegister = getShortcutRegistrationKeys(key)
  const registeredKeys: string[] = []
  keysToRegister.forEach((shortcutKey) => {
    if (globalShortcut.register(shortcutKey, callbacks[action])) {
      registeredKeys.push(shortcutKey)
    }
  })

  shortcuts[action] = {
    action,
    key,
    status: registeredKeys.length ? ShortcutStatus.Registered : ShortcutStatus.Failed,
    registeredKeys
  }
}

ipcMain.handle('getShortcuts', () => shortcuts)

ipcMain.handle(
  'initShortcuts',
  (_event, shortcuts: Record<string, { action: string; key: string }>) => {
    Object.entries(shortcuts).forEach(([action, { key }]) => {
      registerShortcut(action, key)
    })

    // Register semicolon key for triple-press detection (command mode activation)
    globalShortcut.register(';', handleSemicolonPress)
  }
)

ipcMain.handle('updateShortcuts', (_event, _shortcuts: { action: string; key: string }[]) => {
  _shortcuts.forEach((shortcut) => {
    if (shortcuts[shortcut.action]?.key !== shortcut.key) {
      registerShortcut(shortcut.action, shortcut.key)
    }
  })
})

ipcMain.handle('stopSolutionStream', () => {
  if (!currentStreamContext) return false
  abortCurrentStream('user')
  return true
})

ipcMain.handle('sendFollowUpQuestion', async (_event, question: string) => {
  const mainWindow = global.mainWindow
  if (!mainWindow || mainWindow.isDestroyed() || !state.inCoderPage || !settings.apiKey) {
    return { success: false, error: 'Invalid state' }
  }

  // Validate that there's an active conversation
  if (conversationMessages.length === 0) {
    return { success: false, error: 'No active conversation' }
  }

  if (isCapturingScreenshot) {
    console.warn('Screenshot capture in progress, ignoring follow-up question')
    return { success: false, error: 'Screenshot capture in progress' }
  }

  abortCurrentStream('new-request')
  const streamContext: StreamContext = {
    controller: new AbortController(),
    reason: null
  }
  currentStreamContext = streamContext

  // Add a separator before the follow-up response
  mainWindow.webContents.send('solution-chunk', '\n\n---\n\n')

  let endedNaturally = true
  let streamStarted = false
  let assistantResponse = ''

  try {
    const followUpStream = getFollowUpStream(
      conversationMessages,
      question,
      streamContext.controller.signal
    )
    streamStarted = true

    try {
      for await (const chunk of followUpStream) {
        if (streamContext.controller.signal.aborted) {
          endedNaturally = false
          break
        }
        assistantResponse += chunk
        mainWindow.webContents.send('solution-chunk', chunk)
      }
    } catch (error) {
      if (!streamContext.controller.signal.aborted) {
        endedNaturally = false
        console.error('Error streaming follow-up solution:', error)
        mainWindow.webContents.send('solution-error', extractErrorMessage(error))
      } else {
        endedNaturally = false
      }
    }

    const ownsStream = currentStreamContext === streamContext
    if (streamContext.controller.signal.aborted) {
      if (streamContext.reason === 'user') {
        mainWindow.webContents.send('solution-stopped')
      }
    } else if (ownsStream && endedNaturally) {
      // Update conversation history with user question and assistant response
      conversationMessages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: question
          }
        ]
      })
      if (assistantResponse) {
        conversationMessages.push({
          role: 'assistant',
          content: assistantResponse
        })
      }
      mainWindow.webContents.send('solution-complete')
    }
  } catch (error) {
    if (streamContext.controller.signal.aborted) {
      if (streamContext.reason === 'user') {
        mainWindow.webContents.send('solution-stopped')
      }
    } else {
      endedNaturally = false
      console.error('Error streaming follow-up solution:', error)
      mainWindow.webContents.send('solution-error', extractErrorMessage(error))
    }
  } finally {
    if (currentStreamContext === streamContext) {
      currentStreamContext = null
    }
    if (!streamStarted && streamContext.reason === 'user') {
      mainWindow.webContents.send('solution-stopped')
    }
  }

  return { success: true }
})

ipcMain.handle('start-auto-voice-mode', () => {
  startAutoVoiceMode()
})

ipcMain.handle('stop-auto-voice-mode', () => {
  stopAutoVoiceMode()
})

ipcMain.handle('end-voice-session', () => {
  endVoiceSession()
})

ipcMain.handle('clear-pending-voice-question', () => {
  clearPendingVoiceQuestion()
})

ipcMain.handle('voice-trigger', async () => {
  await callbacks.voiceTrigger()
})

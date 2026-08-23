import { ipcMain } from 'electron'
import WebSocket from 'ws'
import { randomUUID } from 'node:crypto'

const WS_URL = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/'

let ws: WebSocket | null = null
let taskId: string | null = null
let isTranscribing = false
let taskStarted = false
let accumulatedText = ''
let currentPartial = ''
let lastSentenceTime = 0
// When true (auto voice mode), termination handlers keep accumulated text so the
// auto voice timer can still consume it via lastSentenceTime instead of dropping it.
let preserveTextOnTermination = false
let transcriptionRequested = false
let transcriptionApiKey = ''
let reconnectTimer: NodeJS.Timeout | null = null
let reconnectScheduled = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

function sendToRenderer(channel: string, ...args: unknown[]) {
  const mainWindow = global.mainWindow
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args)
  }
}

function cleanupSocket() {
  if (ws) {
    ws.removeAllListeners()
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close()
    }
    ws = null
  }
  taskId = null
  taskStarted = false
}

function stopReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  reconnectScheduled = false
}

function scheduleReconnect(reason: string) {
  if (!transcriptionRequested || !transcriptionApiKey || reconnectScheduled) return
  cleanupSocket()
  stopReconnectTimer()
  reconnectScheduled = true
  reconnectAttempts++
  if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
    console.error('Transcription reconnect limit reached:', reason)
    transcriptionRequested = false
    isTranscribing = false
    sendToRenderer('transcription-error', '语音识别连接已中断，请重新开启转录')
    sendToRenderer('transcription-stopped')
    return
  }
  const delay = Math.min(250 * 2 ** (reconnectAttempts - 1), 4000)
  console.warn(
    `Transcription session ended (${reason}); reconnecting in ${delay}ms (attempt ${reconnectAttempts})`
  )
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    reconnectScheduled = false
    if (transcriptionRequested) connectTranscription(transcriptionApiKey)
  }, delay)
}

function connectTranscription(apiKey: string) {
  cleanupSocket()
  isTranscribing = true
  taskId = randomUUID()

  ws = new WebSocket(WS_URL, {
    headers: { Authorization: `bearer ${apiKey}` }
  })

  ws.on('open', () => {
    const runTask = {
      header: {
        action: 'run-task',
        task_id: taskId,
        streaming: 'duplex'
      },
      payload: {
        task_group: 'audio',
        task: 'asr',
        function: 'recognition',
        model: 'qwen-audio-3.0-asr-flash-streaming',
        parameters: {
          format: 'pcm',
          sample_rate: 16000
        },
        input: {}
      }
    }
    ws!.send(JSON.stringify(runTask))
  })

  ws.on('message', (data: WebSocket.Data) => {
    try {
      const msg = JSON.parse(data.toString())
      const event = msg.header?.event

      if (event === 'task-started') {
        taskStarted = true
        reconnectAttempts = 0
        console.log('Transcription task started:', taskId)
        return
      }

      if (event === 'result-generated') {
        const sentence = msg.payload?.output?.sentence
        if (!sentence) return

        const text: string = sentence.text || ''
        const sentenceEnd: boolean = sentence.sentence_end === true

        // 任何 result-generated（含 partial）都刷新最后活动时间，避免长句中间停顿被误判为说完
        lastSentenceTime = Date.now()

        if (sentenceEnd) {
          if (text) {
            accumulatedText += text
          }
          currentPartial = ''
        } else {
          currentPartial = text
        }

        sendToRenderer('transcription-text', {
          text: getTranscriptionText(),
          isPartial: !sentenceEnd
        })
        return
      }

      if (event === 'task-failed') {
        const errorMsg = msg.header?.error_message || '语音识别失败'
        console.error('Transcription task failed:', errorMsg)
        scheduleReconnect('task-failed: ' + errorMsg)
        return
      }

      if (event === 'task-finished') {
        scheduleReconnect('task-finished')
      }
    } catch (e) {
      console.error('Failed to parse transcription message:', e)
    }
  })

  ws.on('error', (err) => {
    console.error('Transcription WebSocket error:', err)
    scheduleReconnect(err.message || 'websocket-error')
  })

  ws.on('close', (code, reason) => {
    if (transcriptionRequested) {
      scheduleReconnect(`websocket-close ${code} ${reason.toString()}`.trim())
    } else {
      cleanupSocket()
    }
  })
}

function startTranscription(apiKey: string) {
  if (transcriptionRequested) return
  transcriptionRequested = true
  transcriptionApiKey = apiKey
  reconnectAttempts = 0
  stopReconnectTimer()
  clearTranscriptionText()
  sendToRenderer('transcription-cleared')
  connectTranscription(apiKey)
}

function stopTranscription() {
  if (!transcriptionRequested && !isTranscribing) return

  if (ws && ws.readyState === WebSocket.OPEN && taskId && taskStarted) {
    const finishTask = {
      header: {
        action: 'finish-task',
        task_id: taskId,
        streaming: 'duplex'
      },
      payload: {
        input: {}
      }
    }
    ws.send(JSON.stringify(finishTask))
  }

  transcriptionRequested = false
  transcriptionApiKey = ''
  reconnectAttempts = 0
  stopReconnectTimer()
  isTranscribing = false
  cleanupSocket()
  clearTranscriptionOnTermination()
  sendToRenderer('transcription-stopped')
}

function handleAudioChunk(chunk: ArrayBuffer) {
  if (!ws || ws.readyState !== WebSocket.OPEN || !taskStarted) return
  ws.send(Buffer.from(chunk))
}

export function getTranscriptionText(): string {
  return accumulatedText + currentPartial
}

export function clearTranscriptionText() {
  accumulatedText = ''
  currentPartial = ''
  lastSentenceTime = 0
}

export function setPreserveTextOnTermination(preserve: boolean) {
  preserveTextOnTermination = preserve
}

function clearTranscriptionOnTermination() {
  if (preserveTextOnTermination) return
  clearTranscriptionText()
  sendToRenderer('transcription-cleared')
}

ipcMain.handle('start-transcription', (_event, apiKey: string) => {
  startTranscription(apiKey)
})

ipcMain.handle('stop-transcription', () => {
  stopTranscription()
})

ipcMain.on('transcription-audio-chunk', (_event, chunk: ArrayBuffer) => {
  handleAudioChunk(chunk)
})

ipcMain.handle('get-transcription-text', () => {
  return getTranscriptionText()
})

ipcMain.handle('clear-transcription-text', () => {
  clearTranscriptionText()
})

export function getLastSentenceTime(): number {
  return lastSentenceTime
}

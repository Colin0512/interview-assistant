import { useSettingsStore } from '@/lib/store/settings'

let mediaStream: MediaStream | null = null
let audioContext: AudioContext | null = null
let processor: ScriptProcessorNode | null = null
let captureGeneration = 0

function downsampleAndSend(float32: Float32Array): void {
  const int16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  window.api.sendTranscriptionAudioChunk(int16.buffer)
}

async function openMicrophoneStream(deviceId: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { deviceId: { exact: deviceId } },
    video: false
  })
}

async function openSystemAudioStream(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: true
  })
  stream.getVideoTracks().forEach((t) => t.stop())
  return stream
}

export async function startAudioCapture(): Promise<boolean> {
  const generation = ++captureGeneration
  const { audioInputDeviceId, audioOutputDeviceId } = useSettingsStore.getState()

  let stream: MediaStream
  if (audioInputDeviceId) {
    try {
      stream = await openMicrophoneStream(audioInputDeviceId)
    } catch (err) {
      console.warn('Failed to open selected microphone, falling back to system audio:', err)
      stream = await openSystemAudioStream()
    }
  } else {
    stream = await openSystemAudioStream()
  }

  if (generation !== captureGeneration) {
    stream.getTracks().forEach((track) => track.stop())
    return false
  }

  mediaStream = stream

  audioContext = new AudioContext({ sampleRate: 16000 })

  if (audioOutputDeviceId && 'setSinkId' in audioContext) {
    try {
      await (audioContext as AudioContext & { setSinkId: (id: string) => Promise<void> }).setSinkId(
        audioOutputDeviceId
      )
    } catch (err) {
      console.warn('Failed to set audio output device:', err)
    }
  }

  if (generation !== captureGeneration) {
    return false
  }

  const source = audioContext.createMediaStreamSource(new MediaStream(stream.getAudioTracks()))

  processor = audioContext.createScriptProcessor(2048, 1, 1)
  processor.onaudioprocess = (e) => {
    downsampleAndSend(e.inputBuffer.getChannelData(0))
  }
  source.connect(processor)
  // 挂到静音节点保活，避免把采集音频导回扬声器造成回声/自激
  const muteGain = audioContext.createGain()
  muteGain.gain.value = 0
  processor.connect(muteGain)
  muteGain.connect(audioContext.destination)
  return true
}

export function stopAudioCapture(): void {
  captureGeneration++
  if (processor) {
    processor.disconnect()
    processor = null
  }
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop())
    mediaStream = null
  }
}

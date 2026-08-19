import { useEffect, useRef } from 'react'
import { useSettingsStore } from '@/lib/store/settings'
import { useAppStore } from '@/lib/store/app'
import { useTranscriptionStore } from '@/lib/store/transcription'
import { useSolutionStore } from '@/lib/store/solution'
import { startAudioCapture, stopAudioCapture } from '@/lib/audio-capture'

import { AppHeader } from './AppHeader'
import { AppContent } from './AppContent'
import { AppStatusBar } from './AppStatusBar'
import { PrerequisitesChecker } from './PrerequisitesChecker'
import { TranscriptionBar } from './TranscriptionBar'

export default function CoderPage() {
  const { opacity, dashscopeApiKey, activeSceneId } = useSettingsStore()
  const { syncAppState } = useAppStore()
  const { isTranscribing, setIsTranscribing, setTranscriptionText, clearText } =
    useTranscriptionStore()
  const { setErrorMessage } = useSolutionStore()
  const isMountedRef = useRef(true)
  const isStartingTranscriptionRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      stopAudioCapture()
    }
  }, [])

  useEffect(() => {
    document.body.style.opacity = opacity.toString()
    return () => {
      document.body.style.opacity = ''
    }
  }, [opacity])

  useEffect(() => {
    window.api.updateAppState({ inCoderPage: true })
    return () => {
      window.api.updateAppState({ inCoderPage: false })
    }
  }, [])

  useEffect(() => {
    window.api.onSyncAppState((state) => {
      syncAppState(state)
    })
    return () => {
      window.api.removeSyncAppStateListener()
    }
  }, [syncAppState])

  useEffect(() => {
    const handleToggle = async () => {
      if (isTranscribing) {
        stopAudioCapture()
        await window.api.stopTranscription()
        await window.api.clearPendingVoiceQuestion()
        setIsTranscribing(false)
      } else {
        if (isStartingTranscriptionRef.current) return
        if (!dashscopeApiKey) {
          setErrorMessage('请先在设置中配置百炼平台 API Key')
          return
        }
        try {
          isStartingTranscriptionRef.current = true
          const captureStarted = await startAudioCapture()
          if (!captureStarted || !isMountedRef.current) return
          await window.api.startTranscription(dashscopeApiKey)
          if (!isMountedRef.current) {
            stopAudioCapture()
            await window.api.stopTranscription()
            return
          }
          setIsTranscribing(true)
          setErrorMessage(null)
        } catch (err) {
          console.error('Failed to start transcription:', err)
          stopAudioCapture()
          if (isMountedRef.current) {
            setErrorMessage('启动语音转录失败，请检查系统音频权限')
          }
        } finally {
          isStartingTranscriptionRef.current = false
        }
      }
    }

    window.api.onToggleTranscription(handleToggle)
    return () => {
      window.api.removeToggleTranscriptionListener()
    }
  }, [isTranscribing, dashscopeApiKey, setIsTranscribing, setErrorMessage])

  useEffect(() => {
    window.api.onTranscriptionText((data) => {
      setTranscriptionText(data.text)
    })
    window.api.onTranscriptionError((message) => {
      setErrorMessage(message)
      setIsTranscribing(false)
      stopAudioCapture()
    })
    window.api.onTranscriptionStopped(() => {
      setIsTranscribing(false)
    })
    window.api.onTranscriptionCleared(() => {
      clearText()
    })

    return () => {
      window.api.removeTranscriptionTextListener()
      window.api.removeTranscriptionErrorListener()
      window.api.removeTranscriptionStoppedListener()
      window.api.removeTranscriptionClearedListener()
    }
  }, [setTranscriptionText, setErrorMessage, setIsTranscribing, clearText])

  useEffect(() => {
    return () => {
      if (useTranscriptionStore.getState().isTranscribing) {
        stopAudioCapture()
        window.api.stopTranscription()
      }
    }
  }, [])

  // Route changes pause auto voice mode; leaving the ELLT scene ends its session.
  useEffect(() => {
    if (activeSceneId === 'oxford-ellt-speaking') {
      window.api.startAutoVoiceMode()
    } else {
      window.api.endVoiceSession()
    }
    return () => {
      window.api.stopAutoVoiceMode()
    }
  }, [activeSceneId])

  return (
    <div className="relative h-screen">
      <AppHeader />
      <AppContent />
      <TranscriptionBar />
      <AppStatusBar />
      <PrerequisitesChecker />
    </div>
  )
}

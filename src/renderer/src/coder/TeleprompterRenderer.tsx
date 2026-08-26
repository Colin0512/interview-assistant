import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  text: string
  speed: number // words per minute
  isActive: boolean // whether the AI is still generating (streaming)
}

/** Split text into sentence-level chunks for teleprompter display. */
function splitSentences(text: string): string[] {
  if (!text.trim()) return []
  const sentences = text.split(/(?<=[.。!！?？\n])\s*/)
  return sentences.filter((s) => s.trim().length > 0)
}

export default function TeleprompterRenderer({ text, speed, isActive }: Props) {
  const chunks = splitSentences(text)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const currentRef = useRef<HTMLSpanElement>(null)

  // When streaming, jump to the latest chunk
  useEffect(() => {
    if (isActive && chunks.length > 0) {
      setCurrentIndex(chunks.length - 1)
    }
  }, [isActive, chunks.length])

  // Auto-scroll current line into view
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [currentIndex])

  // Auto-advance timer
  const msPerChunk = speed > 0 ? (60 / speed) * 1000 : 400

  useEffect(() => {
    if (isActive || paused || chunks.length === 0) return
    if (currentIndex >= chunks.length - 1) return

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => Math.min(prev + 1, chunks.length - 1))
    }, msPerChunk)

    return () => clearTimeout(timer)
  }, [currentIndex, isActive, paused, chunks.length, msPerChunk])

  // Keyboard controls
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        setPaused((prev) => !prev)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCurrentIndex((prev) => Math.min(prev + 1, chunks.length - 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentIndex((prev) => Math.max(prev - 1, 0))
      }
    },
    [chunks.length]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (chunks.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500 text-xl" />
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center min-h-[60vh] px-8 py-12 select-none"
    >
      <div className="max-w-3xl w-full text-center space-y-6">
        {chunks.map((chunk, i) => {
          const isCurrent = i === currentIndex
          const isPast = i < currentIndex

          return (
            <span
              key={i}
              ref={isCurrent ? currentRef : undefined}
              className={[
                'block transition-all duration-300',
                isCurrent
                  ? 'text-2xl text-white font-medium leading-relaxed'
                  : isPast
                    ? 'text-lg text-gray-600 leading-relaxed'
                    : 'text-lg text-gray-700 leading-relaxed'
              ].join(' ')}
            >
              {chunk}
            </span>
          )
        })}
      </div>

      {/* Controls hint */}
      {!isActive && chunks.length > 0 && (
        <div className="fixed bottom-4 left-0 right-0 flex items-center justify-center gap-4 text-xs text-gray-600">
          <span>← → 导航</span>
          <span>空格 {paused ? '播放' : '暂停'}</span>
          <span>
            {currentIndex + 1} / {chunks.length}
          </span>
        </div>
      )}
    </div>
  )
}

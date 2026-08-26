import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowLeft,
  SquareTerminal,
  Palette,
  Shield,
  Bot,
  Eye,
  EyeOff,
  Keyboard,
  FolderOpen,
  Mic,
  PenLine,
  User,
  Plus,
  RotateCcw,
  Pencil,
  Trash2,
  ListTree,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  useSettingsStore,
  PRESET_SCENE_PROMPTS,
  DEFAULT_STAGE_PRESET_ID,
  type ContextMode
} from '@/lib/store/settings'
import { isMac } from '@/lib/utils/env'
import { SelectModel } from './SelectModel'
import { CustomShortcuts, ResetDefaultShortcuts } from './CustomShortcuts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

export default function SettingsPage() {
  const {
    opacity,
    apiBaseURL,
    apiKey,
    model,
    voiceApiBaseURL,
    voiceApiKey,
    voiceModel,
    scenes,
    activeSceneId,
    screenshotAutoSave,
    screenshotDir,
    dashscopeApiKey,
    audioInputDeviceId,
    audioOutputDeviceId,
    writingContent,
    personalInfo,
    hideDockIcon,
    displayMode,
    speechSpeed,
    showPauseMarkers,
    stagePresets,
    activeStagePresetId,
    updateSetting,
    setActiveScene,
    updateScenePrompt,
    addScene,
    removeScene,
    addStagePreset,
    removeStagePreset,
    updateStagePreset,
    setActiveStagePreset,
    addStage,
    removeStage,
    updateStage,
    reorderStages
  } = useSettingsStore()
  const [showApiKey, setShowApiKey] = useState(false)
  const [showVoiceApiKey, setShowVoiceApiKey] = useState(false)
  const [showDashscopeApiKey, setShowDashscopeApiKey] = useState(false)
  const [addSceneOpen, setAddSceneOpen] = useState(false)
  const [newSceneName, setNewSceneName] = useState('')
  const [sceneToDelete, setSceneToDelete] = useState<string | null>(null)
  const [editingStageId, setEditingStageId] = useState<string | null>(null)

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])

  const activeScene = scenes.find((s) => s.id === activeSceneId)
  const deletingScene = scenes.find((s) => s.id === sceneToDelete)
  const activeStagePreset = stagePresets.find((preset) => preset.id === activeStagePresetId)
  const editingStage = activeStagePreset?.stages.find((stage) => stage.id === editingStageId)

  useEffect(() => {
    return () => {
      document.body.style.opacity = ''
    }
  }, [])

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const needsPermission = devices.every((d) => !d.label)
        if (needsPermission) {
          await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        }
        const refreshed = await navigator.mediaDevices.enumerateDevices()
        setAudioDevices(refreshed)
      } catch (err) {
        console.error('Failed to enumerate audio devices:', err)
      }
    }
    loadDevices()
  }, [])

  const handleAddScene = () => {
    const name = newSceneName.trim()
    if (!name) return
    addScene(name)
    setNewSceneName('')
    setAddSceneOpen(false)
  }

  const handleResetScenePrompt = () => {
    if (!activeScene?.isPreset) return
    updateScenePrompt(activeScene.id, PRESET_SCENE_PROMPTS[activeScene.id] ?? '')
  }

  return (
    <>
      {/* Header */}
      <div id="app-header" className="flex items-center">
        <div className="actions">
          <Button variant="ghost" asChild size="icon" className="w-12 mr-2 rounded-none">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        </div>
        <h1>设置</h1>
      </div>

      {/* Settings Content */}
      <div id="app-content" className="flex flex-col gap-4 p-8">
        {/* AI Settings */}
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Bot className="h-5 w-5 mr-2" />
            AI 设置
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                API Base URL
                <span className="ml-2 text-xs font-light">
                  如硅基流动为 https://api.siliconflow.cn/v1
                </span>
              </label>
              <input
                type="text"
                value={apiBaseURL}
                onChange={(e) => updateSetting('apiBaseURL', e.target.value)}
                className="w-60 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="可为空，默认使用 OpenAI 的 API"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">API Key</label>
              <div className="flex items-center w-60">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => updateSetting('apiKey', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入 API Key"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="border border-l-0 rounded-l-none rounded-r-md h-9 w-9 hover:border-none"
                >
                  {showApiKey ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Model
                <span className="ml-2 text-xs font-light">
                  这里列了几个流行的国内和国外模型，请自行确认你的平台是否支持
                </span>
              </label>
              <SelectModel value={model} onChange={(val) => updateSetting('model', val)} />
            </div>

            <div className="border-t border-gray-400/50 pt-4">
              <h3 className="text-sm font-semibold mb-3">口语低延迟接口</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    口语 API Base URL
                    <span className="ml-2 text-xs font-light">
                      纯语音回答专用，留空则复用上方接口
                    </span>
                  </label>
                  <input
                    type="text"
                    value={voiceApiBaseURL}
                    onChange={(e) => updateSetting('voiceApiBaseURL', e.target.value)}
                    className="w-60 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="百炼 OpenAI 兼容端点"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">口语 API Key</label>
                  <div className="flex items-center w-60">
                    <input
                      type={showVoiceApiKey ? 'text' : 'password'}
                      value={voiceApiKey}
                      onChange={(e) => updateSetting('voiceApiKey', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="输入口语接口 API Key"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowVoiceApiKey(!showVoiceApiKey)}
                      className="border border-l-0 rounded-l-none rounded-r-md h-9 w-9 hover:border-none"
                    >
                      {showVoiceApiKey ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    口语模型
                    <span className="ml-2 text-xs font-light">推荐低延迟文本模型</span>
                  </label>
                  <input
                    type="text"
                    value={voiceModel}
                    onChange={(e) => updateSetting('voiceModel', e.target.value)}
                    className="w-60 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="如 qwen-turbo"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stage preset settings */}
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <ListTree className="h-5 w-5 mr-2" />
            阶段预设
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Select value={activeStagePresetId} onValueChange={setActiveStagePreset}>
                <SelectTrigger className="flex-1 bg-white">
                  <SelectValue placeholder="选择阶段预设" />
                </SelectTrigger>
                <SelectContent>
                  {stagePresets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => addStagePreset(`新预设 ${stagePresets.length + 1}`)}
              >
                <Plus className="h-4 w-4" />
                新增预设
              </Button>
              {activeStagePreset && activeStagePreset.id !== DEFAULT_STAGE_PRESET_ID && (
                <Button
                  variant="destructive"
                  size="icon"
                  title="删除当前预设"
                  onClick={() => removeStagePreset(activeStagePreset.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {activeStagePreset && (
              <>
                <Input
                  value={activeStagePreset.name}
                  aria-label="预设名称"
                  className="bg-white"
                  onChange={(event) =>
                    updateStagePreset(activeStagePreset.id, { name: event.target.value })
                  }
                />
                <div className="space-y-2">
                  {activeStagePreset.stages.map((stage, index) => (
                    <div
                      key={stage.id}
                      className="flex items-center gap-3 rounded-md border border-gray-300 bg-white px-3 py-2"
                    >
                      <span
                        className={cn(
                          'h-3 w-3 rounded-full',
                          {
                            blue: 'bg-blue-600',
                            green: 'bg-green-600',
                            orange: 'bg-orange-600',
                            purple: 'bg-purple-600',
                            red: 'bg-red-600',
                            teal: 'bg-teal-600'
                          }[stage.color] ?? 'bg-gray-600'
                        )}
                      />
                      <span className="flex-1 text-sm">
                        Stage {index + 1} · {stage.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === 0}
                        title="上移"
                        onClick={() => reorderStages(activeStagePreset.id, index, index - 1)}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === activeStagePreset.stages.length - 1}
                        title="下移"
                        onClick={() => reorderStages(activeStagePreset.id, index, index + 1)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="编辑阶段"
                        onClick={() => setEditingStageId(stage.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="删除阶段"
                        onClick={() => removeStage(activeStagePreset.id, stage.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {activeStagePreset.stages.length === 0 && (
                    <p className="text-sm text-gray-600">当前预设没有阶段，请先添加一个阶段。</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    const id = addStage(activeStagePreset.id)
                    setEditingStageId(id)
                  }}
                >
                  <Plus className="h-4 w-4" />
                  添加阶段
                </Button>
                <p className="text-xs text-gray-600">
                  在主界面按 <kbd className="rounded border bg-white px-1">,</kbd>{' '}
                  切换到上一阶段，按 <kbd className="rounded border bg-white px-1">.</kbd>{' '}
                  切换到下一阶段；到达首尾时会停留在当前阶段。
                </p>
              </>
            )}
          </div>
        </div>

        <Dialog open={!!editingStage} onOpenChange={(open) => !open && setEditingStageId(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>编辑阶段</DialogTitle>
              <DialogDescription>设置阶段名称、标识颜色及回答时使用的上下文。</DialogDescription>
            </DialogHeader>
            {activeStagePreset && editingStage && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">名称</label>
                  <Input
                    className="mt-1"
                    value={editingStage.name}
                    onChange={(event) =>
                      updateStage(activeStagePreset.id, editingStage.id, {
                        name: event.target.value
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">颜色</label>
                  <Select
                    value={editingStage.color}
                    onValueChange={(color) =>
                      updateStage(activeStagePreset.id, editingStage.id, { color })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        ['blue', '蓝色'],
                        ['green', '绿色'],
                        ['orange', '橙色'],
                        ['purple', '紫色'],
                        ['red', '红色'],
                        ['teal', '青色']
                      ].map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">上下文模式</label>
                  {(
                    [
                      ['personalInfo', '个人资料'],
                      ['writingContent', '写作内容'],
                      ['visualContext', '视觉上下文']
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm">{label}</span>
                      <Select
                        value={editingStage.contextConfig[key]}
                        onValueChange={(mode) =>
                          updateStage(activeStagePreset.id, editingStage.id, {
                            contextConfig: {
                              ...editingStage.contextConfig,
                              [key]: mode as ContextMode
                            }
                          })
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="off">关闭</SelectItem>
                          <SelectItem value="primary">主要</SelectItem>
                          <SelectItem value="fallback">备用</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-sm font-medium">自定义提示词</label>
                  <Textarea
                    className="mt-1 min-h-28"
                    value={editingStage.customPrompt}
                    placeholder="可选：为此阶段补充专用指令"
                    onChange={(event) =>
                      updateStage(activeStagePreset.id, editingStage.id, {
                        customPrompt: event.target.value
                      })
                    }
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setEditingStageId(null)}>完成</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Personal Info Settings */}
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            个人资料
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                个人资料（Stage 1 个人问答用）
                <span className="ml-2 text-xs font-light">
                  填写姓名、来自哪里、学校、专业、兴趣爱好等，个人问答时据此生成回答
                </span>
              </label>
              <Textarea
                value={personalInfo}
                onChange={(e) => updateSetting('personalInfo', e.target.value)}
                placeholder="例如：My name is Li Ming. I am from Beijing. I study computer science at Peking University. I like playing basketball and reading."
                className="w-full min-h-24 max-h-60 bg-white mt-2"
                rows={5}
              />
            </div>
          </div>
        </div>

        {/* Writing Content Settings */}
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <PenLine className="h-5 w-5 mr-2" />
            写作内容
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                写作内容问答
                <span className="ml-2 text-xs font-light">
                  保存一段写作内容，自动语音模式生成口语回答时会带上这段内容
                </span>
              </label>
              <Textarea
                value={writingContent}
                onChange={(e) => updateSetting('writingContent', e.target.value)}
                placeholder="请输入你在写作部分写下的内容，考官可能就此提问"
                className="w-full min-h-32 max-h-80 bg-white mt-2"
                rows={8}
              />
            </div>
          </div>
        </div>

        {/* Transcription Settings */}
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Mic className="h-5 w-5 mr-2" />
            语音转录
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                百炼平台 API Key
                <span className="ml-2 text-xs font-light">
                  从阿里云
                  <a
                    href="https://bailian.console.aliyun.com/cn-beijing?tab=model#/api-key"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-0.5 text-blue-700 hover:underline"
                  >
                    百炼平台
                  </a>
                  获取，如不需要语音转录功能可跳过
                </span>
              </label>
              <div className="flex items-center w-60">
                <input
                  type={showDashscopeApiKey ? 'text' : 'password'}
                  value={dashscopeApiKey}
                  onChange={(e) => updateSetting('dashscopeApiKey', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入百炼平台 API Key"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDashscopeApiKey(!showDashscopeApiKey)}
                  className="border border-l-0 rounded-l-none rounded-r-md h-9 w-9 hover:border-none"
                >
                  {showDashscopeApiKey ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                音频输入设备
                <span className="ml-2 text-xs font-light">选择麦克风，留空则捕获系统音频</span>
              </label>
              <Select
                value={audioInputDeviceId || 'system'}
                onValueChange={(val) =>
                  updateSetting('audioInputDeviceId', val === 'system' ? '' : val)
                }
              >
                <SelectTrigger className="w-60 bg-white">
                  <SelectValue placeholder="系统音频（默认）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">系统音频（默认）</SelectItem>
                  {audioDevices
                    .filter((d) => d.kind === 'audioinput')
                    .map((d) => (
                      <SelectItem key={d.deviceId} value={d.deviceId}>
                        {d.label || d.deviceId}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                音频输出设备
                <span className="ml-2 text-xs font-light">用于转录时的监听输出</span>
              </label>
              <Select
                value={audioOutputDeviceId || 'default'}
                onValueChange={(val) =>
                  updateSetting('audioOutputDeviceId', val === 'default' ? '' : val)
                }
              >
                <SelectTrigger className="w-60 bg-white">
                  <SelectValue placeholder="默认设备" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">默认设备</SelectItem>
                  {audioDevices
                    .filter((d) => d.kind === 'audiooutput')
                    .map((d) => (
                      <SelectItem key={d.deviceId} value={d.deviceId}>
                        {d.label || d.deviceId}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <SquareTerminal className="h-5 w-5 mr-2" />
            解题设置
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                使用场景
                <span className="ml-2 text-xs font-light">
                  选择场景后可编辑对应的系统提示词，修改会自动保存；也可新增自己的场景
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {scenes.map((scene) => (
                  <div
                    key={scene.id}
                    className={cn(
                      'group flex items-center rounded-full border text-sm transition-colors cursor-pointer select-none',
                      scene.id === activeSceneId
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 hover:border-blue-400'
                    )}
                    onClick={() => setActiveScene(scene.id)}
                  >
                    <span className={cn('py-1 pl-3', scene.isPreset ? 'pr-3' : 'pr-1')}>
                      {scene.name}
                    </span>
                    {!scene.isPreset && (
                      <button
                        className="mr-1.5 p-0.5 rounded-full opacity-60 hover:opacity-100 hover:bg-black/10"
                        title="删除该场景"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSceneToDelete(scene.id)
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="flex items-center gap-1 rounded-full border border-dashed border-gray-400 bg-transparent px-3 py-1 text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                  onClick={() => setAddSceneOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  新增场景
                </button>
              </div>
            </div>

            {activeScene && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">
                    系统提示词
                    <span className="ml-2 text-xs font-light">「{activeScene.name}」场景</span>
                  </label>
                  {activeScene.isPreset && (
                    <button
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                      title="恢复该场景的默认提示词"
                      onClick={handleResetScenePrompt}
                    >
                      <RotateCcw className="h-3 w-3" />
                      恢复默认
                    </button>
                  )}
                </div>
                <Textarea
                  value={activeScene.prompt}
                  onChange={(e) => updateScenePrompt(activeScene.id, e.target.value)}
                  placeholder="请输入该场景的系统提示词, 示例: 你是一个解题助手, 请根据「截图」和「语音转录内容」给出相关回答。"
                  className="w-full min-h-24 max-h-100 bg-white"
                  rows={6}
                />
              </div>
            )}
          </div>
        </div>

        {/* Add scene dialog */}
        <Dialog open={addSceneOpen} onOpenChange={setAddSceneOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>新增场景</DialogTitle>
              <DialogDescription>创建后可为该场景编写专属的系统提示词</DialogDescription>
            </DialogHeader>
            <Input
              value={newSceneName}
              onChange={(e) => setNewSceneName(e.target.value)}
              placeholder="场景名称，如：数学考试"
              maxLength={20}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddScene()
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddSceneOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddScene} disabled={!newSceneName.trim()}>
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete scene confirm dialog */}
        <Dialog open={!!sceneToDelete} onOpenChange={(open) => !open && setSceneToDelete(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>删除场景</DialogTitle>
              <DialogDescription>
                确定删除场景「{deletingScene?.name}」吗？其提示词内容将一并删除，且无法恢复。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSceneToDelete(null)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (sceneToDelete) removeScene(sceneToDelete)
                  setSceneToDelete(null)
                }}
              >
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Appearance Settings */}
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Palette className="h-5 w-5 mr-2" />
            外观设置
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                窗口透明度
                <span className="ml-2 text-xs font-light">拖动可实时预览效果</span>
              </label>
              <div className="w-60 flex items-center gap-2">
                <span className="text-xs whitespace-nowrap">透明</span>
                <Slider
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={[opacity]}
                  onValueChange={(value) => {
                    updateSetting('opacity', value[0])
                    document.body.style.opacity = value[0].toString()
                  }}
                />
                <span className="text-xs whitespace-nowrap">不透明</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                显示模式
                <span className="ml-2 text-xs font-light">题词器模式将答案按句子分块滚动显示</span>
              </label>
              <Select
                value={displayMode}
                onValueChange={(val) =>
                  updateSetting('displayMode', val as 'normal' | 'teleprompter')
                }
              >
                <SelectTrigger className="w-60 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">普通模式</SelectItem>
                  <SelectItem value="teleprompter">题词器模式</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {displayMode === 'teleprompter' && (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    语速
                    <span className="ml-2 text-xs font-light">{speechSpeed} 词/分钟</span>
                  </label>
                  <div className="w-60 flex items-center gap-2">
                    <span className="text-xs whitespace-nowrap">慢</span>
                    <Slider
                      min={80}
                      max={250}
                      step={10}
                      value={[speechSpeed]}
                      onValueChange={(value) => updateSetting('speechSpeed', value[0])}
                    />
                    <span className="text-xs whitespace-nowrap">快</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    停顿标记
                    <span className="ml-2 text-xs font-light">
                      在题词器模式下显示句子间的停顿标记
                    </span>
                  </label>
                  <Switch
                    className="scale-y-90"
                    checked={showPauseMarkers}
                    onCheckedChange={(checked) => updateSetting('showPauseMarkers', checked)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Shortcuts Settings */}
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Keyboard className="h-5 w-5 mr-2" />
            快捷键设置
            <div className="text-sm font-light ml-2 mt-1">
              只有在主界面时，快捷键才有效。当前页面仅部分快捷键生效。
            </div>
            <ResetDefaultShortcuts />
          </h2>
          <CustomShortcuts />
        </div>

        {/* Screenshot Save Settings */}
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FolderOpen className="h-5 w-5 mr-2" />
            保存截图
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                保存截图到本地
                <span className="ml-2 text-xs font-light">
                  开启后，每次截图都会自动保存到指定目录
                </span>
              </label>
              <Switch
                className="scale-y-90"
                checked={screenshotAutoSave}
                onCheckedChange={(checked) => updateSetting('screenshotAutoSave', checked)}
              />
            </div>
            {screenshotAutoSave && (
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  保存目录
                  <span className="ml-2 text-xs font-light">
                    可点击右侧内容重新选择保存目录（选择弹窗可能被本窗口遮挡）
                  </span>
                </label>
                <button
                  className="text-xs text-gray-600 max-w-48 truncate hover:text-gray-900 cursor-pointer transition-colors"
                  title="点击选择保存目录"
                  onClick={async () => {
                    const dir = await window.api.selectScreenshotDir()
                    if (dir) updateSetting('screenshotDir', dir)
                  }}
                >
                  {screenshotDir || '默认: 图片/InterviewCoder'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-gray-300/80 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            隐私设置
          </h2>

          <div className="space-y-4">
            <p className="text-sm">
              此应用为本地应用，采集的图片直接上传到您配置的 OpenAI
              等大模型公司，不存在隐私泄露风险。
            </p>
            {isMac && (
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  隐藏 Dock 图标
                  <span className="ml-2 text-xs font-light">
                    开启后不在程序坞和 Cmd+Tab 切换器中显示，仅可通过快捷键唤起窗口
                  </span>
                </label>
                <Switch
                  className="scale-y-90"
                  checked={hideDockIcon}
                  onCheckedChange={(checked) => updateSetting('hideDockIcon', checked)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Eye, EyeOff } from 'lucide-react'
import { useSettingsStore } from '@/lib/store/settings'
import { Button } from '@/components/ui/button'

export function PrerequisitesChecker() {
  const navigate = useNavigate()
  const { apiKey, apiBaseURL, updateSetting } = useSettingsStore()
  const [inputApiKey, setInputApiKey] = useState(apiKey)
  const [inputApiBaseURL, setInputApiBaseURL] = useState(apiBaseURL)
  const [showApiKey, setShowApiKey] = useState(false)

  const saveApiKey = () => {
    if (inputApiKey.trim()) {
      updateSetting('apiKey', inputApiKey.trim())
    }
    if (inputApiBaseURL.trim()) {
      updateSetting('apiBaseURL', inputApiBaseURL.trim())
    }
  }

  // If apiKey exists, skip this checker
  if (apiKey) {
    return null
  }

  return (
    <div className="fixed top-9 left-0 right-0 bottom-0 flex bg-black/50">
      <div className="m-auto bg-white rounded-lg p-6 pt-1 w-120 shadow-lg">
        <h1 className="text-xl font-bold text-center mb-2">欢迎使用System Helper</h1>
        <div className="text-sm text-gray-600">
          请先配置大模型聚合平台信息，如国内的
          <a
            href="https://cloud.siliconflow.cn/i/SG8C0772"
            target="_blank"
            rel="noreferrer"
            className="text-blue-500 mx-1"
          >
            硅基流动
          </a>
          或国外的
          <a
            href="https://openrouter.ai/"
            target="_blank"
            rel="noreferrer"
            className="text-blue-500 mx-1"
          >
            OpenRouter
          </a>
          等 。
        </div>

        <div className="space-y-2 my-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              API Base URL{' '}
              <span className="text-xs font-normal text-gray-500">
                (配置硅基流动或其他代理服务商的 API Base URL 地址)
              </span>
            </label>
            <input
              type="text"
              value={inputApiBaseURL}
              onChange={(e) => setInputApiBaseURL(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://api.openai.com/v1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">API Key</label>
            <div className="flex">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={inputApiKey}
                onChange={(e) => setInputApiKey(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入 API Key"
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
        </div>

        <div className="flex gap-3">
          <Button disabled={!inputApiKey.trim()} className="flex-1" onClick={saveApiKey}>
            开始使用
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              saveApiKey()
              navigate('/settings')
            }}
            className="flex-1"
          >
            更多设置
          </Button>
        </div>
      </div>
    </div>
  )
}

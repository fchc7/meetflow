import enUS from '@/locales/en-US/common.json'
import zhCN from '@/locales/zh-CN/common.json'

export const resources = {
  'zh-CN': {
    translation: zhCN,
  },
  'en-US': {
    translation: enUS,
  },
} as const

export type AppLanguage = keyof typeof resources

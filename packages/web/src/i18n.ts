import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources, type AppLanguage } from '@/locales/resources'

const STORAGE_KEY = 'meetflow-language'
const DEFAULT_LANGUAGE: AppLanguage = 'zh-CN'
const supportedLanguages = Object.keys(resources) as AppLanguage[]

function getInitialLanguage(): AppLanguage {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE
  }

  const storedLanguage = window.localStorage.getItem(STORAGE_KEY) as AppLanguage | null

  if (storedLanguage && supportedLanguages.includes(storedLanguage)) {
    return storedLanguage
  }

  const browserLanguage = navigator.language as AppLanguage

  return supportedLanguages.includes(browserLanguage) ? browserLanguage : DEFAULT_LANGUAGE
}

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: supportedLanguages,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  })

void i18n.on('languageChanged', (language) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, language)
  }
})

export { i18n }

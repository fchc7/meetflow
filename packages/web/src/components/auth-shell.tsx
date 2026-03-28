import type { ReactNode } from 'react'
import { CalendarClock, DoorOpen, Orbit, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type AuthShellProps = {
  title: string
  description: string
  caption: string
  children: ReactNode
}

export function AuthShell({ title, description, caption, children }: AuthShellProps) {
  const { t, i18n } = useTranslation()
  const isChinese = i18n.resolvedLanguage === 'zh-CN'
  const highlights = [
    {
      icon: CalendarClock,
      title: t('authShell.highlights.quiet.title'),
      detail: t('authShell.highlights.quiet.detail'),
    },
    {
      icon: DoorOpen,
      title: t('authShell.highlights.room.title'),
      detail: t('authShell.highlights.room.detail'),
    },
    {
      icon: Orbit,
      title: t('authShell.highlights.recurring.title'),
      detail: t('authShell.highlights.recurring.detail'),
    },
  ]

  return (
    <div className="mx-auto grid min-h-screen max-w-[1560px] lg:grid-cols-[minmax(0,1fr)_minmax(28rem,34rem)]">
      <section className="grid-lines relative hidden overflow-hidden border-r border-border/40 px-8 py-8 lg:flex lg:flex-col lg:justify-center lg:gap-9 xl:px-12">
        <div className="space-y-5">
          <div className="eyebrow">
            <Sparkles className="h-3.5 w-3.5" />
            {t('brand.name')}
          </div>
          <div className="max-w-[40rem] space-y-4">
            <p className="locale-signature text-sm font-medium text-muted-foreground">
              {t('brand.signature')}
            </p>
            <h1
              className={
                isChinese
                  ? 'locale-title max-w-[8ch] text-[3.15rem] font-semibold text-foreground xl:text-[3.6rem]'
                  : 'locale-title max-w-[11ch] text-[3.2rem] font-semibold leading-[0.98] text-foreground xl:text-[3.6rem]'
              }
            >
              {t('authShell.title')}
            </h1>
            <p className="locale-copy max-w-[30rem] text-base text-muted-foreground">
              {t('authShell.description')}
            </p>
          </div>
        </div>

        <div className="grid gap-3 xl:max-w-[46rem] 2xl:grid-cols-3">
          {highlights.map(({ icon: Icon, title: highlightTitle, detail }) => (
            <div key={highlightTitle} className="panel px-4 py-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <h2 className="text-lg font-semibold text-foreground">{highlightTitle}</h2>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-10 xl:px-12">
        <div className="w-full max-w-[34rem] space-y-6">
          <div className="space-y-3">
            <p className="locale-caption">{caption}</p>
            <h2
              className={
                isChinese
                  ? 'locale-title text-[2.25rem] font-semibold text-foreground'
                  : 'locale-title text-[2.45rem] font-semibold text-foreground'
              }
            >
              {title}
            </h2>
            <p className="locale-copy max-w-[28rem] text-[0.98rem] text-muted-foreground">{description}</p>
          </div>

          <div className="panel px-6 py-6 sm:px-7 sm:py-7">
            {children}
          </div>
        </div>
      </section>
    </div>
  )
}

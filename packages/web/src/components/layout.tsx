import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { CalendarDays, ChevronLeft, ChevronRight, LogOut, Orbit, UserRound } from 'lucide-react'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { enUS, zhCN as zhDateLocale } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import type { AppLanguage } from '@/locales/resources'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LANGUAGE_OPTIONS: AppLanguage[] = ['zh-CN', 'en-US']

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const activeLanguage: AppLanguage = i18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN'
  const isChinese = activeLanguage === 'zh-CN'
  const dateLocale = activeLanguage === 'en-US' ? enUS : zhDateLocale
  const todayFormat = activeLanguage === 'en-US' ? 'EEEE, MMM d' : 'M月d日 EEEE'
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(new Date()))
  const calendarRef = useRef<HTMLDivElement | null>(null)
  const navItems = [
    { to: '/', label: t('layout.nav.meetings') },
    { to: '/rooms', label: t('layout.nav.rooms') },
  ]
  const calendarLabels = {
    open: activeLanguage === 'en-US' ? 'Open calendar navigator' : '打开日历导航',
    selected: activeLanguage === 'en-US' ? 'Selected date' : '已选日期',
    todayAction: activeLanguage === 'en-US' ? 'Today' : '今天',
    clear: activeLanguage === 'en-US' ? 'Clear' : '清除',
  }

  const selectedDate = useMemo(() => {
    const rawDate = new URLSearchParams(location.search).get('date')
    if (!rawDate) {
      return null
    }

    const parsedDate = new Date(`${rawDate}T00:00:00`)
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
  }, [location.search])

  const weekdayStart = useMemo(
    () => startOfWeek(new Date(), { locale: dateLocale }),
    [dateLocale],
  )

  const weekdayLabels = useMemo(
    () => Array.from({ length: 7 }).map((_, index) => format(addDays(weekdayStart, index), 'EEEEE', { locale: dateLocale })),
    [dateLocale, weekdayStart],
  )

  const calendarDays = useMemo(() => {
    const rangeStart = startOfWeek(startOfMonth(visibleMonth), { locale: dateLocale })
    const rangeEnd = endOfWeek(endOfMonth(visibleMonth), { locale: dateLocale })
    const days: Date[] = []
    let cursor = rangeStart

    while (cursor <= rangeEnd) {
      days.push(new Date(cursor))
      cursor = addDays(cursor, 1)
    }

    return days
  }, [dateLocale, visibleMonth])

  useEffect(() => {
    if (selectedDate) {
      setVisibleMonth(startOfMonth(selectedDate))
    }
  }, [selectedDate])

  useEffect(() => {
    if (!calendarOpen) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setCalendarOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCalendarOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [calendarOpen])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function handleDatePick(date: Date) {
    const dateKey = format(date, 'yyyy-MM-dd')
    setCalendarOpen(false)
    navigate(`/?date=${dateKey}`)
  }

  function handleCalendarToday() {
    handleDatePick(new Date())
  }

  function handleCalendarClear() {
    setCalendarOpen(false)
    navigate('/')
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_24%),radial-gradient(circle_at_80%_10%,hsl(var(--accent)/0.12),transparent_20%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,hsl(var(--surface-quiet)/0.95),transparent)]" />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1380px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <NavLink to="/" className="flex items-center gap-3 text-foreground">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/80 bg-card shadow-[inset_0_1px_0_hsl(0_0%_100%/0.5)]">
                <Orbit className="h-5 w-5 text-primary" />
              </span>
              <div className="space-y-1">
                <p
                  className={cn(
                    'text-[11px] text-muted-foreground',
                    isChinese ? 'locale-signature font-medium' : 'mono uppercase tracking-[0.22em]',
                  )}
                >
                  {t('brand.signature')}
                </p>
                <p className="text-lg font-semibold">{t('brand.name')}</p>
              </div>
            </NavLink>

            <nav className="flex items-center gap-1 rounded-full border border-border/70 bg-card/75 p-1 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.45)]">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-full px-4 py-2 text-sm font-medium text-muted-foreground',
                      isActive && 'bg-primary text-primary-foreground shadow-[0_10px_18px_hsl(var(--primary)/0.16)]',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-1.5 pl-1 text-xs text-muted-foreground">
              {LANGUAGE_OPTIONS.map((language, index) => (
                <div key={language} className="flex items-center gap-1.5">
                  {index > 0 && <span className="opacity-40">/</span>}
                  <button
                    type="button"
                    onClick={() => void i18n.changeLanguage(language)}
                    className={cn(
                      'rounded px-1 py-0.5 font-medium transition-colors',
                      activeLanguage === language
                        ? 'text-foreground'
                        : 'hover:text-foreground',
                    )}
                  >
                    {t(`layout.languages.${language}`)}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative" ref={calendarRef}>
              <button
                type="button"
                className="panel-muted flex items-center gap-3 px-4 py-3 text-left"
                onClick={() => setCalendarOpen((open) => !open)}
                aria-label={calendarLabels.open}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <div>
                  <p
                    className={cn(
                      'text-[11px] text-muted-foreground',
                      isChinese ? 'locale-chip font-medium' : 'mono uppercase tracking-[0.18em]',
                    )}
                  >
                    {selectedDate ? calendarLabels.selected : t('layout.today')}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {selectedDate
                      ? format(selectedDate, activeLanguage === 'en-US' ? 'EEE, MMM d' : 'M月d日 EEE', { locale: dateLocale })
                      : format(new Date(), todayFormat, { locale: dateLocale })}
                  </p>
                </div>
              </button>

              {calendarOpen && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] w-[320px] rounded-2xl border border-border/70 bg-background/95 p-4 shadow-[0_20px_48px_hsl(var(--foreground)/0.12)] backdrop-blur-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 rounded-full p-0"
                      onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-semibold text-foreground">
                      {format(visibleMonth, activeLanguage === 'en-US' ? 'MMMM yyyy' : 'yyyy年M月', { locale: dateLocale })}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 rounded-full p-0"
                      onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mb-2 grid grid-cols-7 gap-1">
                    {weekdayLabels.map((label, index) => (
                      <span key={`${label}-${index}`} className="text-center text-[11px] text-muted-foreground">
                        {label}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day) => {
                      const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                      const isCurrentDay = isToday(day)
                      const outsideMonth = !isSameMonth(day, visibleMonth)

                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          onClick={() => handleDatePick(day)}
                          className={cn(
                            'h-8 rounded-lg text-xs font-medium',
                            isSelected && 'bg-primary text-primary-foreground',
                            !isSelected && isCurrentDay && 'bg-primary/10 text-primary',
                            !isSelected && !isCurrentDay && 'text-foreground hover:bg-secondary/70',
                            outsideMonth && 'opacity-45',
                          )}
                        >
                          {format(day, 'd')}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-3">
                    <Button type="button" variant="ghost" size="sm" onClick={handleCalendarToday}>
                      {calendarLabels.todayAction}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={handleCalendarClear}>
                      {calendarLabels.clear}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="panel-muted flex items-center gap-3 px-4 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <UserRound className="h-4 w-4" />
              </span>
              <div>
                <p
                  className={cn(
                    'text-[11px] text-muted-foreground',
                    isChinese ? 'locale-chip font-medium' : 'mono uppercase tracking-[0.18em]',
                  )}
                >
                  {t('layout.signedIn')}
                </p>
                <p className="text-sm font-medium text-foreground">{user?.name ?? t('layout.guest')}</p>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 rounded-full">
              <LogOut className="h-4 w-4" />
              {t('layout.logout')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-40 xl:pt-28">
        <div className="mx-auto max-w-[1380px] px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}

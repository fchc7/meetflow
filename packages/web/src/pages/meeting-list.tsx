import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { format, isThisWeek, isToday, parseISO } from 'date-fns'
import { enUS, zhCN as zhDateLocale } from 'date-fns/locale'
import {
  ArrowRight,
  CalendarClock,
  Clock3,
  DoorOpen,
  Orbit,
  Repeat2,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Meeting, Room } from '@meetflow/shared'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getMeetings, getRooms } from '@/services/api'

const STATUS_FILTERS = ['all', 'scheduled', 'completed', 'cancelled'] as const

function getStatusClasses(status: Meeting['status']) {
  if (status === 'scheduled') {
    return 'border border-primary/15 bg-primary/10 text-primary'
  }

  if (status === 'completed') {
    return 'border border-border/80 bg-secondary/70 text-foreground'
  }

  return 'border border-destructive/15 bg-destructive/10 text-destructive'
}

function formatMeetingWindow(startTime: string, endTime: string) {
  return `${format(parseISO(startTime), 'HH:mm')} - ${format(parseISO(endTime), 'HH:mm')}`
}

function toValidFilterDate(raw: string | null) {
  if (!raw) {
    return null
  }

  const parsed = new Date(`${raw}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function MeetingListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t, i18n } = useTranslation()
  const activeLanguage = i18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN'
  const dateLocale = activeLanguage === 'en-US' ? enUS : zhDateLocale
  const clearDateFilterLabel = activeLanguage === 'en-US' ? 'Clear date filter' : '清除日期筛选'
  const dateFilter = searchParams.get('date')
  const selectedFilterDate = useMemo(() => toValidFilterDate(dateFilter), [dateFilter])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const meetingParams = selectedFilterDate && dateFilter ? { date: dateFilter } : undefined

    Promise.all([getMeetings(meetingParams), getRooms()])
      .then(([meetingData, roomData]) => {
        setMeetings(meetingData)
        setRooms(roomData)
      })
      .finally(() => setLoading(false))
  }, [dateFilter])

  function formatDayLabel(iso: string) {
    const date = parseISO(iso)

    if (isToday(date)) {
      return t('meetingList.day.today')
    }

    if (isThisWeek(date)) {
      return format(date, 'EEEE', { locale: dateLocale })
    }

    return format(date, activeLanguage === 'en-US' ? 'MMM d' : 'M月d日', { locale: dateLocale })
  }

  const sortedMeetings = [...meetings].sort(
    (left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime(),
  )
  const filteredMeetings = statusFilter === 'all'
    ? sortedMeetings
    : sortedMeetings.filter((meeting) => meeting.status === statusFilter)
  const todayMeetings = meetings.filter((meeting) => isToday(parseISO(meeting.startTime)))
  const nextMeeting = sortedMeetings.find(
    (meeting) => meeting.status === 'scheduled' && new Date(meeting.endTime) >= new Date(),
  ) ?? sortedMeetings[0]
  const recurringMeetings = meetings.filter((meeting) => meeting.recurrence !== 'none')
  const activeRoomIds = new Set(todayMeetings.map((meeting) => meeting.roomId))
  const roomMap = new Map(rooms.map((room) => [room.id, room]))
  const groupedMeetings = filteredMeetings.reduce<Array<{ label: string; meetings: Meeting[] }>>((groups, meeting) => {
    const label = formatDayLabel(meeting.startTime)
    const existingGroup = groups.find((group) => group.label === label)

    if (existingGroup) {
      existingGroup.meetings.push(meeting)
      return groups
    }

    groups.push({ label, meetings: [meeting] })
    return groups
  }, [])

  const selectedDateLabel = useMemo(() => {
    if (!selectedFilterDate) {
      return ''
    }

    return format(
      selectedFilterDate,
      activeLanguage === 'en-US' ? 'EEE, MMM d, yyyy' : 'yyyy年M月d日 EEE',
      { locale: dateLocale },
    )
  }, [activeLanguage, dateLocale, selectedFilterDate])

  const metrics = [
    {
      label: t('meetingList.metrics.today'),
      value: todayMeetings.length,
      detail: t('meetingList.metrics.todayDetail', { count: todayMeetings.length }),
      icon: CalendarClock,
    },
    {
      label: t('meetingList.metrics.scheduled'),
      value: meetings.filter((meeting) => meeting.status === 'scheduled').length,
      detail: t('meetingList.metrics.scheduledDetail'),
      icon: Clock3,
    },
    {
      label: t('meetingList.metrics.roomsInUse'),
      value: activeRoomIds.size,
      detail: t('meetingList.metrics.roomsDetail'),
      icon: DoorOpen,
    },
    {
      label: t('meetingList.metrics.recurring'),
      value: recurringMeetings.length,
      detail: t('meetingList.metrics.recurringDetail'),
      icon: Repeat2,
    },
  ]

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel grid-lines overflow-hidden px-6 py-6 sm:px-8 sm:py-8">
          <div className="relative z-10 space-y-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <div className="eyebrow">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('meetingList.badge')}
                </div>
                <div className="space-y-3">
                  <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">{t('meetingList.title')}</h1>
                  <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                    {t('meetingList.description')}
                  </p>
                </div>
              </div>

              <Button asChild size="lg" className="shrink-0">
                <Link to="/meetings/new">
                  {t('meetingList.newMeeting')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map(({ label, value, detail, icon: Icon }) => (
                <div key={label} className="panel-muted px-4 py-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {label}
                    </span>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="mono text-3xl font-semibold text-foreground">{value}</p>
                    <p className="text-sm text-muted-foreground">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="panel px-6 py-6">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Orbit className="h-5 w-5" />
              </span>
              <div>
                <p className="mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('meetingList.nextMove')}</p>
                <p className="text-lg font-semibold text-foreground">
                  {nextMeeting ? nextMeeting.title : t('meetingList.noUpcoming')}
                </p>
              </div>
            </div>

            {nextMeeting ? (
              <div className="panel-muted space-y-4 px-4 py-4">
                <div className="space-y-1">
                  <p className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('meetingList.window')}</p>
                  <p className="text-sm font-medium text-foreground">
                    {format(
                      parseISO(nextMeeting.startTime),
                      activeLanguage === 'en-US' ? 'EEE, MMM d' : 'M月d日 EEE',
                      { locale: dateLocale },
                    )} 路 {formatMeetingWindow(nextMeeting.startTime, nextMeeting.endTime)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('meetingList.room')}</p>
                  <p className="text-sm text-foreground">
                    {roomMap.get(nextMeeting.roomId)?.name ?? t('meetingList.roomPending')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/meetings/${nextMeeting.id}`)}
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
                >
                  {t('meetingList.openDetail')}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="panel-muted px-4 py-4 text-sm leading-6 text-muted-foreground">
                {t('meetingList.noAttention')}
              </div>
            )}

            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">{t('meetingList.optimizeTitle')}</p>
              <p>{t('meetingList.optimizeDescription')}</p>
            </div>
          </div>
        </aside>
      </section>

      {selectedFilterDate && (
        <section className="panel px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {activeLanguage === 'en-US'
                ? `Showing meetings on ${selectedDateLabel}`
                : `当前显示 ${selectedDateLabel} 的会议`}
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/')}>
              {clearDateFilterLabel}
            </Button>
          </div>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="space-y-4">
          <div className="panel px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('meetingList.timeline')}</p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">{t('meetingList.flow')}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {STATUS_FILTERS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      'rounded-full px-4 py-2 text-sm font-medium',
                      statusFilter === status
                        ? 'bg-primary text-primary-foreground shadow-[0_10px_20px_hsl(var(--primary)/0.18)]'
                        : 'bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    {t(`meetingList.status.${status}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="panel h-28 animate-pulse bg-card/70" />
              ))}
            </div>
          ) : groupedMeetings.length === 0 ? (
            <div className="panel px-6 py-8 text-sm leading-7 text-muted-foreground">
              {t('meetingList.noMeetings')}
            </div>
          ) : (
            groupedMeetings.map((group) => (
              <section key={group.label} className="space-y-3">
                <div className="flex items-center gap-3 px-2">
                  <span className="mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{group.label}</span>
                  <span className="h-px flex-1 bg-border/60" />
                </div>
                <div className="space-y-3">
                  {group.meetings.map((meeting) => {
                    const room = roomMap.get(meeting.roomId)

                    return (
                      <button
                        key={meeting.id}
                        type="button"
                        onClick={() => navigate(`/meetings/${meeting.id}`)}
                        className="panel flex w-full flex-col gap-4 px-5 py-5 text-left hover:-translate-y-0.5 hover:border-primary/25 sm:flex-row sm:items-start"
                      >
                        <div className="sm:w-28">
                          <p className="mono text-lg font-semibold text-foreground">
                            {format(parseISO(meeting.startTime), 'HH:mm')}
                          </p>
                          <p className="mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            {format(parseISO(meeting.endTime), 'HH:mm')}
                          </p>
                        </div>

                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-xl font-semibold text-foreground">{meeting.title}</h3>
                                {meeting.recurrence !== 'none' && (
                                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                    {t(`createMeeting.recurrenceOptions.${meeting.recurrence}`)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm leading-6 text-muted-foreground">
                                {meeting.description || t('meetingList.noNotes')}
                              </p>
                            </div>

                            <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', getStatusClasses(meeting.status))}>
                              {t(`meetingList.status.${meeting.status}`)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="mono rounded-full bg-secondary/70 px-3 py-1">
                              {formatMeetingWindow(meeting.startTime, meeting.endTime)}
                            </span>
                            <span>{room?.name ?? t('meetingList.roomPending')}</span>
                            <span>{room?.location ?? t('meetingList.locationMissing')}</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        <aside className="space-y-4">
          <div className="panel px-5 py-5">
            <p className="mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('meetingList.roomLoad')}</p>
            <div className="mt-4 space-y-3">
              {rooms.slice(0, 4).map((room) => {
                const roomMeetings = todayMeetings.filter((meeting) => meeting.roomId === room.id)
                return (
                  <div key={room.id} className="panel-muted flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{room.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {roomMeetings.length === 0
                          ? t('meetingList.roomOpen')
                          : t('meetingList.roomUsage', { count: roomMeetings.length })}
                      </p>
                    </div>
                    <span className="mono text-sm text-foreground">{t('meetingList.seatCount', { count: room.capacity })}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="panel px-5 py-5">
            <p className="mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('meetingList.recurringCadence')}</p>
            <div className="mt-4 space-y-3">
              {recurringMeetings.length === 0 ? (
                <div className="panel-muted px-4 py-4 text-sm leading-6 text-muted-foreground">
                  {t('meetingList.noRecurring')}
                </div>
              ) : (
                recurringMeetings.slice(0, 4).map((meeting) => {
                  const recurrenceLabel = t(`createMeeting.recurrenceOptions.${meeting.recurrence}`)
                  const cadenceSuffix = t('meetingList.cadenceSuffix')
                  const cadence = [recurrenceLabel, cadenceSuffix].filter(Boolean).join(' ')

                  return (
                    <div key={meeting.id} className="panel-muted px-4 py-4">
                      <p className="font-medium text-foreground">{meeting.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t('meetingList.recurringLine', {
                          cadence,
                          room: roomMap.get(meeting.roomId)?.name ?? t('meetingList.roomPending'),
                        })}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

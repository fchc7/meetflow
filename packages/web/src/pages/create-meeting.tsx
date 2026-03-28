import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, CalendarRange, Clock3, FileText, Repeat2, Sparkles, UsersRound, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Room } from '@meetflow/shared'
import { useAuth } from '@/hooks/use-auth'
import { PageBackButton } from '@/components/page-back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createMeeting, getRooms, getUsers, type AppUser } from '@/services/api'

const RECURRENCE_VALUES = ['none', 'daily', 'weekly', 'monthly'] as const
const DURATION_PRESETS = [30, 60, 90] as const

function toLocalDateTimeValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function addMinutesToLocalDateTime(value: string, minutes: number) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  date.setMinutes(date.getMinutes() + minutes)
  return toLocalDateTimeValue(date)
}

export function CreateMeetingPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [agenda, setAgenda] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [roomId, setRoomId] = useState('')
  const [recurrence, setRecurrence] = useState<(typeof RECURRENCE_VALUES)[number]>('none')
  const [rooms, setRooms] = useState<Room[]>([])
  const [participants, setParticipants] = useState<AppUser[]>([])
  const [participantIds, setParticipantIds] = useState<string[]>([])
  const [participantPickerValue, setParticipantPickerValue] = useState('')
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [participantError, setParticipantError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const nowLocal = toLocalDateTimeValue(new Date())

  useEffect(() => {
    getRooms().then(setRooms)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoadingParticipants(true)
    setParticipantError('')

    getUsers()
      .then((allUsers) => {
        if (cancelled) {
          return
        }
        setParticipants(allUsers.filter((candidate) => candidate.id !== user?.id))
      })
      .catch((err) => {
        if (cancelled) {
          return
        }
        setParticipantError(err instanceof Error ? err.message : t('createMeeting.participantLoadError'))
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingParticipants(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [t, user?.id])

  const selectedRoom = rooms.find((room) => room.id === roomId) ?? null
  const recurrenceOptions = RECURRENCE_VALUES.map((value) => ({
    value,
    label: t(`createMeeting.recurrenceOptions.${value}`),
  }))
  const isStartInPast = Boolean(startTime) && new Date(startTime).getTime() < Date.now()
  const isEndBeforeStart = Boolean(startTime && endTime) && new Date(endTime).getTime() <= new Date(startTime).getTime()
  const hasInvalidTime = isStartInPast || isEndBeforeStart
  const selectedParticipants = participants.filter((candidate) => participantIds.includes(candidate.id))
  const selectableParticipants = participants.filter((candidate) => !participantIds.includes(candidate.id))

  const handleParticipantAdd = (userId: string) => {
    setParticipantIds((current) => {
      return current.includes(userId) ? current : [...current, userId]
    })
  }

  const handleParticipantRemove = (userId: string) => {
    setParticipantIds((current) => current.filter((id) => id !== userId))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (isStartInPast) {
      setError(t('createMeeting.noPastTime'))
      return
    }

    if (isEndBeforeStart) {
      setError(t('createMeeting.endAfterStart'))
      return
    }

    setSaving(true)

    try {
      await createMeeting({
        title,
        description: description || undefined,
        agenda: agenda || undefined,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        roomId,
        recurrence,
        participantIds,
      })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createMeeting.errorFallback'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageBackButton fallbackTo="/" label={t('navigation.backToMeetings')} />

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel grid-lines px-6 py-6 sm:px-8 sm:py-8">
          <div className="relative z-10 space-y-5">
            <div className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              {t('createMeeting.badge')}
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">{t('createMeeting.title')}</h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                {t('createMeeting.description')}
              </p>
            </div>
          </div>
        </div>

        <aside className="panel px-6 py-6">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CalendarRange className="h-5 w-5" />
              </span>
              <div>
                <p className="mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('createMeeting.preview')}</p>
                <p className="text-lg font-semibold text-foreground">{title || t('createMeeting.untitled')}</p>
              </div>
            </div>

            <div className="panel-muted space-y-4 px-4 py-4">
              <div className="space-y-1">
                <p className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('createMeeting.when')}</p>
                <p className="text-sm font-medium text-foreground">
                  {startTime ? new Date(startTime).toLocaleString(i18n.resolvedLanguage) : t('createMeeting.chooseStart')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {endTime ? new Date(endTime).toLocaleString(i18n.resolvedLanguage) : t('createMeeting.endPreview')}
                </p>
              </div>

              <div className="space-y-1">
                <p className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('createMeeting.room')}</p>
                <p className="text-sm font-medium text-foreground">{selectedRoom?.name ?? t('createMeeting.chooseRoom')}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedRoom?.location ?? t('createMeeting.roomHint')}
                </p>
              </div>

              <div className="space-y-1">
                <p className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('createMeeting.recurrence')}</p>
                <p className="text-sm font-medium text-foreground">
                  {t(`createMeeting.recurrenceOptions.${recurrence}`)}
                </p>
              </div>

              <div className="space-y-1">
                <p className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('createMeeting.participants')}</p>
                <p className="text-sm font-medium text-foreground">
                  {t('createMeeting.participantCount', { count: selectedParticipants.length })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedParticipants.slice(0, 2).map((participant) => participant.name).join('、') || t('createMeeting.participantsEmpty')}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <div className="flex items-start gap-3">
                <Repeat2 className="mt-0.5 h-4 w-4 text-primary" />
                <p>{t('createMeeting.recurrenceHintA')}</p>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 text-primary" />
                <p>{t('createMeeting.recurrenceHintB')}</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="panel px-6 py-6 sm:px-8">
          <div className="space-y-6">
            {error && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">{t('createMeeting.titleLabel')}</Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('createMeeting.titlePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('createMeeting.descriptionLabel')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-28 resize-y"
                placeholder={t('createMeeting.descriptionPlaceholder')}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agenda">{t('createMeeting.agendaLabel')}</Label>
              <Textarea
                id="agenda"
                value={agenda}
                onChange={(event) => setAgenda(event.target.value)}
                className="min-h-40 resize-y"
                placeholder={t('createMeeting.agendaPlaceholder')}
                rows={6}
              />
            </div>
          </div>
        </section>

        <section className="panel px-6 py-6 sm:px-8">
          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">{t('createMeeting.startTime')}</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  min={nowLocal}
                  step={300}
                  onChange={(event) => {
                    const value = event.target.value
                    setStartTime(value)

                    if (!value) {
                      return
                    }

                    if (!endTime || new Date(endTime).getTime() <= new Date(value).getTime()) {
                      setEndTime(addMinutesToLocalDateTime(value, 60))
                    }
                  }}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">{t('createMeeting.endTime')}</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={endTime}
                  min={startTime || nowLocal}
                  step={300}
                  onChange={(event) => setEndTime(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="panel-muted space-y-3 px-4 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="h-4 w-4 text-primary" />
                <p>{t('createMeeting.quickEnd')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setEndTime(addMinutesToLocalDateTime(startTime, minutes))}
                    disabled={!startTime}
                    className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('createMeeting.durationLabel', { count: minutes })}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t('createMeeting.timeHint')}</p>
            </div>

            {hasInvalidTime && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {isStartInPast ? t('createMeeting.noPastTime') : t('createMeeting.endAfterStart')}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="room-trigger">{t('createMeeting.room')}</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger id="room-trigger">
                  <SelectValue placeholder={t('createMeeting.roomPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurrence-trigger">{t('createMeeting.recurrence')}</Label>
              <Select value={recurrence} onValueChange={(value) => setRecurrence(value as (typeof RECURRENCE_VALUES)[number])}>
                <SelectTrigger id="recurrence-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recurrenceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('createMeeting.participants')}</Label>
              <div className="panel-muted space-y-3 px-4 py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UsersRound className="h-4 w-4 text-primary" />
                  <p>{t('createMeeting.participantsHint')}</p>
                </div>

                {loadingParticipants ? (
                  <p className="text-sm text-muted-foreground">{t('createMeeting.participantsLoading')}</p>
                ) : participants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('createMeeting.participantsEmpty')}</p>
                ) : (
                  <div className="space-y-3">
                    <Select
                      value={participantPickerValue}
                      onValueChange={(value) => {
                        setParticipantPickerValue('')
                        handleParticipantAdd(value)
                      }}
                      disabled={selectableParticipants.length === 0}
                    >
                      <SelectTrigger id="participant-trigger">
                        <SelectValue placeholder={t('createMeeting.participantPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableParticipants.map((candidate) => (
                          <SelectItem key={candidate.id} value={candidate.id}>
                            {candidate.name} ({candidate.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectableParticipants.length === 0 && (
                      <p className="text-xs text-muted-foreground">{t('createMeeting.noMoreParticipants')}</p>
                    )}

                    <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                      {selectedParticipants.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('createMeeting.participantsEmpty')}</p>
                      ) : (
                        selectedParticipants.map((participant) => (
                          <div key={participant.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{participant.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{participant.email}</p>
                            </div>
                            <button
                              type="button"
                              className="rounded-full p-1 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                              onClick={() => handleParticipantRemove(participant.id)}
                              aria-label={t('createMeeting.removeParticipant')}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {participantError && <p className="text-xs text-destructive">{participantError}</p>}
            </div>

            <div className="panel-muted space-y-3 px-4 py-4 text-sm leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">{t('createMeeting.nextTitle')}</p>
              <p>{t('createMeeting.nextDescription')}</p>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={saving || !roomId || hasInvalidTime}>
              {saving ? t('createMeeting.submitting') : t('createMeeting.submit')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </form>
    </div>
  )
}

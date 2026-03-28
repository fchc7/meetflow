import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowRight, CalendarRange, Repeat2, Sparkles, UsersRound, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Room } from '@meetflow/shared'
import { useAuth } from '@/hooks/use-auth'
import { PageBackButton } from '@/components/page-back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getMeeting, getRooms, getUsers, updateMeeting, type AppUser } from '@/services/api'

const RECURRENCE_VALUES = ['none', 'daily', 'weekly', 'monthly'] as const

type MeetingDetail = {
  id: string
  title: string
  description?: string | null
  agenda?: string | null
  startTime: string
  endTime: string
  roomId: string
  recurrence: (typeof RECURRENCE_VALUES)[number]
  participants?: Array<{ userId: string }>
}

function toLocalDateTimeValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function isoToLocalDateTimeValue(value: string) {
  return toLocalDateTimeValue(new Date(value))
}

export function EditMeetingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
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
  const [loading, setLoading] = useState(true)
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [error, setError] = useState('')
  const [participantError, setParticipantError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) {
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    Promise.all([getMeeting(id), getRooms()])
      .then(([meetingData, roomData]) => {
        if (cancelled) {
          return
        }

        const meeting = meetingData as MeetingDetail
        setRooms(roomData)
        setTitle(meeting.title)
        setDescription(meeting.description ?? '')
        setAgenda(meeting.agenda ?? '')
        setStartTime(isoToLocalDateTimeValue(meeting.startTime))
        setEndTime(isoToLocalDateTimeValue(meeting.endTime))
        setRoomId(meeting.roomId)
        setRecurrence(meeting.recurrence ?? 'none')
        setParticipantIds(meeting.participants?.map((participant) => participant.userId) ?? [])
      })
      .catch((err) => {
        if (cancelled) {
          return
        }
        setError(err instanceof Error ? err.message : t('editMeeting.loadError'))
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id, t])

  useEffect(() => {
    const canManageParticipants = user?.role === 'admin' || user?.role === 'host'
    if (!canManageParticipants) {
      setParticipants([])
      setParticipantError('')
      return
    }

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
        setParticipantError(err instanceof Error ? err.message : t('editMeeting.participantLoadError'))
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingParticipants(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [t, user?.id, user?.role])

  const isEndBeforeStart = Boolean(startTime && endTime) && new Date(endTime).getTime() <= new Date(startTime).getTime()
  const hasInvalidTime = isEndBeforeStart
  const selectedRoom = rooms.find((room) => room.id === roomId) ?? null
  const selectedParticipants = participants.filter((candidate) => participantIds.includes(candidate.id))
  const selectableParticipants = participants.filter((candidate) => !participantIds.includes(candidate.id))

  const handleParticipantAdd = (userId: string) => {
    setParticipantIds((current) => (current.includes(userId) ? current : [...current, userId]))
  }

  const handleParticipantRemove = (userId: string) => {
    setParticipantIds((current) => current.filter((id) => id !== userId))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!id) {
      return
    }

    setError('')

    if (isEndBeforeStart) {
      setError(t('createMeeting.endAfterStart'))
      return
    }

    setSaving(true)
    try {
      await updateMeeting(id, {
        title,
        description: description || null,
        agenda: agenda || null,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        roomId,
        recurrence,
        participantIds,
      })
      navigate(`/meetings/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('editMeeting.errorFallback'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="panel h-72 animate-pulse bg-card/70" />
  }

  return (
    <div className="space-y-6">
      <PageBackButton fallbackTo={id ? `/meetings/${id}` : '/'} label={t('editMeeting.backToDetail')} />

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel grid-lines px-6 py-6 sm:px-8 sm:py-8">
          <div className="relative z-10 space-y-5">
            <div className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              {t('editMeeting.badge')}
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">{t('editMeeting.title')}</h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                {t('editMeeting.description')}
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
                  {startTime ? new Date(startTime).toLocaleString() : t('createMeeting.chooseStart')}
                </p>
              </div>
              <div className="space-y-1">
                <p className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('createMeeting.room')}</p>
                <p className="text-sm font-medium text-foreground">{selectedRoom?.name ?? t('createMeeting.chooseRoom')}</p>
              </div>
              <div className="space-y-1">
                <p className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('createMeeting.participants')}</p>
                <p className="text-sm font-medium text-foreground">
                  {t('createMeeting.participantCount', { count: selectedParticipants.length })}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <div className="flex items-start gap-3">
                <Repeat2 className="mt-0.5 h-4 w-4 text-primary" />
                <p>{t('editMeeting.hint')}</p>
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
              <Input id="title" type="text" value={title} onChange={(event) => setTitle(event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('createMeeting.descriptionLabel')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-28 resize-y"
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
                  step={300}
                  onChange={(event) => setStartTime(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">{t('createMeeting.endTime')}</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={endTime}
                  min={startTime || undefined}
                  step={300}
                  onChange={(event) => setEndTime(event.target.value)}
                  required
                />
              </div>
            </div>

            {hasInvalidTime && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {t('createMeeting.endAfterStart')}
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
                  {RECURRENCE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`createMeeting.recurrenceOptions.${value}`)}
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

            <Button type="submit" className="w-full gap-2" disabled={saving || !roomId || hasInvalidTime}>
              {saving ? t('editMeeting.submitting') : t('editMeeting.submit')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </form>
    </div>
  )
}

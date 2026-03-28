import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { format, parseISO } from 'date-fns'
import { enUS, zhCN as zhDateLocale } from 'date-fns/locale'
import {
  ArrowRight,
  CalendarRange,
  CircleCheckBig,
  DoorOpen,
  FileText,
  Repeat2,
  UsersRound,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageBackButton } from '@/components/page-back-button'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { cancelMeeting, confirmMeeting, getMeeting, getUsers, updateMeeting, type AppUser } from '@/services/api'
import { useAuth } from '@/hooks/use-auth'

interface MeetingDetail {
  id: string
  title: string
  description?: string
  agenda?: string
  startTime: string
  endTime: string
  roomId: string
  hostId: string
  recurrence: string
  status: 'scheduled' | 'completed' | 'cancelled'
  createdAt: string
  updatedAt: string
  room?: { id: string; name: string; location?: string; capacity: number; equipment: string[]; createdAt: string }
  participants?: { userId: string; name?: string; email?: string; status: 'pending' | 'confirmed' | 'declined' }[]
}

function getStatusClasses(status: MeetingDetail['status']) {
  if (status === 'scheduled') {
    return 'border border-primary/15 bg-primary/10 text-primary'
  }

  if (status === 'completed') {
    return 'border border-border/80 bg-secondary/70 text-foreground'
  }

  return 'border border-destructive/15 bg-destructive/10 text-destructive'
}

export function MeetingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const activeLanguage = i18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN'
  const dateLocale = activeLanguage === 'en-US' ? enUS : zhDateLocale
  const longDateFormat = activeLanguage === 'en-US' ? 'EEE, MMM d' : 'M月d日 EEE'
  const shortDateFormat = activeLanguage === 'en-US' ? 'MMM d, yyyy' : 'yyyy年M月d日'
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null)
  const [allUsers, setAllUsers] = useState<AppUser[]>([])
  const [participantIds, setParticipantIds] = useState<string[]>([])
  const [participantPickerValue, setParticipantPickerValue] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [savingParticipants, setSavingParticipants] = useState(false)
  const [participantError, setParticipantError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) {
      return
    }

    setLoading(true)
    getMeeting(id)
      .then((data) => setMeeting(data as MeetingDetail))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    setParticipantIds(meeting?.participants?.map((participant) => participant.userId) ?? [])
  }, [meeting?.id, meeting?.updatedAt, meeting?.participants])

  useEffect(() => {
    if (!meeting) {
      return
    }

    const canManageParticipants = user?.id === meeting.hostId || user?.role === 'admin'
    if (!canManageParticipants) {
      setAllUsers([])
      setParticipantError('')
      return
    }

    let cancelled = false
    setLoadingUsers(true)
    setParticipantError('')
    getUsers()
      .then((users) => {
        if (cancelled) {
          return
        }
        setAllUsers(users)
      })
      .catch((err) => {
        if (cancelled) {
          return
        }
        setParticipantError(err instanceof Error ? err.message : t('meetingDetail.participantLoadError'))
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingUsers(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [meeting, t, user?.id, user?.role])

  if (loading) {
    return <div className="panel h-72 animate-pulse bg-card/70" />
  }

  if (!meeting) {
    return (
      <div className="panel px-6 py-8 text-sm leading-7 text-muted-foreground">
        {t('meetingDetail.notFound')}
      </div>
    )
  }

  const isHost = user?.id === meeting.hostId || user?.role === 'admin'
  const isParticipant = meeting.participants?.some(
    (participant) => participant.userId === user?.id && participant.status === 'pending',
  )
  const selectedParticipants = allUsers.filter((candidate) => participantIds.includes(candidate.id))
  const selectableParticipants = allUsers.filter((candidate) => !participantIds.includes(candidate.id))

  const handleConfirm = async () => {
    if (!id) {
      return
    }

    setSubmitting(true)
    try {
      await confirmMeeting(id)
      const updated = await getMeeting(id)
      setMeeting(updated as MeetingDetail)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!id) {
      return
    }

    setSubmitting(true)
    try {
      await cancelMeeting(id)
      const updated = await getMeeting(id)
      setMeeting(updated as MeetingDetail)
    } finally {
      setSubmitting(false)
    }
  }

  const handleParticipantAdd = (userId: string) => {
    setParticipantIds((current) => {
      return current.includes(userId) ? current : [...current, userId]
    })
  }

  const handleParticipantRemove = (userId: string) => {
    setParticipantIds((current) => current.filter((id) => id !== userId))
  }

  const handleParticipantsSave = async () => {
    if (!id) {
      return
    }

    setSavingParticipants(true)
    setParticipantError('')
    try {
      await updateMeeting(id, { participantIds })
      const updated = await getMeeting(id)
      setMeeting(updated as MeetingDetail)
    } catch (err) {
      setParticipantError(err instanceof Error ? err.message : t('meetingDetail.participantUpdateError'))
    } finally {
      setSavingParticipants(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageBackButton fallbackTo="/" label={t('navigation.backToMeetings')} />

      <section className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="panel grid-lines overflow-hidden px-6 py-6 sm:px-8 sm:py-8">
          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-4">
                <div className="eyebrow">
                  <CalendarRange className="h-3.5 w-3.5" />
                  {t('meetingDetail.badge')}
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">{meeting.title}</h1>
                    <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', getStatusClasses(meeting.status))}>
                      {t(`meetingDetail.status.${meeting.status}`)}
                    </span>
                  </div>
                  <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                    {meeting.description || t('meetingDetail.descriptionFallback')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isHost && (
                  <>
                    <Button variant="outline" onClick={() => navigate(`/meetings/${id}/edit`)}>
                      {t('meetingDetail.edit')}
                    </Button>
                    <Button variant="destructive" onClick={handleCancel} disabled={submitting || meeting.status === 'cancelled'}>
                      {t('meetingDetail.cancel')}
                    </Button>
                  </>
                )}
                {isParticipant && (
                  <Button onClick={handleConfirm} disabled={submitting}>
                    {t('meetingDetail.confirm')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="panel-muted px-4 py-4">
                <p className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('meetingDetail.window')}</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {format(parseISO(meeting.startTime), longDateFormat, { locale: dateLocale })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(meeting.startTime), 'HH:mm')} - {format(parseISO(meeting.endTime), 'HH:mm')}
                </p>
              </div>

              <div className="panel-muted px-4 py-4">
                <p className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('meetingDetail.room')}</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {meeting.room?.name ?? t('meetingDetail.roomPending')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {meeting.room?.location ?? t('meetingDetail.locationMissing')}
                </p>
              </div>

              <div className="panel-muted px-4 py-4">
                <p className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('meetingDetail.cadence')}</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {meeting.recurrence === 'none'
                    ? t('meetingDetail.cadenceSingle')
                    : t(`createMeeting.recurrenceOptions.${meeting.recurrence}`)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {meeting.recurrence === 'none' ? t('meetingDetail.cadenceSingle') : t('meetingDetail.cadenceRecurring')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="panel px-6 py-6">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CircleCheckBig className="h-5 w-5" />
              </span>
              <div>
                <p className="mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('meetingDetail.readiness')}</p>
                <p className="text-lg font-semibold text-foreground">
                  {meeting.status === 'scheduled' ? t('meetingDetail.ready') : t('meetingDetail.changed')}
                </p>
              </div>
            </div>

            <div className="panel-muted space-y-3 px-4 py-4 text-sm leading-6 text-muted-foreground">
              <p>
                {t('meetingDetail.createdUpdated', {
                  createdAt: format(parseISO(meeting.createdAt), shortDateFormat, { locale: dateLocale }),
                  updatedAt: format(parseISO(meeting.updatedAt), shortDateFormat, { locale: dateLocale }),
                })}
              </p>
              <p>{t('meetingDetail.readinessHint')}</p>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-6">
          <div className="panel px-6 py-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <p className="mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('meetingDetail.agenda')}</p>
                <h2 className="text-xl font-semibold text-foreground">{t('meetingDetail.discussionMap')}</h2>
              </div>
            </div>
            {meeting.agenda ? (
              <pre className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{meeting.agenda}</pre>
            ) : (
              <p className="text-sm leading-7 text-muted-foreground">
                {t('meetingDetail.agendaFallback')}
              </p>
            )}
          </div>

          <div className="panel px-6 py-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <Repeat2 className="h-4 w-4" />
              </span>
              <div>
                <p className="mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('meetingDetail.cadence')}</p>
                <h2 className="text-xl font-semibold text-foreground">{t('meetingDetail.recurringContext')}</h2>
              </div>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              {meeting.recurrence === 'none'
                ? t('meetingDetail.recurringSingle')
                : t('meetingDetail.recurringTemplate', {
                  cadence: t(`createMeeting.recurrenceOptions.${meeting.recurrence}`),
                })}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel px-6 py-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <UsersRound className="h-4 w-4" />
              </span>
              <div>
                <p className="mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('meetingDetail.participants')}</p>
                <h2 className="text-xl font-semibold text-foreground">{t('meetingDetail.attendance')}</h2>
              </div>
            </div>

            {meeting.participants && meeting.participants.length > 0 ? (
              <div className="space-y-3">
                {meeting.participants.map((participant) => (
                  <div key={participant.userId} className="panel-muted flex items-center justify-between gap-3 px-4 py-4">
                    <div>
                      <p className="font-medium text-foreground">
                        {participant.name ?? participant.email ?? participant.userId}
                      </p>
                      <p className="text-sm text-muted-foreground">{participant.email ?? t('meetingDetail.noEmail')}</p>
                    </div>
                    <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', getStatusClasses(
                      participant.status === 'declined'
                        ? 'cancelled'
                        : participant.status === 'confirmed'
                          ? 'completed'
                          : 'scheduled',
                    ))}>
                      {t(`meetingDetail.status.${participant.status}`)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-muted-foreground">
                {t('meetingDetail.noParticipants')}
              </p>
            )}

            {isHost && (
              <div className="mt-5 space-y-3 border-t border-border/70 pt-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{t('meetingDetail.manageParticipants')}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('meetingDetail.manageParticipantsHint')}</p>
                </div>

                {loadingUsers ? (
                  <p className="text-sm text-muted-foreground">{t('meetingDetail.participantsLoading')}</p>
                ) : allUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('meetingDetail.participantDirectoryEmpty')}</p>
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
                      <SelectTrigger id="meeting-participant-trigger">
                        <SelectValue placeholder={t('meetingDetail.participantPlaceholder')} />
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
                      <p className="text-xs text-muted-foreground">{t('meetingDetail.noMoreParticipants')}</p>
                    )}

                    <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                      {selectedParticipants.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('meetingDetail.noParticipants')}</p>
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
                              aria-label={t('meetingDetail.removeParticipant')}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {participantError && (
                  <p className="text-xs text-destructive">{participantError}</p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleParticipantsSave}
                  disabled={loadingUsers || savingParticipants}
                >
                  {savingParticipants ? t('meetingDetail.savingParticipants') : t('meetingDetail.saveParticipants')}
                </Button>
              </div>
            )}
          </div>

          <div className="panel px-6 py-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <DoorOpen className="h-4 w-4" />
              </span>
              <div>
                <p className="mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('meetingDetail.roomProfile')}</p>
                <h2 className="text-xl font-semibold text-foreground">{t('meetingDetail.spaceContext')}</h2>
              </div>
            </div>

            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p><span className="font-medium text-foreground">{t('meetingDetail.room')}:</span> {meeting.room?.name ?? meeting.roomId}</p>
              <p><span className="font-medium text-foreground">{t('meetingDetail.location')}:</span> {meeting.room?.location ?? t('meetingDetail.locationMissing')}</p>
              <p><span className="font-medium text-foreground">{t('meetingDetail.capacity')}:</span> {meeting.room?.capacity ?? t('meetingDetail.capacityUnknown')}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {meeting.room?.equipment && meeting.room.equipment.length > 0 ? (
                  meeting.room.equipment.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-border/70 bg-secondary/70 px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-border/70 bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                    {t('meetingDetail.noEquipment')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

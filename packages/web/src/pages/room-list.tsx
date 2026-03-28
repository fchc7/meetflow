import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Building2, MapPin, MonitorPlay, Sparkles, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Room } from '@meetflow/shared'
import { Button } from '@/components/ui/button'
import { getRooms } from '@/services/api'

export function RoomListPage() {
  const { t } = useTranslation()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRooms()
      .then(setRooms)
      .finally(() => setLoading(false))
  }, [])

  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0)
  const equippedRooms = rooms.filter((room) => room.equipment.length > 0).length
  const largestRoom = rooms.reduce<Room | null>((currentLargest, room) => {
    if (!currentLargest || room.capacity > currentLargest.capacity) {
      return room
    }

    return currentLargest
  }, null)

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="panel h-28 animate-pulse bg-card/70" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel grid-lines overflow-hidden px-6 py-6 sm:px-8 sm:py-8">
          <div className="relative z-10 space-y-5">
            <div className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              {t('rooms.badge')}
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">{t('rooms.title')}</h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                {t('rooms.description')}
              </p>
              <Button asChild className="mt-1">
                <Link to="/rooms/new">{t('rooms.newRoom')}</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <div className="panel px-5 py-5">
            <div className="flex items-center justify-between">
              <p className="mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('rooms.totalRooms')}</p>
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <p className="mono mt-4 text-3xl font-semibold text-foreground">{rooms.length}</p>
          </div>
          <div className="panel px-5 py-5">
            <div className="flex items-center justify-between">
              <p className="mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('rooms.totalSeats')}</p>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="mono mt-4 text-3xl font-semibold text-foreground">{totalCapacity}</p>
          </div>
          <div className="panel px-5 py-5">
            <div className="flex items-center justify-between">
              <p className="mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('rooms.equipped')}</p>
              <MonitorPlay className="h-4 w-4 text-primary" />
            </div>
            <p className="mono mt-4 text-3xl font-semibold text-foreground">{equippedRooms}</p>
          </div>
        </div>
      </section>

      {rooms.length === 0 ? (
        <div className="panel px-6 py-8 text-sm leading-7 text-muted-foreground">
          {t('rooms.empty')}
        </div>
      ) : (
        <div className="grid gap-4">
          {largestRoom && (
            <div className="panel px-5 py-5">
              <p className="mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('rooms.largest')}</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">{largestRoom.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('rooms.largestLine', {
                      location: largestRoom.location || t('rooms.locationMissing'),
                      count: largestRoom.capacity,
                    })}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  {t('rooms.bestForLarge')}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {rooms.map((room) => (
              <div key={room.id} className="panel px-5 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-semibold text-foreground">{room.name}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {room.location || t('rooms.locationMissing')}
                        </span>
                        <span>{t('rooms.capacityValue', { count: room.capacity })}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {room.equipment.length > 0 ? (
                        room.equipment.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-border/70 bg-secondary/70 px-3 py-1 text-xs font-medium text-foreground"
                          >
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full border border-border/70 bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                          {t('rooms.noEquipment')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="panel-muted min-w-[220px] space-y-2 px-4 py-4">
                    <p className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('rooms.atGlance')}</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {room.capacity >= 12 ? t('rooms.largeRoomHint') : t('rooms.smallRoomHint')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

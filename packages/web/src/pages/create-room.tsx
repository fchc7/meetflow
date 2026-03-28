import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, Building2, MapPin, MonitorPlay, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageBackButton } from '@/components/page-back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createRoom } from '@/services/api'

function splitEquipment(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function CreateRoomPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [location, setLocation] = useState('')
  const [equipment, setEquipment] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const equipmentList = splitEquipment(equipment)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (!name.trim()) {
      setError(t('createRoom.errorRequired'))
      return
    }

    const numericCapacity = Number(capacity)
    if (!Number.isFinite(numericCapacity) || numericCapacity <= 0) {
      setError(t('createRoom.errorCapacity'))
      return
    }

    setSaving(true)
    try {
      await createRoom({
        name: name.trim(),
        capacity: numericCapacity,
        location: location.trim() || undefined,
        equipment: equipmentList,
      })
      navigate('/rooms')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createRoom.errorFallback'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageBackButton fallbackTo="/rooms" label={t('navigation.backToRooms')} />

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel grid-lines px-6 py-6 sm:px-8 sm:py-8">
          <div className="relative z-10 space-y-5">
            <div className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              {t('createRoom.badge')}
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">{t('createRoom.title')}</h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                {t('createRoom.description')}
              </p>
            </div>
          </div>
        </div>

        <aside className="panel px-6 py-6">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <p className="mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('createRoom.preview')}</p>
                <p className="text-lg font-semibold text-foreground">{name || t('createRoom.untitled')}</p>
              </div>
            </div>

            <div className="panel-muted space-y-4 px-4 py-4">
              <div className="space-y-1">
                <p className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('createRoom.capacityLabel')}</p>
                <p className="text-sm font-medium text-foreground">
                  {capacity ? t('createRoom.capacityPreview', { count: Number(capacity) || 0 }) : t('createRoom.capacityPlaceholder')}
                </p>
              </div>
              <div className="space-y-1">
                <p className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('createRoom.locationLabel')}</p>
                <p className="text-sm text-foreground">{location || t('createRoom.locationPlaceholder')}</p>
              </div>
              <div className="space-y-1">
                <p className="mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('createRoom.equipmentLabel')}</p>
                <p className="text-sm text-foreground">
                  {equipmentList.length > 0 ? t('createRoom.equipmentPreview', { count: equipmentList.length }) : t('createRoom.noEquipment')}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                <p>{t('createRoom.hintA')}</p>
              </div>
              <div className="flex items-start gap-3">
                <MonitorPlay className="mt-0.5 h-4 w-4 text-primary" />
                <p>{t('createRoom.hintB')}</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <form onSubmit={handleSubmit} className="panel px-6 py-6 sm:px-8">
        <div className="space-y-6">
          {error && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t('createRoom.nameLabel')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('createRoom.namePlaceholder')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">{t('createRoom.capacityLabel')}</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                placeholder={t('createRoom.capacityPlaceholder')}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">{t('createRoom.locationLabel')}</Label>
            <Input
              id="location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder={t('createRoom.locationPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="equipment">{t('createRoom.equipmentLabel')}</Label>
            <Textarea
              id="equipment"
              value={equipment}
              onChange={(event) => setEquipment(event.target.value)}
              className="min-h-28 resize-y"
              placeholder={t('createRoom.equipmentPlaceholder')}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{t('createRoom.equipmentHint')}</p>
          </div>

          <div className="panel-muted space-y-2 px-4 py-4 text-sm leading-6 text-muted-foreground">
            <p className="font-medium text-foreground">{t('createRoom.nextTitle')}</p>
            <p>{t('createRoom.nextDescription')}</p>
          </div>

          <Button type="submit" className="w-full gap-2" disabled={saving}>
            {saving ? t('createRoom.submitting') : t('createRoom.submit')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}

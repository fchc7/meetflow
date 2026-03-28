import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AuthShell } from '@/components/auth-shell'
import { PageBackButton } from '@/components/page-back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('register.mismatch'))
      return
    }

    try {
      await register(name, email, password)
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('register.errorFallback'))
    }
  }

  return (
    <AuthShell
      caption={t('register.caption')}
      title={t('register.title')}
      description={t('register.description')}
    >
      <div className="space-y-4">
        <PageBackButton fallbackTo="/login" label={t('navigation.backToLogin')} />

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">{t('register.name')}</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('register.namePlaceholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('register.email')}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('register.emailPlaceholder')}
              required
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">{t('register.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('register.passwordPlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('register.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t('register.confirmPasswordPlaceholder')}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full gap-2">
            <UserPlus className="h-4 w-4" />
            {t('register.submit')}
            <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="flex items-center justify-between border-t border-border/60 pt-4 text-sm text-muted-foreground">
            <span>{t('register.loginPrompt')}</span>
            <Link to="/login" className="font-medium text-primary hover:text-primary/80">
              {t('register.loginLink')}
            </Link>
          </div>
        </form>
      </div>
    </AuthShell>
  )
}

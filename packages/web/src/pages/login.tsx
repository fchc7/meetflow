import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  if (isAuthenticated) {
    return null
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.errorFallback'))
    }
  }

  return (
    <AuthShell
      caption={t('login.caption')}
      title={t('login.title')}
      description={t('login.description')}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">{t('login.email')}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t('login.emailPlaceholder')}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('login.password')}</Label>
            <span className="text-xs text-muted-foreground">{t('login.passwordHint')}</span>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t('login.passwordPlaceholder')}
            required
          />
        </div>

        <Button type="submit" className="w-full gap-2">
          <KeyRound className="h-4 w-4" />
          {t('login.submit')}
          <ArrowRight className="h-4 w-4" />
        </Button>

        <div className="flex items-center justify-between border-t border-border/60 pt-4 text-sm text-muted-foreground">
          <span>{t('login.registerPrompt')}</span>
          <Link to="/register" className="font-medium text-primary hover:text-primary/80">
            {t('login.registerLink')}
          </Link>
        </div>
      </form>
    </AuthShell>
  )
}

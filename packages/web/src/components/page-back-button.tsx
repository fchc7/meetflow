import { ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PageBackButtonProps = {
  fallbackTo: string
  label?: string
  className?: string
}

export function PageBackButton({ fallbackTo, label, className }: PageBackButtonProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate(fallbackTo, { replace: true })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={cn('w-fit rounded-full border border-border/70 bg-card/65 px-3.5 text-muted-foreground hover:text-foreground', className)}
    >
      <ChevronLeft className="h-4 w-4" />
      {label ?? t('navigation.back')}
    </Button>
  )
}

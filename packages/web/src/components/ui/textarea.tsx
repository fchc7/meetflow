import * as React from 'react'
import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[120px] w-full rounded-2xl border border-input/90 bg-[hsl(var(--surface-quiet)/0.9)] px-4 py-3 text-base shadow-[inset_0_1px_0_hsl(0_0%_100%/0.42)] transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      {...props}
    />
  )
})

Textarea.displayName = 'Textarea'

export { Textarea }

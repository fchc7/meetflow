const DEFAULT_SERIES_LENGTH: Record<'daily' | 'weekly' | 'monthly', number> = {
  daily: 30,
  weekly: 12,
  monthly: 12,
}

type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'

function advanceDate(date: Date, recurrence: Exclude<Recurrence, 'none'>) {
  const next = new Date(date)

  if (recurrence === 'daily') {
    next.setUTCDate(next.getUTCDate() + 1)
    return next
  }

  if (recurrence === 'weekly') {
    next.setUTCDate(next.getUTCDate() + 7)
    return next
  }

  next.setUTCMonth(next.getUTCMonth() + 1)
  return next
}

export function resolveRecurrenceEnd(startTime: string, recurrence: Recurrence, recurrenceEndsAt?: string | null) {
  if (recurrence === 'none') {
    return null
  }

  if (recurrenceEndsAt) {
    return new Date(recurrenceEndsAt)
  }

  let boundary = new Date(startTime)
  for (let index = 1; index < DEFAULT_SERIES_LENGTH[recurrence]; index += 1) {
    boundary = advanceDate(boundary, recurrence)
  }

  return boundary
}

export function generateRecurringOccurrences(input: {
  startTime: string
  endTime: string
  recurrence: Recurrence
  recurrenceEndsAt?: string | null
}) {
  if (input.recurrence === 'none') {
    return { recurrenceEndsAt: null, occurrences: [] as Array<{ startTime: string; endTime: string }> }
  }

  const boundary = resolveRecurrenceEnd(input.startTime, input.recurrence, input.recurrenceEndsAt)
  const occurrences: Array<{ startTime: string; endTime: string }> = []
  let currentStart = new Date(input.startTime)
  let currentEnd = new Date(input.endTime)

  while (boundary) {
    const nextStart = advanceDate(currentStart, input.recurrence)
    const nextEnd = advanceDate(currentEnd, input.recurrence)

    if (nextStart > boundary) {
      break
    }

    occurrences.push({
      startTime: nextStart.toISOString(),
      endTime: nextEnd.toISOString(),
    })

    currentStart = nextStart
    currentEnd = nextEnd
  }

  return {
    recurrenceEndsAt: boundary?.toISOString() ?? null,
    occurrences,
  }
}

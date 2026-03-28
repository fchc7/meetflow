export interface TimeRange {
  start: string
  end: string
}

export function hasTimeConflict(
  existing: TimeRange[],
  incoming: TimeRange,
): boolean {
  const incomingStart = new Date(incoming.start).getTime()
  const incomingEnd = new Date(incoming.end).getTime()

  return existing.some(({ start, end }) => {
    const existingStart = new Date(start).getTime()
    const existingEnd = new Date(end).getTime()
    return existingStart < incomingEnd && existingEnd > incomingStart
  })
}

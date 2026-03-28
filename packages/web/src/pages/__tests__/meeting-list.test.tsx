import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MeetingListPage } from '../meeting-list'
import type { Meeting } from '@meetflow/shared'

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Test', email: 'test@example.com', role: 'host' },
    token: 'token',
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: true,
  }),
}))

const mockMeetings: Meeting[] = [
  {
    id: 'a'.repeat(8) + '-'.repeat(4) + '1111-'.repeat(1) + '2222-'.replace('-', '') + '33333333'.slice(0, 12),
    title: 'Sprint Planning',
    description: 'Plan the sprint',
    agenda: 'Review backlog',
    startTime: '2025-01-15T10:00:00Z',
    endTime: '2025-01-15T11:00:00Z',
    roomId: 'b'.repeat(8) + '-0000-0000-0000-000000000000',
    hostId: '1',
    recurrence: 'none',
    status: 'scheduled',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'c'.repeat(8) + '-0000-0000-0000-000000000001',
    title: 'Daily Standup',
    description: undefined,
    agenda: undefined,
    startTime: '2025-01-15T09:00:00Z',
    endTime: '2025-01-15T09:15:00Z',
    roomId: 'b'.repeat(8) + '-0000-0000-0000-000000000000',
    hostId: '1',
    recurrence: 'daily',
    status: 'completed',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
]

const mockGetMeetings = vi.fn()

vi.mock('@/services/api', () => ({
  getMeetings: (...args: unknown[]) => mockGetMeetings(...args),
}))

describe('MeetingListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders list of meetings', async () => {
    mockGetMeetings.mockResolvedValue(mockMeetings)

    render(<MeetingListPage />)

    expect(await screen.findByText('Sprint Planning')).toBeInTheDocument()
    expect(screen.getByText('Daily Standup')).toBeInTheDocument()
  })

  it('shows meeting titles and status badges', async () => {
    mockGetMeetings.mockResolvedValue(mockMeetings)

    render(<MeetingListPage />)

    expect(await screen.findByText('Sprint Planning')).toBeInTheDocument()
    expect(screen.getAllByText(/scheduled/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0)
  })

  it('can filter by status', async () => {
    mockGetMeetings.mockResolvedValue(mockMeetings)

    render(<MeetingListPage />)

    expect(await screen.findByText('Sprint Planning')).toBeInTheDocument()

    const filterButton = screen.getByRole('button', { name: /scheduled/i })
    await userEvent.setup().click(filterButton)

    expect(mockGetMeetings).toHaveBeenCalled()
  })

  it('shows empty state when no meetings', async () => {
    mockGetMeetings.mockResolvedValue([])

    render(<MeetingListPage />)

    expect(await screen.findByText(/no meetings/i)).toBeInTheDocument()
  })
})

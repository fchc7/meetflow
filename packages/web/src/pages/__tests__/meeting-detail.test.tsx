import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MeetingDetailPage } from '../meeting-detail'

vi.mock('react-router', () => ({
  useParams: () => ({ id: 'meeting-1' }),
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

const mockGetMeeting = vi.fn()
const mockConfirmMeeting = vi.fn()

vi.mock('@/services/api', () => ({
  getMeeting: (...args: unknown[]) => mockGetMeeting(...args),
  confirmMeeting: (...args: unknown[]) => mockConfirmMeeting(...args),
}))

const mockAuthState = {
  user: { id: 'host-1', name: 'Host', email: 'host@example.com', role: 'host' } as Record<string, unknown> | null,
  token: 'token' as string | null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  isAuthenticated: true,
}

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockAuthState,
}))

const baseMeeting = {
  id: 'meeting-1',
  title: 'Team Sync',
  description: 'Weekly team sync meeting',
  agenda: '1. Updates\n2. Blockers',
  startTime: '2025-01-15T10:00:00Z',
  endTime: '2025-01-15T11:00:00Z',
  roomId: 'room-1',
  hostId: 'host-1',
  recurrence: 'none' as const,
  status: 'scheduled' as const,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  room: { id: 'room-1', name: 'Conference A', location: 'Floor 3', capacity: 10, equipment: ['Projector'], createdAt: '2025-01-01T00:00:00Z' },
  participants: [
    { userId: 'host-1', name: 'Alice', email: 'alice@example.com', status: 'confirmed' as const },
    { userId: 'user-2', name: 'Bob', email: 'bob@example.com', status: 'pending' as const },
  ],
}

describe('MeetingDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders meeting details', async () => {
    mockGetMeeting.mockResolvedValue(baseMeeting)

    render(<MeetingDetailPage />)

    expect(await screen.findByText('Team Sync')).toBeInTheDocument()
    expect(screen.getByText('Weekly team sync meeting')).toBeInTheDocument()
    expect(screen.getByText(/conference a/i)).toBeInTheDocument()
  })

  it('shows participants', async () => {
    mockGetMeeting.mockResolvedValue(baseMeeting)

    render(<MeetingDetailPage />)

    expect(await screen.findByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('shows action buttons for host', async () => {
    mockGetMeeting.mockResolvedValue(baseMeeting)

    render(<MeetingDetailPage />)

    expect(await screen.findByText(/edit/i)).toBeInTheDocument()
    expect(screen.getByText(/cancel/i)).toBeInTheDocument()
  })

  it('shows confirm button for participant', async () => {
    mockGetMeeting.mockResolvedValue(baseMeeting)
    mockAuthState.user = { id: 'user-2', name: 'Bob', email: 'bob@example.com', role: 'participant' }

    render(<MeetingDetailPage />)

    expect(await screen.findByText(/confirm attendance/i)).toBeInTheDocument()

    mockAuthState.user = { id: 'host-1', name: 'Host', email: 'host@example.com', role: 'host' }
  })
})

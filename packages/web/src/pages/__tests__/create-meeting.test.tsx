import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { CreateMeetingPage } from '../create-meeting'

const mockNavigate = vi.fn()

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'host-1', name: 'Host', email: 'host@example.com', role: 'host' },
    token: 'token',
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: true,
  }),
}))

const mockCreateMeeting = vi.fn()
const mockGetRooms = vi.fn()

vi.mock('@/services/api', () => ({
  createMeeting: (...args: unknown[]) => mockCreateMeeting(...args),
  getRooms: (...args: unknown[]) => mockGetRooms(...args),
}))

const mockRooms = [
  { id: 'room-1', name: 'Conference A', location: 'Floor 3', capacity: 10, equipment: [], createdAt: '2025-01-01T00:00:00Z' },
  { id: 'room-2', name: 'Board Room', location: 'Floor 5', capacity: 20, equipment: [], createdAt: '2025-01-01T00:00:00Z' },
]

describe('CreateMeetingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRooms.mockResolvedValue(mockRooms)
  })

  it('renders form fields', async () => {
    render(<CreateMeetingPage />)

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument()
  })

  it('submits with valid data', async () => {
    mockCreateMeeting.mockResolvedValue({ id: 'new-meeting-1' })

    const { container } = render(<CreateMeetingPage />)

    await screen.findAllByText(/conference a|board room/i)

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'New Meeting' } })
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '2025-01-20T10:00' } })
    fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '2025-01-20T11:00' } })

    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => {
      expect(mockCreateMeeting).toHaveBeenCalled()
    })
  })

  it('shows error on conflict', async () => {
    mockCreateMeeting.mockRejectedValue(new Error('Time conflict detected'))

    const { container } = render(<CreateMeetingPage />)

    await screen.findAllByText(/conference a|board room/i)

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Conflicting Meeting' } })
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '2025-01-20T10:00' } })
    fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '2025-01-20T11:00' } })

    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => {
      expect(screen.getByText(/time conflict/i)).toBeInTheDocument()
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoomListPage } from '../room-list'
import type { Room } from '@meetflow/shared'

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

const mockRooms: Room[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Conference Room A',
    location: 'Building 1, Floor 3',
    capacity: 10,
    equipment: ['Projector', 'Whiteboard'],
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Board Room',
    location: 'Building 2, Floor 5',
    capacity: 20,
    equipment: ['Video Conference', 'Whiteboard', 'Projector'],
    createdAt: '2025-01-01T00:00:00Z',
  },
]

const mockGetRooms = vi.fn()

vi.mock('@/services/api', () => ({
  getRooms: (...args: unknown[]) => mockGetRooms(...args),
}))

describe('RoomListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders room list', async () => {
    mockGetRooms.mockResolvedValue(mockRooms)

    render(<RoomListPage />)

    expect(await screen.findByText('Conference Room A')).toBeInTheDocument()
    expect(screen.getByText('Board Room')).toBeInTheDocument()
  })

  it('shows room names and capacities', async () => {
    mockGetRooms.mockResolvedValue(mockRooms)

    render(<RoomListPage />)

    expect(await screen.findByText('Conference Room A')).toBeInTheDocument()
    expect(screen.getByText(/capacity.*10/i)).toBeInTheDocument()
    expect(screen.getByText(/capacity.*20/i)).toBeInTheDocument()
  })

  it('shows empty state', async () => {
    mockGetRooms.mockResolvedValue([])

    render(<RoomListPage />)

    expect(await screen.findByText(/no rooms/i)).toBeInTheDocument()
  })
})

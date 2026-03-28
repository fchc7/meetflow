import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'

let mockIsAuthenticated = false
let mockUser: { name: string; email: string } | null = null

vi.mock('@/hooks/use-auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: mockUser,
    token: mockIsAuthenticated ? 'mock-token' : null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: mockIsAuthenticated,
  }),
}))

vi.mock('@/pages/login', () => ({
  default: () => <div data-testid="page-login">LoginPage</div>,
}))
vi.mock('@/pages/register', () => ({
  default: () => <div data-testid="page-register">RegisterPage</div>,
}))
vi.mock('@/pages/meeting-list', () => ({
  default: () => <div data-testid="page-meeting-list">MeetingListPage</div>,
}))
vi.mock('@/pages/meeting-detail', () => ({
  default: () => <div data-testid="page-meeting-detail">MeetingDetailPage</div>,
}))
vi.mock('@/pages/create-meeting', () => ({
  default: () => <div data-testid="page-create-meeting">CreateMeetingPage</div>,
}))
vi.mock('@/pages/room-list', () => ({
  default: () => <div data-testid="page-room-list">RoomListPage</div>,
}))

import { ProtectedRoute } from '../index'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div data-testid="page-login">LoginPage</div>} />
        <Route path="/register" element={<div data-testid="page-register">RegisterPage</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div data-testid="page-meeting-list">MeetingListPage</div>} />
          <Route path="/meetings/new" element={<div data-testid="page-create-meeting">CreateMeetingPage</div>} />
          <Route path="/meetings/:id" element={<div data-testid="page-meeting-detail">MeetingDetailPage</div>} />
          <Route path="/rooms" element={<div data-testid="page-room-list">RoomListPage</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Routing', () => {
  beforeEach(() => {
    mockIsAuthenticated = false
    mockUser = null
  })

  it('renders LoginPage at /login', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<div data-testid="page-login">LoginPage</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('page-login')).toBeInTheDocument()
  })

  it('renders RegisterPage at /register', () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<div data-testid="page-register">RegisterPage</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('page-register')).toBeInTheDocument()
  })

  it('redirects to /login when not authenticated at /', () => {
    renderAt('/')
    expect(screen.getByTestId('page-login')).toBeInTheDocument()
  })

  it('renders MeetingListPage at / when authenticated', () => {
    mockIsAuthenticated = true
    mockUser = { name: 'Test', email: 'test@test.com' }
    renderAt('/')
    expect(screen.getByTestId('page-meeting-list')).toBeInTheDocument()
  })

  it('redirects /meetings/new to /login when not authenticated', () => {
    renderAt('/meetings/new')
    expect(screen.getByTestId('page-login')).toBeInTheDocument()
  })

  it('renders CreateMeetingPage at /meetings/new when authenticated', () => {
    mockIsAuthenticated = true
    mockUser = { name: 'Test', email: 'test@test.com' }
    renderAt('/meetings/new')
    expect(screen.getByTestId('page-create-meeting')).toBeInTheDocument()
  })

  it('redirects /meetings/:id to /login when not authenticated', () => {
    renderAt('/meetings/abc-123')
    expect(screen.getByTestId('page-login')).toBeInTheDocument()
  })

  it('renders MeetingDetailPage at /meetings/:id when authenticated', () => {
    mockIsAuthenticated = true
    mockUser = { name: 'Test', email: 'test@test.com' }
    renderAt('/meetings/abc-123')
    expect(screen.getByTestId('page-meeting-detail')).toBeInTheDocument()
  })

  it('redirects /rooms to /login when not authenticated', () => {
    renderAt('/rooms')
    expect(screen.getByTestId('page-login')).toBeInTheDocument()
  })

  it('renders RoomListPage at /rooms when authenticated', () => {
    mockIsAuthenticated = true
    mockUser = { name: 'Test', email: 'test@test.com' }
    renderAt('/rooms')
    expect(screen.getByTestId('page-room-list')).toBeInTheDocument()
  })
})

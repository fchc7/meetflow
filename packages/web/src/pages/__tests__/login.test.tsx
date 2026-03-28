import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from '../login'

const mockNavigate = vi.fn()

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

const mockLogin = vi.fn()

const mockAuthState = {
  user: null as Record<string, unknown> | null,
  token: null as string | null,
  login: mockLogin,
  register: vi.fn(),
  logout: vi.fn(),
  isAuthenticated: false,
}

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockAuthState,
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email and password inputs', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in|sign in|login/i })).toBeInTheDocument()
  })

  it('submits form and calls login', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue(undefined)

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /log in|sign in|login/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('shows error on failed login', async () => {
    const user = userEvent.setup()
    mockLogin.mockRejectedValue(new Error('Invalid credentials'))

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'bad@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /log in|sign in|login/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('shows link to register page', () => {
    render(<LoginPage />)
    const link = screen.getByRole('link', { name: /register|sign up/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/register')
  })

  it('redirects to / if already authenticated', () => {
    mockAuthState.isAuthenticated = true
    mockAuthState.user = { id: '1', name: 'Test', email: 'test@example.com', role: 'participant' }
    mockAuthState.token = 'token'

    render(<LoginPage />)
    expect(mockNavigate).toHaveBeenCalledWith('/')

    mockAuthState.isAuthenticated = false
    mockAuthState.user = null
    mockAuthState.token = null
  })
})

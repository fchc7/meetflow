import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import { type ReactNode } from 'react'

import { AuthProvider, useAuth } from '@/hooks/use-auth'
import * as api from '@/services/api'

vi.mock('@/services/api', () => ({
  register: vi.fn(),
  login: vi.fn(),
}))

function renderWithProvider(ui: ReactNode) {
  return render(<AuthProvider>{ui}</AuthProvider>)
}

function TestConsumer() {
  const auth = useAuth()
  return (
    <div>
      <span data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</span>
      <span data-testid="token">{auth.token ?? 'null'}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <button
        data-testid="login-btn"
        onClick={() => auth.login('a@b.c', 'pass')}
      />
      <button
        data-testid="register-btn"
        onClick={() => auth.register('Test', 'a@b.c', 'pass')}
      />
      <button data-testid="logout-btn" onClick={() => auth.logout()} />
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(api.login).mockReset()
  vi.mocked(api.register).mockReset()
})

describe('AuthProvider', () => {
  it('initial state: no user, not authenticated', () => {
    const { getByTestId } = renderWithProvider(<TestConsumer />)

    expect(getByTestId('user').textContent).toBe('null')
    expect(getByTestId('token').textContent).toBe('null')
    expect(getByTestId('authenticated').textContent).toBe('false')
  })

  it('restores token from localStorage on mount', () => {
    const storedUser = { id: '1', name: 'Stored', email: 'a@b.c' }
    localStorage.setItem('token', 'stored-token')
    localStorage.setItem('user', JSON.stringify(storedUser))

    const { getByTestId } = renderWithProvider(<TestConsumer />)

    expect(getByTestId('token').textContent).toBe('stored-token')
    expect(getByTestId('authenticated').textContent).toBe('true')
  })

  it('login: calls API, sets user + token', async () => {
    const mockUser = { id: '1', name: 'Test', email: 'a@b.c' }
    vi.mocked(api.login).mockResolvedValue({
      token: 'jwt-abc',
      user: mockUser,
    })

    const { getByTestId } = renderWithProvider(<TestConsumer />)

    await act(async () => {
      getByTestId('login-btn').click()
    })

    expect(api.login).toHaveBeenCalledWith({ email: 'a@b.c', password: 'pass' })
    await waitFor(() => {
      expect(getByTestId('token').textContent).toBe('jwt-abc')
      expect(getByTestId('user').textContent).toBe(JSON.stringify(mockUser))
      expect(getByTestId('authenticated').textContent).toBe('true')
    })
    expect(localStorage.getItem('token')).toBe('jwt-abc')
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(mockUser)
  })

  it('register: calls API, sets user + token', async () => {
    const mockUser = { id: '2', name: 'New', email: 'new@b.c' }
    vi.mocked(api.register).mockResolvedValue({
      user: mockUser,
      token: 'jwt-reg',
    } as never)

    const { getByTestId } = renderWithProvider(<TestConsumer />)

    await act(async () => {
      getByTestId('register-btn').click()
    })

    expect(api.register).toHaveBeenCalledWith({ name: 'Test', email: 'a@b.c', password: 'pass' })
    await waitFor(() => {
      expect(getByTestId('token').textContent).toBe('jwt-reg')
      expect(getByTestId('authenticated').textContent).toBe('true')
    })
    expect(localStorage.getItem('token')).toBe('jwt-reg')
  })

  it('logout: clears user + token', async () => {
    localStorage.setItem('token', 'old')
    localStorage.setItem('user', JSON.stringify({ id: '1' }))

    const { getByTestId } = renderWithProvider(<TestConsumer />)

    await act(async () => {
      getByTestId('logout-btn').click()
    })

    expect(getByTestId('user').textContent).toBe('null')
    expect(getByTestId('token').textContent).toBe('null')
    expect(getByTestId('authenticated').textContent).toBe('false')
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })

  it('useAuth throws when used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow()
    spy.mockRestore()
  })
})

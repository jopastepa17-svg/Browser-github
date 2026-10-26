import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('VYORA workspace', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the private workspace and active conversation', () => {
    render(<App />)

    expect(screen.getByText('Messages')).toBeInTheDocument()
    expect(screen.getAllByText('Nova Labs').length).toBeGreaterThan(0)
    expect(screen.getByPlaceholderText('Write something thoughtful…')).toBeInTheDocument()
  })

  it('sends a message and keeps it visible in the selected chat', () => {
    render(<App />)
    const composer = screen.getByPlaceholderText('Write something thoughtful…')

    fireEvent.change(composer, { target: { value: 'A small test message' } })
    fireEvent.keyDown(composer, { key: 'Enter', code: 'Enter' })

    expect(screen.getAllByText('A small test message').length).toBeGreaterThan(0)
    expect(composer).toHaveValue('')
  })

  it('switches to contacts and opens the add contact dialog', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Contacts' }))

    expect(screen.getByText('Good conversations')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Add contact/i }))

    expect(screen.getByRole('dialog', { name: 'Add a contact' })).toBeInTheDocument()
  })

  it('persists the selected theme setting', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: /Switch to light theme/i }))

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
    expect(localStorage.getItem('vyora-workspace-v1')).toContain('"theme":"light"')
  })

  it('creates a new conversation from the compose action', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start a new chat' }))
    fireEvent.change(screen.getByPlaceholderText('e.g. Elena Voss'), { target: { value: 'Sunday orbit' } })
    fireEvent.click(screen.getByRole('button', { name: /Create conversation/i }))

    expect(screen.getAllByText('Sunday orbit').length).toBeGreaterThan(0)
    expect(screen.getByPlaceholderText('Write something thoughtful…')).toBeInTheDocument()
  })

  it('returns to the auth surface after sign out and can sign in again', () => {
    render(<App />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Open profile' })[0])
    fireEvent.click(screen.getByRole('button', { name: /Sign out/i }))

    expect(screen.getByText('Sign in to your private VYORA space.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enter VYORA' }))

    expect(screen.getByText('Messages')).toBeInTheDocument()
  })
})

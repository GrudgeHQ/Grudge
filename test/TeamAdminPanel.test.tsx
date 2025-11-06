import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { act } from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import TeamAdminPanel from '../app/components/TeamAdminPanel'

describe('TeamAdminPanel', () => {
  beforeEach(() => {
    // reset global mocks
    ;(global as any).fetch = vi.fn(() => Promise.resolve({ ok: true }))
  })

  it('prompts before removing a member and calls DELETE', async () => {
    const members = [
      { id: 'm1', userId: 'u1', user: { name: 'Alice', email: 'a@x.com' }, isAdmin: true, role: 'member' },
      { id: 'm2', userId: 'u2', user: { name: 'Bob', email: 'b@x.com' }, isAdmin: false, role: 'member' },
    ]

    render(<TeamAdminPanel teamId="t1" members={members} />)

    const removeButtons = screen.getAllByText('Remove')
    expect(removeButtons.length).toBeGreaterThan(0)

    // click remove -> modal should open
    await act(async () => {
      fireEvent.click(removeButtons[0])
    })
    expect(await screen.findByText('Remove member')).toBeDefined()

    // click confirm in modal
    const confirmBtn = screen.getByText('Confirm')
    await act(async () => {
      fireEvent.click(confirmBtn)
    })

    // fetch should be called (DELETE)
  expect((global as any).fetch).toHaveBeenCalled()
  const calledUrl = (global as any).fetch.mock.calls[0][0]
  expect(calledUrl).toContain('/api/teams/t1/members/')
  })

  it('demote flow opens modal and posts', async () => {
    const members = [
      { id: 'm1', userId: 'u1', user: { name: 'Alice', email: 'a@x.com' }, isAdmin: true, role: 'member' },
      { id: 'm2', userId: 'u2', user: { name: 'Bob', email: 'b@x.com' }, isAdmin: false, role: 'member' },
    ]
    render(<TeamAdminPanel teamId="t1" members={members} />)
    const demoteBtn = screen.getByText('Demote')
    await act(async () => {
      fireEvent.click(demoteBtn)
    })
    expect(await screen.findByText('Demote member')).toBeDefined()
    await act(async () => {
      fireEvent.click(screen.getByText('Confirm'))
    })
    expect((global as any).fetch).toHaveBeenCalled()
    const calledUrl = (global as any).fetch.mock.calls[0][0]
    expect(calledUrl.includes('/api/teams/t1/members/') || calledUrl.includes('/api/teams/t1/demote')).toBeTruthy()
  })

  it('relinquish flow opens modal and posts', async () => {
    const members = [
      { id: 'm1', userId: 'u1', user: { name: 'Alice', email: 'a@x.com' }, isAdmin: true, role: 'member' },
      { id: 'm2', userId: 'u2', user: { name: 'Bob', email: 'b@x.com' }, isAdmin: false, role: 'member' },
    ]
    render(<TeamAdminPanel teamId="t1" members={members} />)
    const transferSelect = screen.getByRole('combobox')
    await act(async () => {
      fireEvent.change(transferSelect, { target: { value: 'm2' } })
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Transfer & Relinquish'))
    })
    expect(await screen.findByText('Relinquish admin')).toBeDefined()
    await act(async () => {
      fireEvent.click(screen.getByText('Confirm'))
    })
    expect((global as any).fetch).toHaveBeenCalled()
  })
})

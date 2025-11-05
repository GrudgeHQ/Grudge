import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock pusher-js to simulate presence and events
vi.mock('pusher-js', () => {
  // simple in-memory channel implementation
  class Channel {
    bindings: Record<string, Array<(...args: any[]) => void>> = {}
    bind(event: string, cb: (...args: any[]) => void) {
      this.bindings[event] = this.bindings[event] || []
      this.bindings[event].push(cb)
    }
    unbind_all() { this.bindings = {} }
    trigger(event: string, data: any) {
      const cbs = this.bindings[event] || []
      for (const cb of cbs) cb(data)
    }
  }

  const globalAny: any = globalThis
  globalAny.__pusherMock = { channels: {} }

  return {
    default: class Pusher {
      key: string
      opts: any
      constructor(key: string, opts?: any) { this.key = key; this.opts = opts }
      subscribe(name: string) {
        const ch = globalAny.__pusherMock.channels[name] ?? (globalAny.__pusherMock.channels[name] = new Channel())
        return ch
      }
      unsubscribe(name: string) {
        delete globalAny.__pusherMock.channels[name]
      }
      disconnect() {}
      connection = { bind: (_: any) => {}, unbind: (_: any) => {} }
    }
  }
})

import TeamChatClient from '../app/components/TeamChatClient'

beforeEach(() => {
  process.env.NEXT_PUBLIC_PUSHER_KEY = 'testkey'
  process.env.NEXT_PUBLIC_PUSHER_CLUSTER = 'mt1'
  ;(global as any).fetch = vi.fn((url?: string, opts?: any) => {
    if (url && url.toString().endsWith('/chat') && (!opts || opts.method === 'GET')) {
      return Promise.resolve({ ok: true, json: async () => ({ messages: [{ id: 'm1', content: 'hello' }] }) })
    }
    if (url && url.toString().endsWith('/chat') && opts && opts.method === 'POST') {
      return Promise.resolve({ ok: true, json: async () => ({ message: { id: 'm2', content: JSON.parse(opts.body).content } }) })
    }
    return Promise.resolve({ ok: false })
  })
})

describe('TeamChatClient presence and messaging', () => {
  it('shows initial messages and presence events', async () => {
    render(<TeamChatClient teamId="t1" />)

    // initial message loaded from GET
    expect(await screen.findByText(/hello/)).toBeDefined()

    const globalAny: any = globalThis
    const ch = globalAny.__pusherMock.channels['presence-team-t1']
    expect(ch).toBeDefined()

    // simulate subscription succeeded with one member
    ch.trigger('pusher:subscription_succeeded', { members: { 'u1': { user_id: 'u1', user_info: { name: 'Alice' } } } })
    await waitFor(() => screen.getByText(/Online: Alice/))

    // simulate a member joining
    ch.trigger('pusher:member_added', { user_id: 'u2', user_info: { name: 'Bob' } })
    await waitFor(() => screen.getByText(/Joined:/))

    // simulate a member leaving
    ch.trigger('pusher:member_removed', { user_id: 'u2', user_info: { name: 'Bob' } })
    await waitFor(() => screen.getByText(/Left:/))
  })

  it('sends a message via POST and clears input', async () => {
    render(<TeamChatClient teamId="t1" />)
    expect(await screen.findByText(/hello/)).toBeDefined()

    const input = screen.getByPlaceholderText('Message...') as HTMLInputElement
    const sendBtn = screen.getByText('Send')

    await waitFor(() => {
      fireEvent.change(input, { target: { value: 'hi there' } })
      fireEvent.click(sendBtn)
    })

    // POST should have been called
    expect((global as any).fetch).toHaveBeenCalled()
    // input cleared
    await waitFor(() => expect(input.value).toBe(''))
  })
})

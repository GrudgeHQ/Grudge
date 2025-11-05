import Pusher from 'pusher'

const appId = process.env.PUSHER_APP_ID
const key = process.env.PUSHER_KEY
const secret = process.env.PUSHER_SECRET
const cluster = process.env.PUSHER_CLUSTER

let pusher: Pusher | null = null
if (appId && key && secret) {
  const opts: any = { appId, key, secret, useTLS: true }
  if (cluster) opts.cluster = cluster
  pusher = new Pusher(opts)
}

export async function trigger(teamId: string | null, event: string, payload: any) {
  if (!pusher) return
  const privateChannel = teamId ? `private-team-${teamId}` : 'private-global'
  const presenceChannel = teamId ? `presence-team-${teamId}` : 'presence-global'
  try {
    // broadcast to both private and presence subscribers so all realtime clients receive events
    await pusher.trigger(privateChannel, event, payload)
    await pusher.trigger(presenceChannel, event, payload)
  } catch (e) {
    // non-fatal for PoC
    console.error('Realtime trigger failed', e)
  }
}

export function signSocketAuth(socketId: string, channel: string, userData?: any) {
  if (!pusher) return null
  // for presence channels, include user info
  if (channel.startsWith('presence-')) {
    return (pusher as any).authenticate(socketId, channel, userData)
  }
  return (pusher as any).authenticate(socketId, channel)
}

export default pusher

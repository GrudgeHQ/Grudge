import Pusher from 'pusher'

const appId = process.env.PUSHER_APP_ID
const key = process.env.PUSHER_KEY
const secret = process.env.PUSHER_SECRET
const cluster = process.env.PUSHER_CLUSTER

let pusher: Pusher | null = null
if (appId && key && secret) {
  // Pusher.Options requires 'host' for HostOptions, but if not using a custom host, use default
  const opts: Pusher.Options = {
    appId,
    key,
    secret,
    useTLS: true,
    host: 'api.pusherapp.com', // default host for Pusher
  }
  pusher = new Pusher(opts)
}

async function trigger(teamId: string | null, event: string, payload: Record<string, unknown>) {
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

function signSocketAuth(socketId: string, channel: string, userData?: Record<string, unknown>) {
  if (!pusher) return null
  // for presence channels, include user info
  if (channel.startsWith('presence-')) {
    // PresenceChannelData requires 'user_id' property
    const presenceData = userData && typeof userData.user_id === 'string'
      ? userData as { user_id: string; [key: string]: unknown }
      : { user_id: 'unknown' }
    return pusher.authenticate(socketId, channel, presenceData)
  }
  return pusher.authenticate(socketId, channel)
}

export { trigger, signSocketAuth }
export default pusher

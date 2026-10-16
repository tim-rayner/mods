// speakup: built on read-along by Yotam (https://github.com/tomfluff/claude-read-along, MIT).
import { atom, read, update } from 'claude-code'
import type { ConfigRow, EngineInterface, Register } from 'claude-code'

const voiceOn = atom({ plugin: 'speakup', key: 'voiceOn' } as const, false)

/** Runs `/read-along <args>` once the calling command has returned (a command.run hook can't await another command: it would wait on itself), then `after`. */
const readAlong = ($: EngineInterface, runs: string[], after?: () => Promise<unknown>) =>
  $.clock.after(0, async () => {
    for (const args of runs) await $.command.run({ command: 'read-along', args })
    await after?.()
  })

/** The voice speakup sets up: Kokoro's af_aoede, at 0.9×. */
export const VOICE = 'main=kokoro:af_aoede, auto'
export const SPEED = 0.9

/** read-along's `/config` row for one of its options. */
const readAlongRow = (rows: readonly ConfigRow[], field: string) =>
  rows.find(r => r.provider.plugin === 'read-along' && r.key.endsWith(`.${field}`))

/**
 * Keeps read-along's auto-read off at the start of every session (/voice turns it on),
 * and gives it speakup's voice and speed once, the first time both are there to set.
 */
async function setUpReadAlong($: EngineInterface) {
  const rows = await $.config.list()
  const set = async (field: string, value: string | number) => {
    const row = readAlongRow(rows, field)
    if (row && row.value !== value) await $.config.set({ key: row.key, value })
  }
  await set('autoReadReplies', 'off')
  if (!(await $.store.get('voiceApplied')) && readAlongRow(rows, 'voices')) {
    await set('voices', VOICE)
    await set('speed', SPEED)
    await $.store.set('voiceApplied', true)
  }
}

/** read-along's `voices` option, `main=aoede, auto; ja=…`, as the first voice of each group: adapted from read-along's `parseVoices` (MIT, © Yotam). */
const firstVoices = (option: string) => {
  const out: Record<string, string> = {}
  for (const part of option.split(';')) {
    const m = part.match(/^\s*([a-z]{2,4})\s*=(.*)$/)
    const first = (m?.[2] ?? part).split(',').map(v => v.trim()).find(Boolean)
    if (first) out[m?.[1] ?? 'main'] = first
  }
  return out
}

/** read-along's speech service socket. */
const socketPath = async ($: EngineInterface) => `/tmp/read-along-${(await $.env.get('USER')) ?? 'user'}.sock`

/**
 * Says `text` in read-along's voice, through its speech service (the socket its
 * mod starts at session start); in the system voice where that service can't be reached.
 */
async function sayAloud($: EngineInterface, text: string) {
  try {
    const rows = await $.config.list()
    const option = (field: string) => readAlongRow(rows, field)?.value
    const voices = option('voices')
    const speed = Number(option('speed'))
    const volume = Number(option('volume'))
    const res = await $.http.fetch('http://speakd/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        key: 'voice-mod',
        label: 'voice',
        mode: 'now',
        voices: typeof voices === 'string' ? firstVoices(voices) : { main: 'auto' },
        speed: Number.isFinite(speed) && speed > 0 ? speed : 1,
        volume: Number.isFinite(volume) ? volume / 100 : 1,
      }),
      socketPath: await socketPath($),
    })
    if (!res.ok) throw new Error(`speech service answered ${res.status}`)
  } catch {
    await $.audio.speak(text).catch(() => {})
  }
}

/** Whether Kokoro is installed, as read-along's speech service reports it; undefined where the service can't be reached. */
async function hasKokoro($: EngineInterface): Promise<boolean | undefined> {
  try {
    const res = await $.http.fetch('http://speakd/info', { socketPath: await socketPath($) })
    if (!res.ok) return undefined
    const info = JSON.parse(res.text) as { engines?: { name: string; ok: boolean }[] }
    return info.engines?.some(e => e.name === 'kokoro' && e.ok) ?? undefined
  } catch {
    return undefined
  }
}

/** The request `/voice setup` puts in the prompt box: Claude installs Kokoro with read-along's setup skill, which asks before downloading. */
export const KOKORO_SETUP_PROMPT =
  'Set up Kokoro-82M, the recommended voice for the speakup mod (about 1 GB): check this machine with /read-along doctor, then install Kokoro with the read-along plugin\'s setup skill.'

/** Puts the Kokoro setup request in the prompt box: in place of the draft, or only into an empty box where `onlyIfEmpty`. */
async function fillKokoroSetup($: EngineInterface, onlyIfEmpty = false) {
  if (onlyIfEmpty && (await $.prompt.read()).text.trim()) return false
  return (await $.prompt.fill({ text: KOKORO_SETUP_PROMPT })).isFilled
}

/**
 * Offers Kokoro once, the first time the voice comes on without it: the setup
 * request in an empty prompt box (Enter sends it), or a pointer to `/voice setup`.
 */
async function offerKokoro($: EngineInterface) {
  if (await $.store.get('kokoroOffered')) return
  if ((await hasKokoro($)) !== false) return // installed, or the service can't say
  await $.store.set('kokoroOffered', true)
  const filled = await fillKokoroSetup($, true).catch(() => false)
  $.ui.toast(
    filled
      ? 'Using a system voice. For Kokoro-82M, the natural one (about 1 GB): press Enter to set it up.'
      : 'Using a system voice. For Kokoro-82M, the natural one (about 1 GB): type /voice setup.',
    { timeoutMs: 10000 },
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'v',
      description: 'Alias for /read-along: read | stop | pause | speed N | …',
      argumentHint: '[read|stop|pause|speed N|…]',
    })
    // Claude Code ships a /voice (dictation) in some builds; registering over a built-in is refused, but the hook below still answers it.
    await $.command
      .register({
        name: 'voice',
        description: 'Toggle read-along reading replies aloud (off at the start of each session)',
        argumentHint: '[on|off|all|setup|dictation …]',
      })
      .catch(() => {})
    $.clock.after(0, () => setUpReadAlong($).catch(() => {})) // read-along may not be installed yet
    return next(e)
  })

  // /v → /read-along, arguments and all.
  on('command.run', { command: 'v' }, async ($, e) => {
    readAlong($, [e.args])
    return { text: '' }
  })

  // /voice toggles read-along's auto-read for this session, and says "Voice on" aloud when it turns on.
  on('command.run', { command: 'voice' }, async ($, e, next) => {
    const [verb = '', ...rest] = e.args.trim().split(/\s+/).filter(Boolean)
    if (verb === 'dictation') return next({ ...e, args: rest.join(' ') }) // the built-in /voice, if this build has one
    if (verb === 'setup') {
      const filled = await fillKokoroSetup($).catch(() => false)
      return { text: filled ? 'A request to set up Kokoro-82M is in the prompt box: press Enter to send it.' : `Ask Claude: "${KOKORO_SETUP_PROMPT}"` }
    }

    const turnOn = verb === 'on' || verb === 'all' ? true : verb === 'off' ? false : verb === '' ? !(await read($, voiceOn)) : undefined
    if (turnOn === undefined) return { text: 'Usage: /voice [on|off|all|setup|dictation …]' }

    await update($, voiceOn, () => turnOn)
    if (turnOn) readAlong($, [`auto replies ${verb === 'all' ? 'all' : 'final'}`], async () => {
      await sayAloud($, 'Voice on')
      await offerKokoro($).catch(() => {})
    })
    else readAlong($, ['auto replies off', 'stop'])
    return { text: turnOn ? `Voice on: replies are read aloud${verb === 'all' ? ', every block as it streams' : ''}.` : 'Voice off.' }
  })
}

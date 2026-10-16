import { expect, mock, test } from 'claude-code/testing'

const readAlongRuns = (on: Parameters<Parameters<typeof test>[1]>[1]) => {
  const runs: string[] = []
  on('command.run', { command: 'read-along' }, async (_, e) => {
    runs.push(e.args)
    return { text: 'read-along: ok' }
  })
  return runs
}

test('/v forwards its arguments to /read-along', async ($, on) => {
  const clock = mock.clock(on)
  const runs = readAlongRuns(on)
  await $.command.run({ command: 'v', args: 'stop' })
  await clock.advance(0)
  expect(runs).toEqual(['stop'])
})

test('/voice starts off, toggles on, then off and stops reading', async ($, on) => {
  const clock = mock.clock(on)
  const runs = readAlongRuns(on)
  on('http.fetch', async () => ({ value: { status: 200, ok: true, headers: {}, text: '{}' } }))
  const first = await $.command.run({ command: 'voice', args: '' })
  await clock.advance(0)
  expect(first.text).toBe('Voice on: replies are read aloud.')
  expect(runs).toEqual(['auto replies final'])
  const second = await $.command.run({ command: 'voice', args: '' })
  await clock.advance(0)
  expect(second.text).toBe('Voice off.')
  expect(runs).toEqual(['auto replies final', 'auto replies off', 'stop'])
})

test('/voice on says "Voice on" in read-along\'s voice', async ($, on) => {
  const clock = mock.clock(on)
  readAlongRuns(on)
  on('config.list', async () => ({ value: [
    { key: 'read-along.voices', label: 'Voices', kind: 'string', value: 'main=aoede, auto; ja=kokoro:jf_alpha', provider: { plugin: 'read-along', tier: 'user' }, isLocked: false },
    { key: 'read-along.speed', label: 'Speed', kind: 'number', value: 0.9, provider: { plugin: 'read-along', tier: 'user' }, isLocked: false },
  ] }) as never)
  const sent: { url: string; body: any; socketPath?: string }[] = []
  on('http.fetch', async (_, e: any) => {
    sent.push({ url: e.url, body: JSON.parse(e.init.body), socketPath: e.init.socketPath })
    return { value: { status: 200, ok: true, headers: {}, text: '{}' } }
  })
  on('env.get', async () => ({ value: 'tim' }))
  const spokenBySystem: string[] = []
  on('audio.speak', async (_, e: any) => (spokenBySystem.push(e.text), { value: { synthesizer: 'say' } }) as never)
  await $.command.run({ command: 'voice', args: 'on' })
  await clock.advance(0)
  for (let i = 0; i < 5 && !sent.length && !spokenBySystem.length; i++) await clock.advance(1)
  expect(spokenBySystem).toEqual([])
  expect(sent.length).toBe(1)
  expect(sent[0]!.url).toBe('http://speakd/speak')
  expect(sent[0]!.body).toMatchObject({ text: 'Voice on', voices: { main: 'aoede', ja: 'kokoro:jf_alpha' }, speed: 0.9 })
  expect(sent[0]!.socketPath).toBe('/tmp/read-along-tim.sock')
})

test('/voice all reads every block; bad args show usage', async ($, on) => {
  const clock = mock.clock(on)
  const runs = readAlongRuns(on)
  await $.command.run({ command: 'voice', args: 'all' })
  await clock.advance(0)
  expect(runs).toEqual(['auto replies all'])
  const { text } = await $.command.run({ command: 'voice', args: 'loud' })
  expect(text).toContain('Usage')
})

const row = (field: string, value: string | number) =>
  ({ key: `read-along.${field}`, label: field, kind: typeof value, value, provider: { plugin: 'read-along', tier: 'user' }, isLocked: false })

test('session start turns auto-read off, and sets the voice and speed once', async ($, on) => {
  const clock = mock.clock(on)
  const config: Record<string, string | number> = { autoReadReplies: 'final', voices: 'main=auto', speed: 1.25 }
  on('config.list', async () => ({ value: Object.entries(config).map(([f, v]) => row(f, v)) }) as never)
  on('config.set', async (_, e: any) => ((config[e.key.split('.')[1]] = e.value), { value: e.value }) as never)
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  on('command.register', async (_, e) => ({ value: { command: e.name } }) as never)
  const store: Record<string, unknown> = {}
  on('store.get', async (_, e: any) => ({ value: store[e.key] }) as never)
  on('store.set', async (_, e: any) => ((store[e.key] = e.value), { value: undefined }) as never)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  await clock.advance(0)
  for (let i = 0; i < 5 && config.speed !== 0.9; i++) await clock.advance(1)
  expect(config).toEqual({ autoReadReplies: 'off', voices: 'main=kokoro:af_aoede, auto', speed: 0.9 })
})

test('the voice is set once: a later change of the person\'s own stays', async ($, on) => {
  const clock = mock.clock(on)
  const config: Record<string, string | number> = { autoReadReplies: 'off', voices: 'main=auto', speed: 1.25 }
  on('config.list', async () => ({ value: Object.entries(config).map(([f, v]) => row(f, v)) }) as never)
  on('config.set', async (_, e: any) => ((config[e.key.split('.')[1]] = e.value), { value: e.value }) as never)
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  on('command.register', async (_, e) => ({ value: { command: e.name } }) as never)
  const store: Record<string, unknown> = {}
  on('store.get', async (_, e: any) => ({ value: store[e.key] }) as never)
  on('store.set', async (_, e: any) => ((store[e.key] = e.value), { value: undefined }) as never)
  const start = async () => {
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
    for (let i = 0; i < 5; i++) await clock.advance(1)
  }
  await start()
  expect(config.voices).toBe('main=kokoro:af_aoede, auto')
  config.voices = 'main=kokoro:af_heart'
  await start()
  expect(config.voices).toBe('main=kokoro:af_heart')
})

/** A speech service whose /info reports Kokoro as `kokoro`; records the prompt box fills and toasts. */
const kokoroWorld = (on: Parameters<Parameters<typeof test>[1]>[1], kokoro: boolean, draft = '') => {
  on('http.fetch', async (_, e: any) => ({ value: { status: 200, ok: true, headers: {}, text: e.url.endsWith('/info')
    ? JSON.stringify({ engines: [{ name: 'kokoro', ok: kokoro }, { name: 'mac', ok: true }] })
    : '{}' } }) as never)
  on('env.get', async () => ({ value: 'tim' }))
  const fills: string[] = []
  const toasts: string[] = []
  on('prompt.read', async () => ({ value: { text: draft, cursor: draft.length } }) as never)
  on('prompt.fill', async (_, e: any) => (fills.push(e.text), { isFilled: true }) as never)
  on('ui.toast', async (_, e: any) => (toasts.push(e.text), { value: undefined }) as never)
  return { fills, toasts }
}

const settle = async (clock: { advance: (ms: number) => Promise<unknown> }) => {
  await clock.advance(0)
  for (let i = 0; i < 5; i++) await clock.advance(1)
}

test('without Kokoro, the first /voice on offers its setup once, in the prompt box', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  readAlongRuns(on)
  const { fills, toasts } = kokoroWorld(on, false)
  await $.command.run({ command: 'voice', args: 'on' })
  await settle(clock)
  expect(fills.length).toBe(1)
  expect(fills[0]).toContain('Kokoro-82M')
  expect(toasts[0]).toContain('press Enter')
  await $.command.run({ command: 'voice', args: 'off' })
  await $.command.run({ command: 'voice', args: 'on' })
  await settle(clock)
  expect(fills.length).toBe(1)
  expect(toasts.length).toBe(1)
})

test('with Kokoro installed, /voice on offers nothing', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  readAlongRuns(on)
  const { fills, toasts } = kokoroWorld(on, true)
  await $.command.run({ command: 'voice', args: 'on' })
  await settle(clock)
  expect(fills).toEqual([])
  expect(toasts).toEqual([])
})

test('the offer leaves a draft alone and points to /voice setup', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  readAlongRuns(on)
  const { fills, toasts } = kokoroWorld(on, false, 'half a thought')
  await $.command.run({ command: 'voice', args: 'on' })
  await settle(clock)
  expect(fills).toEqual([])
  expect(toasts[0]).toContain('/voice setup')
})

test('/voice setup puts the Kokoro setup request in the prompt box', async ($, on) => {
  mock.clock(on)
  const { fills } = kokoroWorld(on, false)
  const { text } = await $.command.run({ command: 'voice', args: 'setup' })
  expect(fills).toEqual([expect.stringContaining('Kokoro-82M')])
  expect(text).toContain('press Enter')
})

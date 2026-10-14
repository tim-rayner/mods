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
    { key: 'read-along.voices', label: 'Voices', kind: 'string', value: 'main=aoede, auto; ja=kokoro:jf_alpha', provider: { kind: 'plugin', name: 'read-along' }, isLocked: false },
    { key: 'read-along.speed', label: 'Speed', kind: 'number', value: 0.9, provider: { kind: 'plugin', name: 'read-along' }, isLocked: false },
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

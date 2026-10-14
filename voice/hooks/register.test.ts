import { expect, mock, test } from 'claude-code/testing'

const readAlongRuns = (on: Parameters<Parameters<typeof test>[1]>[1]) => {
  const runs: string[] = []
  on('command.run', { command: 'read-along' }, async (_, e) => {
    runs.push(e.args)
    return { text: 'read-along: ok' }
  })
  return runs
}

test('/r forwards its arguments to /read-along', async ($, on) => {
  const clock = mock.clock(on)
  const runs = readAlongRuns(on)
  await $.command.run({ command: 'r', args: 'stop' })
  await clock.advance(0)
  expect(runs).toEqual(['stop'])
})

test('/voice starts off, toggles on, then off and stops reading', async ($, on) => {
  const clock = mock.clock(on)
  const runs = readAlongRuns(on)
  await $.command.run({ command: 'voice', args: '' })
  await clock.advance(0)
  expect(runs).toEqual(['auto replies final'])
  await $.command.run({ command: 'voice', args: '' })
  await clock.advance(0)
  expect(runs).toEqual(['auto replies final', 'auto replies off', 'stop'])
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

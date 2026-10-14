import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

const voiceOn = atom({ plugin: 'tim-mods', key: 'voiceOn' } as const, false)

/** Runs `/read-along <args>` once the calling command has returned: a command.run hook can't await another command (it would wait on itself). */
const readAlong = ($: EngineInterface, ...runs: string[]) =>
  $.clock.after(0, async () => {
    for (const args of runs) await $.command.run({ command: 'read-along', args })
  })

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'r',
      description: 'Alias for /read-along: read | stop | pause | speed N | …',
      argumentHint: '[read|stop|pause|speed N|…]',
    })
    // Claude Code ships a /voice (dictation) in some builds; registering over a built-in is refused, but the hook below still answers it.
    await $.command
      .register({
        name: 'voice',
        description: 'Toggle read-along reading replies aloud (off at the start of each session)',
        argumentHint: '[on|off|all|dictation …]',
      })
      .catch(() => {})
    return next(e)
  })

  // /r → /read-along, arguments and all.
  on('command.run', { command: 'r' }, async ($, e) => {
    readAlong($, e.args)
    return { text: '' }
  })

  // /voice toggles read-along's auto-read for this session; read-along's own line reports the change.
  on('command.run', { command: 'voice' }, async ($, e, next) => {
    const [verb = '', ...rest] = e.args.trim().split(/\s+/).filter(Boolean)
    if (verb === 'dictation') return next({ ...e, args: rest.join(' ') }) // the built-in /voice, if this build has one

    const turnOn = verb === 'on' || verb === 'all' ? true : verb === 'off' ? false : verb === '' ? !(await read($, voiceOn)) : undefined
    if (turnOn === undefined) return { text: 'Usage: /voice [on|off|all|dictation …]' }

    await update($, voiceOn, () => turnOn)
    if (turnOn) readAlong($, `auto replies ${verb === 'all' ? 'all' : 'final'}`)
    else readAlong($, 'auto replies off', 'stop')
    return { text: '' }
  })
}

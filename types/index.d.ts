declare module 'claude-code' {
  interface PluginState {
    'tim-mods': {
      /** Whether read-along reads replies aloud this session; off until /voice. */
      voiceOn: boolean
    }
  }
}

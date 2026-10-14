declare module 'claude-code' {
  interface PluginState {
    'voice': {
      /** Whether read-along reads replies aloud this session; off until /voice. */
      voiceOn: boolean
    }
  }
}

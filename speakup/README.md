# speakup

Turns read-along on and off per session. Builds on [read-along](https://github.com/tomfluff/claude-read-along).

| Command | What it does |
| --- | --- |
| `/voice` | Toggle read-along reading replies aloud for this session (off at the start of every session). Turning it on says "Voice on" aloud in your read-along voice. |
| `/voice on` / `/voice off` | Set it explicitly (`off` also stops anything being read). |
| `/voice all` | Read every text block as it streams, not just the final answer. |
| `/voice dictation …` | Pass through to Claude Code's built-in `/voice` (dictation), where this build has one. |
| `/v …` | Alias for `/read-along …` (`/v stop`, `/v speed 1.2`, …). |

Sessions start silent because read-along's `autoReadReplies` option is set to `off` in
`~/.claude/settings.json` (`pluginConfigs["read-along@claude-read-along"].options`).

## Install

```
/plugin install speakup --marketplace tim-rayner/mods
```

Or from a clone: `claude plugin marketplace add ~/repos/mods && claude plugin install speakup@tim-mods`.

## Develop

`claude plugin validate speakup` and `claude plugin test speakup`, from the repo root.

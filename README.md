# tim-mods

My Claude Code mods, in one plugin. Builds on [read-along](https://github.com/tomfluff/claude-read-along).

| Command | What it does |
| --- | --- |
| `/voice` | Toggle read-along reading replies aloud for this session. Off at the start of every session. |
| `/voice on` / `/voice off` | Set it explicitly (`off` also stops anything being read). |
| `/voice all` | Read every text block as it streams, not just the final answer. |
| `/voice dictation …` | Pass through to Claude Code's built-in `/voice` (dictation), where this build has one. |
| `/r …` | Alias for `/read-along …` (`/r stop`, `/r speed 1.2`, …). |

Sessions start silent because read-along's `autoReadReplies` option is set to `off` in
`~/.claude/settings.json` (`pluginConfigs["read-along@claude-read-along"].options`).

## Install

```
/plugin install tim-mods --marketplace tim-rayner/mods
```

Or from this folder: `claude plugin marketplace add ~/repos/mods && claude plugin install tim-mods@tim-mods`.

## Develop

`claude plugin validate .` and `claude plugin test .`

# tim-mods

My collection of Claude Code mods. Each folder is one mod; `.claude-plugin/marketplace.json` lists them.

| Mod | What it does |
| --- | --- |
| [speakup](speakup/) | `/voice` toggles [read-along](https://github.com/tomfluff/claude-read-along) reading replies aloud (off by default); `/v` aliases `/read-along`. |

## Install a mod

```
/plugin install <mod> --marketplace tim-rayner/mods
```

e.g. `/plugin install speakup --marketplace tim-rayner/mods`.

## Adding a mod

Make `<mod>/` with `.claude-plugin/plugin.json`, `hooks/hooks.json` and `hooks/register.tsx`, add `{ "name": "<mod>", "source": "./<mod>" }` to `plugins` in `.claude-plugin/marketplace.json`, then `claude plugin validate <mod>` and `claude plugin test <mod>`.

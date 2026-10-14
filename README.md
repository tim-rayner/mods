# tim-mods

My collection of Claude Code mods. Each folder is one mod; `.claude-plugin/marketplace.json` lists them.

| Mod | What it does |
| --- | --- |
| [speakup](speakup/) | Claude reads replies aloud only when you type `/voice`, in Kokoro's af_aoede voice. [Install it →](speakup/README.md#install) |

## Install a mod

```
/plugin install <mod> --marketplace tim-rayner/mods
```

e.g. `/plugin install speakup --marketplace tim-rayner/mods`.

## Adding a mod

Make `<mod>/` with `.claude-plugin/plugin.json`, `hooks/hooks.json` and `hooks/register.tsx`, add `{ "name": "<mod>", "source": "./<mod>" }` to `plugins` in `.claude-plugin/marketplace.json`, then `claude plugin validate <mod>` and `claude plugin test <mod>`.

# tim-mods

My collection of Claude Code mods. Each folder is one mod; `.claude-plugin/marketplace.json` lists them.

| Mod | What it does |
| --- | --- |
| [speakup](speakup/) | Claude reads its replies aloud, locally, only when you type `/voice`. Recommended voice model: Kokoro-82M (swappable). [Install it →](speakup/README.md#install) |

## Install a mod

```
/plugin install <mod> --marketplace tim-rayner/mods
```

e.g. `/plugin install speakup --marketplace tim-rayner/mods`.

## Adding a mod

Make `<mod>/` with `.claude-plugin/plugin.json`, `hooks/hooks.json` and `hooks/register.tsx`, add `{ "name": "<mod>", "source": "./<mod>" }` to `plugins` in `.claude-plugin/marketplace.json`, then `claude plugin validate <mod>` and `claude plugin test <mod>`.

## Credits and licence

speakup is built on [read-along](https://github.com/tomfluff/claude-read-along) by Yotam Sechayk (MIT). Everything here is MIT licensed; see [LICENSE](LICENSE).

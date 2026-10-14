# speakup

Claude Code reads its replies to you out loud, but only when you ask. Every session starts silent; type `/voice` and it starts talking, in a natural local voice (Kokoro's **af_aoede**, from the [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) model, at 0.9× speed).

It's a thin layer on top of [read-along](https://github.com/tomfluff/claude-read-along), which does the speaking and highlights the sentence being read.

| Command | What it does |
| --- | --- |
| `/voice` | Toggle reading replies aloud for this session. Says "Voice on" when it turns on. |
| `/voice on` · `/voice off` | Set it explicitly (`off` also stops anything being read). |
| `/voice all` | Read every text block as it streams, not just the final answer. |
| `/voice dictation …` | Pass through to Claude Code's built-in `/voice` (dictation), where your build has one. |
| `/v …` | Shorthand for `/read-along …`: `/v pause`, `/v stop`, `/v speed 1.2`, `/v read`. |

## Install

Easiest: paste this into Claude Code and let it do the rest.

```
Install the speakup mod by following https://github.com/tim-rayner/mods/blob/main/speakup/README.md (the "Agent setup" section).
```

Everything runs on your machine. The one big download is the voice model, about 1 GB.

## Agent setup

Steps for an agent installing speakup for someone. Run them in order; each is safe to re-run. Ask the person before steps that install software (2 and 3), saying what and how big.

1. **Check the machine.** macOS, Linux or WSL, with `python3` and `claude` on the PATH. Kokoro's packages need Python 3.10 to 3.13, or `uv` (which fetches a Python of its own).

2. **Install read-along**, the plugin that speaks:

   ```bash
   claude plugin marketplace add tomfluff/claude-read-along
   claude plugin install read-along@claude-read-along
   ```

3. **Install the voice model (Kokoro, about 1 GB) and an audio player.** Find read-along's folder and run its setup:

   ```bash
   RA="$(ls -d ~/.claude/plugins/cache/claude-read-along/read-along/*/ | sort -V | tail -1 | sed 's#/$##')"
   python3 -I "$RA/bin/setup.py" kokoro       # a few minutes: run it in the background and wait
   python3 -I "$RA/bin/speakd.py" --doctor    # "[x] Kokoro" and a Player line mean it's ready
   ```

   If the doctor says there's no player: on macOS `brew install ffmpeg`; on Debian, Ubuntu or WSL `sudo apt install ffmpeg` (ask before using sudo). If `setup.py` says the Python is too new or old, install `uv` (`brew install uv`, or `curl -LsSf https://astral.sh/uv/install.sh | sh`) and run it again. read-along's own `/read-along setup` skill covers anything else.

4. **Install speakup:**

   ```bash
   claude plugin marketplace add tim-rayner/mods
   claude plugin install speakup@tim-mods
   ```

5. **Hand over.** Tell the person to open a new Claude Code session (or run `/reload-plugins` in this one) and type `/voice`. They should hear "Voice on" in the aoede voice, then each reply read aloud.

There's nothing to configure by hand. On its first session speakup sets read-along's voice to `kokoro:af_aoede` and its speed to 0.9 (once, so later changes in `/read-along` stay), and it keeps read-along's auto-read off at the start of every session, so `/voice` decides.

**If it's silent:** run `/read-along doctor` in the session, and check the service log at `/tmp/read-along-$(id -u).log`.

## Develop

From the repo root: `claude plugin validate speakup` and `claude plugin test speakup`.

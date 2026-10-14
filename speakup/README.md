# speakup

**Kokoro-82M reads Claude Code's replies to you out loud, when you ask it to.**

Every session starts silent. Type `/voice` and Claude starts talking in Kokoro's **af_aoede** voice at 0.9× speed, all on your own machine.

## Why Kokoro-82M

[Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) is an open-weight text-to-speech model (Apache 2.0) that sounds close to a person reading, yet is small enough to run on a laptop's CPU at about three times real time. No cloud service, no API key, nothing you say leaves the machine. speakup is built around it: the install sets it up, and the first session picks its `af_aoede` voice for you.

The speaking itself is done by [read-along](https://github.com/tomfluff/claude-read-along), which runs Kokoro in a small local service and highlights each sentence as it's read. speakup decides *when* it speaks:

```
/voice ──▶ speakup ──▶ read-along ──▶ speech service ──▶ Kokoro-82M (af_aoede) ──▶ your speakers
```

## Commands

| Command | What it does |
| --- | --- |
| `/voice` | Toggle reading replies aloud for this session. Says "Voice on" when it turns on. |
| `/voice on` · `/voice off` | Set it explicitly (`off` also stops anything being read). |
| `/voice all` | Read every text block as it streams, not just the final answer. |
| `/voice dictation …` | Pass through to Claude Code's built-in `/voice` (dictation), where your build has one. |
| `/v …` | Shorthand for `/read-along …`: `/v pause`, `/v stop`, `/v speed 1.2`, `/v read`. |

## Install

Paste this into Claude Code and let it do the rest:

```
Install the speakup mod by following https://github.com/tim-rayner/mods/blob/main/speakup/README.md (the "Agent setup" section).
```

Everything runs locally. The one big download is Kokoro-82M and its runtime, about 1 GB.

## Agent setup

Steps for an agent installing speakup for someone. Run them in order; each is safe to re-run. Ask the person before steps that install software (2 and 3), saying what and how big.

1. **Check the machine.** macOS, Linux or WSL, with `python3` and `claude` on the PATH. Kokoro's packages need Python 3.10 to 3.13, or `uv` (which fetches a Python of its own).

2. **Install read-along**, which runs the voice:

   ```bash
   claude plugin marketplace add tomfluff/claude-read-along
   claude plugin install read-along@claude-read-along
   ```

3. **Install Kokoro-82M (about 1 GB) and check for an audio player.** read-along's setup downloads the model, checks it against its SHA-256, and installs its runtime in a folder of its own:

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

There's nothing to configure by hand. On its first session speakup sets read-along's voice to `kokoro:af_aoede` and its speed to 0.9, and at the start of every session it turns read-along's auto-read off, so `/voice` decides.

**If it's silent:** run `/read-along doctor` in the session, and check the service log at `/tmp/read-along-$(id -u).log`.

## Swapping the voice

Kokoro-82M with af_aoede is the default, not a requirement. speakup sets the voice only once, on its first session, so any voice you pick afterwards stays. `/voice` works the same with all of them.

- **Another Kokoro voice.** Kokoro-82M ships around 50: American and British English (`af_heart`, `af_bella`, `am_michael`, `bf_emma`, …) plus Spanish, French, Hindi, Italian, Portuguese, Chinese and, with `setup.py kokoro --japanese`, Japanese. Try one with `/v voice kokoro:af_heart`, list them with `/v voices`, and keep your choice with `/v save`.
- **Your system's voices.** No download: `/v voice mac:Samantha` on macOS (System Settings → Accessibility → Spoken Content → Manage Voices has free Enhanced and Premium voices), or eSpeak NG on Linux. Handy if the 1 GB is too much; skip step 3 above.
- **Pocket TTS.** Kyutai's model adds 27 more voices and can clone a voice of your own from a short recording of you: `python3 -I "$RA/bin/setup.py" pocket`, then `/v voice pocket:alba`. See read-along's `/read-along setup` for cloning, and only clone a voice whose owner agreed.
- **A different default for everyone you share speakup with.** Fork this repo and change `VOICE` and `SPEED` at the top of [`hooks/register.tsx`](hooks/register.tsx).

`/read-along` (or `/v`) on its own opens the settings, with a voice per language, speed, volume and the rest.

## Develop

From the repo root: `claude plugin validate speakup` and `claude plugin test speakup`.

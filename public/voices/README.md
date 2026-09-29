# Voices

## Attack words (real politician speech)

Each fighter has a bank of short clips cut from their own archival footage:

`public/voices/<id>/words/w00.mp3` …

On every punch / kick / special, the game plays **one random word** from that fighter’s bank. Banks never cross characters — Bibi only uses Bibi’s voice, etc.

Source map: `word-banks.json`

To re-cut clips from archival sources (after updating timestamps in the script), run from repo root:

`RAW=/tmp/scandal-raw bash scripts/rebuild-media.sh`

Raw files are not shipped with the repo; they are downloaded from the Internet Archive items listed in `public/finalsmashes/SOURCES.md`.

## Other lines

- `hurt.wav` / `victory.wav` — still placeholders (swap in real clips if you want)
- `announcer/` — Final Smash callouts only (`finish-him`, `final-smash`, `<id>-fs`)

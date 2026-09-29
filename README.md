# Knesset Kombat 26

Satirical 1v1 health-bar fighter featuring caricature avatars of Israeli Knesset figures. Built as a static Vite app you can host on GitHub Pages.

## Play

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43126](http://127.0.0.1:43126).

Production build:

```bash
npm run build
npm run preview
```

The `dist/` folder is what you deploy to GitHub Pages (or any static host). `vite.config.js` sets `base: './'` so relative asset paths work from a project site or `username.github.io/repo`.

## How to fight (keyboard only)

| Action | Player 1 | Player 2 |
|--------|----------|----------|
| Move | A / D | ← / → |
| Jump (can leap over rival) | W | ↑ |
| Block (hold) | S | ↓ |
| Punch | F | J |
| Kick | G | K |
| Special | R | L |

- Combat is **keyboard-only** (no mouse attack buttons).
- 3D avatars with face textures in a Three.js arena.
- Jump high enough to pass over the other fighter.
- Each hit drains the opponent health bar.
- **Blocking cuts incoming damage by 85%** (defender takes 15%).
- Modes: **Vs CPU** or **2 Players**.

## Roster

| ID | Character | Special |
|----|-----------|---------|
| `bibi` | Bibi — The Survivor | Coalition Crush |
| `lapid` | Lapid — Smooth Operator | Prime Time Punch |
| `gantz` | Gantz — The General | Iron Dome Drop |
| `bengvir` | Ben-Gvir — Firebrand | Otterman Blitz |
| `smotrich` | Smotrich — Budget Blade | Austerity Slash |
| `lieberman` | Lieberman — Iron Fist | Veto Smash |

Avatars live in `public/avatars/` — square crops from public Wikimedia Commons portraits of each politician (see `public/refs/SOURCES.md`). Each fighter also has a distinct 3D body build (height, bulk, kippah/glasses/beard props) in `src/characters.js`.

## Audio

- **BGM (lobby + fight):** *Hava Nagila* by default (`public/music/hava-nagila.mp3`); alternate track is Miguel Nagila
- **Attack voices:** each punch/kick/special plays a **random real spoken word** from that fighter’s own archival audio (`public/voices/<id>/words/`)
- **Announcer:** `public/voices/announcer/*.mp3` — Final Smash callouts only
- **Final Smash clips:** `public/finalsmashes/<id>.mp4` — real scandal news clips (see `SOURCES.md`); swap same filenames to replace

## Folder map

```
public/
  avatars/          character portraits
  stages/arena.png  fight background
  voices/<id>/words/ random attack words (real politician voice)
  voices/<id>/      hurt / victory placeholders
src/
  main.js           screens + combat
  characters.js     roster + damage + block factor
  style.css
index.html
```

## Disclaimer

Fan parody / political satire concept game. Not affiliated with the Knesset or any party.

# Reference portrait sources

Likeness avatars in `../avatars/` were cropped from public Wikimedia Commons portraits:

| Character | Commons file | Notes |
|-----------|--------------|-------|
| Bibi | Benjamin Netanyahu Portrait February 2023 (3x4 cropped).jpg | Israel GPO / Avi Ohayon |
| Lapid | Yair Lapid February 2022 cropped.jpg | Wikimedia Commons |
| Gantz | Benny Gantz 2019 (cropped).jpg | Wikimedia Commons |
| Ben-Gvir | Itamar Ben Gvir 1.jpg | Wikimedia Commons |
| Smotrich | Bezalel Smotrich (AS5V6986).jpg | Wikimedia Commons |
| Lieberman | Avigdor Lieberman (portrait).jpg | Wikimedia Commons |

Re-download refs and rebuild square avatars with:

```bash
# see scripts in repo history / agent session — crops land in public/avatars/<id>.png
```

Each fighter also has a unique 3D body profile in `src/characters.js` (`body` field): height, torso width, props (kippah, glasses, goatee, etc.).

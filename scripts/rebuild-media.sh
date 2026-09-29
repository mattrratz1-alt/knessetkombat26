#!/usr/bin/env bash
# Rebuild attack-word MP3s and Final Smash MP4s from curated source windows.
set -euo pipefail
RAW="${RAW:-/tmp/scandal-raw}"
ROOT="/workspace/public"
FS_DUR=5.833333

af_words='highpass=f=120,lowpass=f=7500,volume=2.5,aresample=44100'

cut_word() {
  local src=$1 out=$2 start=$3 end=$4
  local dur
  dur=$(awk -v s="$start" -v e="$end" 'BEGIN{printf "%.3f", e-s}')
  ffmpeg -y -loglevel error -ss "$start" -i "$src" -t "$dur" -vn \
    -af "$af_words" -codec:a libmp3lame -q:a 2 "$out"
}

cut_fs() {
  local src=$1 out=$2 start=$3
  ffmpeg -y -loglevel error -ss "$start" -i "$src" -t "$FS_DUR" \
    -vf "scale=1280:-2:flags=lanczos" \
    -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p \
    -c:a aac -b:a 128k -movflags +faststart "$out"
}

mkdir -p "$ROOT/voices"/{bibi,gantz,lapid,bengvir,smotrich,lieberman}/words
mkdir -p "$ROOT/finalsmashes"

# --- Final Smash (politician visible + speaking) ---
cut_fs "$RAW/bibi_raw.mp4"     "$ROOT/finalsmashes/bibi.mp4"     48.0
cut_fs "$RAW/lapid_raw.mp4"    "$ROOT/finalsmashes/lapid.mp4"    4.6
cut_fs "$RAW/gantz_raw.mp4"    "$ROOT/finalsmashes/gantz.mp4"    76.0
cut_fs "$RAW/bg_speech.mp4"           "$ROOT/finalsmashes/bengvir.mp4"  4.6
SMOT_FS="${SMOT_FS:-$RAW/smotrich_twitter.mp4}"
if [[ ! -f "$SMOT_FS" ]]; then SMOT_FS="$RAW/smotrich_raw.mp4"; fi
cut_fs "$SMOT_FS"                     "$ROOT/finalsmashes/smotrich.mp4" 5.0
cut_fs "$RAW/lieberman_iran.mp4"      "$ROOT/finalsmashes/lieberman.mp4" 25.0

# --- Attack words: Bibi (Hebrew lobby interview) ---
BIBI="$RAW/bibi_raw.mp4"
bibi_ranges=(
  "52.25 53.05" "53.40 54.20" "54.50 55.25" "55.10 55.85"
  "55.70 56.45" "56.25 57.00" "51.85 52.55" "53.85 54.55"
)
i=0
for r in "${bibi_ranges[@]}"; do
  cut_word "$BIBI" "$ROOT/voices/bibi/words/w$(printf '%02d' "$i").mp3" ${r}
  i=$((i + 1))
done

# --- Gantz (English VICE interview) ---
GANTZ="$RAW/gantz_raw.mp4"
gantz_ranges=(
  "77.45 78.20" "78.15 78.90" "79.75 80.45" "80.20 80.95"
  "81.75 82.50" "83.85 84.35" "86.85 87.35" "87.45 88.05"
  "84.00 84.65" "85.00 85.55"
)
i=0
for r in "${gantz_ranges[@]}"; do
  cut_word "$GANTZ" "$ROOT/voices/gantz/words/w$(printf '%02d' "$i").mp3" ${r}
  i=$((i + 1))
done

# --- Lapid (Hebrew press — rules of engagement) ---
LAPID="$RAW/lapid_raw.mp4"
lapid_ranges=(
  "4.85 5.55" "9.15 9.85" "10.05 10.75" "11.75 12.45"
  "12.55 13.35" "13.85 14.55" "14.65 15.35" "15.05 15.75"
  "16.55 17.35" "17.85 18.55"
)
i=0
for r in "${lapid_ranges[@]}"; do
  cut_word "$LAPID" "$ROOT/voices/lapid/words/w$(printf '%02d' "$i").mp3" ${r}
  i=$((i + 1))
done

# --- Ben-Gvir (Knesset speech — his voice) ---
BG="$RAW/bg_speech.mp4"
bengvir_ranges=(
  "4.85 5.60" "9.15 9.95" "11.75 12.55" "16.55 17.35"
  "20.05 20.80" "24.05 24.80" "28.05 28.80" "32.05 32.80"
  "36.05 36.80" "40.05 40.80"
)
i=0
for r in "${bengvir_ranges[@]}"; do
  cut_word "$BG" "$ROOT/voices/bengvir/words/w$(printf '%02d' "$i").mp3" ${r}
  i=$((i + 1))
done

# --- Smotrich (Twitter clip — politician speaking Hebrew) ---
SMOT="$SMOT_FS"
smot_ranges=(
  "5.00 5.75" "8.50 9.25" "12.00 12.75" "15.50 16.25"
  "18.00 18.75" "21.00 21.75" "24.00 24.75" "27.00 27.75"
  "30.00 30.75" "33.00 33.75"
)
i=0
for r in "${smot_ranges[@]}"; do
  cut_word "$SMOT" "$ROOT/voices/smotrich/words/w$(printf '%02d' "$i").mp3" ${r}
  i=$((i + 1))
done

# --- Lieberman (Hebrew press — his voice, not English narration) ---
LIEB="$RAW/lieberman_iran.mp4"
LIEB2="$RAW/lieberman_meet.mp4"
lieb_ranges=(
  "25.10 25.85" "26.20 26.95" "27.50 28.25" "28.80 29.55"
  "0.50 1.25" "2.00 2.75" "3.50 4.25" "5.00 5.75"
)
i=0
for r in "${lieb_ranges[@]}"; do
  src="$LIEB"
  if [[ $i -ge 4 ]]; then src="$LIEB2"; fi
  cut_word "$src" "$ROOT/voices/lieberman/words/w$(printf '%02d' "$i").mp3" ${r}
  i=$((i + 1))
done

echo "Done. Re-run whisper spot-check locally if needed."

/** Universal BGM (Hava Nagila default) + per-character attack words + Final Smash announcer */

import { assetUrl } from './assets.js'

const audioCache = new Map()

function getAudio(src) {
  const url = assetUrl(src)
  let a = audioCache.get(url)
  if (!a) {
    a = new Audio(url)
    audioCache.set(url, a)
  }
  return a
}

const TRACKS = [
  {
    id: 'hava',
    name: 'Hava Nagila',
    src: './music/hava-nagila.mp3',
    volume: 0.3,
  },
  {
    id: 'miguel',
    name: 'Miguel Nagila',
    src: './music/miguel-nagila.mp3',
    volume: 0.34,
  },
]

let trackIndex = 0 // Hava Nagila is universal default
let bgm = null
let bgmMode = null // 'lobby' | 'fight' | null
let qStreak = 0
let qStreakAt = 0
const Q_STREAK_NEEDED = 8
const Q_STREAK_WINDOW_MS = 2000

function currentTrack() {
  return TRACKS[trackIndex]
}

function stopCurrentBgm({ reset = true } = {}) {
  if (!bgm) return
  bgm.pause()
  if (reset) bgm.currentTime = 0
}

function playCurrentTrack({ restart = false } = {}) {
  const track = currentTrack()
  const next = getAudio(track.src)
  next.loop = true
  next.volume = track.volume

  if (bgm && bgm !== next) {
    stopCurrentBgm({ reset: true })
  }
  bgm = next

  if (restart) bgm.currentTime = 0
  if (bgm.paused) {
    void bgm.play().catch(() => {})
  }
}

/** Start / keep BGM for lobby screens (does not restart if already playing). */
export function startLobbyBgm() {
  bgmMode = 'lobby'
  playCurrentTrack({ restart: false })
}

/** Start fight BGM (restarts from the top of the current track). */
export function startFightBgm() {
  bgmMode = 'fight'
  playCurrentTrack({ restart: true })
}

/** @deprecated use startFightBgm */
export function startBgm() {
  startFightBgm()
}

export function stopLobbyBgm() {
  if (bgmMode === 'lobby') {
    stopCurrentBgm({ reset: true })
    bgmMode = null
  }
}

export function stopFightBgm() {
  if (bgmMode === 'fight') {
    stopCurrentBgm({ reset: true })
    bgmMode = null
  }
}

export function stopBgm() {
  stopCurrentBgm({ reset: true })
  bgmMode = null
}

export function getBgmTrackName() {
  return currentTrack().name
}

/**
 * Toggle Hava Nagila ↔ Miguel Nagila and keep playing in the current context.
 * Returns the new track name.
 */
export function toggleBgmTrack() {
  trackIndex = (trackIndex + 1) % TRACKS.length
  if (bgmMode) {
    playCurrentTrack({ restart: true })
  }
  return currentTrack().name
}

/**
 * Call from a global keydown handler. Press Q eight times in a row to toggle BGM.
 * Returns the new track name when toggled, otherwise null.
 */
export function noteMusicToggleKey(code, { repeat = false } = {}) {
  if (repeat) return null
  const now = performance.now()
  if (now - qStreakAt > Q_STREAK_WINDOW_MS) qStreak = 0

  if (code !== 'KeyQ') {
    qStreak = 0
    return null
  }

  qStreakAt = now
  qStreak += 1
  if (qStreak < Q_STREAK_NEEDED) return null

  qStreak = 0
  return toggleBgmTrack()
}

export function playClip(src, volume = 0.9) {
  try {
    const a = getAudio(src).cloneNode()
    a.volume = volume
    void a.play().catch(() => {})
  } catch {
    /* ignore */
  }
}

/**
 * Play one random real spoken word from this character's voice bank.
 * Only uses clips belonging to that fighter (never another politician).
 */
const lastAttackClipIndex = new Map()

export function playAttackWord(character) {
  const bank = character?.attackWords
  if (!Array.isArray(bank) || bank.length === 0) return
  let idx = Math.floor(Math.random() * bank.length)
  const last = lastAttackClipIndex.get(character.id)
  if (bank.length > 1 && idx === last) idx = (idx + 1) % bank.length
  lastAttackClipIndex.set(character.id, idx)
  playClip(bank[idx], 0.95)
}

/** @deprecated generic announcer removed — attacks use playAttackWord */
export function announceMove(_move, _specialName) {
  /* no-op */
}

export function announceFinalSmash(character) {
  playClip('./voices/announcer/finish-him.mp3', 1)
  setTimeout(() => {
    playClip('./voices/announcer/final-smash.mp3', 1)
  }, 700)
  if (character?.finalSmash?.voice) {
    setTimeout(() => playClip(character.finalSmash.voice, 1), 1400)
  }
}

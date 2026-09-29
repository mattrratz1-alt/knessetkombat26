import { createArena } from './arena.js'
import {
  announceFinalSmash,
  noteMusicToggleKey,
  playAttackWord,
  playClip,
  startFightBgm,
  startLobbyBgm,
  stopBgm,
  stopFightBgm,
} from './audio.js'
import {
  BLOCK_DAMAGE_FACTOR,
  CHARACTERS,
  MAX_HEALTH,
  ROUND_SECONDS,
} from './characters.js'

const app = document.querySelector('#app')

function publicUrl(relPath) {
  const path = String(relPath || '').replace(/^\.\//, '')
  const { origin, pathname } = window.location
  let dir = pathname
  if (dir.endsWith('/index.html')) dir = dir.slice(0, -'index.html'.length)
  else if (!dir.endsWith('/')) dir += '/'
  // Source-tree GitHub Pages keeps files under /public/; Vite dist flattens them to root.
  const sourceTree = Boolean(document.querySelector('script[src*="src/main"]'))
  const prefix = sourceTree && !path.startsWith('public/') ? 'public/' : ''
  return origin + dir + prefix + path
}

document.documentElement.style.setProperty(
  '--arena-bg',
  `url("${publicUrl('stages/arena.png')}")`,
)

const state = {
  screen: 'title',
  mode: 'cpu',
  selectingFor: 'p1',
  p1Id: null,
  p2Id: null,
  fight: null,
}

const audioCache = new Map()

/** Keyboard map — combat is keys only, no mouse action buttons */
const P1_KEYS = {
  left: 'KeyA',
  right: 'KeyD',
  jump: 'KeyW',
  block: 'KeyS',
  punch: 'KeyF',
  kick: 'KeyG',
  special: 'KeyR',
}

const P2_KEYS = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  jump: 'ArrowUp',
  block: 'ArrowDown',
  punch: 'KeyJ',
  kick: 'KeyK',
  special: 'KeyL',
}

function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id)
}

function playVoice(character, kind) {
  const src = character?.voices?.[kind]
  if (!src) return
  playClip(src, 0.55)
}

function render() {
  if (state.screen === 'title') renderTitle()
  else if (state.screen === 'select') renderSelect()
  else renderFightShell()
}

function renderTitle() {
  teardownFight()
  startLobbyBgm()
  app.innerHTML = `
    <section class="screen title-screen">
      <div class="title-inner">
        <h1 class="brand">KNESSET<span>KOMBAT 26</span></h1>
        <p class="tagline">
          3D Knesset fighters. Move, jump over your rival, strike the health bar —
          hold block to cut 85% of incoming damage.
        </p>
        <div class="mode-row">
          <button class="btn" data-mode="cpu">Vs CPU</button>
          <button class="btn secondary" data-mode="local">2 Players</button>
        </div>
        <div class="controls-cheat">
          <p><strong>P1</strong> A/D move · W jump · S block · F punch · G kick · R special</p>
          <p><strong>P2</strong> ←/→ move · ↑ jump · ↓ block · J punch · K kick · L special</p>
        </div>
        <p class="hint">Finish them with a Final Smash</p>
      </div>
    </section>
  `
  app.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode
      state.p1Id = null
      state.p2Id = null
      state.selectingFor = 'p1'
      state.screen = 'select'
      render()
    })
  })
}

function renderSelect() {
  teardownFight()
  startLobbyBgm()
  const p1 = state.p1Id ? getCharacter(state.p1Id) : null
  const p2 = state.p2Id ? getCharacter(state.p2Id) : null
  const prompt =
    state.selectingFor === 'p1'
      ? 'Choose Player 1'
      : state.mode === 'cpu'
        ? 'Choose CPU opponent'
        : 'Choose Player 2'

  app.innerHTML = `
    <section class="screen select-screen">
      <div class="select-header">
        <div>
          <h1>Character Select</h1>
          <p>${prompt} · ${state.mode === 'cpu' ? 'Vs CPU' : 'Local 2P'} · keyboard combat</p>
        </div>
        <button class="btn secondary" id="back-title">Back</button>
      </div>

      <div class="picks">
        <div class="pick-card">
          ${
            p1
              ? `<img src="${publicUrl(p1.avatar)}" alt="${p1.name}" /><div><h3>${p1.name}</h3><p>${p1.title}</p></div>`
              : `<div><h3>P1</h3><p>Waiting…</p></div>`
          }
        </div>
        <div class="vs">VS</div>
        <div class="pick-card">
          ${
            p2
              ? `<img src="${publicUrl(p2.avatar)}" alt="${p2.name}" /><div><h3>${p2.name}</h3><p>${p2.title}</p></div>`
              : `<div><h3>${state.mode === 'cpu' ? 'CPU' : 'P2'}</h3><p>Waiting…</p></div>`
          }
        </div>
      </div>

      <div class="roster">
        ${CHARACTERS.map(
          (c) => `
          <button class="char-tile ${state.p1Id === c.id ? 'selected-p1' : ''} ${state.p2Id === c.id ? 'selected-p2' : ''}" data-id="${c.id}" type="button">
            <img src="${publicUrl(c.avatar)}" alt="${c.name}" />
            <strong>${c.name}</strong>
            <span>${c.title}</span>
          </button>
        `,
        ).join('')}
      </div>

      <div class="select-actions">
        <button class="btn" id="fight-btn" type="button" ${p1 && p2 && p1.id !== p2.id ? '' : 'disabled'}>Enter Arena</button>
      </div>
    </section>
  `

  app.querySelector('#back-title').addEventListener('click', () => {
    state.screen = 'title'
    render()
  })

  app.querySelectorAll('.char-tile').forEach((tile) => {
    tile.addEventListener('click', () => {
      const id = tile.dataset.id
      if (state.selectingFor === 'p1') {
        state.p1Id = id
        state.selectingFor = 'p2'
      } else {
        if (id === state.p1Id) return
        state.p2Id = id
      }
      render()
    })
  })

  app.querySelector('#fight-btn')?.addEventListener('click', () => {
    if (!state.p1Id || !state.p2Id || state.p1Id === state.p2Id) return
    startFight()
  })
}

function startFight() {
  teardownFight()
  const p1Char = getCharacter(state.p1Id)
  const p2Char = getCharacter(state.p2Id)

  state.fight = {
    p1Char,
    p2Char,
    health: { p1: MAX_HEALTH, p2: MAX_HEALTH },
    timeLeft: ROUND_SECONDS,
    over: false,
    winner: null,
    keys: new Set(),
    lastAttack: { p1: 0, p2: 0 },
    arena: null,
    raf: 0,
    lastTick: performance.now(),
    aiCooldown: 1.2, // give the player a beat before CPU opens
    status: { p1: '', p2: '' },
    timers: [],
  }

  state.screen = 'fight'
  renderFightShell()

  const mount = document.getElementById('arena-mount')
  const arena = createArena(mount, p1Char, p2Char)
  state.fight.arena = arena
  arena.onResize()

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  startFightBgm()
  loopFight()
}

function renderFightShell() {
  const f = state.fight
  if (!f) return
  const { p1Char, p2Char } = f

  app.innerHTML = `
    <section class="screen fight-screen">
      <div class="fight-layout">
        <div class="hud">
          ${hudMarkup('p1', p1Char, f.health.p1, false)}
          <div class="timer" id="timer">${Math.ceil(f.timeLeft)}</div>
          ${hudMarkup('p2', p2Char, f.health.p2, true)}
        </div>

        <div class="arena-mount" id="arena-mount" tabindex="0" aria-label="Fight arena — use keyboard"></div>

        <div class="key-legend">
          <div>
            <h4>P1 — ${p1Char.name}</h4>
            <p>A/D move · W jump · S block · F punch · G kick · R ${p1Char.specialName}</p>
            <p class="status-line" id="status-p1">${f.status.p1}</p>
          </div>
          <div>
            <h4>${state.mode === 'cpu' ? 'CPU' : 'P2'} — ${p2Char.name}</h4>
            <p>${
              state.mode === 'cpu'
                ? 'CPU moves, jumps, blocks, and attacks on its own.'
                : `←/→ move · ↑ jump · ↓ block · J punch · K kick · L ${p2Char.specialName}`
            }</p>
            <p class="status-line" id="status-p2">${f.status.p2}</p>
          </div>
        </div>

        ${
          f.over
            ? `<div class="overlay"><div class="overlay-card">
                <h2>${f.winner === 'draw' ? 'DRAW' : `${f.winner.name} WINS`}</h2>
                <p>Press Enter for rematch · Esc for roster</p>
                <button class="btn" id="rematch" type="button">Rematch</button>
                <button class="btn secondary" id="to-select" type="button">Roster</button>
              </div></div>`
            : ''
        }
      </div>
    </section>
  `

  app.querySelector('#rematch')?.addEventListener('click', () => startFight())
  app.querySelector('#to-select')?.addEventListener('click', () => {
    teardownFight()
    state.selectingFor = 'p1'
    state.screen = 'select'
    render()
  })

  // Focus arena so arrow keys don't scroll the page
  queueMicrotask(() => document.getElementById('arena-mount')?.focus())
}

function hudMarkup(side, character, health, right) {
  const pct = Math.max(0, (health / MAX_HEALTH) * 100)
  const tone = pct <= 30 ? 'low' : pct <= 60 ? 'mid' : ''
  return `
    <div class="fighter-hud ${right ? 'right' : ''}">
      <div class="name-row">
        <img class="hud-face" src="${publicUrl(character.avatar)}" alt="" />
        <div class="name">${character.name}</div>
      </div>
      <div class="health-track">
        <div class="health-fill ${tone}" id="hp-${side}" style="transform: scaleX(${pct / 100})"></div>
      </div>
    </div>
  `
}

function readInput(side) {
  const f = state.fight
  const map = side === 'p1' ? P1_KEYS : P2_KEYS
  return {
    left: f.keys.has(map.left),
    right: f.keys.has(map.right),
    jump: f.keys.has(map.jump),
    block: f.keys.has(map.block),
    punch: false,
    kick: false,
    special: false,
  }
}

function onKeyDown(e) {
  const f = state.fight
  if (!f) return

  // Prevent arrow-key page scroll during fight
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault()
  }

  if (f.over) {
    if (e.code === 'Enter') startFight()
    if (e.code === 'Escape') {
      teardownFight()
      state.selectingFor = 'p1'
      state.screen = 'select'
      render()
    }
    return
  }

  if (e.repeat) {
    f.keys.add(e.code)
    return
  }

  f.keys.add(e.code)

  if (e.code === P1_KEYS.punch) tryAttack('p1', 'punch')
  if (e.code === P1_KEYS.kick) tryAttack('p1', 'kick')
  if (e.code === P1_KEYS.special) tryAttack('p1', 'special')

  if (state.mode === 'local') {
    if (e.code === P2_KEYS.punch) tryAttack('p2', 'punch')
    if (e.code === P2_KEYS.kick) tryAttack('p2', 'kick')
    if (e.code === P2_KEYS.special) tryAttack('p2', 'special')
  }
}

function onKeyUp(e) {
  const f = state.fight
  if (!f) return
  f.keys.delete(e.code)
}

function tryAttack(side, move) {
  const f = state.fight
  if (!f || f.over || !f.arena) return

  const now = performance.now()
  const cooldown = move === 'special' ? 900 : 380
  if (now - f.lastAttack[side] < cooldown) return

  const avatar = f.arena.fighters[side]
  if (avatar.blocking) return

  f.lastAttack[side] = now
  f.arena.playAttackAnim(avatar, move)

  const attackerChar = side === 'p1' ? f.p1Char : f.p2Char
  // Real politician voice — random word from this fighter's bank only
  playAttackWord(attackerChar)
  f.status[side] = move === 'special' ? attackerChar.specialName.toUpperCase() : move.toUpperCase()
  updateHud()

  // Damage lands at the extension of the punch/kick
  const delay = move === 'special' ? 300 : move === 'kick' ? 200 : 120
  const t = setTimeout(() => applyHit(side, move), delay)
  f.timers = f.timers || []
  f.timers.push(t)
}

function applyHit(side, move) {
  const f = state.fight
  if (!f || f.over || !f.arena) return

  const avatar = f.arena.fighters[side]
  const defSide = side === 'p1' ? 'p2' : 'p1'
  const defender = f.arena.fighters[defSide]
  const attackerChar = side === 'p1' ? f.p1Char : f.p2Char
  const defenderChar = defSide === 'p1' ? f.p1Char : f.p2Char

  if (!f.arena.inRange(avatar, defender)) {
    if (f.status[side] !== 'WHIFF') f.status[side] = `${move.toUpperCase()} · MISS`
    updateHud()
    return
  }

  const raw = attackerChar.moves[move]
  const blocked = defender.blocking
  const dealt = blocked ? Math.max(1, Math.round(raw * BLOCK_DAMAGE_FACTOR)) : raw
  const wouldFinish = !blocked && f.health[defSide] - dealt <= 0

  if (wouldFinish) {
    // Lethal blow → Final Smash cinematic
    f.health[defSide] = 0
    f.arena.flashHit(defender, avatar)
    defender.x += avatar.facing * 1.4
    updateHud()
    playFinalSmash(attackerChar)
    return
  }

  f.health[defSide] = Math.max(0, f.health[defSide] - dealt)
  f.arena.flashHit(defender, avatar)
  defender.x += avatar.facing * (blocked ? 0.25 : move === 'special' ? 1.1 : 0.55)
  playVoice(defenderChar, 'hurt')
  f.status[defSide] = blocked ? `BLOCKED −${dealt}` : `HIT −${dealt}`

  updateHud()

  if (f.health[defSide] <= 0) {
    endRound(attackerChar)
  }
}

function playFinalSmash(winner) {
  const f = state.fight
  if (!f || f.finishing) return
  f.finishing = true
  f.over = true // freeze combat/AI while cinematic plays
  stopFightBgm()
  announceFinalSmash(winner)

  const fs = winner.finalSmash || {
    name: 'FINAL SMASH',
    caption: 'Destroyed.',
    clip: winner.avatar,
  }
  const clipSrc = publicUrl(fs.clip)

  const overlay = document.createElement('div')
  overlay.className = 'final-smash-overlay'
  overlay.innerHTML = `
    <div class="final-smash-card">
      <p class="fs-eyebrow">FINAL SMASH</p>
      <h2>${fs.name}</h2>
      <p class="fs-caption">${fs.caption}</p>
      <video class="fs-video" playsinline preload="auto"></video>
      <p class="fs-by">${winner.name} finishes the fight</p>
    </div>
  `
  document.querySelector('.fight-layout')?.appendChild(overlay)

  const video = overlay.querySelector('video')
  let done = false
  const finish = () => {
    if (done) return
    done = true
    overlay.remove()
    endRound(winner)
  }

  if (video) {
    video.src = clipSrc
    const tryPlay = () => {
      void video.play().catch(() => {
        video.muted = true
        void video.play().catch(() => {})
      })
    }
    video.addEventListener('loadeddata', tryPlay, { once: true })
    video.addEventListener('ended', finish)
    video.addEventListener('error', () => {
      const by = overlay.querySelector('.fs-by')
      if (by) by.textContent = 'Clip missing — upload public/finalsmashes/*.mp4'
    })
    video.load()
  }

  const t = setTimeout(finish, 6200)
  f.timers.push(t)
}

function updateHud() {
  const f = state.fight
  if (!f) return
  for (const side of ['p1', 'p2']) {
    const pct = Math.max(0, (f.health[side] / MAX_HEALTH) * 100)
    const bar = document.getElementById(`hp-${side}`)
    if (bar) {
      bar.style.transform = `scaleX(${pct / 100})`
      bar.classList.toggle('low', pct <= 30)
      bar.classList.toggle('mid', pct > 30 && pct <= 60)
    }
    const status = document.getElementById(`status-${side}`)
    if (status) status.textContent = f.status[side]
  }
  const timer = document.getElementById('timer')
  if (timer) timer.textContent = String(Math.max(0, Math.ceil(f.timeLeft)))
}

function loopFight() {
  const f = state.fight
  if (!f) return

  const step = (now) => {
    if (!state.fight || state.fight !== f) return
    const dt = Math.min(0.05, (now - f.lastTick) / 1000)
    f.lastTick = now

    if (!f.over && f.arena) {
      const p1Input = readInput('p1')
      p1Input.block = f.keys.has(P1_KEYS.block)
      f.arena.fighters.p1.blocking = p1Input.block

      let p2Input
      if (state.mode === 'cpu') {
        p2Input = runAi(dt)
      } else {
        p2Input = readInput('p2')
        p2Input.block = f.keys.has(P2_KEYS.block)
        f.arena.fighters.p2.blocking = p2Input.block
      }

      f.arena.updateFighter(f.arena.fighters.p1, dt, p1Input)
      f.arena.updateFighter(f.arena.fighters.p2, dt, p2Input)
      f.arena.render(dt)

      f.timeLeft -= dt
      if (f.timeLeft <= 0) {
        f.timeLeft = 0
        if (f.health.p1 === f.health.p2) endRound('draw')
        else endRound(f.health.p1 > f.health.p2 ? f.p1Char : f.p2Char)
      }
      updateHud()
    } else if (f.arena) {
      f.arena.render(dt)
    }

    f.raf = requestAnimationFrame(step)
  }

  f.raf = requestAnimationFrame(step)
}

function runAi(dt) {
  const f = state.fight
  const cpu = f.arena.fighters.p2
  const player = f.arena.fighters.p1
  const input = { left: false, right: false, jump: false, block: false }

  f.aiCooldown -= dt

  const dx = player.x - cpu.x
  const dist = Math.abs(dx)

  // Approach slowly; keep a little space so the player can act
  if (dist > 2.8) {
    input.left = dx < 0
    input.right = dx > 0
  } else if (dist < 1.4) {
    // Back off more often than jump-in
    if (Math.random() < 0.55) {
      input.left = dx > 0
      input.right = dx < 0
    } else if (cpu.onGround && Math.random() < 0.08) {
      input.jump = true
      input.left = dx > 0
      input.right = dx < 0
    }
  }

  // Occasional hop over when crowded
  if (dist < 1.5 && player.onGround && cpu.onGround && Math.random() < 0.004) {
    input.jump = true
    input.left = dx > 0
    input.right = dx < 0
  }

  // Block only some incoming hits (readable, not perfect)
  if (player.attackTimer > 0 && dist < 2.5 && Math.random() < 0.28) {
    input.block = true
    cpu.blocking = true
    return input
  }

  cpu.blocking = false

  // Attack less often; prefer light moves; miss the window sometimes
  if (f.aiCooldown <= 0 && dist <= 2.2 && Math.abs(player.y - cpu.y) < 0.9) {
    if (Math.random() < 0.35) {
      // hesitate
      f.aiCooldown = 0.45 + Math.random() * 0.4
      return input
    }
    const roll = Math.random()
    const move = roll < 0.62 ? 'punch' : roll < 0.9 ? 'kick' : 'special'
    tryAttack('p2', move)
    f.aiCooldown = move === 'special' ? 1.8 : 0.95 + Math.random() * 0.55
  } else if (f.aiCooldown <= 0) {
    f.aiCooldown = 0.35 + Math.random() * 0.35
  }

  return input
}

function endRound(winner) {
  const f = state.fight
  if (!f) return
  // Allow endRound after Final Smash (over already true while finishing)
  if (f.over && !f.finishing) return
  f.over = true
  f.finishing = false
  f.winner = winner
  if (winner !== 'draw') playVoice(winner, 'victory')
  const mountHtml = document.getElementById('arena-mount')
  const canvas = mountHtml?.querySelector('canvas')
  renderFightShell()
  const newMount = document.getElementById('arena-mount')
  if (canvas && newMount) {
    newMount.appendChild(canvas)
    f.arena?.onResize()
  }
}

function teardownFight() {
  const f = state.fight
  if (!f) return
  cancelAnimationFrame(f.raf)
  ;(f.timers || []).forEach(clearTimeout)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  f.arena?.dispose()
  stopBgm()
  state.fight = null
}

/** Hidden easter egg: Q ×8 toggles Hava Nagila ↔ Miguel Nagila */
function onGlobalMusicKey(e) {
  const name = noteMusicToggleKey(e.code, { repeat: e.repeat })
  if (!name) return
  let toast = document.getElementById('music-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'music-toast'
    toast.className = 'music-toast'
    document.body.appendChild(toast)
  }
  toast.textContent = `♪ ${name}`
  toast.classList.add('show')
  clearTimeout(toast._hide)
  toast._hide = setTimeout(() => toast.classList.remove('show'), 1600)
}

window.addEventListener('keydown', onGlobalMusicKey)

render()

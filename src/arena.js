import * as THREE from 'three'
import { assetUrl } from './audio.js'

const ARENA_MIN = -7.2
const ARENA_MAX = 7.2
const GROUND_Y = 0
const GRAVITY = -28
const JUMP_V = 11.5
const MOVE_SPEED = 5.2
const FIGHTER_HEIGHT = 2.35
const ATTACK_RANGE = 2.55
const ATTACK_VERT = 1.35

/**
 * Side-view Three.js arena — Smash-style fighters with fitted face heads.
 */
export function createArena(container, p1Char, p2Char) {
  const width = container.clientWidth || 800
  const height = container.clientHeight || 480

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a1628)
  scene.fog = new THREE.Fog(0x0a1628, 14, 32)

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 80)
  camera.position.set(0, 2.35, 10.2)
  camera.lookAt(0, 1.55, 0)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true
  container.appendChild(renderer.domElement)

  scene.add(new THREE.AmbientLight(0xb8c8e0, 0.55))
  const key = new THREE.DirectionalLight(0xfff2d6, 1.2)
  key.position.set(4, 10, 6)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  scene.add(key)
  scene.add(new THREE.DirectionalLight(0x6ec1ff, 0.45).translateX(-6).translateY(4).translateZ(-4))
  const fill = new THREE.PointLight(0xf4d35e, 0.4, 30)
  fill.position.set(0, 3, 4)
  scene.add(fill)

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(20, 0.35, 6),
    new THREE.MeshStandardMaterial({ color: 0x8a7a62, roughness: 0.85, metalness: 0.05 }),
  )
  floor.position.set(0, -0.18, 0)
  floor.receiveShadow = true
  scene.add(floor)

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 10),
    new THREE.MeshStandardMaterial({ color: 0x1a2f4d, roughness: 1 }),
  )
  wall.position.set(0, 4.2, -3)
  scene.add(wall)

  for (const x of [-8, -4, 0, 4, 8]) {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.34, 5.5, 12),
      new THREE.MeshStandardMaterial({ color: 0xc9b89a, roughness: 0.7 }),
    )
    col.position.set(x, 2.5, -2.4)
    col.castShadow = true
    scene.add(col)
  }

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(18, 0.02, 0.35),
    new THREE.MeshStandardMaterial({ color: 0xf4d35e, emissive: 0x3a2e00, emissiveIntensity: 0.4 }),
  )
  stripe.position.set(0, 0.01, 1.2)
  scene.add(stripe)

  const loader = new THREE.TextureLoader()
  const p1 = buildFighter(p1Char, loader, -3.4, 1)
  const p2 = buildFighter(p2Char, loader, 3.4, -1)
  scene.add(p1.root)
  scene.add(p2.root)

  const fighters = { p1, p2 }
  const fx = []
  let shake = 0

  function onResize() {
    const w = container.clientWidth
    const h = container.clientHeight
    if (!w || !h) return
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener('resize', onResize)

  function updateFighter(f, dt, input) {
    if (!f.blocking && f.attackTimer <= 0) {
      if (input.left) f.vx = -MOVE_SPEED
      else if (input.right) f.vx = MOVE_SPEED
      else f.vx = 0
    } else if (f.attackTimer <= 0) {
      f.vx = 0
    }

    if (input.jump && f.onGround && f.attackTimer <= 0) {
      f.vy = JUMP_V
      f.onGround = false
    }

    // Attack lunge
    if (f.attackTimer > 0 && f.attackMove === 'punch') {
      f.vx = f.facing * 2.2
    } else if (f.attackTimer > 0 && f.attackMove === 'special') {
      f.vx = f.facing * 3.5
    }

    f.x += f.vx * dt
    f.vy += GRAVITY * dt
    f.y += f.vy * dt
    if (f.y <= GROUND_Y) {
      f.y = GROUND_Y
      f.vy = 0
      f.onGround = true
    }

    f.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, f.x))

    const other = f === fighters.p1 ? fighters.p2 : fighters.p1
    f.facing = f.x <= other.x ? 1 : -1
    f.root.scale.x = Math.abs(f.root.scale.x || 1) * f.facing

    resolveOverlap(fighters.p1, fighters.p2)
    f.root.position.set(f.x, f.y, 0)
    animatePose(f, dt, input)
  }

  function resolveOverlap(a, b) {
    const dx = b.x - a.x
    const dist = Math.abs(dx)
    const minDist = 1.05
    const clearing = a.y > 1.05 || b.y > 1.05
    if (clearing || dist >= minDist) return
    const push = (minDist - dist) / 2
    const dir = dx >= 0 ? 1 : -1
    a.x -= dir * push
    b.x += dir * push
    a.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, a.x))
    b.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, b.x))
  }

  function animatePose(f, dt, input) {
    f.animT += dt
    const walking = f.onGround && Math.abs(f.vx) > 0.4 && f.attackTimer <= 0
    const bob = walking ? Math.sin(f.animT * 14) * 0.22 : 0

    // Reset base pose
    f.leftArm.rotation.set(0, 0, 0.12)
    f.rightArm.rotation.set(0, 0, -0.12)
    f.leftLeg.rotation.set(0, 0, 0)
    f.rightLeg.rotation.set(0, 0, 0)
    f.torso.rotation.set(0, 0, 0)
    f.headGroup.rotation.set(0, 0, 0)

    if (walking) {
      f.leftLeg.rotation.x = bob
      f.rightLeg.rotation.x = -bob
      f.leftArm.rotation.x = -bob * 0.9
      f.rightArm.rotation.x = bob * 0.9
    }

    if (f.attackTimer > 0) {
      f.attackTimer -= dt
      const t = 1 - Math.max(0, f.attackTimer) / f.attackDur
      const swing = Math.sin(Math.min(1, t) * Math.PI) // 0→1→0

      if (f.attackMove === 'punch') {
        // Wind-up then forward jab: hanging arm (+rot.z) swings to +X toward opponent
        if (t < 0.22) {
          const u = t / 0.22
          f.rightArm.rotation.z = -0.55 * u // cock back
          f.rightArm.rotation.x = 0.35 * u
          f.leftArm.rotation.z = 0.45 * u
          f.torso.rotation.y = -0.2 * u
        } else {
          const u = (t - 0.22) / 0.78
          const jab = Math.sin(Math.min(1, u) * Math.PI)
          f.rightArm.rotation.z = 1.65 * jab // thrust forward horizontal
          f.rightArm.rotation.x = -0.15 * jab
          f.leftArm.rotation.z = -0.55 * jab // rear hand back
          f.torso.rotation.y = 0.45 * jab
          f.torso.rotation.z = -0.1 * jab
          f.headGroup.rotation.z = 0.1 * jab
        }
        f.fist.visible = true
        f.fist.scale.setScalar(1.15 + 0.9 * swing)
      } else if (f.attackMove === 'kick') {
        // Chamber knee, then snap front kick forward/up
        if (t < 0.3) {
          const u = t / 0.3
          f.rightLeg.rotation.z = 0.9 * u // knee up
          f.rightLeg.rotation.x = -0.8 * u
          f.leftArm.rotation.z = -0.4 * u
          f.rightArm.rotation.z = 0.35 * u
          f.torso.rotation.z = 0.12 * u
        } else {
          const u = (t - 0.3) / 0.7
          const kick = Math.sin(Math.min(1, u) * Math.PI)
          f.rightLeg.rotation.z = 1.85 * kick // leg extends forward/high
          f.rightLeg.rotation.x = -0.25 * kick
          f.leftLeg.rotation.z = 0.15 * kick
          f.leftArm.rotation.z = -0.7 * kick
          f.rightArm.rotation.z = 0.55 * kick
          f.torso.rotation.z = 0.22 * kick
          f.torso.rotation.x = -0.12 * kick
        }
        f.foot.visible = true
        f.foot.scale.setScalar(1.1 + 0.8 * swing)
      } else if (f.attackMove === 'special') {
        // Overhead wind-up then both-arm forward smash
        if (t < 0.35) {
          const u = t / 0.35
          f.rightArm.rotation.x = -2.6 * u
          f.leftArm.rotation.x = -2.4 * u
          f.rightArm.rotation.z = 0.25 * u
          f.leftArm.rotation.z = -0.25 * u
          f.torso.rotation.x = -0.45 * u
        } else {
          const u = (t - 0.35) / 0.65
          const smash = Math.sin(u * Math.PI)
          f.rightArm.rotation.x = -2.6 + 2.4 * u
          f.leftArm.rotation.x = -2.4 + 2.2 * u
          f.rightArm.rotation.z = 1.5 * smash
          f.leftArm.rotation.z = 1.1 * smash
          f.torso.rotation.x = -0.45 + 0.8 * smash
          f.torso.rotation.z = -0.12 * smash
        }
        f.aura.visible = true
        f.aura.material.opacity = 0.15 + 0.55 * swing
        f.aura.scale.setScalar(1 + 1.2 * swing)
      }

      if (f.attackTimer <= 0) {
        f.attackMove = null
        f.rightArm.position.set(f.rightArmRest.x, f.rightArmRest.y, f.rightArmRest.z)
        f.leftArm.position.set(f.leftArmRest.x, f.leftArmRest.y, f.leftArmRest.z)
        f.rightLeg.position.set(f.rightLegRest.x, f.rightLegRest.y, f.rightLegRest.z)
        f.fist.visible = false
        f.foot.visible = false
        f.aura.visible = false
      }
    } else if (f.blocking) {
      f.leftArm.rotation.x = -1.25
      f.rightArm.rotation.x = -1.25
      f.leftArm.rotation.z = 0.85
      f.rightArm.rotation.z = -0.85
      f.torso.rotation.x = 0.15
    }

    if (!f.onGround) {
      f.leftLeg.rotation.x = 0.55
      f.rightLeg.rotation.x = 0.35
      f.leftArm.rotation.z = 0.45
      f.rightArm.rotation.z = -0.45
    }

    if (f.hitFlash > 0) {
      f.hitFlash -= dt
      f.bodyMat.emissive.setHex(f.hitFlash > 0 ? 0x882222 : 0x000000)
      f.root.position.x = f.x + Math.sin(f.hitFlash * 60) * 0.05
    }
  }

  function inRange(attacker, defender) {
    const reach =
      attacker.attackMove === 'kick' ? ATTACK_RANGE + 0.25 : ATTACK_RANGE
    return (
      Math.abs(attacker.x - defender.x) <= reach &&
      Math.abs(attacker.y - defender.y) <= ATTACK_VERT
    )
  }

  function playAttackAnim(f, move) {
    f.attackMove = move
    f.attackDur = move === 'special' ? 0.58 : move === 'kick' ? 0.42 : 0.32
    f.attackTimer = f.attackDur
    f.fist.visible = move === 'punch'
    f.foot.visible = move === 'kick'
    f.aura.visible = move === 'special'
  }

  function flashHit(f, from) {
    f.hitFlash = 0.28
    shake = 0.28
    // Impact star between fighters
    const midX = (f.x + from.x) / 2
    const midY = 1.2 + f.y * 0.5
    const star = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      new THREE.MeshBasicMaterial({ color: 0xffe566, transparent: true, opacity: 1 }),
    )
    star.position.set(midX, midY, 0.6)
    scene.add(star)
    fx.push({ mesh: star, life: 0.28 })
  }

  function render(dt = 0.016) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const p = fx[i]
      p.life -= dt
      p.mesh.scale.multiplyScalar(1.08)
      p.mesh.material.opacity = Math.max(0, p.life * 3)
      p.mesh.rotation.y += 0.3
      if (p.life <= 0) {
        scene.remove(p.mesh)
        fx.splice(i, 1)
      }
    }

    const midX = (fighters.p1.x + fighters.p2.x) / 2
    let camX = midX * 0.25
    let camY = 2.35
    if (shake > 0) {
      shake -= dt
      camX += (Math.random() - 0.5) * shake * 1.8
      camY += (Math.random() - 0.5) * shake * 1.2
    }
    camera.position.x += (camX - camera.position.x) * 0.08
    camera.position.y += (camY - camera.position.y) * 0.08
    camera.lookAt(midX * 0.25, 1.55, 0)
    renderer.render(scene, camera)
  }

  function dispose() {
    window.removeEventListener('resize', onResize)
    for (const p of fx) scene.remove(p.mesh)
    renderer.dispose()
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }

  return {
    fighters,
    updateFighter,
    inRange,
    playAttackAnim,
    flashHit,
    render,
    dispose,
    onResize,
  }
}

function buildFighter(character, loader, startX, facing) {
  const b = character.body
  const root = new THREE.Group()
  const suit = new THREE.Color(character.color)
  const suitDark = suit.clone().multiplyScalar(0.62)
  const bodyMat = new THREE.MeshStandardMaterial({
    color: suit,
    roughness: b.style === 'military' ? 0.75 : 0.5,
    metalness: 0.08,
    emissive: 0x000000,
  })
  const pantMat = new THREE.MeshStandardMaterial({ color: suitDark, roughness: 0.72 })
  const skinMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(b.skin), roughness: 0.85 })
  const shirtMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(character.shirt || '#f2f5fa'),
    roughness: 0.7,
  })

  const torsoR = 0.28 * b.torsoW
  const torsoLen = 0.62 * b.torsoH
  const torsoY = 1.12 * b.height
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(torsoR, torsoLen, 6, 14), bodyMat)
  torso.position.y = torsoY
  torso.castShadow = true
  root.add(torso)

  if (b.style === 'military' || b.style === 'stocky' || b.style === 'heavy') {
    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(0.55 * b.shoulder, 0.4 * b.torsoH, 0.34 * b.torsoW),
      bodyMat,
    )
    chest.position.set(0, torsoY + 0.05, 0.02)
    chest.castShadow = true
    root.add(chest)
  }

  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.2 * b.torsoW, 0.32 * b.torsoH, 0.28), shirtMat)
  shirt.position.set(0, torsoY + 0.08, 0.14 * b.torsoW)
  root.add(shirt)

  if (character.tie) {
    const tie = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.3 * b.torsoH, 0.04),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(character.tie), roughness: 0.45 }),
    )
    tie.position.set(0, torsoY + 0.02, 0.2 * b.torsoW)
    root.add(tie)
  }

  // Legs as pivot groups (hip → down)
  const legLen = 0.55 * b.leg
  const legR = 0.11 * (0.85 + b.torsoW * 0.15)
  const hipY = torsoY - torsoLen * 0.45
  const legSpread = 0.14 * b.torsoW

  const leftLeg = makeLimb(legR, legLen, pantMat, 'down')
  leftLeg.position.set(-legSpread, hipY, 0)
  root.add(leftLeg)
  const rightLeg = makeLimb(legR, legLen, pantMat, 'down')
  rightLeg.position.set(legSpread, hipY, 0)
  root.add(rightLeg)

  const foot = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.08, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 }),
  )
  foot.position.set(0, -legLen - 0.05, 0.06)
  foot.visible = false
  rightLeg.add(foot)

  // Arms as pivot groups (shoulder → down)
  const armLen = 0.5 * b.arm
  const armR = 0.085 * (0.9 + b.arm * 0.1)
  const armX = 0.4 * b.shoulder
  const armY = torsoY + 0.18

  const leftArm = makeLimb(armR, armLen, bodyMat, 'down')
  leftArm.position.set(-armX, armY, 0)
  root.add(leftArm)
  const rightArm = makeLimb(armR, armLen, bodyMat, 'down')
  rightArm.position.set(armX, armY, 0)
  root.add(rightArm)
  const leftArmRest = leftArm.position.clone()
  const rightArmRest = rightArm.position.clone()
  const rightLegRest = rightLeg.position.clone()

  const fist = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 12, 12),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(b.skin), roughness: 0.7 }),
  )
  fist.position.set(0, -armLen - 0.05, 0)
  fist.visible = false
  rightArm.add(fist)

  // Extra-large Smash-style head so faces are readable in fight
  const headGroup = new THREE.Group()
  const headScale = 2.05 * b.head
  const headY = torsoY + torsoLen * 0.5 + 0.42 * headScale
  headGroup.position.y = headY

  // Back-of-head hemisphere only (+Z is open). Portrait disc is the whole face.
  const headR = 0.34 * headScale
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(headR, 28, 20, Math.PI, Math.PI),
    skinMat,
  )
  head.castShadow = true
  headGroup.add(head)

  // Face disc in front — nothing skin-colored overlaps the portrait
  const faceMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0.02,
  })
  const face = new THREE.Mesh(new THREE.CircleGeometry(headR * 0.99, 48), faceMat)
  face.position.set(0, 0.02, 0.02)
  face.renderOrder = 2
  headGroup.add(face)

  loader.load(
  assetUrl(character.avatar),
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      faceMat.map = tex
      faceMat.needsUpdate = true
    },
    undefined,
    () => {},
  )

  addBodyProps(character, headGroup, { ...b, head: headScale })
  root.add(headGroup)

  // Special aura (hidden)
  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 16, 16),
    new THREE.MeshBasicMaterial({
      color: character.accent,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  )
  aura.position.y = torsoY
  aura.visible = false
  root.add(aura)

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.32 * b.torsoW, 0.46 * b.torsoW, 32),
    new THREE.MeshBasicMaterial({
      color: character.accent,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.03
  root.add(ring)

  root.scale.set(facing * (0.92 + b.torsoW * 0.04), b.height, 0.95 + b.torsoW * 0.03)
  root.position.set(startX, 0, 0)

  return {
    root,
    torso,
    headGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    leftArmRest,
    rightArmRest,
    rightLegRest,
    fist,
    foot,
    aura,
    bodyMat,
    x: startX,
    y: 0,
    vx: 0,
    vy: 0,
    facing,
    onGround: true,
    blocking: false,
    animT: 0,
    attackTimer: 0,
    attackDur: 0.28,
    attackMove: null,
    hitFlash: 0,
    height: FIGHTER_HEIGHT * b.height,
  }
}

/** Limb group with mesh hanging from pivot (shoulder/hip). */
function makeLimb(radius, length, material, _dir) {
  const pivot = new THREE.Group()
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 8), material)
  mesh.position.y = -length / 2 - radius * 0.2
  mesh.castShadow = true
  pivot.add(mesh)
  return pivot
}

function addBodyProps(character, headGroup, b) {
  const props = new Set(character.body.props || [])
  const hairMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(b.hair), roughness: 0.92 })
  const hs = b.head

  if (props.has('silverHair') || props.has('silverWavyHair') || props.has('recedingGray')) {
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.3 * hs, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.3),
      hairMat,
    )
    hair.position.y = 0.1 * hs
    headGroup.add(hair)
  }

  if (props.has('recedingHair')) {
    const hairL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.22), hairMat)
    hairL.position.set(-0.22 * hs, 0.04, 0)
    const hairR = hairL.clone()
    hairR.position.x = 0.22 * hs
    headGroup.add(hairL, hairR)
  }

  if (props.has('knitKippah')) {
    const kippah = new THREE.Mesh(
      new THREE.SphereGeometry(0.22 * hs, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.15),
      new THREE.MeshStandardMaterial({ color: 0x6b4f2a, roughness: 0.95 }),
    )
    kippah.position.set(0, 0.16 * hs, -0.02)
    headGroup.add(kippah)
  }

  if (props.has('whiteKippah')) {
    const kippah = new THREE.Mesh(
      new THREE.SphereGeometry(0.24 * hs, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.1),
      new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.95 }),
    )
    kippah.position.set(0, 0.18 * hs, -0.02)
    headGroup.add(kippah)
  }

  if (props.has('glasses')) {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.4, roughness: 0.35 })
    const z = 0.34 * hs * 0.82
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.025), frameMat)
    bridge.position.set(0, 0.04, z)
    const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.02), frameMat)
    lensL.position.set(-0.11, 0.04, z)
    const lensR = lensL.clone()
    lensR.position.x = 0.11
    headGroup.add(bridge, lensL, lensR)
  }

  // Beard/goatee sit under the chin — never over the face texture
  if (props.has('fullBeard')) {
    const beard = new THREE.Mesh(
      new THREE.SphereGeometry(0.16 * hs, 12, 10, 0, Math.PI * 2, Math.PI / 2.2, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.95 }),
    )
    beard.position.set(0, -0.28 * hs, 0.06)
    headGroup.add(beard)
  }

  if (props.has('grayGoatee')) {
    const goatee = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.06 * hs, 0.1 * hs, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.95 }),
    )
    goatee.position.set(0, -0.32 * hs, 0.12 * hs)
    headGroup.add(goatee)
  }
}

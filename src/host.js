/**
 * dsh-rich-sync — Host half.
 *
 * Device file streaming over websockets: link another machine, mirror one of
 * its folders as a real local directory, edit it with every tool, run
 * commands remotely, changes stream both directions.
 *
 * Shape (operator survey 2026-08-27, research-locked):
 *  - Local mirror: the remote folder materializes under
 *    ~/.dsh/rich-sync/mirrors/<deviceId>/<slug>/ — a REAL directory, so bash,
 *    git, grep and the workspace picker all compose natively.
 *  - Topology: wormhole-style relay — every install registers a hub endpoint
 *    (/api/rich-sync/ws upgrade on the public node's DSH); devices dial OUT
 *    to a hub URL; the hub routes messages between paired sockets. Neither
 *    device needs a public URL (the public node IS the hub).
 *  - Pairing: short code shown on the transmitter, entered on the subscriber,
 *    exchanged (routed by deviceId) for a long-lived per-peer token. Code
 *    refresh invalidates nothing already linked; Unlink revokes the token.
 *  - Protocol: VS Code diskFileSystemProvider-shaped ops (stat/list/read/
 *    write/mkdir/delete/rename) + fileChange push events, JSON over one
 *    websocket; plus an exec channel (command runs on the transmitter inside
 *    the synced tree, output streams back).
 *  - Full root access for now (operator: gate later).
 *
 * HTTP panel API (loopback + browser-marker fenced, like rich-context):
 *  - GET  /api/rich-sync/state          identity, peers, mirrors, status
 *  - POST /api/rich-sync/code           refresh pairing code
 *  - POST /api/rich-sync/hub            set the hub URL this device dials to
 *  - POST /api/rich-sync/link           pair to a transmitter (url+id+code)
 *  - POST /api/rich-sync/browse         list a directory on a device
 *  - POST /api/rich-sync/sync           mirror a remote folder + workspace
 *  - POST /api/rich-sync/workspace      register a sub-workspace
 *  - POST /api/rich-sync/unlink         revoke a peer + stop sync
 *  - POST /api/rich-sync/exec           run a command on a device
 *
 * Model-facing tool `remote` (single lane): status + exec — agents run
 * commands on the device their workspace mirrors.
 *
 * Zero runtime deps beyond `ws` (already in the profile) + node builtins.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync, statSync, watchFile, rmSync, renameSync, createReadStream, createWriteStream, openSync, closeSync, readSync, writeSync, futimesSync } from 'node:fs'
import { join, dirname, basename, resolve as resolvePath } from 'node:path'
import { homedir, hostname } from 'node:os'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { watch } from 'node:fs'
import { WebSocketServer, WebSocket } from 'ws'

const API_PREFIX = '/api/rich-sync'
const WS_PATH = `${API_PREFIX}/ws`
const ACTION_LIMIT = 2_000_000
const DSH_HOME = process.env.DSH_HOME ?? join(homedir(), '.dsh')
const STORE_DIR = join(DSH_HOME, 'rich-sync')
const MIRROR_ROOT = join(STORE_DIR, 'mirrors')
const IDENTITY_FILE = join(STORE_DIR, 'identity.json')
const PEERS_FILE = join(STORE_DIR, 'peers.json')
const SYNC_CONFIG_FILE = join(STORE_DIR, 'sync.json')
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
/** Max bytes for a single read/write op (matches rich-context ACTION_LIMIT spirit). */
const MAX_FILE_BYTES = 8 * 1024 * 1024

export const name = 'dsh-rich-sync'
export const inject = ['tools', 'webServer', 'workspaceRegistry']

// ── Store helpers ────────────────────────────────────────────────────────────
function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return fallback }
}

function writeJsonFile(file, value) {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(value, null, 2), 'utf8')
}

function randomCode(length = 8) {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i += 1) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return out
}

function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || 'root'
}

/** Normalize an absolute path; reject escapes. */
function normalizeRemotePath(path) {
  const clean = resolvePath('/', String(path ?? ''))
  return clean
}

/** Version token: the vscode-style etag (mtimeMs:size). */
function versionOf(stats) {
  return `${Math.round(stats.mtimeMs)}:${stats.size}`
}

// ── Identity & peers ─────────────────────────────────────────────────────────
class SyncStore {
  constructor() {
    mkdirSync(STORE_DIR, { recursive: true })
    const identity = readJson(IDENTITY_FILE, null)
    if (identity === null || typeof identity.deviceId !== 'string' || identity.deviceId === '') {
      this.identity = {
        deviceId: randomBytes(4).toString('hex'),
        name: hostname(),
        pairingCode: randomCode(),
        hubUrl: '',
      }
      writeJsonFile(IDENTITY_FILE, this.identity)
    } else {
      this.identity = identity
    }
    this.peers = readJson(PEERS_FILE, [])
    this.syncs = readJson(SYNC_CONFIG_FILE, [])
  }

  saveIdentity() { writeJsonFile(IDENTITY_FILE, this.identity) }
  savePeers() { writeJsonFile(PEERS_FILE, this.peers) }
  saveSyncs() {
    // Runtime-only fields (watcher handles, timers) never persist — a
    // truthy {} after restart would stop #watchLocal from re-arming.
    const clean = this.syncs.map(({ localWatcher, pushTimer, ...rest }) => rest)
    writeJsonFile(SYNC_CONFIG_FILE, clean)
  }

  refreshCode() {
    this.identity.pairingCode = randomCode()
    this.saveIdentity()
    return this.identity.pairingCode
  }

  setHubUrl(url) {
    this.identity.hubUrl = String(url ?? '').trim()
    this.saveIdentity()
  }

  peer(id) { return this.peers.find((peer) => peer.deviceId === id) }

  upsertPeer(peer) {
    const index = this.peers.findIndex((entry) => entry.deviceId === peer.deviceId)
    if (index >= 0) this.peers[index] = { ...this.peers[index], ...peer }
    else this.peers.push(peer)
    this.savePeers()
  }

  dropPeer(id) {
    this.peers = this.peers.filter((peer) => peer.deviceId !== id)
    this.syncs = this.syncs.filter((sync) => sync.deviceId !== id)
    this.savePeers()
    this.saveSyncs()
  }
}

// ── Transmitter: serve filesystem ops + exec on this device ──────────────────
class Transmitter {
  constructor(ctx) {
    this.ctx = ctx
    /** peerId -> Set<rootPath> the peer subscribed to watch events for. */
    this.watchRoots = new Map()
    this.watchers = new Map() // rootPath -> fs.FSWatcher
    this.pendingEvents = new Map() // rootPath -> Map<path, kind> (debounced)
  }

  /** Serve one protocol request. Returns the result object or throws. */
  async serve(op, args, peerId) {
    switch (op) {
      case 'stat': {
        const path = normalizeRemotePath(args.path)
        try {
          const stats = statSync(path)
          return { type: stats.isDirectory() ? 'directory' : stats.isFile() ? 'file' : 'other', size: stats.size, version: versionOf(stats) }
        } catch { return null }
      }
      case 'list': {
        const path = normalizeRemotePath(args.path)
        const entries = []
        for (const name of readdirSync(path)) {
          const child = join(path, name)
          let type = 'other'
          let size
          let version
          try {
            const stats = statSync(child)
            type = stats.isDirectory() ? 'directory' : stats.isFile() ? 'file' : 'other'
            size = stats.size
            version = versionOf(stats)
          } catch { /* raced away — still list the name */ }
          entries.push({ name, type, size, version })
        }
        entries.sort((a, b) => a.name.localeCompare(b.name))
        return entries
      }
      case 'read': {
        const path = normalizeRemotePath(args.path)
        const stats = statSync(path)
        if (!stats.isFile()) throw new Error(`not a regular file: ${path}`)
        if (stats.size > MAX_FILE_BYTES) throw new Error(`file too large (${stats.size} > ${MAX_FILE_BYTES}): ${path}`)
        const buffer = Buffer.allocUnsafe(stats.size)
        const fd = openSync(path, 'r')
        let offset = 0
        try {
          while (offset < stats.size) {
            const read = readSync(fd, buffer, offset, stats.size - offset, null)
            // File shrank between stat and read (TOCTOU): a zero read never
            // advances — break instead of wedging the event loop forever.
            if (read === 0) break
            offset += read
          }
        } finally { closeSync(fd) }
        if (buffer.includes(0, 0, offset)) {
          // Binary payload: base64 (the pull side decodes; pushes already refuse).
          return { binary: true, content: buffer.subarray(0, offset).toString('base64'), version: versionOf(stats) }
        }
        return { content: buffer.subarray(0, offset).toString('utf8'), version: versionOf(stats) }
      }
      case 'write': {
        const path = normalizeRemotePath(args.path)
        const content = String(args.content ?? '')
        if (Buffer.byteLength(content) > MAX_FILE_BYTES) throw new Error('content too large')
        const existed = existsSync(path)
        if (existed) {
          const stats = statSync(path)
          if (args.expectedVersion !== undefined && versionOf(stats) !== args.expectedVersion) {
            throw new Error(`stale version on ${path}`)
          }
        } else if (args.expectedVersion !== undefined) {
          throw new Error(`no such file to replace: ${path}`)
        }
        mkdirSync(dirname(path), { recursive: true })
        writeFileSync(path, content, 'utf8')
        return { operation: existed ? 'update' : 'create', version: versionOf(statSync(path)) }
      }
      case 'mkdir': {
        const path = normalizeRemotePath(args.path)
        mkdirSync(path, { recursive: true })
        return { ok: true }
      }
      case 'delete': {
        const path = normalizeRemotePath(args.path)
        rmSync(path, { recursive: true, force: true })
        return { ok: true }
      }
      case 'rename': {
        const from = normalizeRemotePath(args.from)
        const to = normalizeRemotePath(args.to)
        mkdirSync(dirname(to), { recursive: true })
        renameSync(from, to)
        return { ok: true }
      }
      case 'watch': {
        const root = normalizeRemotePath(args.root)
        let set = this.watchRoots.get(peerId)
        if (set === undefined) { set = new Set(); this.watchRoots.set(peerId, set) }
        set.add(root)
        this.#ensureWatcher(root)
        return { ok: true }
      }
      case 'unwatch': {
        const root = normalizeRemotePath(args.root)
        const set = this.watchRoots.get(peerId)
        if (set !== undefined) set.delete(root)
        this.#releaseWatchers()
        return { ok: true }
      }
      default:
        throw new Error(`unknown op "${op}"`)
    }
  }

  #ensureWatcher(root) {
    if (this.watchers.has(root)) return
    try {
      const watcher = watch(root, { recursive: true }, (_event, filename) => {
        const path = filename === null || filename === undefined ? root : join(root, String(filename))
        this.#recordEvent(root, path)
      })
      watcher.on('error', () => { this.watchers.delete(root) })
      this.watchers.set(root, watcher)
    } catch (error) {
      console.warn(`[dsh-rich-sync] watch failed on ${root}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  #releaseWatchers() {
    const watched = new Set()
    for (const set of this.watchRoots.values()) for (const root of set) watched.add(root)
    for (const [root, watcher] of this.watchers) {
      if (!watched.has(root)) { watcher.close(); this.watchers.delete(root) }
    }
  }

  #recordEvent(root, path) {
    let byPath = this.pendingEvents.get(root)
    if (byPath === undefined) { byPath = new Map(); this.pendingEvents.set(root, byPath) }
    byPath.set(path, existsSync(path) ? 'changed' : 'deleted')
    clearTimeout(this._flushTimer)
    this._flushTimer = setTimeout(() => this.#flushEvents(), 80)
  }

  #flushEvents() {
    const batch = []
    for (const [root, byPath] of this.pendingEvents) {
      for (const [path, kind] of byPath) batch.push({ root, path, kind })
      byPath.clear()
    }
    if (batch.length > 0) this.onEvents?.(batch)
  }

  /** Engine hook: drop watchers no peer subscribes to anymore. */
  releaseWatchersPublic() { this.#releaseWatchers() }

  stopAll() {
    for (const watcher of this.watchers.values()) watcher.close()
    this.watchers.clear()
    this.watchRoots.clear()
  }
}

/** Run one command on this device (exec channel). Streams output via onChunk. */
function runExec({ command, cwd }, onChunk, onOrphan) {
  return new Promise((resolvePromise) => {
    const child = spawn('bash', ['-lc', String(command ?? '')], { cwd: normalizeRemotePath(cwd || homedir()) })
    try { child.stdin.end() } catch { /* already gone */ }
    onOrphan?.(child)
    let settled = false
    const settle = (exitCode, error) => {
      if (settled) return
      settled = true
      resolvePromise({ exitCode: exitCode ?? -1, error: error ?? null })
    }
    child.stdout.on('data', (chunk) => onChunk('stdout', chunk.toString('utf8')))
    child.stderr.on('data', (chunk) => onChunk('stderr', chunk.toString('utf8')))
    child.on('error', (error) => settle(null, error.message))
    child.on('close', (code) => settle(code, null))
  })
}

// ── Wire: one JSON protocol over a websocket ─────────────────────────────────
/**
 * A Wire wraps a websocket with request/response correlation + event push.
 * Framing: {id, op, ...} requests, {id, ok, result|error} responses,
 * {type:'events'|'exec-out'|'exec-start', ...} pushes. Every message carries
 * `from` (sender deviceId) and, when routed through a hub, `to` (recipient).
 */
class Wire {
  constructor(socket, handlers) {
    this.socket = socket
    this.handlers = handlers
    this.pending = new Map()
    this.nextId = 1
    this.closed = false
    this.peerId = null // set once the remote side identifies itself
    socket.on('message', (raw) => { void this.#dispatch(raw) })
    socket.on('close', () => {
      this.closed = true
      for (const { reject } of this.pending.values()) reject(new Error('connection closed'))
      this.pending.clear()
      handlers.onClose?.(this)
    })
    socket.on('error', () => { /* close follows */ })
  }

  #send(message) {
    if (this.closed) return
    try { this.socket.send(JSON.stringify(message)) } catch { /* closing */ }
  }

  async #dispatch(raw) {
    let message
    try { message = JSON.parse(raw.toString('utf8')) } catch { return }
    try {
      if (message.id !== undefined && message.op !== undefined) {
        const result = await this.handlers.onRequest(message, this)
        if (message.from !== undefined) this.peerId = message.from
        this.#send({ id: message.id, ok: true, result, to: message.from })
        return
      }
      if (message.id !== undefined && message.ok !== undefined) {
        const entry = this.pending.get(message.id)
        if (entry !== undefined) {
          this.pending.delete(message.id)
          if (message.ok) entry.resolve(message.result)
          else entry.reject(new Error(message.error ?? 'remote error'))
        }
        return
      }
      if (message.type !== undefined) await this.handlers.onPush(message, this)
    } catch (error) {
      if (message.id !== undefined && message.op !== undefined) {
        this.#send({ id: message.id, ok: false, error: error instanceof Error ? error.message : String(error), to: message.from })
      }
    }
  }

  request(op, args = {}, timeoutMs = 30_000) {
    const id = this.nextId
    this.nextId += 1
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`request "${op}" timed out after ${timeoutMs}ms`))
      }, timeoutMs)
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolvePromise(value) },
        reject: (error) => { clearTimeout(timer); reject(error) },
      })
      this.#send({ id, op, ...args })
    })
  }

  send(message) { this.#send(message) }
}

/** Open a websocket to a URL and wait for it (or throw). */
function openSocket(url, timeoutMs = 15_000) {
  return new Promise((resolvePromise, reject) => {
    const socket = new WebSocket(url, { handshakeTimeout: timeoutMs })
    const timer = setTimeout(() => reject(new Error(`connect timeout: ${url}`)), timeoutMs)
    socket.onopen = () => { clearTimeout(timer); resolvePromise(socket) }
    socket.onerror = () => { clearTimeout(timer); reject(new Error(`cannot connect to ${url}`)) }
  })
}

// ── The engine: hub endpoint + outbound hub link + mirror ────────────────────
/**
 * Routing model (wormhole-shaped, one socket per device):
 *  - Every install registers the hub endpoint; the PUBLIC device's endpoint is
 *    the meeting point. Every device keeps ONE outbound socket open to its
 *    configured hub URL (`identity.hubUrl`); the hub device itself has none.
 *  - Messages carry `to` (recipient deviceId). A hub forwards anything not
 *    addressed to itself; the recipient serves it locally. `from` identifies
 *    the sender for replies and pairing.
 *  - Pairing: the subscriber sends {op:'pair', to: transmitterId, code} over
 *    its hub socket; the hub relays the knock; the transmitter validates the
 *    code, mints a long-lived token, replies; both sides store the peer. The
 *    hub marks the subscriber's socket as a known routing participant.
 */
class SyncEngine {
  constructor(ctx, store) {
    this.ctx = ctx
    this.store = store
    this.transmitter = new Transmitter(ctx)
    /** deviceId -> Wire (devices connected to MY hub endpoint). */
    this.hubSockets = new Map()
    /** My ONE outbound socket to my hub (null when I am the hub / unconfigured). */
    this.outbound = null
    this.mirrorRunning = new Map()
    /** local path -> expiry: watcher events for paths WE wrote are echoes (multi-event inotify). */
    this.echoGuard = new Map()
    /** local path -> sha1 of the last content we applied FROM the remote (suppress push-back). */
    this.lastApplied = new Map()
    this.onPeerStateChange = null

    this.transmitter.onEvents = (batch) => {
      const byPeer = new Map()
      for (const entry of batch) {
        for (const [peerId, roots] of this.transmitter.watchRoots) {
          for (const root of roots) {
            if (entry.path === root || entry.path.startsWith(`${root}/`)) {
              const list = byPeer.get(peerId) ?? []
              list.push({ path: entry.path, kind: entry.kind })
              byPeer.set(peerId, list)
            }
          }
        }
      }
      for (const [peerId, changes] of byPeer) this.route(peerId, { type: 'events', changes }).catch(() => {})
    }
  }

  /** Files written by the current initial sync (cap guard). */
  #syncedFiles = 0

  get myId() { return this.store.identity.deviceId }

  #guardLocal(path) {
    this.echoGuard.set(path, Date.now() + 2000)
  }

  #isGuarded(path) {
    const expiry = this.echoGuard.get(path)
    if (expiry === undefined) return false
    if (Date.now() > expiry) { this.echoGuard.delete(path); return false }
    return true
  }

  #hash(content) {
    return createHash('sha1').update(String(content ?? '')).digest('hex')
  }

  // ── Routing ────────────────────────────────────────────────────────────────
  /** Route one message to a peer: hub socket first, else my outbound link. */
  async route(peerId, message) {
    const token = this.store.peer(peerId)?.token
    const payload = { ...message, from: this.myId, to: peerId, ...(token !== undefined ? { token } : {}) }
    const hubWire = this.hubSockets.get(peerId)
    if (hubWire !== undefined && !hubWire.closed) { hubWire.send(payload); return }
    if (this.outbound !== null && !this.outbound.closed) { this.outbound.send(payload); return }
    throw new Error(`device ${peerId} is not connected (set a hub URL or wait for it to dial in)`)
  }

  /** Request/response against a peer, whatever the transport. */
  async peerRequest(peerId, op, args = {}, timeoutMs = 30_000) {
    const token = this.store.peer(peerId)?.token
    const payload = { ...args, from: this.myId, to: peerId, ...(token !== undefined ? { token } : {}) }
    const hubWire = this.hubSockets.get(peerId)
    if (hubWire !== undefined && !hubWire.closed) return hubWire.request(op, payload, timeoutMs)
    if (this.outbound !== null && !this.outbound.closed) return this.outbound.request(op, payload, timeoutMs)
    throw new Error(`device ${peerId} is not connected`)
  }

  /** Serve one op addressed to ME (arrived on any socket). */
  async #serveLocal(message, wire) {
    const peerId = message.from ?? wire.peerId ?? 'unknown'
    // End-to-end auth: every op except the pairing knock must carry the
    // per-peer token minted at pairing time (the hub relay is untrusted).
    if (message.op !== 'pair' && message.op !== 'hello-hub') {
      const peer = this.store.peer(peerId)
      if (peer === undefined || message.token !== peer.token) {
        throw new Error(`unauthorized request from ${peerId}`)
      }
    }
    switch (message.op) {
      case 'hello-hub': {
        // A device identifies its socket so the hub can route to it.
        const claim = String(message.from ?? '')
        if (claim === '') throw new Error('hello-hub requires from')
        // Identity takeover guard: a live registration for this id exists →
        // refuse (closing the imposter), never silently re-route a victim.
        const existing = this.hubSockets.get(claim)
        if (existing !== undefined && existing !== wire && !existing.closed) {
          throw new Error(`device ${claim} is already connected to this hub`)
        }
        wire.peerId = claim
        this.hubSockets.set(claim, wire)
        this.onPeerStateChange?.()
        return { ok: true, hubDeviceId: this.myId, name: this.store.identity.name }
      }
      case 'pair': {
        // Pairing knock: validate my current code, mint a long-lived token.
        // Brute-force limits: per-socket AND per-claimed-id global lockout
        // (reconnecting must not reset the guess budget).
        const claimant = String(message.from ?? 'anon')
        this.pairLocks ??= new Map()
        const lock = this.pairLocks.get(claimant) ?? { misses: 0, until: 0 }
        if (Date.now() < lock.until) throw new Error('pairing locked for this device, try later')
        wire.pairMisses = (wire.pairMisses ?? 0) + 1
        if (wire.pairMisses > 5 || lock.misses >= 5) {
          lock.until = Date.now() + 10 * 60_000
          this.pairLocks.set(claimant, lock)
          wire.socket.close()
          throw new Error('too many pairing attempts')
        }
        if (String(message.code ?? '') !== this.store.identity.pairingCode) {
          lock.misses += 1
          this.pairLocks.set(claimant, lock)
          throw new Error('wrong pairing code')
        }
        const token = randomBytes(24).toString('hex')
        this.store.upsertPeer({ deviceId: String(message.from ?? 'unknown'), name: String(message.name ?? 'device'), token, hubUrl: '', lastSeen: Date.now() })
        this.onPeerStateChange?.()
        return { ok: true, token, deviceId: this.myId, name: this.store.identity.name }
      }
      case 'exec': {
        const execId = String(message.execId ?? randomUUID())
        // Kill the child if the requester's socket dies mid-exec (orphans).
        const result = await runExec(message, (stream, chunk) => {
          this.route(peerId, { type: 'exec-out', stream, chunk, execId }).catch(() => {})
        }, (child) => {
          wire.socket.once('close', () => { try { child.kill('SIGKILL') } catch { /* already exited */ } })
        })
        return { ...result, execId }
      }
      default:
        return this.transmitter.serve(message.op, message, peerId)
    }
  }

  /** Shared inbound handling: serve locally or relay through the hub mesh. */
  #inbound = async (message, wire) => {
    const to = message.to
    if (to === undefined || to === this.myId) return this.#serveLocal(message, wire)
    const target = this.hubSockets.get(to)
    if (target === undefined || target.closed) throw new Error(`device ${to} is not connected to this hub`)
    if (message.op !== undefined) {
      // NEVER forward the caller's id: target.request mints its own and the
      // result resolves back up this chain — forwarding would clobber the
      // target's pending-entry id and drop or cross-deliver responses.
      const { id: _callerId, ...rest } = message
      return target.request(message.op, rest, message.op === 'exec' ? 11 * 60_000 : 120_000)
    }
    target.send(message)
    return { ok: true }
  }

  #inboundPush = async (message, wire) => {
    const addressedToMe = message.to === undefined || message.to === this.myId
    if (!addressedToMe) {
      const target = this.hubSockets.get(message.to)
      if (target !== undefined && !target.closed) target.send(message)
      return
    }
    // Everything addressed to me must authenticate: pushes carry the same
    // per-peer token as requests (the relay is not trusted to originate).
    const peerId = String(message.from ?? wire.peerId ?? '')
    const peer = this.store.peer(peerId)
    if (peer === undefined || message.token !== peer.token) {
      if (message.type !== 'hello') console.warn(`[dsh-rich-sync] unauthenticated push (${message.type}) from ${peerId} dropped`)
      return
    }
    if (message.type === 'close-peer') {
      // The peer unlinked us: drop them, stop serving, close their socket.
      this.store.dropPeer(peerId)
      const theirWire = this.hubSockets.get(peerId)
      theirWire?.socket.close()
      if (this.outbound !== null) this.outbound.socket.close()
      this.onPeerStateChange?.()
      return
    }
    if (message.type === 'exec-out') {
      const parts = this.#execCollectors.get(String(message.execId ?? ''))
      if (parts !== undefined && parts.length < 4096) parts.push(String(message.chunk ?? ''))
      return
    }
    if (message.type === 'events') { void this.#applyRemoteEvents(peerId, message.changes) }
  }

  // ── Hub endpoint (this device may be the public meeting point) ────────────
  attachHub(webServer) {
    const wss = new WebSocketServer({ noServer: true })
    const disposeUpgrade = webServer.registerUpgrade({
      path: WS_PATH,
      handler: (req, socket, head) => {
        wss.handleUpgrade(req, socket, head, (ws) => {
          const wire = new Wire(ws, {
            onRequest: this.#inbound,
            onPush: this.#inboundPush,
            onClose: (closed) => {
              for (const [id, entry] of this.hubSockets) {
                if (entry === closed) {
                  this.hubSockets.delete(id)
                  // Stop serving watch events to a departed peer.
                  this.transmitter.watchRoots.delete(id)
                  this.transmitter.releaseWatchersPublic?.()
                  this.onPeerStateChange?.()
                  break
                }
              }
            },
          })
        })
      },
    })
    return () => {
      disposeUpgrade?.()
      for (const wire of this.hubSockets.values()) wire.socket.close()
      wss.close()
    }
  }

  /** Dial MY hub (the public meeting point) and keep the socket open. */
  async connectHub() {
    const url = String(this.store.identity.hubUrl ?? '').trim()
    if (url === '') return { ok: false, error: 'no hub URL configured' }
    if (this.outbound !== null && !this.outbound.closed) this.outbound.socket.close()
    const socket = await openSocket(url)
    const wire = new Wire(socket, {
      onRequest: this.#inbound,
      onPush: this.#inboundPush,
      onClose: () => { if (this.outbound === wire) { this.outbound = null; this.onPeerStateChange?.() } },
    })
    this.outbound = wire
    const hello = await wire.request('hello-hub', { from: this.myId, name: this.store.identity.name })
    this.onPeerStateChange?.()
    return { ok: true, hello }
  }

  // ── Linking (pairing through the hub) ─────────────────────────────────────
  async linkTo({ hubUrl, deviceId, code }) {
    const url = String(hubUrl ?? '').trim()
    const target = String(deviceId ?? '').trim()
    if (url === '' || target === '') throw new Error('hubUrl and deviceId are required')
    if (String(code ?? '').trim() === '') throw new Error('pairing code is required')
    // Pair over a fresh socket to the target's hub, then drop it — steady-state
    // traffic uses the hub socket each side already holds.
    const socket = await openSocket(url)
    const wire = new Wire(socket, { onRequest: async () => { throw new Error('unexpected request during pairing') }, onPush: async () => {}, onClose: () => {} })
    try {
      const hello = await wire.request('pair', { from: this.myId, name: this.store.identity.name, to: target, code }, 20_000)
      if (hello?.token === undefined) throw new Error('pairing failed: transmitter did not return a token')
      const peer = { deviceId: target, name: hello.name ?? target, token: hello.token, hubUrl: url, lastSeen: Date.now() }
      this.store.upsertPeer(peer)
      return peer
    } finally {
      wire.socket.close()
    }
  }

  // ── Mirror engine (subscriber side) ───────────────────────────────────────
  mirrorPath(peerId, remotePath) {
    // Two roots can share a basename (/home/x/proj vs /home/y/proj) — fold a
    // short hash of the full remote path into the directory name.
    const digest = createHash('sha1').update(String(remotePath)).digest('hex').slice(0, 6)
    return join(MIRROR_ROOT, peerId, `${slugify(basename(remotePath)) || 'root'}-${digest}`)
  }

  async startSync(sync) {
    const key = `${sync.deviceId}:${sync.remotePath}`
    if (this.mirrorRunning.has(key)) return
    this.mirrorRunning.set(key, true)
    this.#syncedFiles = 0
    mkdirSync(sync.localPath, { recursive: true })
    try {
      await this.peerRequest(sync.deviceId, 'watch', { root: sync.remotePath }, 30_000)
      // Watch FIRST: even a capped/partial initial sync keeps streaming
      // remote changes instead of silently freezing.
      this.#watchLocal(sync)
      await this.#syncDir(sync, sync.remotePath, sync.localPath)
      sync.syncedAt = Date.now()
      this.store.saveSyncs()
    } finally {
      this.mirrorRunning.delete(key)
    }
  }

  async #syncDir(sync, remoteDir, localDir, depth = 0) {
    if (depth > 12) {
      console.warn(`[dsh-rich-sync] depth cap (12) hit under ${remoteDir} — subtree skipped, mirror continues`)
      return
    }
    if (this.#syncedFiles > 50_000) {
      console.warn(`[dsh-rich-sync] file cap (50000) hit under ${remoteDir} — stopping initial sync, mirror stays partial`)
      return
    }
    const entries = await this.peerRequest(sync.deviceId, 'list', { path: remoteDir }, 60_000)
    for (const entry of entries ?? []) {
      const remoteChild = `${remoteDir}/${entry.name}`
      const localChild = join(localDir, entry.name)
      if (entry.type === 'directory') {
        mkdirSync(localChild, { recursive: true })
        await this.#syncDir(sync, remoteChild, localChild)
      } else if (entry.type === 'file') {
        this.#syncedFiles += 1
        const known = this.#localVersion(localChild)
        if (known !== undefined && known === entry.version) continue
        const file = await this.peerRequest(sync.deviceId, 'read', { path: remoteChild }, 60_000)
        if (file !== null && file !== undefined) {
          this.#guardLocal(localChild)
          this.lastApplied.set(localChild, this.#hash(file.content))
          mkdirSync(dirname(localChild), { recursive: true })
          if (file.binary === true) writeFileSync(localChild, Buffer.from(file.content, 'base64'))
          else writeFileSync(localChild, file.content, 'utf8')
          const [mtime] = String(file.version).split(':')
          try { futimesSync(localChild, new Date(), new Date(Number(mtime))) } catch { /* best effort */ }
        }
      }
    }
  }

  #localVersion(path) {
    try {
      const stats = statSync(path)
      if (!stats.isFile()) return undefined
      return versionOf(stats)
    } catch { return undefined }
  }

  #watchLocal(sync) {
    if (sync.localWatcher !== undefined) return
    try {
      const watcher = watch(sync.localPath, { recursive: true }, (_event, filename) => {
        if (filename === null || filename === undefined) return
        const localChild = join(sync.localPath, String(filename))
        if (this.#isGuarded(localChild)) return
        // Per-path coalescing: one timer flushes EVERY changed path (a single
        // slot dropped all-but-last under bursts — editor multi-save, git mv).
        sync.pendingPushes ??= new Set()
        sync.pendingPushes.add(localChild)
        clearTimeout(sync.pushTimer)
        sync.pushTimer = setTimeout(() => {
          const paths = [...sync.pendingPushes]
          sync.pendingPushes.clear()
          for (const path of paths) void this.#pushLocal(sync, path)
        }, 120)
      })
      watcher.on('error', () => { sync.localWatcher = undefined })
      sync.localWatcher = watcher
    } catch (error) {
      console.warn(`[dsh-rich-sync] local watch failed on ${sync.localPath}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /** Push every file under a local directory to the remote counterpart. */
  async #pushTree(sync, localDir, remoteDir) {
    let names = []
    try { names = readdirSync(localDir) } catch { return }
    for (const name of names) {
      const localChild = join(localDir, name)
      const remoteChild = `${remoteDir === '/' ? '' : remoteDir}/${name}`
      const stats = existsSync(localChild) ? statSync(localChild) : undefined
      if (stats === undefined) continue
      if (stats.isDirectory()) {
        await this.peerRequest(sync.deviceId, 'mkdir', { path: remoteChild }, 30_000)
        await this.#pushTree(sync, localChild, remoteChild)
      } else if (stats.isFile()) {
        const raw = readFileSync(localChild)
        if (raw.includes(0)) continue // binary files are not pushed (text v1)
        const content = raw.toString('utf8')
        if (this.lastApplied.get(localChild) === this.#hash(content)) continue
        await this.peerRequest(sync.deviceId, 'write', { path: remoteChild, content }, 60_000)
      }
    }
  }

  async #pushLocal(sync, localChild) {
    try {
      const rel = localChild.slice(sync.localPath.length + 1)
      const remoteChild = `${sync.remotePath}/${rel}`
      const stats = existsSync(localChild) ? statSync(localChild) : undefined
      if (stats === undefined) {
        await this.peerRequest(sync.deviceId, 'delete', { path: remoteChild }, 30_000)
      } else if (stats.isFile()) {
        const raw = readFileSync(localChild)
        // v1 mirrors text: binary files are not pushed (no silent corruption).
        if (raw.includes(0)) { console.warn(`[dsh-rich-sync] binary file not pushed: ${localChild}`); return }
        const content = raw.toString('utf8')
        // Content-identity: never push back what we just applied from the remote.
        if (this.lastApplied.get(localChild) === this.#hash(content)) return
        await this.peerRequest(sync.deviceId, 'write', { path: remoteChild, content }, 60_000)
      } else if (stats.isDirectory()) {
        // Directory events reconcile recursively: mkdir the dir, then push
        // every file beneath it (a bare mkdir lost children on renames).
        await this.peerRequest(sync.deviceId, 'mkdir', { path: remoteChild }, 30_000)
        await this.#pushTree(sync, localChild, remoteChild)
      }
    } catch (error) {
      console.warn(`[dsh-rich-sync] push failed for ${localChild}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async #applyRemoteEvents(peerId, changes) {
    for (const change of changes ?? []) {
      const sync = this.store.syncs.find((entry) => entry.deviceId === peerId && (change.path === entry.remotePath || change.path.startsWith(`${entry.remotePath}/`)))
      if (sync === undefined) continue
      const rel = change.path.slice(sync.remotePath.length)
      const localChild = join(sync.localPath, rel)
      try {
        if (change.kind === 'deleted') {
          this.#guardLocal(localChild)
          rmSync(localChild, { recursive: true, force: true })
        } else {
          const remote = await this.peerRequest(peerId, 'stat', { path: change.path }, 30_000)
          if (remote === null || remote === undefined) {
            this.#guardLocal(localChild)
            rmSync(localChild, { recursive: true, force: true })
          } else if (remote.type === 'directory') {
            this.#guardLocal(localChild)
            mkdirSync(localChild, { recursive: true })
          } else if (remote.type === 'file') {
            const file = await this.peerRequest(peerId, 'read', { path: change.path }, 60_000)
            if (file === null || file === undefined) continue
            // Content-identity: identical content means nothing to apply (kills echo loops).
            if (existsSync(localChild) && this.lastApplied.get(localChild) === this.#hash(file.content)) continue
            try {
              if (readFileSync(localChild, 'utf8') === file.content) {
                this.lastApplied.set(localChild, this.#hash(file.content))
                continue
              }
            } catch { /* absent locally — apply */ }
            this.#guardLocal(localChild)
            this.lastApplied.set(localChild, this.#hash(file.content))
            mkdirSync(dirname(localChild), { recursive: true })
            if (file.binary === true) writeFileSync(localChild, Buffer.from(file.content, 'base64'))
            else writeFileSync(localChild, file.content, 'utf8')
          }
        }
      } catch (error) {
        console.warn(`[dsh-rich-sync] remote event apply failed for ${change.path}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  // ── Workspace registration ────────────────────────────────────────────────
  async registerWorkspace(path, title) {
    const registry = this.ctx.get('workspaceRegistry')
    if (registry === undefined) return { ok: false, error: 'workspace registry unavailable' }
    let ws = await registry.resolveByPath(path)
    if (ws === undefined) ws = await registry.create(path)
    return { ok: true, workspaceId: ws.id, title: ws.title ?? title ?? basename(path) }
  }

  // ── Remote exec from this side ────────────────────────────────────────────
  /** In-flight exec collectors keyed by execId (fed by exec-out pushes). */
  #execCollectors = new Map()

  async execOn(peerId, { cwd, command }, timeoutMs = 10 * 60_000) {
    const execId = String(randomUUID())
    const parts = []
    this.#execCollectors.set(execId, parts)
    try {
      const result = await this.peerRequest(peerId, 'exec', { cwd, command, execId }, timeoutMs)
      const output = parts.join('').slice(0, 262_144)
      return { ...result, output }
    } finally {
      this.#execCollectors.delete(execId)
    }
  }

  stopAll() {
    this.transmitter.stopAll()
    for (const sync of this.store.syncs) sync.localWatcher?.close()
    for (const wire of this.hubSockets.values()) wire.socket.close()
    if (this.outbound !== null) this.outbound.socket.close()
  }
}

// ── HTTP panel API ───────────────────────────────────────────────────────────
function writeJson(res, status, body) {
  if (res.writableEnded) return
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

async function readJsonBody(req, limit) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > limit) throw new Error('body-too-large')
    chunks.push(buffer)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw === '' ? undefined : JSON.parse(raw)
}

function guard(req, res) {
  const remote = req.socket?.remoteAddress ?? ''
  const loopback = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1'
  // CSRF fence: same-origin/none fetch metadata only — a bare Origin header
  // is forgeable by scripts, sec-fetch-site is not (modern browsers).
  const site = req.headers['sec-fetch-site']
  const browser = site === 'same-origin' || site === 'none'
  if (!loopback || !browser) writeJson(res, 403, { ok: false, error: 'forbidden' })
  return loopback && browser
}

function peerStatus(engine, peerId) {
  const hub = engine.hubSockets.get(peerId)
  if (hub !== undefined && !hub.closed) return 'connected'
  if (engine.outbound !== null && !engine.outbound.closed) return 'via-hub'
  return 'offline'
}

function makeRoutes(ctx, store, engine) {
  const state = {
    kind: 'exact',
    path: `${API_PREFIX}/state`,
    handler: (req, res) => {
      if (req.method !== 'GET') { writeJson(res, 405, { ok: false, error: 'method-not-allowed' }); return }
      if (!guard(req, res)) return
      writeJson(res, 200, {
        ok: true,
        identity: {
          deviceId: store.identity.deviceId,
          name: store.identity.name,
          pairingCode: store.identity.pairingCode,
          hubUrl: store.identity.hubUrl,
        },
        // Tokens never leave the host: the panel gets identity + status only.
        peers: store.peers.map((peer) => {
          const { token, ...safe } = peer
          return { ...safe, status: peerStatus(engine, peer.deviceId) }
        }),
        syncs: store.syncs.map((sync) => ({ ...sync, running: engine.mirrorRunning.has(`${sync.deviceId}:${sync.remotePath}`) })),
        mirrorRoot: MIRROR_ROOT,
      })
    },
  }
  const code = {
    kind: 'exact',
    path: `${API_PREFIX}/code`,
    handler: (req, res) => {
      if (req.method !== 'POST') { writeJson(res, 405, { ok: false, error: 'method-not-allowed' }); return }
      if (!guard(req, res)) return
      writeJson(res, 200, { ok: true, pairingCode: store.refreshCode() })
    },
  }
  const hub = {
    kind: 'exact',
    path: `${API_PREFIX}/hub`,
    handler: async (req, res) => {
      if (req.method !== 'POST') { writeJson(res, 405, { ok: false, error: 'method-not-allowed' }); return }
      if (!guard(req, res)) return
      try {
        const body = await readJsonBody(req, 10_000)
        store.setHubUrl(body?.url)
        writeJson(res, 200, { ok: true, hubUrl: store.identity.hubUrl })
      } catch (error) { writeJson(res, 400, { ok: false, error: error?.message ?? 'bad-request' }) }
    },
  }
  const connect = {
    kind: 'exact',
    path: `${API_PREFIX}/connect`,
    handler: async (req, res) => {
      if (req.method !== 'POST') { writeJson(res, 405, { ok: false, error: 'method-not-allowed' }); return }
      if (!guard(req, res)) return
      try {
        writeJson(res, 200, await engine.connectHub())
      } catch (error) { writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) }) }
    },
  }
  const link = {
    kind: 'exact',
    path: `${API_PREFIX}/link`,
    handler: async (req, res) => {
      if (req.method !== 'POST') { writeJson(res, 405, { ok: false, error: 'method-not-allowed' }); return }
      if (!guard(req, res)) return
      try {
        const body = await readJsonBody(req, 10_000)
        const peer = await engine.linkTo(body ?? {})
        writeJson(res, 200, { ok: true, peer })
      } catch (error) { writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) }) }
    },
  }
  const browse = {
    kind: 'exact',
    path: `${API_PREFIX}/browse`,
    handler: async (req, res) => {
      if (req.method !== 'POST') { writeJson(res, 405, { ok: false, error: 'method-not-allowed' }); return }
      if (!guard(req, res)) return
      try {
        const body = await readJsonBody(req, 10_000)
        const entries = await engine.peerRequest(String(body?.deviceId ?? ''), 'list', { path: body?.path ?? '/' }, 30_000)
        writeJson(res, 200, { ok: true, entries: entries ?? [] })
      } catch (error) { writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) }) }
    },
  }
  const syncRoute = {
    kind: 'exact',
    path: `${API_PREFIX}/sync`,
    handler: async (req, res) => {
      if (req.method !== 'POST') { writeJson(res, 405, { ok: false, error: 'method-not-allowed' }); return }
      if (!guard(req, res)) return
      try {
        const body = await readJsonBody(req, 10_000)
        const deviceId = String(body?.deviceId ?? '')
        const remotePath = normalizeRemotePath(body?.remotePath ?? '')
        if (store.peer(deviceId) === undefined && deviceId !== store.identity.deviceId) throw new Error('unknown device')
        const localPath = engine.mirrorPath(deviceId, remotePath)
        const sync = { deviceId, remotePath, localPath, createdAt: Date.now(), syncedAt: null }
        const existing = store.syncs.findIndex((entry) => entry.deviceId === deviceId && entry.remotePath === remotePath)
        if (existing >= 0) store.syncs[existing] = { ...store.syncs[existing], ...sync }
        else store.syncs.push(sync)
        store.saveSyncs()
        const workspace = await engine.registerWorkspace(localPath, basename(remotePath) || deviceId)
        await engine.startSync(store.syncs.find((entry) => entry.deviceId === deviceId && entry.remotePath === remotePath))
        writeJson(res, 200, { ok: true, sync, workspace })
      } catch (error) { writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) }) }
    },
  }
  const workspaceRoute = {
    kind: 'exact',
    path: `${API_PREFIX}/workspace`,
    handler: async (req, res) => {
      if (req.method !== 'POST') { writeJson(res, 405, { ok: false, error: 'method-not-allowed' }); return }
      if (!guard(req, res)) return
      try {
        const body = await readJsonBody(req, 10_000)
        const path = String(body?.path ?? '')
        if (!path.startsWith(MIRROR_ROOT)) throw new Error('sub-workspaces must live under the mirror root')
        writeJson(res, 200, await engine.registerWorkspace(path, body?.title))
      } catch (error) { writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) }) }
    },
  }
  const unlink = {
    kind: 'exact',
    path: `${API_PREFIX}/unlink`,
    handler: async (req, res) => {
      if (req.method !== 'POST') { writeJson(res, 405, { ok: false, error: 'method-not-allowed' }); return }
      if (!guard(req, res)) return
      try {
        const body = await readJsonBody(req, 10_000)
        const deviceId = String(body?.deviceId ?? '')
        void engine.route(deviceId, { type: 'close-peer', reason: 'unlinked' }).catch(() => {})
        const syncs = store.syncs.filter((sync) => sync.deviceId === deviceId)
        for (const sync of syncs) sync.localWatcher?.close()
        if (body?.removeMirror === true) for (const sync of syncs) rmSync(sync.localPath, { recursive: true, force: true })
        store.dropPeer(deviceId)
        writeJson(res, 200, { ok: true })
      } catch (error) { writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) }) }
    },
  }
  const execRoute = {
    kind: 'exact',
    path: `${API_PREFIX}/exec`,
    handler: async (req, res) => {
      if (req.method !== 'POST') { writeJson(res, 405, { ok: false, error: 'method-not-allowed' }); return }
      if (!guard(req, res)) return
      try {
        const body = await readJsonBody(req, 100_000)
        writeJson(res, 200, { ok: true, result: await engine.execOn(String(body?.deviceId ?? ''), { cwd: body?.cwd, command: body?.command }) })
      } catch (error) { writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) }) }
    },
  }
  return [state, code, hub, connect, link, browse, syncRoute, workspaceRoute, unlink, execRoute]
}

// ── Model-facing `remote` tool (single lane) ─────────────────────────────────
function remoteToolDefinition(ctx, store, engine) {
  return {
    name: 'remote',
    description: 'Run commands on a linked remote device (dsh-rich-sync). Use when the current workspace is a synced mirror of another machine — `remote` executes on THAT machine inside the mirrored tree, so builds/tests/installs affect the real project. actions: status = linked devices + synced folders with their local mirror paths; exec = run a command on a device (deviceId from status, cwd defaults to the device\'s synced root).',
    parameters: {
      type: 'object',
      required: ['action'],
      properties: {
        action: { type: 'string', enum: ['status', 'exec'], description: 'status = devices + synced roots; exec = run a command remotely.' },
        deviceId: { type: 'string', description: 'Target device id (see status). Required for exec.' },
        cwd: { type: 'string', description: 'exec optional: absolute path on the remote device (defaults to the synced root).' },
        command: { type: 'string', description: 'exec: the command line to run on the remote device.' },
      },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          message: { type: 'string' },
          devices: { type: 'array', items: { type: 'object' }, description: 'status: devices with synced roots + mirror paths.' },
          exitCode: { type: 'number', description: 'exec: the remote exit code.' },
        },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args) {
      const action = String(args.action ?? 'status')
      if (action === 'status') {
        const devices = store.peers.map((peer) => ({
          deviceId: peer.deviceId,
          name: peer.name,
          status: peerStatus(engine, peer.deviceId),
          roots: store.syncs.filter((sync) => sync.deviceId === peer.deviceId).map((sync) => ({ remote: sync.remotePath, mirror: sync.localPath })),
        }))
        return { ok: true, devices, message: devices.length === 0 ? 'No devices linked (see the Devices panel).' : `${devices.length} device(s).` }
      }
      if (action === 'exec') {
        const deviceId = String(args.deviceId ?? '')
        if (deviceId === '') return { ok: false, message: 'deviceId is required (see action:status).' }
        const sync = store.syncs.find((entry) => entry.deviceId === deviceId)
        const cwd = String(args.cwd ?? '') !== '' ? String(args.cwd) : sync?.remotePath ?? homedir()
        try {
          const result = await engine.execOn(deviceId, { cwd, command: args.command })
          return { ok: result.exitCode === 0, exitCode: result.exitCode, message: `exit ${result.exitCode}${result.error ? ` (${result.error})` : ''}` }
        } catch (error) {
          return { ok: false, message: error instanceof Error ? error.message : String(error) }
        }
      }
      return { ok: false, message: `unknown action "${action}".` }
    },
  }
}

export function apply(ctx) {
  const store = new SyncStore()
  const engine = new SyncEngine(ctx, store)
  ctx.effect(() => {
    const disposers = makeRoutes(ctx, store, engine).map((route) => ctx.webServer.register(route))
    const disposeHub = engine.attachHub(ctx.webServer)
    const disposeTool = ctx.tools.register(remoteToolDefinition(ctx, store, engine))
    // Resume mirrors for already-linked devices (best effort, non-blocking).
    for (const sync of store.syncs) {
      engine.startSync(sync).catch((error) => {
        console.warn(`[dsh-rich-sync] resume failed for ${sync.remotePath}: ${error instanceof Error ? error.message : String(error)}`)
      })
    }
    return () => {
      disposeTool?.()
      disposeHub?.()
      for (const dispose of disposers.reverse()) dispose?.()
      engine.stopAll()
    }
  }, 'rich-sync: routes + hub + tool')
}

/** Test surface: pure helpers + the store/engine classes for in-process e2e. */
export const __internals = { slugify, normalizeRemotePath, versionOf, randomCode }
export { SyncStore, SyncEngine, Transmitter, Wire, openSocket, runExec }

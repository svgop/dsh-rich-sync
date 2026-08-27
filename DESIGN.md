# dsh-rich-sync — design (v0.1)

**Mission:** link another machine over websockets and make one of its folders
usable here as if local — real directory, native workspace, every tool works.

**Operator survey (2026-08-27):** local mirror · wormhole-style relay topology ·
VS Code-shaped salvaged protocol · sync + remote exec in v1 · sub-workspaces ·
code → long-lived token.

## Architecture

- **Local mirror** (`~/.dsh/rich-sync/mirrors/<device>/<slug>/`): a REAL
  directory, so bash/git/grep and DSH's workspace picker compose natively.
  `ctx.fs` has no provider registry (verified) — virtual-fs would fight the
  harness; a materialized dir is the DSH-grain answer.
- **Topology (one socket per device):** every install registers the hub
  endpoint (`webServer.registerUpgrade` at `/api/rich-sync/ws` — native
  websocket upgrades, rides the existing wss/nginx URL). The PUBLIC device's
  endpoint is the meeting point; every other device keeps ONE outbound socket
  to its configured hub URL. Messages carry `to:` (recipient deviceId); the
  hub relays; the recipient serves locally. Neither endpoint device needs to
  be public.
- **Pairing:** transmitter panel shows Device ID + refreshable pairing code;
  subscriber enters hub URL + ID + code; the knock routes to the transmitter,
  which validates the code and mints a long-lived per-peer token. Refreshing
  the code invalidates nothing linked; Unlink revokes the token. (PAKE per
  magic-wormhole is a v1.1 candidate pending the pairing research verdict —
  the wss channel already encrypts in transit.)
- **Protocol (salvaged shape):** VS Code diskFileSystemProvider ops —
  stat/list/read/write/mkdir/delete/rename/watch — as JSON over the socket,
  plus `fileChange` push events (fs.watch recursive on the transmitter,
  80ms debounce) and an `exec` op (bash -lc on the transmitter, streamed
  stdout/stderr chunks). Version tokens are vscode-style mtimeMs:size etags.
- **Echo-loop safety:** local watcher events for paths we wrote ourselves are
  suppressed by a 2s TTL guard (inotify fires multiple events per write), and
  pushes are content-hash gated (`lastApplied` sha1 per path) — a remote
  change never bounces back. Verified by e2e.
- **Workspaces:** mirror roots register via the workspace registry
  (resolveByPath/create) so they appear in the native new-session picker;
  any subfolder can be registered as a sub-workspace from the browser.
- **Model-facing `remote` tool (single lane):** status (devices + mirror
  paths) and exec — agents run commands on the machine their workspace
  mirrors.

## Verification

In-process e2e (`/tmp/rich-sync-e2e.mjs`): 13/13 — hello-hub, pairing
(accept/wrong-code-rejected/both-sides-stored), list/read over the relay,
initial mirror, remote→local edit/create/delete, local→remote push
(echo-loop-free), remote exec, unknown-device refusal.

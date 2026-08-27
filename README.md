# dsh-rich-sync

**Device file streaming for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)** — link another machine over a websocket relay, mirror one of its folders as a real local directory, work on it with every tool, run commands remotely, changes stream both directions.

> 设备文件流式同步：通过 websocket 中继链接另一台机器，把它的文件夹镜像为真实的本地目录，所有工具直接可用，命令可远程执行，变更双向流动。

## Install

```sh
dsh plugin --profile web add dsh-rich-sync
```

Restart the `dsh web` process. A **Devices** entry appears in the sidebar.

## How it works

1. **On the device with the folder (transmitter):** open Devices, copy its
   **Device ID** and **Pairing code** (both refreshable).
2. **On your working device (subscriber):** Devices → Add device → paste the
   hub URL (the public device's `…/api/rich-sync/ws`), the Device ID, and the
   code → **Link**. The link exchanges the code for a long-lived token.
3. **Browse** the device, pick a folder → **Sync this folder**. It materializes
   under `~/.dsh/rich-sync/mirrors/<device>/<folder>/` as a REAL directory,
   registers as a workspace in the native picker, and stays in sync: remote
   edits stream in, local edits push back (content-hash guarded, no loops).
4. Any subfolder can be opened as its own workspace (⌂ in the browser).

Topology: every device keeps ONE websocket to the hub (the public device's
DSH); messages route by device ID — neither endpoint needs a public URL.

## Agents

The `remote` tool gives models a single lane: `status` (devices + mirror
paths) and `exec` (run a command on the device a workspace mirrors — builds,
tests, installs run where the files live).

## Architecture

```
src/host.js            Node half — identity + pairing, ws hub endpoint
                       (webServer.registerUpgrade), VS Code-shaped fs protocol
                       (stat/list/read/write/mkdir/delete/rename/watch +
                       fileChange events), mirror engine (echo-loop safe),
                       remote exec channel, workspace registration, panel API,
                       and the `remote` tool.
src/client.bundle.js   Browser half — pure DOM Devices panel (sidebar entry,
                       this-device identity, linked devices, add/link, remote
                       file browser, mirrors list).
```

Full-root access for now (gating planned). Protocol shape salvaged from VS
Code's diskFileSystemProvider (MIT); cache model from rclone VFS.

## License

[MIT](LICENSE)

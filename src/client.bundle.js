window.__ModuleLoader__.load({
	id: "dsh-rich-sync",
	factory: (require) => {
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		var module = { exports: {} };
		var exports = module.exports;
		//#region lib/locale.js
		const NS = "rich-sync";
		const en = {
			"entry.label": "Devices",
			"entry.tooltip": "Link devices, stream their folders, work remotely as if local",
			"panel.title": "Devices",
			"panel.intro": "Link another machine over a websocket relay and mirror one of its folders locally as a real directory and native workspace, with two-way streaming.",
			"this.title": "This device",
			"this.id": "Device ID",
			"this.code": "Pairing code",
			"this.refresh": "Refresh",
			"this.hub": "Hub URL",
			"this.hubSave": "Save",
			"this.connect": "Connect",
			"this.hubHint": "The public meeting point both devices dial. Leave empty on the public device itself.",
			"peers.title": "Linked devices",
			"peers.empty": "No devices linked yet.",
			"peers.hub": "Hub URL",
			"peers.id": "Device ID",
			"peers.code": "Pairing code",
			"peers.link": "Link",
			"peers.unlink": "Unlink",
			"peers.unlinkTitle": "Unlink device",
			"peers.unlinkBody": "This revokes the device's token and stops syncing its folders. Files already mirrored stay on disk.",
			"peers.status.connected": "connected",
			"peers.status.via-hub": "via hub",
			"peers.status.offline": "offline",
			"peers.roots": "synced roots",
			"browse.title": "Browse device",
			"browse.hint": "Pick a linked device above to browse its files.",
			"browse.up": "Up",
			"browse.loading": "loading…",
			"browse.refresh": "refresh",
			"browse.sync": "Sync this folder",
			"browse.workspace": "Workspace",
			"browse.empty": "(empty directory)",
			"mirrors.title": "Mirrored folders",
			"mirrors.empty": "Nothing mirrored yet — browse a device and sync a folder.",
			"mirrors.open": "Open",
			"mirrors.syncing": "initial sync running",
			"mirrors.degraded": "push failures — retrying",
			"status.linked": "device linked",
			"status.synced": "mirror ready + workspace registered",
			"status.workspace": "workspace registered",
			"status.saved": "saved",
			"this.copy": "click to copy",
			"peers.unlinkConfirm": "Unlink",
			"mirrors.hint": "start a new session and pick this workspace",
			"error.generic": "failed",
			"action.close": "Close",
			"action.cancel": "Cancel",
		};
		const zh = {
			"entry.label": "设备",
			"entry.tooltip": "链接设备，流式同步其文件夹，像本地一样远程工作",
			"panel.title": "设备",
			"panel.intro": "通过 websocket 中继链接另一台机器，把它的某个文件夹镜像为本地真实目录与原生工作区，变更双向流式同步。",
			"this.title": "本机",
			"this.id": "设备 ID",
			"this.code": "配对码",
			"this.refresh": "刷新",
			"this.hub": "Hub 地址",
			"this.hubSave": "保存",
			"this.connect": "连接",
			"this.hubHint": "双方设备共同拨号的公共会合点。公共设备本身留空即可。",
			"peers.title": "已链接设备",
			"peers.empty": "尚未链接任何设备。",
			"peers.hub": "Hub 地址",
			"peers.id": "设备 ID",
			"peers.code": "配对码",
			"peers.link": "链接",
			"peers.unlink": "解除",
			"peers.unlinkTitle": "解除链接设备",
			"peers.unlinkBody": "此操作将吊销该设备的令牌并停止同步其文件夹；已镜像到本地的文件会保留在磁盘上。",
			"peers.status.connected": "已连接",
			"peers.status.via-hub": "经中继",
			"peers.status.offline": "离线",
			"peers.roots": "同步根",
			"browse.title": "浏览设备",
			"browse.hint": "在上方选择一台已链接的设备，即可浏览它的文件。",
			"browse.up": "上级",
			"browse.loading": "读取中…",
			"browse.refresh": "刷新",
			"browse.sync": "同步此文件夹",
			"browse.workspace": "工作区",
			"browse.empty": "（空目录）",
			"mirrors.title": "已镜像文件夹",
			"mirrors.empty": "尚未镜像——浏览设备并同步一个文件夹。",
			"mirrors.open": "打开",
			"mirrors.syncing": "初始同步进行中",
			"mirrors.degraded": "推送失败，正在重试",
			"status.linked": "设备已链接",
			"status.synced": "镜像就绪并注册工作区",
			"status.workspace": "工作区已注册",
			"status.saved": "已保存",
			"this.copy": "点击复制",
			"peers.unlinkConfirm": "解除",
			"mirrors.hint": "新建会话并选择该工作区",
			"error.generic": "失败",
			"action.close": "关闭",
			"action.cancel": "取消",
		};
		const lang = (typeof navigator !== "undefined" && /^(zh)/i.test(navigator.language ?? "")) ? "zh" : "en";
		const dict = { en, zh };
		const t = (key) => dict[lang][key] ?? dict.en[key] ?? key;
		//#endregion
		//#region lib/styles.js
		// Wave 2: layout glue ONLY. Every control is a native ui-primitives
		// component (Button, Input, StateDot, PathLabel, FileTypeIcon, Tooltip,
		// Modal); the hand-rolled .rsy-btn/.rsy-input/.rsy-dot/.rsy-fileIcon/
		// dialog-card styles were deleted, not re-tokenized.
		const css = `/* Hosted main-panel page frame (native page template, kept from wave 1):
   transparent page — the main column paints --dsw-alias-bg-base — 960px column,
   pageHead anatomy, 32px section rhythm. */
.rsy-main{height:100%;overflow:auto;box-sizing:border-box;padding:0 clamp(24px,4vw,48px) 48px;display:flex;justify-content:center;align-items:flex-start}
.rsy-page{width:100%;max-width:960px;display:flex;flex-direction:column;gap:32px}
.rsy-head{box-sizing:border-box;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-top:28px}
[data-platform=darwin] .rsy-head{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}
.rsy-title{margin:0;font-size:20px;font-weight:500;line-height:28px;color:var(--dsw-alias-label-primary)}
.rsy-intro{color:var(--dsw-alias-label-secondary);margin:4px 0 0;font-size:13px;line-height:20px}
/* Native group-head grammar (Plugins page): groupTitle 14px/500/22 with an
   optional count in label-caption tabular-nums. */
.rsy-group{display:flex;flex-direction:column;gap:8px}
.rsy-groupHead{display:flex;align-items:baseline;gap:8px}
.rsy-groupTitle{margin:0;font-size:14px;font-weight:500;line-height:22px;color:var(--dsw-alias-label-primary)}
.rsy-count{color:var(--dsw-alias-label-caption);font-variant-numeric:tabular-nums;font-size:14px}
/* Key-value rows: the 88px label-tertiary column and the mono value are the
   page's own layout glue; controls and paths render through primitives. */
.rsy-row{display:flex;align-items:center;gap:10px;min-height:32px}
.rsy-label{flex:none;width:88px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px}
.rsy-mono{min-width:0;flex:1;color:var(--dsw-alias-label-primary);font-size:12px;line-height:16px;font-family:ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsy-note{margin:0;color:var(--dsw-alias-label-caption);font-size:11px;line-height:14px}
.rsy-input{flex:1;min-width:0}
/* List rows (peers, mirrors, browse entries): hover-row glue on the native
   interactive token; icon and status glyphs come from primitives. */
.rsy-list{display:flex;flex-direction:column;gap:2px}
.rsy-itemRow{display:flex;align-items:center;gap:10px;padding:6px 8px;margin:0 -8px;border-radius:var(--dsw-radius-md)}
.rsy-itemRowCanClick{cursor:pointer}
.rsy-itemRow:hover{background:var(--dsw-alias-interactive-bg-hover)}
.rsy-itemMain{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.rsy-itemName{color:var(--dsw-alias-label-primary);font-size:13px;line-height:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsy-itemNameLine{min-width:0;display:flex;align-items:center;gap:8px}
.rsy-itemId{flex:none;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px;font-family:ui-monospace,monospace}
.rsy-itemMeta{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:14px;font-family:ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsy-itemIcon{flex:none;display:inline-flex;color:var(--dsw-alias-label-secondary)}
/* PathLabel fills a row (flex:1); inside the column stack of a mirror row it
   must not grow vertically. */
.rsy-itemPath{flex:none}
.rsy-dotText{display:inline-flex;align-items:center;gap:6px}
.rsy-browseBar{display:flex;align-items:center;gap:10px;min-height:32px}
.rsy-browseId{flex:none;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px;font-family:ui-monospace,monospace}
/* Footer status: plain text on state tokens. */
.rsy-footer{display:flex}
.rsy-status{flex:1;min-width:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsy-statusErr{color:var(--dsw-alias-state-error-primary)}
.rsy-statusOk{color:var(--dsw-alias-state-success-primary)}`;
		const tagId = "dsh-rich-sync/panel.css";
		if (typeof document !== "undefined" && document.querySelector(`style[data-plugin-css="${tagId}"]`) === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-rich-sync";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region lib/api.js
		const API = "/api/rich-sync";
		async function getState() { const r = await fetch(`${API}/state`, { cache: "no-store" }); return r.json(); }
		async function post(path, body) {
			const r = await fetch(`${API}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
			return r.json();
		}
		//#endregion
		//#region lib/panel-slot.js
		// Sanctioned surface (0.1.6+): sidebar.panellist row + keyed main panel,
		// mirroring the built-in Plugins entry. The shell owns the row chrome;
		// no DOM grafting into React-managed sidebar rows.
		const PANEL_ID = "rich-sync";
		const ICON_PATHS = '<rect x="1.8" y="2.5" width="6" height="4.5" rx="1"/><rect x="8.2" y="9" width="6" height="4.5" rx="1"/><path d="M4.8 7v2.5a1 1 0 0 0 1 1h2.4M11.2 9V6.5a1 1 0 0 0-1-1H7.8"/>';
		function PanelIcon({ size }) {
			return (0, react_jsx_runtime.jsx)("svg", {
				viewBox: "0 0 16 16", width: size ?? 18, height: size ?? 18,
				fill: "none", stroke: "currentColor", strokeWidth: 1.3,
				strokeLinecap: "round", strokeLinejoin: "round",
				"aria-hidden": true,
				dangerouslySetInnerHTML: { __html: ICON_PATHS },
			});
		}
		//#endregion
		//#region lib/panel.js
		// Wave 2: the panel is a React component tree built from the app's own
		// ui-primitives. The pure-DOM createPanel builder was deleted; the
		// fetch/action logic and the 5s poll + teardown below are the same
		// behavior, ported into hooks.
		const { useState, useEffect, useRef, useCallback } = react;

		// Peer status (host emits connected | via-hub | offline): a live link —
		// direct or relayed — is "done"; only offline is idle.
		const peerDotState = (status) => (status === "offline" ? "idle" : "done");
		const peerStatusKey = (status) => (status === "connected" ? "peers.status.connected" : status === "via-hub" ? "peers.status.via-hub" : "peers.status.offline");
		// Mirror health: initial sync running → ongoing (native spinner),
		// degraded pushes → error, steady → done.
		const mirrorDotState = (sync) => (sync.running === true ? "ongoing" : sync.degraded === true ? "error" : "done");
		const mirrorDotTitleKey = (sync) => (sync.running === true ? "mirrors.syncing" : sync.degraded === true ? "mirrors.degraded" : "status.synced");

		/** Native group head: 14px/500 title + optional tabular-nums count. */
		function GroupHead({ titleKey, count }) {
			return (0, react_jsx_runtime.jsxs)("div", {
				className: "rsy-groupHead",
				children: [
					(0, react_jsx_runtime.jsx)("h3", { className: "rsy-groupTitle", children: t(titleKey) }),
					count === undefined ? null : (0, react_jsx_runtime.jsx)("span", { className: "rsy-count", children: count }),
				],
			});
		}

		/** Key-value row: fixed 88px label-tertiary column + caller-owned value. */
		function KVRow({ labelKey, children }) {
			return (0, react_jsx_runtime.jsxs)("div", {
				className: "rsy-row",
				children: [
					(0, react_jsx_runtime.jsx)("span", { className: "rsy-label", children: t(labelKey) }),
					children,
				],
			});
		}

		/** Icon-only ghost sm Button with its Tooltip + accessible label. */
		function IconAction({ label, icon, onClick, disabled }) {
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label,
				side: "bottom",
				delayMs: 500,
				disabled: disabled === true,
				children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					size: "sm",
					"aria-label": label,
					disabled,
					onClick,
					children: icon,
				}),
			});
		}

		function MainPanel() {
			const [state, setState] = useState(null);
			const [status, setStatus] = useState({ kind: "", text: "" });
			const [hubDraft, setHubDraft] = useState("");
			const [add, setAdd] = useState({ hub: "", id: "", code: "" });
			const [browse, setBrowse] = useState(null); // { deviceId, path, entries: null | [] }
			const [unlinkTarget, setUnlinkTarget] = useState(null); // peer pending unlink confirm
			const hubFocused = useRef(false);
			const browseSeq = useRef(0); // last issued browse request (drop stale replies)

			const refresh = useCallback(() => {
				getState().then((s) => {
					if (s.ok !== true) throw new Error(s.error);
					setState(s);
					// Follow the server's hub URL unless the user is editing it.
					if (hubFocused.current === false) setHubDraft(s.identity.hubUrl ?? "");
				}).catch(() => setStatus({ kind: "error", text: t("error.generic") }));
			}, []);

			// Same 5s state poll the pure-DOM panel ran; the interval dies on unmount.
			useEffect(() => {
				refresh();
				const timer = window.setInterval(refresh, 5000);
				return () => { window.clearInterval(timer); };
			}, [refresh]);

			const copyText = (text) => { try { void _deepseek_ai_dsh_client_ui_primitives.writeClipboard(text); } catch { /* best effort */ } };
			const failWith = (cause) => setStatus({ kind: "error", text: `${t("error.generic")}: ${cause.message}` });

			const refreshCode = () => {
				post("code").then((r) => {
					if (r.ok !== true) return;
					setStatus({ kind: "ok", text: t("status.saved") });
					refresh();
				}).catch(() => setStatus({ kind: "error", text: t("error.generic") }));
			};
			const saveHub = () => {
				post("hub", { url: hubDraft.trim() }).then((r) => {
					if (r.ok !== true) return;
					setStatus({ kind: "ok", text: t("status.saved") });
					refresh();
				}).catch(() => setStatus({ kind: "error", text: t("error.generic") }));
			};
			const connectHub = () => {
				post("connect", {}).then((r) => setStatus(r.ok === true
					? { kind: "ok", text: t("status.saved") }
					: { kind: "error", text: r.error ?? t("error.generic") })).catch(() => setStatus({ kind: "error", text: t("error.generic") }));
			};
			const linkPeer = () => {
				post("link", { hubUrl: add.hub.trim(), deviceId: add.id.trim(), code: add.code.trim() })
					.then((r) => {
						if (r.ok !== true) throw new Error(r.error);
						setStatus({ kind: "ok", text: `${t("status.linked")}: ${r.peer.name} (${r.peer.deviceId})` });
						setAdd((prev) => ({ ...prev, id: "", code: "" }));
						refresh();
					})
					.catch(failWith);
			};
			const confirmUnlink = () => {
				const target = unlinkTarget;
				if (target === null) return;
				setUnlinkTarget(null);
				post("unlink", { deviceId: target.deviceId })
					.then((r) => { if (r.ok !== true) throw new Error(r.error); refresh(); })
					.catch(failWith);
			};
			const loadBrowse = (deviceId, path) => {
				const seq = browseSeq.current + 1;
				browseSeq.current = seq;
				setBrowse({ deviceId, path, entries: null });
				post("browse", { deviceId, path })
					.then((r) => {
						if (r.ok !== true) throw new Error(r.error);
						if (browseSeq.current !== seq) return;
						setBrowse({ deviceId, path, entries: r.entries ?? [] });
					})
					.catch((cause) => {
						if (browseSeq.current !== seq) return;
						setStatus({ kind: "error", text: `${t("error.generic")}: ${cause.message}` });
						setBrowse((current) => (current !== null && current.deviceId === deviceId && current.path === path ? { ...current, entries: [] } : current));
					});
			};
			const syncFolder = () => {
				if (browse === null) return;
				post("sync", { deviceId: browse.deviceId, remotePath: browse.path })
					.then((r) => {
						if (r.ok !== true) throw new Error(r.error);
						setStatus({ kind: "ok", text: `${t("status.synced")} — ${r.sync.localPath}` });
						refresh();
					})
					.catch(failWith);
			};
			const registerWorkspace = (path) => {
				post("workspace", { path })
					.then((res2) => { if (res2.ok !== true) throw new Error(res2.error); setStatus({ kind: "ok", text: t("status.workspace") }); })
					.catch(failWith);
			};
			const openMirror = (sync) => {
				copyText(sync.localPath);
				setStatus({ kind: "ok", text: `${sync.localPath} — ${t("mirrors.hint")}` });
			};

			const dirnameOf = (path) => {
				const cut = path.lastIndexOf("/");
				return cut <= 0 ? "/" : path.slice(0, cut);
			};
			const joinMirror = (deviceId, remoteDir, name) => {
				const under = (s) => {
					if (s.deviceId !== deviceId) return false;
					if (remoteDir === s.remotePath) return true;
					if (s.remotePath === "/") return remoteDir.startsWith("/");
					return remoteDir.startsWith(`${s.remotePath}/`);
				};
				// Most specific root wins (a `/` sync must not shadow `/home/x/proj`).
				const match = (state?.syncs ?? []).filter(under).sort((a, b) => (b.remotePath === "/" ? 0 : b.remotePath.length) - (a.remotePath === "/" ? 0 : a.remotePath.length))[0];
				if (match === undefined) return "";
				const root = match.remotePath === "/" ? "" : match.remotePath;
				const rel = remoteDir === match.remotePath ? name : `${remoteDir.slice(root.length + 1)}/${name}`;
				return `${match.localPath}/${rel}`;
			};

			const identity = state?.identity;
			const peers = state?.peers ?? [];
			const syncs = state?.syncs ?? [];
			const idText = identity === undefined ? "" : `${identity.name} · ${identity.deviceId}`;
			const peerMeta = (peer) => {
				const roots = syncs.filter((s) => s.deviceId === peer.deviceId).map((s) => s.remotePath);
				return `${peer.deviceId} · ${t(peerStatusKey(peer.status))}${roots.length > 0 ? ` · ${t("peers.roots")}: ${roots.join(", ")}` : ""}`;
			};

			const browseList = browse === null
				? (0, react_jsx_runtime.jsx)("p", { className: "rsy-note", children: t("browse.hint") })
				: browse.entries === null
					? (0, react_jsx_runtime.jsxs)("span", {
						className: "rsy-dotText",
						children: [
							(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "ongoing" }),
							(0, react_jsx_runtime.jsx)("span", { className: "rsy-note", children: t("browse.loading") }),
						],
					})
					: browse.entries.length === 0
						? (0, react_jsx_runtime.jsx)("p", { className: "rsy-note", children: t("browse.empty") })
						: [
							...browse.entries.filter((entry) => entry.type === "directory").map((entry) => {
								const mirrorPathFor = joinMirror(browse.deviceId, browse.path, entry.name);
								return (0, react_jsx_runtime.jsxs)("div", {
									className: "rsy-itemRow rsy-itemRowCanClick",
									onClick: () => loadBrowse(browse.deviceId, `${browse.path === "/" ? "" : browse.path}/${entry.name}`),
									children: [
										(0, react_jsx_runtime.jsx)("span", {
											className: "rsy-itemIcon",
											children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.FileTypeIcon, { kind: "folder", size: 16 }),
										}),
										(0, react_jsx_runtime.jsx)("span", { className: "rsy-itemName", children: entry.name }),
										mirrorPathFor !== "" ? (0, react_jsx_runtime.jsx)(IconAction, {
											label: t("browse.workspace"),
											icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 14 }),
											onClick: (event) => { event.stopPropagation(); registerWorkspace(mirrorPathFor); },
										}) : null,
									],
								}, entry.name);
							}),
							...browse.entries.filter((entry) => entry.type === "file").map((entry) => (0, react_jsx_runtime.jsxs)("div", {
								className: "rsy-itemRow",
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: "rsy-itemIcon",
										children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.FileTypeIcon, { path: entry.name, size: 16 }),
									}),
									(0, react_jsx_runtime.jsx)("span", { className: "rsy-itemName", children: entry.name }),
								],
							}, entry.name)),
						];

			return (0, react_jsx_runtime.jsxs)("div", {
				className: "rsy-main",
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: "rsy-page",
						children: [
							// Native pageHead: title 20/500/28 + intro 13/20 secondary.
							(0, react_jsx_runtime.jsx)("header", {
								className: "rsy-head",
								children: (0, react_jsx_runtime.jsxs)("div", {
									children: [
										(0, react_jsx_runtime.jsx)("h1", { className: "rsy-title", children: t("panel.title") }),
										(0, react_jsx_runtime.jsx)("p", { className: "rsy-intro", children: t("panel.intro") }),
									],
								}),
							}),
							// ── This device ──
							(0, react_jsx_runtime.jsxs)("section", {
								className: "rsy-group",
								children: [
									(0, react_jsx_runtime.jsx)(GroupHead, { titleKey: "this.title" }),
									(0, react_jsx_runtime.jsxs)(KVRow, {
										labelKey: "this.id",
										children: [
											(0, react_jsx_runtime.jsx)("span", { className: "rsy-mono", children: idText }),
											(0, react_jsx_runtime.jsx)(IconAction, {
												label: t("this.copy"),
												icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutlineRegular, { size: 14 }),
												onClick: () => { if (idText !== "") copyText(idText); },
											}),
										],
									}),
									(0, react_jsx_runtime.jsxs)(KVRow, {
										labelKey: "this.code",
										children: [
											(0, react_jsx_runtime.jsx)("span", { className: "rsy-mono", children: identity?.pairingCode ?? "" }),
											(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "ghost",
												size: "sm",
												icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular, {}),
												onClick: refreshCode,
												children: t("this.refresh"),
											}),
										],
									}),
									(0, react_jsx_runtime.jsxs)(KVRow, {
										labelKey: "this.hub",
										children: [
											(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
												className: "rsy-input",
												spellCheck: false,
												placeholder: "wss://host.example/api/rich-sync/ws",
												value: hubDraft,
												onChange: (event) => setHubDraft(event.target.value),
												onFocus: () => { hubFocused.current = true; },
												onBlur: () => { hubFocused.current = false; },
											}),
											(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "ghost",
												size: "sm",
												icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutlineRegular, {}),
												onClick: saveHub,
												children: t("this.hubSave"),
											}),
											(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "ghost",
												size: "sm",
												icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLinkOutlineRegular, {}),
												onClick: connectHub,
												children: t("this.connect"),
											}),
										],
									}),
									(0, react_jsx_runtime.jsx)("p", { className: "rsy-note", children: t("this.hubHint") }),
								],
							}),
							// ── Linked devices ──
							(0, react_jsx_runtime.jsxs)("section", {
								className: "rsy-group",
								children: [
									(0, react_jsx_runtime.jsx)(GroupHead, { titleKey: "peers.title", count: peers.length }),
									(0, react_jsx_runtime.jsx)("div", {
										className: "rsy-list",
										children: peers.length === 0
											? (0, react_jsx_runtime.jsx)("p", { className: "rsy-note", children: t("peers.empty") })
											: peers.map((peer) => (0, react_jsx_runtime.jsxs)("div", {
												className: "rsy-itemRow",
												children: [
													(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: peerDotState(peer.status) }),
													(0, react_jsx_runtime.jsxs)("div", {
														className: "rsy-itemMain",
														children: [
															(0, react_jsx_runtime.jsx)("span", { className: "rsy-itemName", children: peer.name }),
															(0, react_jsx_runtime.jsx)("span", { className: "rsy-itemMeta", children: peerMeta(peer) }),
														],
													}),
													(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "ghost",
														size: "sm",
														icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutlineRegular, {}),
														onClick: () => loadBrowse(peer.deviceId, "/"),
														children: t("browse.title"),
													}),
													(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "ghost",
														size: "sm",
														icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, {}),
														onClick: () => setUnlinkTarget(peer),
														children: t("peers.unlink"),
													}),
												],
											}, peer.deviceId)),
									}),
									(0, react_jsx_runtime.jsxs)("div", {
										className: "rsy-row",
										children: [
											(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
												className: "rsy-input",
												spellCheck: false,
												placeholder: t("peers.hub"),
												value: add.hub,
												onChange: (event) => setAdd((prev) => ({ ...prev, hub: event.target.value })),
											}),
											(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
												className: "rsy-input",
												spellCheck: false,
												placeholder: t("peers.id"),
												value: add.id,
												onChange: (event) => setAdd((prev) => ({ ...prev, id: event.target.value })),
											}),
											(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
												className: "rsy-input",
												spellCheck: false,
												placeholder: t("peers.code"),
												value: add.code,
												onChange: (event) => setAdd((prev) => ({ ...prev, code: event.target.value })),
											}),
											// The page's single main action: pairing a device.
											(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "primary",
												size: "sm",
												icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, {}),
												onClick: linkPeer,
												children: t("peers.link"),
											}),
										],
									}),
								],
							}),
							// ── Browse ──
							(0, react_jsx_runtime.jsxs)("section", {
								className: "rsy-group",
								children: [
									(0, react_jsx_runtime.jsx)(GroupHead, { titleKey: "browse.title" }),
									(0, react_jsx_runtime.jsxs)("div", {
										className: "rsy-browseBar",
										children: [
											(0, react_jsx_runtime.jsx)(IconAction, {
												label: t("browse.up"),
												icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronUpOutlineRegular, { size: 14 }),
												disabled: browse === null || browse.path === "/",
												onClick: () => { if (browse !== null && browse.path !== "/") loadBrowse(browse.deviceId, dirnameOf(browse.path)); },
											}),
											browse === null ? null : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, {
												children: [
													(0, react_jsx_runtime.jsx)("span", { className: "rsy-browseId", children: browse.deviceId }),
													(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.PathLabel, { path: browse.path }),
												],
											}),
											(0, react_jsx_runtime.jsx)(IconAction, {
												label: t("browse.refresh"),
												icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular, { size: 14 }),
												disabled: browse === null,
												onClick: () => { if (browse !== null) loadBrowse(browse.deviceId, browse.path); },
											}),
											(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "ghost",
												size: "sm",
												icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, {}),
												disabled: browse === null,
												onClick: syncFolder,
												children: t("browse.sync"),
											}),
										],
									}),
									(0, react_jsx_runtime.jsx)("div", { className: "rsy-list", children: browseList }),
								],
							}),
							// ── Mirrors ──
							(0, react_jsx_runtime.jsxs)("section", {
								className: "rsy-group",
								children: [
									(0, react_jsx_runtime.jsx)(GroupHead, { titleKey: "mirrors.title", count: syncs.length }),
									(0, react_jsx_runtime.jsx)("div", {
										className: "rsy-list",
										children: syncs.length === 0
											? (0, react_jsx_runtime.jsx)("p", { className: "rsy-note", children: t("mirrors.empty") })
											: syncs.map((sync) => (0, react_jsx_runtime.jsxs)("div", {
												className: "rsy-itemRow",
												children: [
													(0, react_jsx_runtime.jsx)("span", {
														title: t(mirrorDotTitleKey(sync)),
														children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: mirrorDotState(sync) }),
													}),
													(0, react_jsx_runtime.jsxs)("div", {
														className: "rsy-itemMain",
														children: [
															(0, react_jsx_runtime.jsxs)("span", {
																className: "rsy-itemNameLine",
																children: [
																	(0, react_jsx_runtime.jsx)("span", { className: "rsy-itemId", children: sync.deviceId }),
																	(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.PathLabel, { path: sync.remotePath }),
																],
															}),
															(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.PathLabel, { path: sync.localPath, className: "rsy-itemPath" }),
														],
													}),
													(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "ghost",
														size: "sm",
														icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutlineRegular, {}),
														onClick: () => openMirror(sync),
														children: t("mirrors.open"),
													}),
												],
											}, `${sync.deviceId}:${sync.remotePath}`)),
									}),
								],
							}),
							(0, react_jsx_runtime.jsx)("footer", {
								className: "rsy-footer",
								children: (0, react_jsx_runtime.jsx)("span", {
									className: status.kind === "error" ? "rsy-status rsy-statusErr" : status.kind === "ok" ? "rsy-status rsy-statusOk" : "rsy-status",
									children: status.text,
								}),
							}),
						],
					}),
					// Unlink confirm: the native dialog (mask, focus trap, Esc).
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: unlinkTarget !== null,
						onClose: () => setUnlinkTarget(null),
						title: t("peers.unlinkTitle"),
						closeLabel: t("action.close"),
						description: unlinkTarget === null ? "" : `${unlinkTarget.name} (${unlinkTarget.deviceId})`,
						children: (0, react_jsx_runtime.jsx)("p", { children: t("peers.unlinkBody") }),
						footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, {
							children: [
								(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									size: "sm",
									onClick: () => setUnlinkTarget(null),
									children: t("action.cancel"),
								}),
								(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "primary",
									size: "sm",
									onClick: confirmUnlink,
									children: t("peers.unlinkConfirm"),
								}),
							],
						}),
					}),
				],
			});
		}
		//#endregion
		//#region lib/index.js
		const inject = ["locale", "slots"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { en, zh }), "rich-sync: dictionaries");

			// Sidebar + panel ride the sanctioned slots (see lib/panel-slot.js):
			// the shell owns the row chrome and panel selection; the panel's
			// 5s poller stops through the effect cleanup on unmount.
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main",
				key: PANEL_ID,
				locale: NS,
			}, MainPanel));
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: PANEL_ID,
				order: 40,
				label: () => t("entry.label"),
				locale: NS,
			}, PanelIcon));

			return () => {};
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

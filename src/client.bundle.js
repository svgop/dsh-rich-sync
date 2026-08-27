window.__ModuleLoader__.load({
	id: "dsh-rich-sync",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		//#region lib/locale.js
		const NS = "rich-sync";
		const en = {
			"entry.label": "Devices",
			"entry.tooltip": "Link devices, stream their folders, work remotely as if local",
			"panel.title": "Devices",
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
			"peers.add": "Add device",
			"peers.hub": "Hub URL",
			"peers.id": "Device ID",
			"peers.code": "Pairing code",
			"peers.link": "Link",
			"peers.unlink": "Unlink",
			"peers.status.connected": "connected",
			"peers.status.via-hub": "via hub",
			"peers.status.offline": "offline",
			"peers.roots": "synced roots",
			"browse.title": "Browse device",
			"browse.up": "↑ up",
			"browse.refresh": "refresh",
			"browse.sync": "Sync this folder",
			"browse.workspace": "Workspace",
			"browse.empty": "(empty directory)",
			"mirrors.title": "Mirrored folders",
			"mirrors.empty": "Nothing mirrored yet — browse a device and sync a folder.",
			"mirrors.open": "Open",
			"status.linked": "device linked",
			"status.synced": "mirror ready + workspace registered",
			"status.workspace": "workspace registered",
			"status.saved": "saved",
			"this.copy": "click to copy",
			"peers.unlinkConfirm": "Unlink",
			"mirrors.hint": "start a new session and pick this workspace",
			"error.generic": "failed",
			"action.close": "Close",
		};
		const zh = {
			"entry.label": "设备",
			"entry.tooltip": "链接设备，流式同步其文件夹，像本地一样远程工作",
			"panel.title": "设备",
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
			"peers.add": "添加设备",
			"peers.hub": "Hub 地址",
			"peers.id": "设备 ID",
			"peers.code": "配对码",
			"peers.link": "链接",
			"peers.unlink": "解除",
			"peers.status.connected": "已连接",
			"peers.status.via-hub": "经中继",
			"peers.status.offline": "离线",
			"peers.roots": "同步根",
			"browse.title": "浏览设备",
			"browse.up": "↑ 上级",
			"browse.refresh": "刷新",
			"browse.sync": "同步此文件夹",
			"browse.workspace": "工作区",
			"browse.empty": "（空目录）",
			"mirrors.title": "已镜像文件夹",
			"mirrors.empty": "尚未镜像——浏览设备并同步一个文件夹。",
			"mirrors.open": "打开",
			"status.linked": "设备已链接",
			"status.synced": "镜像就绪并注册工作区",
			"status.workspace": "工作区已注册",
			"status.saved": "已保存",
			"this.copy": "点击复制",
			"peers.unlinkConfirm": "解除",
			"mirrors.hint": "新建会话并选择该工作区",
			"error.generic": "失败",
			"action.close": "关闭",
		};
		const lang = (typeof navigator !== "undefined" && /^(zh)/i.test(navigator.language ?? "")) ? "zh" : "en";
		const dict = { en, zh };
		const t = (key) => dict[lang][key] ?? dict.en[key] ?? key;
		//#endregion
		//#region lib/styles.js
		const css = `.rsy-entry{appearance:none;box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;height:36px;padding:0 10px;font:inherit;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:8px;cursor:pointer;text-align:left}
.rsy-entry:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.rsy-entry[data-active="true"]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.rsy-entryIcon{display:inline-flex;justify-content:center;align-items:center;width:24px;height:24px;flex:none;color:var(--dsw-alias-label-tertiary)}
.rsy-entryLabel{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsy-scrim{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:24px}
.rsy-card{width:100%;max-width:760px;max-height:min(90vh,1100px);border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-specific-tip);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.3)}
.rsy-card,.rsy-card *{box-sizing:border-box}
.rsy-head{display:flex;align-items:center;gap:10px;padding:14px 16px 10px}
.rsy-title{font-size:14px;font-weight:500;line-height:20px;color:var(--dsw-alias-label-primary);flex:none}
.rsy-closeBtn{flex:none;margin-left:auto;width:28px;height:28px;display:grid;place-items:center;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:999px;font-size:16px}
.rsy-closeBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.rsy-body{flex:1;min-height:0;display:flex;flex-direction:column;overflow-y:auto;scrollbar-width:none}
.rsy-body::-webkit-scrollbar{display:none}
.rsy-section{border-bottom:1px solid var(--dsw-alias-border-l1);padding:10px 16px;display:flex;flex-direction:column;gap:8px}
.rsy-sectionTitle{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:14px;text-transform:uppercase;letter-spacing:.05em}
.rsy-row{display:flex;align-items:center;gap:10px;min-height:30px}
.rsy-label{flex:none;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px;width:88px}
.rsy-mono{min-width:0;flex:1;color:var(--dsw-alias-label-primary);font-size:12px;line-height:16px;font-family:ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsy-btn{appearance:none;background:0 0;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:3px 10px;font:inherit;font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary);cursor:pointer;flex:none}
.rsy-btn:hover{border-color:var(--dsw-alias-state-business-primary);color:var(--dsh-alias-state-business-primary,var(--dsw-alias-state-business-primary))}
.rsy-input{min-width:0;flex:1;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;padding:4px 8px;outline:none;font-family:ui-monospace,monospace}
.rsy-input:focus{border-color:var(--dsw-alias-state-business-primary)}
.rsy-note{color:var(--dsw-alias-label-caption);font-size:11px;line-height:14px}
.rsy-dot{width:7px;height:7px;border-radius:999px;flex:none;background:var(--dsw-alias-label-caption)}
.rsy-dotOn{background:var(--dsw-alias-state-success-primary,#3fb950)}
.rsy-peerRow{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.rsy-peerRow:last-child{border-bottom:none}
.rsy-peerMain{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.rsy-peerName{color:var(--dsw-alias-label-primary);font-size:13px;line-height:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsy-peerMeta{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:14px;font-family:ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsy-fileRow{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--dsw-alias-border-l1);cursor:pointer}
.rsy-fileRow:hover{background:var(--dsw-alias-interactive-bg-hover)}
.rsy-fileRow:last-child{border-bottom:none}
.rsy-fileIcon{flex:none;width:16px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:12px}
.rsy-fileName{flex:1;min-width:0;color:var(--dsw-alias-label-primary);font-size:12.5px;line-height:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsy-footer{display:flex;align-items:stretch;border-top:1px solid var(--dsw-alias-border-l1)}
.rsy-status{flex:1;align-self:center;min-width:0;padding:0 12px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
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
		//#region lib/sidebar.js
		const ENTRY_ATTR = "data-dsh-rich-sync-entry";
		const FAMILY = ["[data-dsh-taskboard-entry]", "[data-dsh-ssh-entry]", "[data-dsh-skill-explorer-entry]", "[data-dsh-rich-context-entry]", "[data-dsh-generative-ideas-entry]", `[${ENTRY_ATTR}]`];
		const ICON = `<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1.8" y="2.5" width="6" height="4.5" rx="1"/><rect x="8.2" y="9" width="6" height="4.5" rx="1"/><path d="M4.8 7v2.5a1 1 0 0 0 1 1h2.4M11.2 9V6.5a1 1 0 0 0-1-1H7.8"/></svg>`;
		function sidebarRoot() {
			const column = document.querySelector('[data-pane="sidebar"], [class*="sidebarCol"]');
			if (column === null) return undefined;
			return column.querySelector('[class*="logoRow"]')?.parentElement ?? column.firstElementChild ?? undefined;
		}
		function newSessionButton(root) {
			const nested = root.querySelector('button[class*="newSession"]');
			if (nested !== null) return nested;
			for (const child of root.children) if (child.tagName === "BUTTON") return child;
			return undefined;
		}
		function mountSidebarEntry(onToggle, isActive, subscribe) {
			if (document.querySelector(`[${ENTRY_ATTR}]`) !== null) return () => {};
			const entry = document.createElement("button");
			entry.type = "button";
			entry.setAttribute(ENTRY_ATTR, "");
			entry.setAttribute("data-dsh-plugin", "rich-sync");
			entry.setAttribute("data-dsh-part", "sidebar-entry");
			entry.className = "rsy-entry";
			entry.setAttribute("aria-label", t("entry.tooltip"));
			entry.setAttribute("title", t("entry.tooltip"));
			entry.innerHTML = `<span class="rsy-entryIcon">${ICON}</span><span class="rsy-entryLabel">${t("entry.label")}</span>`;
			entry.addEventListener("click", onToggle);
			let root, placed = false;
			const place = () => {
				const button = root === undefined ? undefined : newSessionButton(root);
				if (button === undefined) return false;
				if (entry.parentElement !== root) {
					const row = button.closest('[class*="logoRow"]');
					const base = row !== null && row.parentElement === root ? row : button;
					const family = Array.from(root.children).filter((el) => el instanceof HTMLElement && el.matches(FAMILY.join(", ")));
					const anchor = family.length > 0 ? family[family.length - 1].nextElementSibling : base.nextElementSibling;
					root.insertBefore(entry, anchor);
				}
				return true;
			};
			const tryPlace = () => {
				if (root !== undefined && !root.isConnected) { rootObserver.disconnect(); root = undefined; placed = false; }
				if (placed && document.body.contains(entry)) return;
				root ??= sidebarRoot();
				if (root === undefined) return;
				placed = place();
				if (placed) rootObserver.observe(root, { childList: true, subtree: true });
			};
			const waitObserver = new MutationObserver(tryPlace);
			waitObserver.observe(document.body, { childList: true, subtree: true });
			const rootObserver = new MutationObserver(() => {
				if (root === undefined || !root.isConnected) { placed = false; tryPlace(); return; }
				if (!root.contains(entry)) placed = place();
			});
			let unsubscribe;
			if (subscribe !== undefined) {
				const sync = () => { if (isActive()) entry.setAttribute("data-active", "true"); else entry.removeAttribute("data-active"); };
				unsubscribe = subscribe(sync);
				sync();
			}
			tryPlace();
			return () => { waitObserver.disconnect(); rootObserver.disconnect(); if (unsubscribe !== undefined) unsubscribe(); entry.remove(); };
		}
		//#endregion
		//#region lib/panel.js
		function createPanel(onClose) {
			let state = null;
			let browse = null; // { deviceId, path }
			let statusEl;

			const setStatus = (kind, text) => {
				statusEl.textContent = text ?? "";
				statusEl.className = kind === "error" ? "rsy-status rsy-statusErr" : kind === "ok" ? "rsy-status rsy-statusOk" : "rsy-status";
			};
			const copyText = (text) => { try { void navigator.clipboard?.writeText(text); } catch { /* best effort */ } };

			let handleClose = () => onClose();
			const scrim = document.createElement("div");
			scrim.className = "rsy-scrim";
			scrim.addEventListener("click", (event) => { if (event.target === scrim) handleClose(); });
			const card = document.createElement("div");
			card.className = "rsy-card";
			card.setAttribute("aria-label", t("panel.title"));
			const head = document.createElement("div");
			head.className = "rsy-head";
			const title = document.createElement("span");
			title.className = "rsy-title";
			title.textContent = t("panel.title");
			const closeBtn = document.createElement("button");
			closeBtn.type = "button";
			closeBtn.className = "rsy-closeBtn";
			closeBtn.setAttribute("aria-label", t("action.close"));
			closeBtn.textContent = "×";
			closeBtn.addEventListener("click", () => handleClose());
			head.append(title, closeBtn);
			card.append(head);

			const body = document.createElement("div");
			body.className = "rsy-body";

			const section = (titleKey) => {
				const el = document.createElement("div");
				el.className = "rsy-section";
				const h = document.createElement("span");
				h.className = "rsy-sectionTitle";
				h.textContent = t(titleKey);
				el.append(h);
				body.append(el);
				return el;
			};
			const row = (labelKey, ...children) => {
				const el = document.createElement("div");
				el.className = "rsy-row";
				const label = document.createElement("span");
				label.className = "rsy-label";
				label.textContent = t(labelKey);
				el.append(label, ...children);
				return el;
			};
			const btn = (label, onClick, cls = "rsy-btn") => {
				const b = document.createElement("button");
				b.type = "button";
				b.className = cls;
				b.textContent = label;
				b.addEventListener("click", onClick);
				return b;
			};

			// ── This device ──
			const thisSection = section("this.title");
			const idEl = document.createElement("span");
			idEl.className = "rsy-mono";
			idEl.title = t("this.copy");
			idEl.addEventListener("click", () => copyText(idEl.textContent));
			thisSection.append(row("this.id", idEl));
			const codeEl = document.createElement("span");
			codeEl.className = "rsy-mono";
			const codeBtn = btn(t("this.refresh"), () => post("code").then((r) => { if (r.ok === true) { codeEl.textContent = r.pairingCode; setStatus("ok", t("status.saved")); } }).catch(() => setStatus("error", t("error.generic"))));
			thisSection.append(row("this.code", codeEl, codeBtn));
			const hubInput = document.createElement("input");
			hubInput.className = "rsy-input";
			hubInput.spellcheck = false;
			hubInput.placeholder = "wss://host.example/api/rich-sync/ws";
			const hubSave = btn(t("this.hubSave"), () => post("hub", { url: hubInput.value.trim() }).then((r) => { if (r.ok === true) { state.identity.hubUrl = r.hubUrl; setStatus("ok", t("status.saved")); refresh(); } }).catch(() => setStatus("error", t("error.generic"))));
			const hubConnect = btn(t("this.connect"), () => post("connect", {}).then((r) => setStatus(r.ok === true ? "ok" : "error", r.ok === true ? t("status.saved") : (r.error ?? "failed"))).catch(() => setStatus("error", t("error.generic"))));
			thisSection.append(row("this.hub", hubInput, hubSave, hubConnect));
			const hubNote = document.createElement("span");
			hubNote.className = "rsy-note";
			hubNote.textContent = t("this.hubHint");
			thisSection.append(hubNote);

			// ── Linked devices ──
			const peersSection = section("peers.title");
			const peersList = document.createElement("div");
			peersSection.append(peersList);
			const addForm = document.createElement("div");
			addForm.className = "rsy-row";
			const addHub = document.createElement("input");
			addHub.className = "rsy-input";
			addHub.spellcheck = false;
			addHub.placeholder = t("peers.hub");
			const addId = document.createElement("input");
			addId.className = "rsy-input";
			addId.spellcheck = false;
			addId.placeholder = t("peers.id");
			addId.style.flex = "0.6";
			const addCode = document.createElement("input");
			addCode.className = "rsy-input";
			addCode.spellcheck = false;
			addCode.placeholder = t("peers.code");
			addCode.style.flex = "0.5";
			const addBtn = btn(t("peers.link"), () => {
				post("link", { hubUrl: addHub.value.trim(), deviceId: addId.value.trim(), code: addCode.value.trim() })
					.then((r) => {
						if (r.ok !== true) throw new Error(r.error);
						setStatus("ok", `${t("status.linked")}: ${r.peer.name} (${r.peer.deviceId})`);
						addId.value = "";
						addCode.value = "";
						refresh();
					})
					.catch((cause) => setStatus("error", `${t("error.generic")}: ${cause.message}`));
			});
			addBtn.style.borderColor = "var(--dsw-alias-state-business-primary)";
			addForm.append(addHub, addId, addCode, addBtn);
			peersSection.append(addForm);

			// ── Browse ──
			const browseSection = section("browse.title");
			const browseBar = document.createElement("div");
			browseBar.className = "rsy-row";
			const browsePath = document.createElement("span");
			browsePath.className = "rsy-mono";
			const upBtn = btn(t("browse.up"), () => { if (browse !== null && browse.path !== "/") loadBrowse(browse.deviceId, dirnameOf(browse.path)); });
			const refreshBtn = btn(t("browse.refresh"), () => { if (browse !== null) loadBrowse(browse.deviceId, browse.path); });
			const syncBtn = btn(t("browse.sync"), () => {
				if (browse === null) return;
				post("sync", { deviceId: browse.deviceId, remotePath: browse.path })
					.then((r) => {
						if (r.ok !== true) throw new Error(r.error);
						setStatus("ok", `${t("status.synced")} — ${r.sync.localPath}`);
						refresh();
					})
					.catch((cause) => setStatus("error", `${t("error.generic")}: ${cause.message}`));
			});
			syncBtn.style.borderColor = "var(--dsw-alias-state-business-primary)";
			browseBar.append(upBtn, browsePath, refreshBtn, syncBtn);
			browseSection.append(browseBar);
			const browseList = document.createElement("div");
			browseSection.append(browseList);

			// ── Mirrors ──
			const mirrorsSection = section("mirrors.title");
			const mirrorsList = document.createElement("div");
			mirrorsSection.append(mirrorsList);

			card.append(body);

			const footer = document.createElement("div");
			footer.className = "rsy-footer";
			statusEl = document.createElement("span");
			statusEl.className = "rsy-status";
			footer.append(statusEl);
			card.append(footer);
			scrim.append(card);

			function dirnameOf(path) {
				const cut = path.lastIndexOf("/");
				return cut <= 0 ? "/" : path.slice(0, cut);
			}

			const renderState = () => {
				if (state === null) return;
				idEl.textContent = `${state.identity.name} · ${state.identity.deviceId}`;
				codeEl.textContent = state.identity.pairingCode;
				hubInput.value = state.identity.hubUrl ?? "";
				// peers
				peersList.innerHTML = "";
				if ((state.peers ?? []).length === 0) {
					const empty = document.createElement("span");
					empty.className = "rsy-note";
					empty.textContent = t("peers.empty");
					peersList.append(empty);
				}
				for (const peer of state.peers ?? []) {
					const rowEl = document.createElement("div");
					rowEl.className = "rsy-peerRow";
					const dot = document.createElement("span");
					dot.className = peer.status === "connected" ? "rsy-dot rsy-dotOn" : "rsy-dot";
					dot.title = t(`peers.status.${peer.status === "connected" ? "connected" : "offline"}`);
					const main = document.createElement("div");
					main.className = "rsy-peerMain";
					const name = document.createElement("span");
					name.className = "rsy-peerName";
					name.textContent = peer.name;
					const meta = document.createElement("span");
					meta.className = "rsy-peerMeta";
					const roots = (state.syncs ?? []).filter((s) => s.deviceId === peer.deviceId).map((s) => s.remotePath);
					meta.textContent = `${peer.deviceId} · ${t(`peers.status.${peer.status === "connected" ? "connected" : "offline"}`)}${roots.length > 0 ? ` · ${t("peers.roots")}: ${roots.join(", ")}` : ""}`;
					main.append(name, meta);
					const browseB = btn(t("browse.title"), () => loadBrowse(peer.deviceId, "/"));
					const unlinkB = btn(t("peers.unlink"), () => {
						if (window.confirm(`${t("peers.unlinkConfirm")} ${peer.name}?`)) post("unlink", { deviceId: peer.deviceId })
							.then((r) => { if (r.ok !== true) throw new Error(r.error); refresh(); })
							.catch((cause) => setStatus("error", `${t("error.generic")}: ${cause.message}`));
					});
					rowEl.append(dot, main, browseB, unlinkB);
					peersList.append(rowEl);
				}
				// mirrors
				mirrorsList.innerHTML = "";
				if ((state.syncs ?? []).length === 0) {
					const empty = document.createElement("span");
					empty.className = "rsy-note";
					empty.textContent = t("mirrors.empty");
					mirrorsList.append(empty);
				}
				for (const sync of state.syncs ?? []) {
					const rowEl = document.createElement("div");
					rowEl.className = "rsy-peerRow";
					const main = document.createElement("div");
					main.className = "rsy-peerMain";
					const name = document.createElement("span");
					name.className = "rsy-peerName";
					name.textContent = `${sync.deviceId} · ${sync.remotePath}`;
					const meta = document.createElement("span");
					meta.className = "rsy-peerMeta";
					meta.textContent = sync.localPath;
					meta.title = sync.localPath;
					main.append(name, meta);
					const openB = btn(t("mirrors.open"), () => { copyText(sync.localPath); setStatus("ok", `${sync.localPath} — ${t("mirrors.hint")}`); });
					rowEl.append(main, openB);
					mirrorsList.append(rowEl);
				}
			};

			const loadBrowse = (deviceId, path) => {
				browse = { deviceId, path };
				browsePath.textContent = `${deviceId}:${path}`;
				browseList.innerHTML = "";
				post("browse", { deviceId, path })
					.then((r) => {
						if (r.ok !== true) throw new Error(r.error);
						if ((r.entries ?? []).length === 0) {
							const empty = document.createElement("span");
							empty.className = "rsy-note";
							empty.textContent = t("browse.empty");
							browseList.append(empty);
							return;
						}
						for (const entry of r.entries) {
							if (entry.type === "directory") {
								const rowEl = document.createElement("div");
								rowEl.className = "rsy-fileRow";
								const icon = document.createElement("span");
								icon.className = "rsy-fileIcon";
								icon.textContent = "▸";
								const name = document.createElement("span");
								name.className = "rsy-fileName";
								name.textContent = `${entry.name}/`;
								const mirrorPathFor = joinMirror(deviceId, path, entry.name);
								if (mirrorPathFor !== "") {
									const wsB = btn("⌂", (event) => {
										event.stopPropagation();
										post("workspace", { path: mirrorPathFor })
											.then((res2) => { if (res2.ok !== true) throw new Error(res2.error); setStatus("ok", t("status.workspace")); })
											.catch((cause) => setStatus("error", `${t("error.generic")}: ${cause.message}`));
									});
									wsB.title = t("browse.workspace");
									rowEl.append(icon, name, wsB);
								} else {
									rowEl.append(icon, name);
								}
								rowEl.addEventListener("click", () => loadBrowse(deviceId, `${path === "/" ? "" : path}/${entry.name}`));
								browseList.append(rowEl);
							}
						}
						for (const entry of r.entries) {
							if (entry.type !== "file") continue;
							const rowEl = document.createElement("div");
							rowEl.className = "rsy-fileRow";
							rowEl.style.cursor = "default";
							const icon = document.createElement("span");
							icon.className = "rsy-fileIcon";
							icon.textContent = "·";
							const name = document.createElement("span");
							name.className = "rsy-fileName";
							name.textContent = entry.name;
							rowEl.append(icon, name);
							browseList.append(rowEl);
						}
					})
					.catch((cause) => setStatus("error", `${t("error.generic")}: ${cause.message}`));
			};

			const joinMirror = (deviceId, remoteDir, name) => {
				const sync = (state?.syncs ?? []).find((s) => s.deviceId === deviceId && (remoteDir === s.remotePath || remoteDir.startsWith(`${s.remotePath}/`)));
				if (sync === undefined) return "";
				const root = sync.remotePath === "/" ? "" : sync.remotePath;
				const under = remoteDir === sync.remotePath || (root !== "" && remoteDir.startsWith(`${root}/`)) || (root === "" && remoteDir.startsWith("/"));
				if (!under) return "";
				const rel = remoteDir === sync.remotePath ? name : `${remoteDir.slice(root.length + 1)}/${name}`;
				return `${sync.localPath}/${rel}`;
			};

			const refresh = () => {
				getState().then((s) => {
					if (s.ok !== true) throw new Error(s.error);
					state = s;
					renderState();
				}).catch(() => setStatus("error", t("error.generic")));
			};
			refresh();
			const timer = window.setInterval(refresh, 5000);

			handleClose = () => { window.clearInterval(timer); onClose(); };
			// teardown() (sidebar click / plugin dispose) removes the DOM without
			// firing click handlers — give it a way to stop the poller too.
			scrim.dispose = () => { window.clearInterval(timer); };

			return scrim;
		}
		//#endregion
		//#region lib/index.js
		const inject = ["locale"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { en, zh }), "rich-sync: dictionaries");
			let open = false;
			let listeners = new Set();
			let panel = null;
			const isOpen = () => open;
			const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
			const teardown = () => {
				setOpen(false);
				if (panel !== null) { panel.dispose?.(); panel.remove(); panel = null; }
			};
			const setOpen = (value) => {
				if (open === value) return;
				open = value;
				for (const listener of [...listeners]) listener();
			};
			const toggle = () => {
				if (open) { teardown(); return; }
				panel = createPanel(() => teardown());
				document.body.appendChild(panel);
				setOpen(true);
			};
			const SIDEBAR_ROW_SELECTOR = '[class*="sessionRow"], [class*="projectRow"], [class*="searchResultRow"], [class*="searchResultWorkspace"], [class*="newSession"]';
			const onSidebarClick = (event) => {
				if (!open) return;
				if (event.target !== null && event.target.closest?.(SIDEBAR_ROW_SELECTOR) !== null) teardown();
			};
			document.addEventListener("click", onSidebarClick, true);
			const disposeEntry = mountSidebarEntry(toggle, isOpen, subscribe);
			return () => {
				document.removeEventListener("click", onSidebarClick, true);
				teardown();
				disposeEntry();
			};
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

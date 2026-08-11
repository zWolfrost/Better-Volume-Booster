"use strict";

const DEBUG = false;
const log = (...args) => { if (DEBUG) console.log(...args); };

const HOSTNAME_TITLE_NORMAL_ID = "hostname-title";
const EXCLUDE_HOSTNAME_CHECKBOX_ID = "exclude-hostname";
const SEND_COOKIES_CHECKBOX_ID = "send-cookies";

/* Hard cap on simultaneously active CORS-relaxation rules. */
const MAX_CORS_RULES = 1000;

// registrableDomain comes from utils.js (public-suffix aware)
const safeHostname = url => { try { return new URL(url).hostname; } catch { return null; } };


/* ------------------------------------------------------------------ */
/* In-memory, per-tab bookkeeping. Nothing here is ever persisted:     */
/* it is forgotten as soon as the tab navigates away or closes, or the */
/* browser session ends.                                               */
/* ------------------------------------------------------------------ */
const mediaSourcesByTab = new Map(); // tabId -> Set(hostname)   (for the popup's permission prompt)
const tabCorsKeys       = new Map(); // tabId -> Set(pairKey)    (which CORS rules this tab caused)
const tabHostnames      = new Map(); // tabId -> hostname

const corsRules = new Map();         // "initiator -> domain" -> {id, tabs:Set}
let nextCorsRuleId = 1000;

const cookieRuleIds = new Map();     // hostname -> ruleId
let nextCookieRuleId = 2;


/* ------------------------------------------------------------------ */
/* CONTEXT MENU SETUP (unchanged user-facing behaviour)                */
/* ------------------------------------------------------------------ */
browser.contextMenus.onShown.addListener(async (info, tab) => {
	if (!tab.url) return;

	const hostname = safeHostname(tab.url);
	if (!hostname) return;
	const storage = await getStorage(hostname);

	await browser.contextMenus.create({
		id: HOSTNAME_TITLE_NORMAL_ID,
		title: `Settings for ${hostname}:`,
		type: "normal",
		contexts: ["action"],
		enabled: false
	})

	await browser.contextMenus.create({
		id: EXCLUDE_HOSTNAME_CHECKBOX_ID,
		title: "Exclude from audio boosting",
		type: "checkbox",
		contexts: ["action"],
		checked: storage[hostname].excluded
	});

	await browser.contextMenus.create({
		id: SEND_COOKIES_CHECKBOX_ID,
		title: "Send cookies to media requests (default container only)",
		type: "checkbox",
		contexts: ["action"],
		checked: storage[hostname].sendCookiesInMediaRequests
	});

	browser.contextMenus.refresh();
})

browser.contextMenus.onHidden.addListener(() => browser.contextMenus.removeAll())


browser.contextMenus.onClicked.addListener(async (info, tab) => {
	const hostname = safeHostname(tab.url);
	if (!hostname) return;
	const storage = await getStorage(hostname);

	let propertyName = {
		[EXCLUDE_HOSTNAME_CHECKBOX_ID]: "excluded",
		[SEND_COOKIES_CHECKBOX_ID]: "sendCookiesInMediaRequests"
	}[info.menuItemId]

	const newValue = !storage[hostname][propertyName];

	// "Send cookies" is now backed by an *optional* permission: ask for it
	// (user gesture = this click) only when the feature is being enabled.
	if (propertyName === "sendCookiesInMediaRequests" && newValue) {
		const granted = await ensureCookiesPermission(tab.id);
		if (!granted) return; // setting stays off; options page explains why
	}

	await setStorage({ [hostname]: { [propertyName]: newValue } });

	await DNRsetupCookies(hostname, (await getStorage(hostname))[hostname], tab.cookieStoreId);

	browser.tabs.reload(tab.id);
});

async function ensureCookiesPermission(tabId) {
	if (await browser.permissions.contains({permissions: ["cookies"]})) return true;

	let granted = false;
	try {
		// This runs inside the context-menu click, i.e. a user gesture.
		granted = await browser.permissions.request({permissions: ["cookies"]});
	}
	catch (error) {
		log("cookies permission request failed:", error);
	}

	if (!granted) {
		// Denied or impossible: explain what happened on the options page.
		try {
			await browser.tabs.create({url: browser.runtime.getURL("pages/options.html") + "#cookies-permission"});
		} catch {}
	}
	return granted;
}

browser.permissions.onRemoved.addListener(change => {
	if (change.permissions?.includes("cookies")) removeAllCookieRules();
});


/* ------------------------------------------------------------------ */
/* TAB LIFECYCLE: forget per-tab data as early as possible             */
/* ------------------------------------------------------------------ */
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status === "complete" && tab.url) {
		browser.tabs.sendMessage(tabId, {action: "updateVolume", url: tab.url}).catch(() => {});
	}

	// Main-frame navigation to another host: drop everything we remembered
	// about the previous document (scoped CORS rules + media source list).
	if (changeInfo.status === "loading" && tab.url) {
		const hostname = safeHostname(tab.url);
		const previous = tabHostnames.get(tabId);
		if (hostname && previous && hostname !== previous) {
			dropTabCorsRules(tabId);
			mediaSourcesByTab.delete(tabId);
		}
		if (hostname) tabHostnames.set(tabId, hostname);
	}
});

browser.tabs.onRemoved.addListener(tabId => {
	dropTabCorsRules(tabId);
	mediaSourcesByTab.delete(tabId);
	tabHostnames.delete(tabId);
});


/* ------------------------------------------------------------------ */
/* MESSAGES FROM CONTENT SCRIPTS / PAGES                               */
/* ------------------------------------------------------------------ */
browser.runtime.onMessage.addListener(async (message, sender) => {
	switch (message.action) {
		// A content script booted up: give it its url + the only setting it
		// needs up front (the exclusion flag), and make sure the (scoped,
		// optional) cookie rule for this host is in place. The full settings
		// object never leaves the background context.
		case "updateRequests": {
			const url = sender.tab?.url;
			if (!url) return {};
			const hostname = safeHostname(url);
			if (hostname === null) return {url: url, excluded: true};
			const storage = await getStorage(hostname);

			DNRsetupCookies(hostname, storage[hostname], sender.tab.cookieStoreId).catch(() => {});

			return {url: url, excluded: !!storage[hostname].excluded};
		}

		// A content script found cross-origin media and needs the CORS
		// relaxation *only* for this (page -> media domain) pair.
		case "ensureCors": {
			const tabId = sender.tab?.id;
			const initiator = message.initiator;
			const domain = message.domain;
			if (!tabId || !isValidHostname(initiator) || !isValidHostname(domain)) return {ok: false};

			const storage = await getStorage(initiator);
			if (storage[initiator].excluded) return {ok: false};

			try {
				await ensureCorsRule(initiator, domain, tabId);
				return {ok: true};
			}
			catch (error) {
				log("ensureCors failed:", error);
				return {ok: false};
			}
		}

		// Content scripts (every frame) report the cross-origin hosts they
		// embed media from, so the popup can offer scoped host permissions.
		case "reportMediaSources": {
			const tabId = sender.tab?.id;
			if (!tabId) return {};
			let set = mediaSourcesByTab.get(tabId);
			if (!set) { set = new Set(); mediaSourcesByTab.set(tabId, set); }
			for (const hostname of (message.hostnames ?? [])) {
				if (isValidHostname(hostname)) set.add(hostname);
			}
			return {};
		}

		case "getMediaSources": {
			return {hostnames: Array.from(mediaSourcesByTab.get(message.tabId) ?? [])};
		}

		// Effective (session > local > global) settings for a tab.
		case "getEffective": {
			const hostname = safeHostname(message.url);
			if (hostname === null) return {excluded: true};
			const storage = await getStorage(hostname);
			if (storage[hostname].excluded) return {excluded: true};
			const options = storage.session.url == message.url ? storage.session : storage[hostname];
			return {excluded: false, volume: options.volume, mono: options.mono};
		}
	}
});


/* Keep every tab in sync when settings change (including the RAM-only
   session storage, which content scripts can't observe themselves). */
async function broadcastVolumeUpdate() {
	const tabs = await browser.tabs.query({});
	for (const tab of tabs) {
		if (tab.url) browser.tabs.sendMessage(tab.id, {action: "updateVolume", url: tab.url}).catch(() => {});
	}
}

// Slider drags produce bursts of storage writes; coalesce them into a single
// broadcast so N tabs aren't pinged on every input event.
let broadcastTimer = null;
function scheduleBroadcast() {
	if (broadcastTimer) return;
	broadcastTimer = setTimeout(() => {
		broadcastTimer = null;
		broadcastVolumeUpdate();
	}, 100);
}

browser.storage.local.onChanged.addListener(scheduleBroadcast);
// Session-area changes only matter to tabs when the actual "session"
// multiplier object changed; don't spam every tab for other keys.
if (browser.storage.session) {
	browser.storage.session.onChanged.addListener(changes => {
		if (changes && "session" in changes) scheduleBroadcast();
	});
}


/* ------------------------------------------------------------------ */
/* DECLARATIVE NET REQUEST RULES                                       */
/*                                                                     */
/* PRIVACY MODEL (v1.16):                                              */
/*  - CORS is no longer relaxed for *every* media response on the web. */
/*    A rule is created per (initiator page -> media domain) pair, on  */
/*    demand, and only while a tab that needed it is still open.       */
/*  - Cookie injection (opt-in per subdomain, optional permission) is  */
/*    restricted to same-site media requests: both the requester and   */
/*    the destination must be the configured domain. Cookie values are */
/*    kept inside in-memory DNR rules only, never in extension storage */
/*    and never sent anywhere else.                                    */
/* ------------------------------------------------------------------ */

async function ensureCorsRule(initiator, domain, tabId) {
	const key = `${initiator} -> ${domain}`;
	let record = corsRules.get(key);

	if (!record) {
		// Evict the oldest rule if we hit the cap.
		if (corsRules.size >= MAX_CORS_RULES) {
			const oldestKey = corsRules.keys().next().value;
			const oldest = corsRules.get(oldestKey);
			corsRules.delete(oldestKey);
			for (const otherTab of oldest.tabs) tabCorsKeys.get(otherTab)?.delete(oldestKey);
			await browser.declarativeNetRequest.updateDynamicRules({removeRuleIds: [oldest.id]});
		}

		const id = nextCorsRuleId++;
		await browser.declarativeNetRequest.updateDynamicRules({
			addRules: [{
				"id": id,
				"priority": 1,
				"action": {
					"type": "modifyHeaders",
					"responseHeaders": [{
						"header": "Access-Control-Allow-Origin",
						"operation": "set",
						"value": "*"
					}]
				},
				"condition": {
					"resourceTypes": ["media"],
					"initiatorDomains": [initiator],
					"requestDomains": [domain]
				}
			}]
		});

		record = {id, tabs: new Set()};
		corsRules.set(key, record);
		log("Scoped CORS rule added:", key);
	}

	record.tabs.add(tabId);
	tabHostnames.set(tabId, initiator);
	let keys = tabCorsKeys.get(tabId);
	if (!keys) { keys = new Set(); tabCorsKeys.set(tabId, keys); }
	keys.add(key);
}

function dropTabCorsRules(tabId) {
	const keys = tabCorsKeys.get(tabId);
	if (!keys) return;
	tabCorsKeys.delete(tabId);

	const removeRuleIds = [];
	for (const key of keys) {
		const record = corsRules.get(key);
		if (!record) continue;
		record.tabs.delete(tabId);
		if (record.tabs.size === 0) {
			corsRules.delete(key);
			removeRuleIds.push(record.id);
		}
	}
	if (removeRuleIds.length) {
		browser.declarativeNetRequest.updateDynamicRules({removeRuleIds}).catch(() => {});
		log("Scoped CORS rules removed for tab", tabId, removeRuleIds);
	}
}

async function DNRsetupCookies(hostname, hostStorage, storeId = "firefox-default") {
	if (!hostname || !hostStorage) return;

	// Multi-Account Containers are a Firefox privacy boundary: cookie rules
	// are built from the default cookie store and DNR cannot scope rules to a
	// container, so container tabs neither create nor remove them - the
	// workaround lives and dies with default-container contexts only.
	if (storeId !== "firefox-default") return;

	const hasPermission = await browser.permissions.contains({permissions: ["cookies"]});

	if (!hostStorage.excluded && hostStorage.sendCookiesInMediaRequests && hasPermission) {
		const domain = registrableDomain(hostname);

		// Only RFC 6265-safe names/values may reach the header: this makes
		// CRLF / delimiter injection through a hostile cookie impossible.
		const COOKIE_NAME = /^[!#$%&'*+\-.^_`|~0-9a-zA-Z]+$/;
		const COOKIE_VALUE = /^[!#$%&'*+\-.^_`|~0-9a-zA-Z:\/]*$/;
		const cookies = await browser.cookies.getAll({domain: domain});
		const cookieString = cookies
			.filter(cookie => COOKIE_NAME.test(cookie.name) && COOKIE_VALUE.test(cookie.value))
			.map(cookie => `${cookie.name}=${cookie.value}`).join("; ");

		if (!cookieString) {
			await removeCookieRule(hostname);
			return;
		}

		const id = cookieRuleIds.get(hostname) ?? nextCookieRuleId++;
		cookieRuleIds.set(hostname, id);

		try {
		await browser.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: [id],
			addRules: [{
				"id": id,
				"priority": 1,
				"action": {
					"type": "modifyHeaders",
					"requestHeaders": [{
						"header": "Cookie",
						"operation": "set",
						"value": cookieString
					}]
				},
				"condition": {
					"resourceTypes": ["media"],
					// Same-site only: cookies are re-attached exclusively to
					// media requests that both come from and go to this domain.
					"initiatorDomains": [domain],
					"requestDomains": [domain]
				}
			}]
		});
		}
		catch (error) {
			// e.g. cookie jar too large for a header rule: fail closed, the
			// site simply behaves as if the workaround were off.
			log("cookies rule install failed for", hostname, error);
			cookieRuleIds.delete(hostname);
			await browser.declarativeNetRequest.updateDynamicRules({removeRuleIds: [id]}).catch(() => {});
			return;
		}

		log("Scoped cookies rule updated for domain:", domain);
	}
	else {
		await removeCookieRule(hostname);
	}
}

async function removeCookieRule(hostname) {
	const id = cookieRuleIds.get(hostname);
	if (id === undefined) return;
	cookieRuleIds.delete(hostname);
	await browser.declarativeNetRequest.updateDynamicRules({removeRuleIds: [id]}).catch(() => {});
}

async function removeAllCookieRules() {
	const ids = Array.from(cookieRuleIds.values());
	cookieRuleIds.clear();
	if (ids.length) await browser.declarativeNetRequest.updateDynamicRules({removeRuleIds: ids}).catch(() => {});
}

/* Keep cookie rules fresh while the (optional) permission is granted, so
   stale session cookies never linger in a rule after login/logout. */
let cookieRefreshTimer = null;
if (browser.cookies?.onChanged) {
	browser.cookies.onChanged.addListener(() => {
		clearTimeout(cookieRefreshTimer);
		cookieRefreshTimer = setTimeout(async () => {
			if (!await browser.permissions.contains({permissions: ["cookies"]})) return;
			const storage = await getStorage();
			for (const key of Object.keys(storage)) {
				if (RESERVED_KEYS.has(key)) continue;
				if (storage[key]?.sendCookiesInMediaRequests) {
					await DNRsetupCookies(key, storage[key]);
				}
			}
		}, 500);
	});
}

/* ------------------------------------------------------------------ */
/* STARTUP RECONCILIATION                                              */
/*                                                                     */
/* Dynamic DNR rules survive browser restarts and event-page wakes,    */
/* but this script's in-memory bookkeeping does not. On every boot:    */
/*  - CORS pair rules are re-associated to currently open tabs by      */
/*    initiator hostname, and rules nobody needs any more (leftovers   */
/*    from a previous session) are removed;                            */
/*  - cookie rules are rebuilt for opted-in hosts, then stale rules    */
/*    from previous boots are purged.                                  */
/* ------------------------------------------------------------------ */
const isCorsRule = r => r.action?.type === "modifyHeaders"
	&& r.action?.responseHeaders?.[0]?.header === "Access-Control-Allow-Origin";
const isCookieRule = r => r.action?.type === "modifyHeaders"
	&& r.action?.requestHeaders?.[0]?.header === "Cookie";

async function reconcileRules() {
	const live = await browser.declarativeNetRequest.getDynamicRules().catch(() => []);

	// Re-associate surviving CORS pair rules with live tabs.
	const tabs = await browser.tabs.query({});
	const tabsByHost = new Map();
	for (const tab of tabs) {
		const hostname = safeHostname(tab.url);
		if (hostname) {
			if (!tabsByHost.has(hostname)) tabsByHost.set(hostname, []);
			tabsByHost.get(hostname).push(tab.id);
		}
	}

	const removeIds = [];
	for (const rule of live.filter(isCorsRule)) {
		nextCorsRuleId = Math.max(nextCorsRuleId, rule.id + 1);
		const initiator = rule.condition?.initiatorDomains?.[0];
		const domain = rule.condition?.requestDomains?.[0];
		const tabIds = (initiator != null && tabsByHost.get(initiator)) || [];

		if (!isValidHostname(initiator) || !isValidHostname(domain) || tabIds.length === 0) {
			removeIds.push(rule.id); // nobody needs it anymore
			continue;
		}

		const key = `${initiator} -> ${domain}`;
		corsRules.set(key, {id: rule.id, tabs: new Set(tabIds)});
		for (const tabId of tabIds) {
			if (!tabCorsKeys.has(tabId)) tabCorsKeys.set(tabId, new Set());
			tabCorsKeys.get(tabId).add(key);
			tabHostnames.set(tabId, initiator);
		}
	}
	if (removeIds.length) {
		await browser.declarativeNetRequest.updateDynamicRules({removeRuleIds: removeIds}).catch(() => {});
		log("Startup: pruned orphaned CORS rules", removeIds);
	}

	// Remember which cookie-shaped rules existed before the rebuild so any
	// stale one (from a previous boot) can be purged afterwards.
	return live.filter(isCookieRule).map(rule => {
		nextCookieRuleId = Math.max(nextCookieRuleId, rule.id + 1);
		return rule.id;
	});
}

getStorage().then(async storage => {
	const preExistingCookieRules = await reconcileRules();

	for (const key of Object.keys(storage)) {
		if (RESERVED_KEYS.has(key)) continue;
		if (storage[key]?.sendCookiesInMediaRequests) {
			await DNRsetupCookies(key, storage[key]);
		}
	}

	const freshIds = new Set(cookieRuleIds.values());
	const staleIds = preExistingCookieRules.filter(id => !freshIds.has(id));
	if (staleIds.length) {
		await browser.declarativeNetRequest.updateDynamicRules({removeRuleIds: staleIds}).catch(() => {});
		log("Startup: purged stale cookie rules", staleIds);
	}
});

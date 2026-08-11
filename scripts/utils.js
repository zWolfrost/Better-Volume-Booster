"use strict";

/* Keys that are not per-site data (used e.g. by the "forget per-site settings" button). */
const RESERVED_KEYS = new Set(["options", "global", "session"]);

/* Hostname sanity check: anything that fails this never reaches a DNR rule. */
function isValidHostname(hostname) {
	return typeof hostname === "string"
		&& hostname.length > 0 && hostname.length <= 253
		&& /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(hostname);
}

/* Common multi-part public suffixes so registrable domains stay correct for
   e.g. *.co.uk / *.com.au hosts (cookie scoping depends on this). */
const TWO_LEVEL_SUFFIXES = new Set([
	"co.uk", "org.uk", "ac.uk", "gov.uk", "me.uk", "net.uk",
	"com.au", "net.au", "org.au", "edu.au", "asn.au",
	"co.nz", "net.nz", "org.nz", "govt.nz",
	"co.jp", "ne.jp", "or.jp", "ac.jp", "ad.jp",
	"com.br", "net.br", "org.br", "com.ar", "com.mx", "com.tr",
	"com.pl", "co.za", "co.in", "net.in", "org.in", "com.sg",
	"com.hk", "com.tw", "co.kr", "com.cn", "net.cn", "org.cn",
	"gov.cn", "co.il", "org.il", "net.il", "co.cr", "com.co",
	"com.ve", "com.eg", "co.ke", "com.ua", "com.vn", "co.th"
]);

function registrableDomain(hostname) {
	hostname = String(hostname).toLowerCase();
	if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return hostname; // IPv4 literal
	const parts = hostname.split(".").filter(Boolean);
	if (parts.length <= 2) return parts.join(".");
	const lastTwo = parts.slice(-2).join(".");
	if (TWO_LEVEL_SUFFIXES.has(lastTwo)) return parts.slice(-3).join(".");
	return lastTwo;
}

/* Reduces a hostname list to the minimal covering set: a hostname is dropped
   only when another entry is its exact parent domain (true subdomain relation,
   not mere substring matching like "evilsite.com" ~ "site.com"). */
function getEssentialHostnames(arr, includeSubdomains = true) {
	let set = new Set(arr.filter(isValidHostname));

	if (!includeSubdomains) {
		set = new Set(Array.from(set, registrableDomain));
	}

	for (let hostname of [...set]) {
		for (let parent of [...set]) {
			if (hostname !== parent && hostname.endsWith("." + parent)) {
				set.delete(hostname);
			}
		}
	}

	return Array.from(set);
}

async function getStorage(targetHostname=null) {
	const DEFAULT_GLOBAL_SETTINGS = {
		options: {
			volumeMultiplierPercentLimit: 500,
			showVolumeMultiplier: {
				"global": true,
				"local": true,
				"session": false
			},
			showAudioChannelButtons: true,
			specifyPermissionSubdomains: false,
			applyDefaultLocalSettings: true
		},

		global: {
			volume: 100,
			mono: false
		},

		session: {
			url: null,
			volume: 100,
			mono: false
		}
	}

	const DEFAULT_LOCAL_GENERAL_SETTINGS = {
		enabled: false,
		volume: 100,
		mono: false,
		excluded: false,
		sendCookiesInMediaRequests: false
	}

	const DEFAULT_LOCAL_SPECIFIC_SETTINGS = {
		"www.tiktok.com": {
			sendCookiesInMediaRequests: true
		}
	}

	let storage = await browser.storage.local.get()

	// v1.16: the temporary "session" multiplier moved from disk (storage.local)
	// to RAM-only storage.session, so it truly dies with the browser session.
	{
		const legacySession = storage.session;
		delete storage.session;

		let sessionStore = {};
		if (browser.storage.session) {
			try { sessionStore = await browser.storage.session.get("session"); } catch {}
		}
		storage.session = {...DEFAULT_GLOBAL_SETTINGS.session, ...(sessionStore.session ?? {}), ...(legacySession ?? {})};

		if (legacySession && browser.storage.session) {
			browser.storage.session.set({session: storage.session})
				.then(() => browser.storage.local.remove("session"))
				.catch(() => {});
		}
	}

	// backwards compatibility for v1.13
	{
		for (let key in storage) {
			if (storage[key] && storage[key].volumeMultiplierPercent) {
				storage[key].volume ??= storage[key].volumeMultiplierPercent;
			}
		}
		if (storage.options && typeof storage.options.showVolumeMultiplier === "string") {
			storage.options.showVolumeMultiplier = {
				global: (storage.options.showVolumeMultiplier == "global") || (storage.options.showVolumeMultiplier == "both"),
				local: (storage.options.showVolumeMultiplier == "local") || (storage.options.showVolumeMultiplier == "both"),
				session: false
			}
		}
	}

	// Delete undefined keys recursively
	function deleteUndefinedKeys(obj) {
		for (let key in obj) {
			if (obj[key] === undefined) delete obj[key];
			else if (typeof obj[key] === "object" && obj[key]) deleteUndefinedKeys(obj[key]);
		}
	}
	deleteUndefinedKeys(storage);

	for (let key in DEFAULT_GLOBAL_SETTINGS) {
		storage[key] = {...DEFAULT_GLOBAL_SETTINGS[key], ...storage[key]}
	}

	if (storage.options.applyDefaultLocalSettings) {
		for (let key in DEFAULT_LOCAL_SPECIFIC_SETTINGS) {
			storage[key] = {...DEFAULT_LOCAL_SPECIFIC_SETTINGS[key], ...storage[key]}
		}
	}

	if (targetHostname != null) {
		const hostnameStorage = {...DEFAULT_LOCAL_GENERAL_SETTINGS, ...storage[targetHostname]}

		if (hostnameStorage.enabled) storage[targetHostname] = hostnameStorage;
		else storage[targetHostname] = {...hostnameStorage, ...storage.global}
	}

	// The hard limit is a safety feature: clamp every effective volume to it,
	// including values stored before the limit was lowered.
	{
		const limit = storage.options.volumeMultiplierPercentLimit;
		const clamp = o => { if (o && typeof o.volume === "number") o.volume = Math.min(Math.max(o.volume, 0), limit); };
		clamp(storage.global);
		clamp(storage.session);
		if (targetHostname != null) clamp(storage[targetHostname]);
	}

	return storage;
}

/* Deep-merges `src` into `target`; keys set to `undefined` are deleted. */
function deepMerge(target, src) {
	const out = {...(target ?? {})};
	for (let key in src) {
		const value = src[key];
		if (value === undefined) delete out[key];
		else if (value && typeof value === "object" && !Array.isArray(value) && out[key] && typeof out[key] === "object") out[key] = deepMerge(out[key], value);
		else out[key] = value;
	}
	return out;
}

async function setStorage(obj) {
	const localObj = {};

	for (let key in obj) {
		if (key === "session") {
			// Session data is RAM-only: never written to disk.
			if (browser.storage.session) {
				const current = (await browser.storage.session.get("session")).session ?? {};
				await browser.storage.session.set({session: deepMerge(current, obj.session)});
			}
		}
		else localObj[key] = obj[key];
	}

	if (Object.keys(localObj).length) {
		let storage = await browser.storage.local.get(Object.keys(localObj));

		for (let key in localObj) {
			storage[key] = deepMerge(storage[key], localObj[key]);
		}

		return browser.storage.local.set(storage);
	}
}

class VolumeOptions {
	constructor(inputs, callback) {
		this.inputs = inputs;

		this.inputs.forEach(node => node.addEventListener("input", e => {
			this.volume = e.target.value;
			callback();
		}))
	}

	get enabled() {
		return !this.inputs[0].parentElement.classList.contains("disabled");
	}
	set enabled(enable) {
		if (enable) this.inputs[0].parentElement.classList.remove("disabled");
		else this.inputs[0].parentElement.classList.add("disabled");
	}

	get volume() {
		return +this.inputs[0].value;
	}
	set volume(volume) {
		this.inputs.forEach(i => i.value = VolumeOptions.parseVolume(volume, i.min, i.max));
	}

	static parseVolume(volume, min, max) {
		let parsed = parseInt(volume);

		if (isNaN(parsed) || parsed < min) return min;
		else if (parsed > max) return max;

		return parsed;
	}
}

class VolumeMonoFlip {
	constructor(button, callback) {
		this.button = button;

		this.button.addEventListener("click", () => {
			this.mono = !this.mono;

			callback();
		})
	}

	get mono() {
		return this.button.classList.contains("quaver");
	}
	set mono(mono) {
		this.button.classList.remove("quaver", "beam");
		this.button.classList.add(mono ? "quaver" : "beam");
	}
}

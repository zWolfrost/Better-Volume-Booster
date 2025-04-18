"use strict";

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
		reloadMediaElements: false,
		sendCookiesInMediaRequests: false
	}

	const DEFAULT_LOCAL_SPECIFIC_SETTINGS = {
		"www.tiktok.com": {
			sendCookiesInMediaRequests: true
		}
	}

	let storage = await browser.storage.local.get()

	// backwards compatibility for v1.13
	{
		for (let key in storage) {
			if (storage[key].volumeMultiplierPercent) {
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
			else if (typeof obj[key] === "object") deleteUndefinedKeys(obj[key]);
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

	if (targetHostname) {
		const hostnameStorage = {...DEFAULT_LOCAL_GENERAL_SETTINGS, ...storage[targetHostname]}

		if (hostnameStorage.enabled) storage[targetHostname] = hostnameStorage;
		else storage[targetHostname] = {...hostnameStorage, ...storage.global}
	}

	return storage;
}

async function setStorage(obj) {
	let storage = await browser.storage.local.get(Object.keys(obj));

	for (let key in obj) {
		storage[key] = {...storage[key], ...obj[key]}
	}

	return browser.storage.local.set(storage);
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
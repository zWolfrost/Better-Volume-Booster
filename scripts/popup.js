"use strict"

const DOMAIN_TEXT = document.getElementById("domain-text");
const GLOBAL_VOLUME_MULTIPLIER_RANGE = document.getElementById("global-volume-multiplier-range");
const GLOBAL_VOLUME_MULTIPLIER_COUNTER = document.getElementById("global-volume-multiplier-counter");
const LOCAL_VOLUME_MULTIPLIER_RANGE = document.getElementById("local-volume-multiplier-range");
const LOCAL_VOLUME_MULTIPLIER_COUNTER = document.getElementById("local-volume-multiplier-counter");
const FLIP_GLOBAL_SOUND_MODE = document.getElementById("flip-global-sound-mode");
const FLIP_LOCAL_SOUND_MODE = document.getElementById("flip-local-sound-mode");
const DELETE_LOCAL_VOLUME_OPTIONS = document.getElementById("delete-local-volume-multiplier");
const RESTORE_GLOBAL_VOLUME_OPTIONS = document.getElementById("restore-global-volume-multiplier");
const MEDIA_SOURCES_MESSAGE = document.getElementById("media-sources-message");
const MEDIA_SOURCES_LIST = document.getElementById("media-sources-list");
const SEND_COOKIES_MESSAGE = document.getElementById("send-cookies-message");
const SEND_COOKIES_CHECKBOX = document.getElementById("send-cookies-checkbox");
const ASK_PERMISSIONS_BUTTON = document.getElementById("ask-permissions-button");
const ENABLE_ALL_PERMISSIONS_BUTTON = document.getElementById("enable-all-permissions-button");
const NO_MEDIA_DETECTED_MESSAGE = document.getElementById("no-media-detected-message");



class NoteFlipper {
	constructor(button, callback) {
		this.button = button;

		this.button.addEventListener("click", () => {
			this.isMono = !this.isMono;

			callback(this.isMono);
		})
	}

	get isMono() {
		return this.button.classList.contains("quaver");
	}
	set isMono(mono) {
		this.button.classList.remove("quaver", "beam");
		this.button.classList.add(mono ? "quaver" : "beam");
	}
}

function getCurrentTab() {
	return new Promise(resolve => browser.tabs.query({active: true, currentWindow: true}, tabs => resolve(tabs[0])))
}


function hideLocalOptions() {
	LOCAL_VOLUME_MULTIPLIER_RANGE.parentElement.classList.add("hidden");
	GLOBAL_VOLUME_MULTIPLIER_RANGE.parentElement.classList.add("single-option")

	document.querySelectorAll(".fake").forEach(node => node.classList.add("hidden"))
}
function hideGlobalOptions() {
	GLOBAL_VOLUME_MULTIPLIER_RANGE.parentElement.classList.add("hidden");
	LOCAL_VOLUME_MULTIPLIER_RANGE.parentElement.classList.add("single-option")
}


/** sync the widths of the volume multiplier ranges to the smallest one */ 
function syncRangesWidths() {
	const minVolumeMultiplierRangeWidth = Math.min(LOCAL_VOLUME_MULTIPLIER_RANGE.offsetWidth, GLOBAL_VOLUME_MULTIPLIER_RANGE.offsetWidth);
	LOCAL_VOLUME_MULTIPLIER_RANGE.style.maxWidth = GLOBAL_VOLUME_MULTIPLIER_RANGE.style.maxWidth = minVolumeMultiplierRangeWidth + "px";
}


function animate(element, name, seconds=1, mode="ease-in-out", repetitions=1, reset=true) {
	return new Promise(resolve => {
		if (reset == true && element.style.animationName === name) {
			element.style.animation = "none";
			element.offsetHeight;
			element.style.animation = "none";
		}

		element.style.animation = `${name} ${seconds}s ${mode} ${repetitions}`;

		element.addEventListener("animationend", function() {
			element.style.animation = "none";
			resolve();
		}, {once: true});
	})
}


/** add a domain to the media sources list with a checkbox */
function addPermissionToMediaSourcesList(domain)
{
	const chkbox = document.createElement("input");
	chkbox.type = "checkbox";
	chkbox.checked = true;
	chkbox.name = domain;
	chkbox.classList.add("media-source-checkbox");

	const label = document.createElement("label");
	label.innerText = domain;
	label.for = domain;
	label.classList.add("url");

	const li = document.createElement("li");
	li.appendChild(chkbox);
	li.appendChild(label);
	MEDIA_SOURCES_LIST.appendChild(li);
}


(async () => {
	function tablog(...args) {
		return browser.scripting.executeScript({ target: {tabId: tab.id}, func: (...args) => console.log(...args), args: args });
	}

	function setGlobalVolumeOptions() {
		browser.storage.local.set({
			global: {
				volumeMultiplierPercent: +globalVolumeOptions.inputs[0].value,
				mono: globalMonoNoteFlipper.isMono
			},
		})
	}
	function setLocalVolumeOptions() {
		browser.storage.local.set({
			[domain]: {
				enabled: localVolumeOptions.enabled,
				volumeMultiplierPercent: +localVolumeOptions.inputs[0].value,
				mono: localMonoNoteFlipper.isMono,
				sendCookiesInMediaRequests: SEND_COOKIES_CHECKBOX.checked
			},
		})
	}

	function refreshPopup() {
		const RANGE_TOTAL_STEPS = 100;

		browser.storage.local.get().then(storage => {
			const localIsAvailable = domain && storage?.[domain]?.enabled;
			const domainGlobalFallback = localIsAvailable ? domain : "global";

			globalVolumeOptions.enabled = !localIsAvailable;
			localVolumeOptions.enabled = localIsAvailable;

			globalMonoNoteFlipper.isMono = storage.global.mono;
			localMonoNoteFlipper.isMono = storage[domainGlobalFallback].mono;

			globalVolumeOptions.forEachInput(input => {
				input.max = storage.options.volumeMultiplierPercentLimit;
				input.value = storage.global.volumeMultiplierPercent;
			})

			localVolumeOptions.forEachInput(input => {
				input.max = storage.options.volumeMultiplierPercentLimit;
				input.value = storage[domainGlobalFallback].volumeMultiplierPercent;
			})

			GLOBAL_VOLUME_MULTIPLIER_RANGE.step = Math.round(GLOBAL_VOLUME_MULTIPLIER_RANGE.max / RANGE_TOTAL_STEPS);
			LOCAL_VOLUME_MULTIPLIER_RANGE.step = Math.round(LOCAL_VOLUME_MULTIPLIER_RANGE.max / RANGE_TOTAL_STEPS);


			if (storage.options.sendCookiesInMediaRequests == "ask") {
				SEND_COOKIES_CHECKBOX.checked = storage[domain]?.sendCookiesInMediaRequests ?? false;
				SEND_COOKIES_MESSAGE.classList.remove("hidden");
			}

			if (domain) {
				DOMAIN_TEXT.innerText = domain;

				switch (storage.options.showVolumeMultiplier) {
					case "both": syncRangesWidths(); break;
					case "global": hideLocalOptions(); break;
					case "local": hideGlobalOptions(); break;
				}

				// prompt for media sources permissions
				promptMediaSourcesDomains({ includeSubdomains: storage.options.includePermissionSubdomains })
			}
			else {
				// hide the local volume options if there is no domain for some reason (e.g. about:blank)
				hideLocalOptions();
			}
		})
	}
	async function promptMediaSourcesDomains({ includeSubdomains }) {
		async function getMediaSourcesDomains() {
			let mediaSourcesResult = await browser.scripting.executeScript({
				target: {tabId: tab.id, allFrames: true},
				/* injectImmediately: true, */
				func: () => {
					let sourceDomains = [];

					const foundElements = document.querySelectorAll("video, audio, iframe");

					for (let el of foundElements) {
						try {
							let hostname = new URL(new URL(el.currentSrc ?? el.src).origin).hostname;
							sourceDomains.push(hostname);
						}
						catch {}
					}

					return sourceDomains;
				}
			})

			return mediaSourcesResult.map(res => res.result).flat().filter(el => el);
		}
		function getEssentialDomains(arr, includeSubdomains=true) {
			if (!includeSubdomains) {
				arr = arr.map(domain => domain.split(".").slice(-2).join("."));
			}

			let set = new Set(arr);

			for (let domain of set) {
				for (let domain2 of set) {
					if (domain.includes(domain2) && domain !== domain2) {
						set.delete(domain);
					}
				}
			}

			return Array.from(set);
		}
		async function getNeededDomains(arr) {
			let isGrantedDomain = domain => browser.permissions.contains({ origins: [`*://*.${domain}/*`] });

			const mediaSourcesNeededBooleans = await Promise.all( arr.map( domain => isGrantedDomain(domain).then(res => !res) ) );

			return arr.filter((_, i) => mediaSourcesNeededBooleans[i])
		}

		if (domain) {
			// get the sources domains of all the media elements in the page
			const mediaSourcesDomains = await getMediaSourcesDomains();

			if (mediaSourcesDomains.length > 0) {
				// get the essential domains (no duplicates, no subdomains, etc.)
				const mediaSourcesEssential = getEssentialDomains([domain, ...mediaSourcesDomains], includeSubdomains);

				// get the domains that don't already have permissions
				const mediaSourcesNeeded = await getNeededDomains(mediaSourcesEssential);

				// if there are domains that need permissions, show the message
				if (mediaSourcesNeeded.length > 0) {
					MEDIA_SOURCES_LIST.innerHTML = "";

					mediaSourcesNeeded.forEach(addPermissionToMediaSourcesList);

					MEDIA_SOURCES_MESSAGE.classList.remove("hidden");
				}
			}
			else {
				// if there are no media elements in the page, show the message
				NO_MEDIA_DETECTED_MESSAGE.classList.remove("hidden");
			}
		}
	}


	// get the current url
	const tab = await getCurrentTab();

	let domain;
	try { domain = new URL(tab.url).hostname; }
	catch { domain = null; }


	const localVolumeOptions = new VolumeOptions([LOCAL_VOLUME_MULTIPLIER_COUNTER, LOCAL_VOLUME_MULTIPLIER_RANGE], value => {
		localVolumeOptions.enabled = true;
		globalVolumeOptions.enabled = false;

		setLocalVolumeOptions();
	}, {links: [FLIP_LOCAL_SOUND_MODE, DELETE_LOCAL_VOLUME_OPTIONS]})

	const globalVolumeOptions = new VolumeOptions([GLOBAL_VOLUME_MULTIPLIER_COUNTER, GLOBAL_VOLUME_MULTIPLIER_RANGE], value => {
		if (!localVolumeOptions.enabled) {
			localVolumeOptions.forEachInput(input => input.value = value);
		}

		setGlobalVolumeOptions();
	}, {links: [FLIP_GLOBAL_SOUND_MODE]})


	const localMonoNoteFlipper = new NoteFlipper(FLIP_LOCAL_SOUND_MODE, () => {
		animate(FLIP_LOCAL_SOUND_MODE.querySelector("img"), "bounce", 0.2);

		localVolumeOptions.enabled = true;
		globalVolumeOptions.enabled = false;

		setLocalVolumeOptions();
	})

	const globalMonoNoteFlipper = new NoteFlipper(FLIP_GLOBAL_SOUND_MODE, isMono => {
		animate(FLIP_GLOBAL_SOUND_MODE.querySelector("img"), "bounce", 0.2);

		if (!localVolumeOptions.enabled) {
			localMonoNoteFlipper.isMono = isMono;
		}

		setGlobalVolumeOptions();
	})


	DELETE_LOCAL_VOLUME_OPTIONS.addEventListener("click", () => {
		animate(DELETE_LOCAL_VOLUME_OPTIONS.querySelector("img"), "shake", 0.4);

		localVolumeOptions.enabled = false;
		globalVolumeOptions.enabled = true;

		localVolumeOptions.forEachInput(input => input.value = globalVolumeOptions.inputs[0].value);
		localMonoNoteFlipper.isMono = globalMonoNoteFlipper.isMono;

		setLocalVolumeOptions();
	})

	RESTORE_GLOBAL_VOLUME_OPTIONS.addEventListener("click", () => {
		animate(RESTORE_GLOBAL_VOLUME_OPTIONS.querySelector("img"), "bounce", 0.2);

		globalVolumeOptions.forEachInput(input => input.value = 100);
		globalMonoNoteFlipper.isMono = false;

		if (!localVolumeOptions.enabled) {
			localVolumeOptions.forEachInput(input => input.value = 100);
			localMonoNoteFlipper.isMono = false;
		}

		setGlobalVolumeOptions();
	})


	ASK_PERMISSIONS_BUTTON.addEventListener("click", () => {
		let mediaSources = [];

		for (let chkbox of document.getElementsByClassName("media-source-checkbox")) {
			if (chkbox.checked) {
				mediaSources.push(`*://*.${chkbox.name}/*`);
			}
		}

		if (mediaSources.length > 0) {
			browser.permissions.request({ origins: mediaSources }).then(granted => {
				if (granted) {
					browser.tabs.reload(tab.id);
					window.close();
				}
			})
		}
	})

	ENABLE_ALL_PERMISSIONS_BUTTON.addEventListener("click", () => {
		browser.permissions.request({ origins: ["<all_urls>"] }).then(granted => {
			if (granted) {
				browser.tabs.reload(tab.id);
				window.close();
			}
		})
	})


	SEND_COOKIES_CHECKBOX.addEventListener("change", () => {
		setLocalVolumeOptions();
		browser.tabs.reload(tab.id);
		window.close();
	})


	// refresh the popup with the current settings
	refreshPopup();
})()
"use strict";

const HOSTNAME_TEXT = document.getElementById("hostname-text");
const GLOBAL_VOLUME_MULTIPLIER_RANGE = document.getElementById("global-volume-multiplier-range");
const GLOBAL_VOLUME_MULTIPLIER_COUNTER = document.getElementById("global-volume-multiplier-counter");
const LOCAL_VOLUME_MULTIPLIER_RANGE = document.getElementById("local-volume-multiplier-range");
const LOCAL_VOLUME_MULTIPLIER_COUNTER = document.getElementById("local-volume-multiplier-counter");
const SESSION_VOLUME_MULTIPLIER_RANGE = document.getElementById("session-volume-multiplier-range");
const SESSION_VOLUME_MULTIPLIER_COUNTER = document.getElementById("session-volume-multiplier-counter");
const FLIP_GLOBAL_SOUND_MODE = document.getElementById("flip-global-sound-mode");
const FLIP_LOCAL_SOUND_MODE = document.getElementById("flip-local-sound-mode");
const FLIP_SESSION_SOUND_MODE = document.getElementById("flip-session-sound-mode");
const RESTORE_GLOBAL_VOLUME_OPTIONS = document.getElementById("restore-global-volume-multiplier");
const DELETE_LOCAL_VOLUME_OPTIONS = document.getElementById("delete-local-volume-multiplier");
const DELETE_SESSION_VOLUME_OPTIONS = document.getElementById("delete-session-volume-multiplier");
const MEDIA_SOURCES_MESSAGE = document.getElementById("media-sources-message");
const MEDIA_SOURCES_LIST = document.getElementById("media-sources-list");
const ASK_PERMISSIONS_BUTTON = document.getElementById("ask-permissions-button");
const ENABLE_ALL_PERMISSIONS_BUTTON = document.getElementById("enable-all-permissions-button");
const NO_VOLUME_MULTIPLIERS_SELECTED_MESSAGE = document.getElementById("no-volume-multipliers-selected-message");
const NO_MEDIA_DETECTED_MESSAGE = document.getElementById("no-media-detected-message");
const EXCLUDED_HOSTNAME_MESSAGE = document.getElementById("excluded-hostname-message");


let currentTabId;
let currentUrl;
let currentHostname;

let globalVolumeOptions;
let localVolumeOptions;
let sessionVolumeOptions;
let globalMonoNoteFlipper;
let localMonoNoteFlipper;
let sessionMonoNoteFlipper;

let localVolumeOptionsEnabledPreviously = false;


function syncVolumeOptions() {
	if (!localVolumeOptions.enabled && !localVolumeOptionsEnabledPreviously) {
		localVolumeOptions.volume = globalVolumeOptions.volume;
		localMonoNoteFlipper.mono = globalMonoNoteFlipper.mono;
	}
	if (!sessionVolumeOptions.enabled) {
		sessionVolumeOptions.volume = localVolumeOptions.volume;
		sessionMonoNoteFlipper.mono = localMonoNoteFlipper.mono;
	}
}
async function initPopup() {
	const storage = await getStorage(currentHostname)

	globalVolumeOptions.inputs.forEach(input => input.max = storage.options.volumeMultiplierPercentLimit)
	localVolumeOptions.inputs.forEach(input => input.max = storage.options.volumeMultiplierPercentLimit)
	sessionVolumeOptions.inputs.forEach(input => input.max = storage.options.volumeMultiplierPercentLimit)

	globalVolumeOptions.volume = storage.global.volume;
	globalMonoNoteFlipper.mono = storage.global.mono;

	let hideParent = el => el.parentElement.classList.add("hidden");

	if (!storage.options.showAudioChannelButtons) {
		document.querySelectorAll(".note").forEach(el => el.classList.add("hidden"));
	}

	// hide the local volume options if there is no hostname for some reason (e.g. about:blank)
	if (!currentHostname) {
		hideParent(LOCAL_VOLUME_MULTIPLIER_RANGE);
		hideParent(SESSION_VOLUME_MULTIPLIER_RANGE);
		return;
	}

	if (storage[currentHostname].excluded) {
		EXCLUDED_HOSTNAME_MESSAGE.classList.remove("hidden");
		hideParent(LOCAL_VOLUME_MULTIPLIER_RANGE);
		hideParent(SESSION_VOLUME_MULTIPLIER_RANGE);
		return;
	}

	globalVolumeOptions.enabled = !storage[currentHostname].enabled;
	localVolumeOptions.enabled = storage[currentHostname].enabled;
	localVolumeOptionsEnabledPreviously = localVolumeOptions.enabled;
	localVolumeOptions.volume = storage[currentHostname].volume;
	localMonoNoteFlipper.mono = storage[currentHostname].mono;
	sessionVolumeOptions.enabled = false;
	sessionVolumeOptions.volume = localVolumeOptions.volume;
	sessionMonoNoteFlipper.mono = localMonoNoteFlipper.mono;

	if (storage.session.url == currentUrl) {
		globalVolumeOptions.enabled = false;
		localVolumeOptions.enabled = false;
		sessionVolumeOptions.enabled = true;
		sessionVolumeOptions.volume = storage.session.volume;
		sessionMonoNoteFlipper.mono = storage.session.mono;
	}

	HOSTNAME_TEXT.innerText = currentHostname;

	if (!storage.options.showVolumeMultiplier["global"]) hideParent(GLOBAL_VOLUME_MULTIPLIER_RANGE);
	if (!storage.options.showVolumeMultiplier["local"]) hideParent(LOCAL_VOLUME_MULTIPLIER_RANGE);
	if (!storage.options.showVolumeMultiplier["session"]) hideParent(SESSION_VOLUME_MULTIPLIER_RANGE);

	const showedVolumeMultipliers = Array.from(document.querySelectorAll(".option:not(.hidden) > .volume-multiplier-range"));

	if (showedVolumeMultipliers.length == 0) {
		NO_VOLUME_MULTIPLIERS_SELECTED_MESSAGE.classList.remove("hidden");
		return;
	}

	const maxWidth = Math.min(...showedVolumeMultipliers.map(el => el.offsetWidth));
	showedVolumeMultipliers.forEach(el => el.style.maxWidth = `${maxWidth}px`);

	// prompt for media sources permissions
	promptMediaSourcesHostnames(storage.options.specifyPermissionSubdomains)
}


async function promptMediaSourcesHostnames(includeSubdomains) {
	// No scripting permission needed: every frame's content script already
	// reports the cross-origin media hosts it embeds to the background, and
	// that in-memory list is what we display here. The content script may
	// still be booting when the popup opens on a fresh page, so retry once.
	async function getMediaSourcesHostnames() {
		const query = async () => {
			const response = await browser.runtime.sendMessage({action: "getMediaSources", tabId: currentTabId}).catch(() => null);
			return response?.hostnames ?? [];
		};
		let hostnames = await query();
		if (!hostnames.length) {
			await new Promise(resolve => setTimeout(resolve, 400));
			hostnames = await query();
		}
		return hostnames;
	}
	// getEssentialHostnames comes from utils.js (true subdomain logic)
	async function getNeededHostnames(arr) {
		let isGrantedHostname = hostname => browser.permissions.contains({ origins: [`*://*.${hostname}/*`] });

		const mediaSourcesNeededBooleans = await Promise.all( arr.map( hostname => isGrantedHostname(hostname).then(res => !res) ) );

		return arr.filter((_, i) => mediaSourcesNeededBooleans[i])
	}

	function addPermissionToMediaSourcesList(mediaHostname)
	{
		const chkbox = document.createElement("input");
		chkbox.type = "checkbox";
		chkbox.checked = true;
		chkbox.id = mediaHostname;
		chkbox.name = mediaHostname;
		chkbox.classList.add("media-source-checkbox");

		const label = document.createElement("label");
		label.innerText = mediaHostname;
		label.htmlFor = mediaHostname;
		label.classList.add("url");

		const li = document.createElement("li");
		li.appendChild(chkbox);
		li.appendChild(label);
		MEDIA_SOURCES_LIST.appendChild(li);
	}

	if (currentHostname) {
		// get the sources hostnames of all the media elements in the page
		const mediaSourcesHostnames = await getMediaSourcesHostnames();

		if (mediaSourcesHostnames.length > 0) {
			// Only hosts that actually serve cross-origin media are offered:
			// the extension never asks for more access than it needs.
			const mediaSourcesEssential = getEssentialHostnames(mediaSourcesHostnames, includeSubdomains);

			// get the hostnames that don't already have permissions
			const mediaSourcesNeeded = await getNeededHostnames(mediaSourcesEssential);

			// if there are hostnames that need permissions, show the message
			if (mediaSourcesNeeded.length > 0) {
				MEDIA_SOURCES_LIST.innerHTML = "";

				mediaSourcesNeeded.forEach(addPermissionToMediaSourcesList);

				MEDIA_SOURCES_MESSAGE.classList.remove("hidden");
			}
		}
		else {
			// if there is no cross-origin media in the page, show the message
			NO_MEDIA_DETECTED_MESSAGE.classList.remove("hidden");
		}
	}
}

function animate(element, name, seconds=1, mode="ease-in-out") {
	element.style.animation = "none";
	element.offsetHeight;
	element.style.animation = `${name} ${seconds}s ${mode} 1`;
}


const setGlobalOptions = (override={}) => setStorage({ global: { volume: globalVolumeOptions.volume, mono: globalMonoNoteFlipper.mono, ...override } })
const setLocalOptions = (override={}) => setStorage({ [currentHostname]: { enabled: true, volume: localVolumeOptions.volume, mono: localMonoNoteFlipper.mono, ...override } })
const setSessionOptions = (override={}) => setStorage({ session: { url: currentUrl, volume: sessionVolumeOptions.volume, mono: sessionMonoNoteFlipper.mono, ...override } })

globalVolumeOptions = new VolumeOptions([GLOBAL_VOLUME_MULTIPLIER_COUNTER, GLOBAL_VOLUME_MULTIPLIER_RANGE], () => {
	syncVolumeOptions();
	setGlobalOptions();
})

localVolumeOptions = new VolumeOptions([LOCAL_VOLUME_MULTIPLIER_COUNTER, LOCAL_VOLUME_MULTIPLIER_RANGE], () => {
	localVolumeOptionsEnabledPreviously = true;

	if (!sessionVolumeOptions.enabled) {
		globalVolumeOptions.enabled = false;
		localVolumeOptions.enabled = true;
	}

	syncVolumeOptions();
	setLocalOptions();
})

sessionVolumeOptions = new VolumeOptions([SESSION_VOLUME_MULTIPLIER_COUNTER, SESSION_VOLUME_MULTIPLIER_RANGE], () => {
	globalVolumeOptions.enabled = false;
	localVolumeOptions.enabled = false;
	sessionVolumeOptions.enabled = true;

	syncVolumeOptions();
	setSessionOptions();
})

globalMonoNoteFlipper = new VolumeMonoFlip(FLIP_GLOBAL_SOUND_MODE, () => {
	animate(FLIP_GLOBAL_SOUND_MODE.querySelector("img"), "bounce", 0.2);

	syncVolumeOptions();
	setGlobalOptions();
})

localMonoNoteFlipper = new VolumeMonoFlip(FLIP_LOCAL_SOUND_MODE, () => {
	animate(FLIP_LOCAL_SOUND_MODE.querySelector("img"), "bounce", 0.2);

	localVolumeOptionsEnabledPreviously = true;

	if (!sessionVolumeOptions.enabled) {
		globalVolumeOptions.enabled = false;
		localVolumeOptions.enabled = true;
	}

	syncVolumeOptions();
	setLocalOptions();
})

sessionMonoNoteFlipper = new VolumeMonoFlip(FLIP_SESSION_SOUND_MODE, () => {
	animate(FLIP_SESSION_SOUND_MODE.querySelector("img"), "bounce", 0.2);

	globalVolumeOptions.enabled = false;
	localVolumeOptions.enabled = false;
	sessionVolumeOptions.enabled = true;

	syncVolumeOptions();
	setSessionOptions();
})


DELETE_LOCAL_VOLUME_OPTIONS.addEventListener("click", () => {
	if (localVolumeOptions.enabled) {
		animate(DELETE_LOCAL_VOLUME_OPTIONS.querySelector("img"), "shake", 0.4);

		globalVolumeOptions.enabled = true;
		localVolumeOptions.enabled = false;
		localVolumeOptionsEnabledPreviously = false;
		sessionVolumeOptions.enabled = false;

		syncVolumeOptions();
		setLocalOptions({ enabled: false, volume: undefined, mono: undefined });
	}
})

DELETE_SESSION_VOLUME_OPTIONS.addEventListener("click", () => {
	if (sessionVolumeOptions.enabled) {
		animate(DELETE_SESSION_VOLUME_OPTIONS.querySelector("img"), "shake", 0.4);

		globalVolumeOptions.enabled = !localVolumeOptionsEnabledPreviously;
		localVolumeOptions.enabled = localVolumeOptionsEnabledPreviously;
		sessionVolumeOptions.enabled = false;

		syncVolumeOptions();
		setSessionOptions({ url: undefined, volume: undefined, mono: undefined });
	}
})

RESTORE_GLOBAL_VOLUME_OPTIONS.addEventListener("click", () => {
	animate(RESTORE_GLOBAL_VOLUME_OPTIONS.querySelector("img"), "rotate", 0.4, "ease-out");

	globalVolumeOptions.volume = 100;
	globalMonoNoteFlipper.mono = false;

	syncVolumeOptions();
	setGlobalOptions();
})


ASK_PERMISSIONS_BUTTON.addEventListener("click", async () => {
	let mediaSources = [];

	for (let chkbox of document.getElementsByClassName("media-source-checkbox")) {
		if (chkbox.checked) {
			mediaSources.push(`*://*.${chkbox.name}/*`);
			// "*://*.example.com/*" does not match "example.com" itself, so
			// bare registrable domains also get their exact-origin pattern.
			if (registrableDomain(chkbox.name) === chkbox.name) {
				mediaSources.push(`*://${chkbox.name}/*`);
			}
		}
	}

	if (mediaSources.length > 0) {
		let granted = await browser.permissions.request({ origins: mediaSources })
		if (granted) browser.tabs.reload(currentTabId);
	}
})

ENABLE_ALL_PERMISSIONS_BUTTON.addEventListener("click", async () => {
	if (!confirm("Grant the extension data access to ALL websites?\nOnly do this if you trust every site's media to be readable by this extension.")) return;
	let granted = await browser.permissions.request({ origins: ["<all_urls>"] })
	if (granted) browser.tabs.reload(currentTabId);
});


(async () => {
	const tabs = await browser.tabs.query({active: true, currentWindow: true});

	try {
		currentTabId = tabs[0].id;
		currentUrl = tabs[0].url;
		currentHostname = new URL(currentUrl).hostname;
	} catch {}

	initPopup();
})();

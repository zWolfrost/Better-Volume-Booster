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

let localVolumeOptionsWasEnabled = false;


function syncVolumeOptions() {
	if (globalVolumeOptions.enabled) {
		localVolumeOptions.volume = globalVolumeOptions.volume;
		localMonoNoteFlipper.mono = globalMonoNoteFlipper.mono;
	}
	if (!sessionVolumeOptions.enabled) {
		sessionVolumeOptions.volume = localVolumeOptions.volume;
		sessionMonoNoteFlipper.mono = localMonoNoteFlipper.mono;
	}
}
async function refreshPopup() {
	const storage = await getStorage(currentHostname)

	globalVolumeOptions.inputs.forEach(input => input.max = storage.options.volumeMultiplierPercentLimit)
	localVolumeOptions.inputs.forEach(input => input.max = storage.options.volumeMultiplierPercentLimit)
	sessionVolumeOptions.inputs.forEach(input => input.max = storage.options.volumeMultiplierPercentLimit)

	globalVolumeOptions.volume = storage.global.volume;
	globalMonoNoteFlipper.mono = storage.global.mono;

	let hideParent = el => el.parentElement.classList.add("hidden");

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
	localVolumeOptionsWasEnabled = localVolumeOptions.enabled;
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

	if (!storage.options.showVolumeMultiplier["global"]) hideParent(LOCAL_VOLUME_MULTIPLIER_RANGE);
	if (!storage.options.showVolumeMultiplier["local"]) hideParent(GLOBAL_VOLUME_MULTIPLIER_RANGE);
	if (!storage.options.showVolumeMultiplier["session"]) hideParent(SESSION_VOLUME_MULTIPLIER_RANGE);

	const showedVolumeMultipliers = [
		LOCAL_VOLUME_MULTIPLIER_RANGE, GLOBAL_VOLUME_MULTIPLIER_RANGE, SESSION_VOLUME_MULTIPLIER_RANGE
	].filter(el => !el.parentElement.classList.contains("hidden"));
	const maxWidth = Math.min(...showedVolumeMultipliers.map(el => el.offsetWidth));
	showedVolumeMultipliers.forEach(el => el.style.maxWidth = `${maxWidth}px`);

	// prompt for media sources permissions
	promptMediaSourcesHostnames(storage.options.specifyPermissionSubdomains)
}


async function promptMediaSourcesHostnames(includeSubdomains) {
	async function getMediaSourcesHostnames() {
		let mediaSourcesResult = await browser.scripting.executeScript({
			target: {tabId: currentTabId, allFrames: true},
			/* injectImmediately: true, */
			func: () => {
				let sourceHostnames = [];

				const foundElements = document.querySelectorAll("video, audio, iframe");

				for (let el of foundElements) {
					try {
						let hostname = new URL(new URL(el.currentSrc ?? el.src).origin).hostname;
						sourceHostnames.push(hostname);
					}
					catch {}
				}

				return sourceHostnames;
			}
		})

		return mediaSourcesResult.map(res => res.result).flat().filter(el => el);
	}
	function getEssentialHostnames(arr, includeSubdomains=true) {
		if (!includeSubdomains) {
			arr = arr.map(hostname => hostname.split(".").slice(-2).join("."));
		}

		let set = new Set(arr);

		for (let hostname of set) {
			for (let hostname2 of set) {
				if (hostname.includes(hostname2) && hostname !== hostname2) {
					set.delete(hostname);
				}
			}
		}

		return Array.from(set);
	}
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
			// get the essential hostnames (no duplicates, no subdomains, etc.)
			const mediaSourcesEssential = getEssentialHostnames([currentHostname, ...mediaSourcesHostnames], includeSubdomains);

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
			// if there are no media elements in the page, show the message
			NO_MEDIA_DETECTED_MESSAGE.classList.remove("hidden");
		}
	}
}

function animate(element, name, seconds=1, mode="ease-in-out") {
	element.style.animation = "none";
	element.offsetHeight;
	element.style.animation = `${name} ${seconds}s ${mode} 1`;
}


const setGlobalOptions = properties => setStorage({ global: { ...properties } })
const setLocalOptions = properties => setStorage({ [currentHostname]: { enabled: true, ...properties } })
const setSessionOptions = properties => setStorage({ session: { url: currentUrl, ...properties } })

globalVolumeOptions = new VolumeOptions([GLOBAL_VOLUME_MULTIPLIER_COUNTER, GLOBAL_VOLUME_MULTIPLIER_RANGE], () => {
	syncVolumeOptions();
	setGlobalOptions({ volume: globalVolumeOptions.volume });
})

localVolumeOptions = new VolumeOptions([LOCAL_VOLUME_MULTIPLIER_COUNTER, LOCAL_VOLUME_MULTIPLIER_RANGE], () => {
	localVolumeOptionsWasEnabled = true;

	if (!sessionVolumeOptions.enabled) {
		globalVolumeOptions.enabled = false;
		localVolumeOptions.enabled = true;
	}

	syncVolumeOptions();
	setLocalOptions({ volume: localVolumeOptions.volume })
})

sessionVolumeOptions = new VolumeOptions([SESSION_VOLUME_MULTIPLIER_COUNTER, SESSION_VOLUME_MULTIPLIER_RANGE], () => {
	globalVolumeOptions.enabled = false;
	localVolumeOptions.enabled = false;
	sessionVolumeOptions.enabled = true;

	syncVolumeOptions();
	setSessionOptions({ volume: sessionVolumeOptions.volume })
})

globalMonoNoteFlipper = new VolumeMonoFlip(FLIP_GLOBAL_SOUND_MODE, () => {
	animate(FLIP_GLOBAL_SOUND_MODE.querySelector("img"), "bounce", 0.2);

	syncVolumeOptions();
	setGlobalOptions({ mono: globalMonoNoteFlipper.mono })
})

localMonoNoteFlipper = new VolumeMonoFlip(FLIP_LOCAL_SOUND_MODE, () => {
	animate(FLIP_LOCAL_SOUND_MODE.querySelector("img"), "bounce", 0.2);

	localVolumeOptionsWasEnabled = true;

	if (!sessionVolumeOptions.enabled) {
		globalVolumeOptions.enabled = false;
		localVolumeOptions.enabled = true;
	}

	syncVolumeOptions();
	setLocalOptions({ mono: localMonoNoteFlipper.mono })
})

sessionMonoNoteFlipper = new VolumeMonoFlip(FLIP_SESSION_SOUND_MODE, () => {
	animate(FLIP_SESSION_SOUND_MODE.querySelector("img"), "bounce", 0.2);

	globalVolumeOptions.enabled = false;
	localVolumeOptions.enabled = false;
	sessionVolumeOptions.enabled = true;

	syncVolumeOptions();
	setSessionOptions({ mono: sessionMonoNoteFlipper.mono })
})


DELETE_LOCAL_VOLUME_OPTIONS.addEventListener("click", () => {
	if (localVolumeOptions.enabled) {
		animate(DELETE_LOCAL_VOLUME_OPTIONS.querySelector("img"), "shake", 0.4);

		globalVolumeOptions.enabled = true;
		localVolumeOptions.enabled = false;
		localVolumeOptionsWasEnabled = false;
		sessionVolumeOptions.enabled = false;

		syncVolumeOptions();
		setLocalOptions({ enabled: false, volume: undefined, mono: undefined })
	}
})

DELETE_SESSION_VOLUME_OPTIONS.addEventListener("click", () => {
	if (sessionVolumeOptions.enabled) {
		animate(DELETE_SESSION_VOLUME_OPTIONS.querySelector("img"), "shake", 0.4);

		globalVolumeOptions.enabled = !localVolumeOptionsWasEnabled;
		localVolumeOptions.enabled = localVolumeOptionsWasEnabled;
		sessionVolumeOptions.enabled = false;

		syncVolumeOptions();
		setSessionOptions({ url: undefined, volume: undefined, mono: undefined })
	}
})

RESTORE_GLOBAL_VOLUME_OPTIONS.addEventListener("click", () => {
	animate(RESTORE_GLOBAL_VOLUME_OPTIONS.querySelector("img"), "bounce", 0.2);

	globalVolumeOptions.volume = 100;
	globalMonoNoteFlipper.mono = false;

	syncVolumeOptions();
	setGlobalOptions({ volume: globalVolumeOptions.volume, mono: globalMonoNoteFlipper.mono })
})


ASK_PERMISSIONS_BUTTON.addEventListener("click", async () => {
	let mediaSources = [];

	for (let chkbox of document.getElementsByClassName("media-source-checkbox")) {
		if (chkbox.checked) {
			mediaSources.push(`*://*.${chkbox.name}/*`);
		}
	}

	if (mediaSources.length > 0) {
		let granted = await browser.permissions.request({ origins: mediaSources })
		if (granted) browser.tabs.reload(currentTabId);
	}
})

ENABLE_ALL_PERMISSIONS_BUTTON.addEventListener("click", async () => {
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

	refreshPopup();
})();
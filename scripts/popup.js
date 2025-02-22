"use strict";

const HOSTNAME_TEXT = document.getElementById("hostname-text");
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
const ASK_PERMISSIONS_BUTTON = document.getElementById("ask-permissions-button");
const ENABLE_ALL_PERMISSIONS_BUTTON = document.getElementById("enable-all-permissions-button");
const NO_MEDIA_DETECTED_MESSAGE = document.getElementById("no-media-detected-message");
const EXCLUDED_HOSTNAME_MESSAGE = document.getElementById("excluded-hostname-message");


let currentTabId;
let currentHostname;

let globalVolumeOptions;
let localVolumeOptions;
let globalMonoNoteFlipper;
let localMonoNoteFlipper;


function syncLocalVolumeOptions() {
	if (!localVolumeOptions.enabled) {
		localMonoNoteFlipper.mono = globalMonoNoteFlipper.mono;
		localVolumeOptions.volume = globalVolumeOptions.volume;
	}
}
async function refreshPopup() {
	const storage = await getStorage(currentHostname)

	globalVolumeOptions.inputs.forEach(input => input.max = storage.options.volumeMultiplierPercentLimit)
	localVolumeOptions.inputs.forEach(input => input.max = storage.options.volumeMultiplierPercentLimit)

	globalVolumeOptions.volume = storage.global.volume;
	globalMonoNoteFlipper.mono = storage.global.mono;

	let hideParent = el => el.parentElement.classList.add("hidden");

	// hide the local volume options if there is no hostname for some reason (e.g. about:blank)
	if (!currentHostname) {
		hideParent(LOCAL_VOLUME_MULTIPLIER_RANGE);
		return;
	}

	if (storage[currentHostname].excluded) {
		EXCLUDED_HOSTNAME_MESSAGE.classList.remove("hidden");
		hideParent(LOCAL_VOLUME_MULTIPLIER_RANGE);
		return;
	}

	globalVolumeOptions.enabled = !storage[currentHostname].enabled;
	localVolumeOptions.enabled = storage[currentHostname].enabled;
	localVolumeOptions.volume = storage[currentHostname].volume;
	localMonoNoteFlipper.mono = storage[currentHostname].mono;

	HOSTNAME_TEXT.innerText = currentHostname;

	if (storage.options.showVolumeMultiplier == "both")
	{
		LOCAL_VOLUME_MULTIPLIER_RANGE.style.maxWidth = GLOBAL_VOLUME_MULTIPLIER_RANGE.style.maxWidth = (
			Math.min(LOCAL_VOLUME_MULTIPLIER_RANGE.offsetWidth, GLOBAL_VOLUME_MULTIPLIER_RANGE.offsetWidth) + "px"
		)
	}
	else if (storage.options.showVolumeMultiplier == "global") hideParent(LOCAL_VOLUME_MULTIPLIER_RANGE);
	else if (storage.options.showVolumeMultiplier == "local") hideParent(GLOBAL_VOLUME_MULTIPLIER_RANGE);

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

globalVolumeOptions = new VolumeOptions([GLOBAL_VOLUME_MULTIPLIER_COUNTER, GLOBAL_VOLUME_MULTIPLIER_RANGE], () => {
	syncLocalVolumeOptions();
	setGlobalOptions({ volume: globalVolumeOptions.volume });
})

localVolumeOptions = new VolumeOptions([LOCAL_VOLUME_MULTIPLIER_COUNTER, LOCAL_VOLUME_MULTIPLIER_RANGE], () => {
	globalVolumeOptions.enabled = false;
	localVolumeOptions.enabled = true;
	setLocalOptions({ volume: localVolumeOptions.volume })
})

globalMonoNoteFlipper = new VolumeMonoFlip(FLIP_GLOBAL_SOUND_MODE, () => {
	animate(FLIP_GLOBAL_SOUND_MODE.querySelector("img"), "bounce", 0.2);

	syncLocalVolumeOptions();
	setGlobalOptions({ mono: globalMonoNoteFlipper.mono })
})

localMonoNoteFlipper = new VolumeMonoFlip(FLIP_LOCAL_SOUND_MODE, () => {
	animate(FLIP_LOCAL_SOUND_MODE.querySelector("img"), "bounce", 0.2);

	globalVolumeOptions.enabled = false;
	localVolumeOptions.enabled = true;

	setLocalOptions({ mono: localMonoNoteFlipper.mono })
})


DELETE_LOCAL_VOLUME_OPTIONS.addEventListener("click", () => {
	if (localVolumeOptions.enabled) {
		animate(DELETE_LOCAL_VOLUME_OPTIONS.querySelector("img"), "shake", 0.4);

		globalVolumeOptions.enabled = true;
		localVolumeOptions.enabled = false;

		syncLocalVolumeOptions();
		setLocalOptions({ enabled: localVolumeOptions.enabled })
	}
})

RESTORE_GLOBAL_VOLUME_OPTIONS.addEventListener("click", () => {
	animate(RESTORE_GLOBAL_VOLUME_OPTIONS.querySelector("img"), "bounce", 0.2);

	globalVolumeOptions.volume = 100;
	globalMonoNoteFlipper.mono = false;

	syncLocalVolumeOptions();
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
})


browser.tabs.query({active: true, currentWindow: true}, async tabs => {
	try {
		currentTabId = tabs[0].id;
		currentHostname = new URL(tabs[0].url).hostname;
	} catch {}

	refreshPopup();
})
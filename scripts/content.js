"use strict";

// GETTING ACTUAL HOSTNAME (BYPASSING IFRAME'S)
function getUrl() {
	return (window.self === window.top) ? document.URL : document.referrer;
}
const hostname = (getUrl() == "") ? "blank" : new URL(getUrl()).hostname;

const DEBUG = false && (hostname !== "blank");
if (DEBUG) console.log(hostname);


class AudioBooster {
	constructor() {
		this.audioCtx = new AudioContext();

		this.gainNode = this.audioCtx.createGain();
		this.gainNode.connect(this.audioCtx.destination);

		this.INITIAL_CHANNEL_COUNT = this.audioCtx.destination.channelCount;
		this.MONO_CHANNEL_COUNT = 1;
	}

	connectMediaElement(el) {
		return this.audioCtx.createMediaElementSource(el).connect(this.gainNode);
	}

	get gain() {
		return this.gainNode.gain.value;
	}
	set gain(gain) {
		this.gainNode.gain.value = gain;
	}

	get mono() {
		return this.audioCtx.destination.channelCount == this.MONO_CHANNEL_COUNT;
	}
	set mono(mono) {
		this.audioCtx.destination.channelCount = (mono ? this.MONO_CHANNEL_COUNT : this.INITIAL_CHANNEL_COUNT);
	}
}


function onNodeCreation(callback, {type, selector} = {}) {
	function callbackWrapper(node) {
		if (type && node.nodeType != type) return;
		if (selector && !node.matches(selector)) return;

		callback(node);
	}

	new MutationObserver(records => {
		for (let mutation of records) {
			for (let node of mutation.addedNodes) {
				let nodeList = [node];
				callbackWrapper(node);

				for (let node of nodeList) {
					for (let child of node.childNodes) {
						nodeList.push(child);
						callbackWrapper(child);
					}
				}
			}
		}
	}).observe(document, {subtree: true, childList: true});
}


(async () => {
	// SENDING DOMAIN TO BACKGROUND SCRIPT
	if (hostname !== "blank") {
		await browser.runtime.sendMessage({action: "setupRequests", hostname: hostname});
		if (DEBUG) console.log("Awaited background script");
	}


	let initialStorage = await getStorage(hostname);

	if (initialStorage[hostname].excluded) return;


	// SETTING UP STORAGE LISTENER TO UPDATE VOLUME MULTIPLIER
	let audio = null;

	async function updateVolume() {
		if (audio) {
			const storage = await getStorage(hostname);
			const options = storage.session.url == getUrl() ? storage.session : storage[hostname];

			audio.gain = options.volume / 100;
			audio.mono = options.mono;
		}
	}

	browser.storage.local.onChanged.addListener(() => {
		if (DEBUG) console.log("Detected storage change");
		updateVolume()
	});

	browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
		if (request.action == "updateVolume") {
			if (DEBUG) console.log("Detected url change");
			updateVolume();
		}
	});


	// WATCH FOR MEDIA ELEMENTS OR FINDING THEM IF THEY ALREADY EXIST
	async function onMediaElementCreation(el) {
		const BOOSTED_CLASSNAME = `_volume-boosted`;

		if (!el.classList.contains(BOOSTED_CLASSNAME)) {
			if (DEBUG) console.log(el);

			el.classList.add(BOOSTED_CLASSNAME);

			el.crossOrigin = "anonymous";

			if (!audio) {
				audio = new AudioBooster();
				updateVolume();
			}

			audio.connectMediaElement(el);
		}
	}

	const MEDIA_TAGS_SELECTOR = "video, audio";
	onNodeCreation(onMediaElementCreation, {type: Node.ELEMENT_NODE, selector: MEDIA_TAGS_SELECTOR})
	document.querySelectorAll(MEDIA_TAGS_SELECTOR).forEach(onMediaElementCreation);
})();
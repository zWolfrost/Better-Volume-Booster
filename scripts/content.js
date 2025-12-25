"use strict";

const DEBUG = false;


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
	// SENDING DOMAIN TO BACKGROUND SCRIPT + GETTING URL
	let url, hostname, initialStorage;
	let messageIsResolved = false;

	let message = browser.runtime.sendMessage({action: "updateRequests"}).then(response => {
		url = response.url;
		hostname = new URL(url).hostname;
		initialStorage = response.storage;
		messageIsResolved = true;

		if (DEBUG) console.log("Domain: " + hostname);
	});


	// SETTING UP STORAGE LISTENER TO UPDATE VOLUME MULTIPLIER
	let audio = null;

	async function updateVolume() {
		if (audio) {
			const storage = await getStorage(hostname);
			const options = storage.session.url == url ? storage.session : storage[hostname];

			audio.gain = options.volume / 100;
			audio.mono = options.mono;
		}
	}

	browser.storage.local.onChanged.addListener(() => {
		if (DEBUG) console.log("Detected storage change");
		updateVolume()
	});

	browser.runtime.onMessage.addListener(message => {
		if (message.action == "updateVolume") {
			url = message.url;
			if (DEBUG) console.log("Detected url change: " + url);
			updateVolume();
		}
	});


	// WATCH FOR MEDIA ELEMENTS OR FINDING THEM IF THEY ALREADY EXIST
	async function onMediaElementCreation(el) {
		const BOOSTED_CLASSNAME = `_volume-boosted`;

		if (!el.classList.contains(BOOSTED_CLASSNAME)) {
			if (DEBUG) console.log(el);

			el.classList.add(BOOSTED_CLASSNAME);

			if (messageIsResolved) {
				if (DEBUG) console.log("Message already resolved, could cleanly bypass")

				if (initialStorage[hostname].excluded) {
					return;
				}

				el.crossOrigin = "anonymous";
			}
			else {
				if (DEBUG) console.log("Message not yet resolved, had to reload media element")

				el.preload = "metadata";

				await message;

				if (initialStorage[hostname].excluded) {
					el.load();
					return;
				}

				el.crossOrigin = "anonymous";

				el.load();
			}

			if (el.paused) {
				await new Promise(resolve => el.addEventListener("play", resolve, {once: true}));
			}

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


	// RESUME AUDIO CONTEXT ON FIRST USER INTERACTION
	document.addEventListener("click", () => {
		if (audio.audioCtx.state === "suspended") {
			audio.audioCtx.resume();
			if (DEBUG) console.log("Resumed AudioContext");
		}
	}, {once: true});
})();
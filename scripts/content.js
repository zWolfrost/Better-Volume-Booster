// GETTING ACTUAL HOSTNAME (BYPASSING IFRAME'S)
const url = (window.self === window.top) ? document.URL : document.referrer;
const hostname = (url == "") ? "blank" : new URL(url).hostname;

const DEBUG = false && (hostname !== "blank");
if (DEBUG) console.log(hostname);


browser.storage.local.get(hostname).then(initialStorage => {
	if (initialStorage?.[hostname]?.excluded ?? false) return;

	// SETTING UP VOLUME BOOSTER
	class AudioTweaker {
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

	let audio = null;



	// WATCH FOR MEDIA ELEMENTS OR FINDING THEM IF THEY ALREADY EXIST
	const BOOSTED_CLASSNAME = `_volume-boosted`;
	const MEDIA_TAGS_SELECTOR = "video, audio";


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


	onNodeCreation(onMediaElementCreation, {type: Node.ELEMENT_NODE, selector: MEDIA_TAGS_SELECTOR})
	document.querySelectorAll(MEDIA_TAGS_SELECTOR).forEach(onMediaElementCreation);

	async function onMediaElementCreation(el) {
		if (!el.classList.contains(BOOSTED_CLASSNAME)) {
			if (DEBUG) console.log(el);

			el.classList.add(BOOSTED_CLASSNAME);

			/* if (el.readyState <= 1) {
				await new Promise(resolve => el.addEventListener("loadedmetadata", resolve, {once: true}));
			} */

			el.crossOrigin = "anonymous";

			if (el.paused) {
				await new Promise(resolve => el.addEventListener("play", resolve, {once: true}));
			}

			if (!audio) {
				audio = new AudioTweaker();
				updateVolume();
			}

			audio.connectMediaElement(el);
		}
	}



	// SETTING UP STORAGE LISTENER TO UPDATE VOLUME MULTIPLIER
	function updateVolume() {
		if (audio) {
			browser.storage.local.get().then(storage => {
				const hostnameGlobalFallback = storage?.[hostname]?.enabled ? hostname : "global";

				audio.gain = storage[hostnameGlobalFallback].volumeMultiplierPercent / 100;
				audio.mono = storage[hostnameGlobalFallback].mono;

				if (DEBUG) console.log(storage[hostnameGlobalFallback].volumeMultiplierPercent, storage[hostnameGlobalFallback].mono);
			})
		}
	}

	browser.storage.local.onChanged.addListener(changes => updateVolume());
});


// SENDING DOMAIN TO BACKGROUND SCRIPT
if (hostname !== "blank") {
	browser.runtime.sendMessage({hostname: hostname});
}
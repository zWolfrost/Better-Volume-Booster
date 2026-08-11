"use strict";

const DEBUG = false;
const log = (...args) => { if (DEBUG) console.log(...args); };


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
		// Short ramp instead of an instant jump: no audible pops/cracks when
		// the multiplier changes mid-playback (kinder to ears and speakers).
		this.gainNode.gain.setTargetAtTime(gain, this.audioCtx.currentTime, 0.05);
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
	// REGISTER THIS FRAME WITH THE BACKGROUND SCRIPT + GET SETTINGS
	// (the background only shares the exclusion flag: minimal data flow)
	let url, hostname, initialExcluded;
	let messageIsResolved = false;

	// The CORS rule must be scoped to THIS frame's real request initiator:
	// its own origin for normal frames, or the inherited parent origin for
	// about:blank frames - never the top hostname, or cross-origin iframes'
	// media would get rules that never match their requests.
	const frameInitiator = location.hostname || (() => {
		try { return new URL(document.baseURI).hostname; } catch { return ""; }
	})();

	let message = browser.runtime.sendMessage({action: "updateRequests"}).then(response => {
		url = response.url;
		hostname = new URL(url).hostname;
		initialExcluded = !!response.excluded;
		messageIsResolved = true;

		log("Domain: " + hostname);
	});


	// VOLUME / MONO SYNC (the background computes the effective settings,
	// which lets the temporary "session" multiplier live in RAM-only storage)
	let audio = null;

	async function updateVolume() {
		if (!audio || !url) return;

		const effective = await browser.runtime.sendMessage({action: "getEffective", url}).catch(() => null);
		if (!effective || effective.excluded) return;

		audio.gain = effective.volume / 100;
		audio.mono = effective.mono;
	}

	browser.runtime.onMessage.addListener(message => {
		if (message.action == "updateVolume") {
			url = message.url;
			log("Detected url change: " + url);
			updateVolume();
		}
	});


	// PRIVACY HELPERS ----------------------------------------------------
	// Report the cross-origin hosts this frame embeds media from, so the
	// popup can offer *scoped* host permissions (same-origin media never
	// needs any permission and is never reported).
	function reportMediaSources(elements) {
		const hostnames = [];

		for (let el of elements) {
			try {
				const sourceUrl = new URL(el.currentSrc ?? el.src, document.baseURI);
				if ((sourceUrl.protocol == "http:" || sourceUrl.protocol == "https:") && sourceUrl.origin != location.origin) {
					hostnames.push(sourceUrl.hostname);
				}
			} catch {}
		}

		if (hostnames.length) {
			browser.runtime.sendMessage({action: "reportMediaSources", hostnames}).catch(() => {});
		}
	}

	// Ask the background for a CORS relaxation scoped to
	// (this page -> that media domain) instead of a global one.
	async function requestScopedCors(mediaHostname) {
		const response = await browser.runtime.sendMessage({
			action: "ensureCors",
			initiator: frameInitiator,
			domain: mediaHostname
		}).catch(() => null);

		return !!response?.ok;
	}

	function getCrossOriginMediaHostname(el, useAttribute = false) {
		try {
			// useAttribute: during a src-swap mutation, currentSrc still
			// points at the OLD resource - the attribute holds the new one.
			// Otherwise also consider <source> children: elements that carry
			// their URL in a child keep el.src/currentSrc empty until the
			// resource selection runs.
			let raw;
			if (useAttribute) raw = el.getAttribute("src") ?? "";
			else {
				raw = el.currentSrc || el.src || "";
				if (!raw && el.querySelector) {
					const source = el.querySelector("source");
					if (source) raw = source.getAttribute("src") ?? "";
				}
			}
			const sourceUrl = new URL(raw, document.baseURI);
			if ((sourceUrl.protocol == "http:" || sourceUrl.protocol == "https:") && sourceUrl.origin != location.origin) {
				return sourceUrl.hostname;
			}
		} catch {}
		return null;
	}


	// WATCH FOR MEDIA ELEMENTS OR FIND THEM IF THEY ALREADY EXIST ---------
	const connected = new WeakSet(); // elements already wired to the booster

	async function onMediaElementCreation(el) {
		// iframes are only observed to report their host for the popup's
		// permission prompt (their own content script instance boosts them).
		if (el.tagName == "IFRAME") {
			reportMediaSources([el]);
			return;
		}

		// <source> children can arrive in a later mutation than their media
		// element; (re)apply the cross-origin setup to a not-yet-connected
		// parent so <source>-based cross-origin media is boosted, not muted.
		if (el.tagName == "SOURCE") {
			const parent = el.parentElement;
			if (parent && (parent.tagName == "VIDEO" || parent.tagName == "AUDIO") && !connected.has(parent)) {
				const host = getCrossOriginMediaHostname(parent);
				if (host) {
					requestScopedCors(host).then(ok => {
						if (ok && parent.isConnected && !connected.has(parent)) {
							parent.crossOrigin = "anonymous";
							parent.load();
						}
					}).catch(() => {});
				}
			}
			return;
		}

		const BOOSTED_CLASSNAME = `_volume-boosted`;

		if (!el.classList.contains(BOOSTED_CLASSNAME)) {
			log(el);

			el.classList.add(BOOSTED_CLASSNAME);
			reportMediaSources([el]);

			if (messageIsResolved) {
				log("Message already resolved, could cleanly bypass");

				if (initialExcluded) {
					return;
				}
			}
			else {
				log("Message not yet resolved, had to reload media element");

				el.preload = "metadata";

				await message;

				if (initialExcluded) {
					el.load();
					return;
				}
			}

			// Same-origin media needs no CORS relaxation and no request
			// modification at all: it is left completely untouched.
			// Cross-origin media gets a scoped (page -> media host) rule,
			// requested before the (re)fetch so the response carries CORS.
			const mediaHostname = getCrossOriginMediaHostname(el);
			if (mediaHostname) {
				const allowed = await requestScopedCors(mediaHostname);
				if (!allowed) return;

				el.crossOrigin = "anonymous";

				// (Re)start the fetch now that the scoped rule exists, so the
				// very first request already carries CORS: no race with the
				// resource-selection task, and no tainted (silenced) media.
				el.load();
			}

			// If the player later swaps the source to another cross-origin
			// host, request the new scoped rule on attribute change and then
			// restart the fetch once the rule is active (the implicit load
			// that races ahead without CORS is simply retried).
			new MutationObserver(() => {
				const swappedHost = getCrossOriginMediaHostname(el, true);
				if (swappedHost) {
					el.crossOrigin = "anonymous";
					requestScopedCors(swappedHost).then(ok => {
						if (ok && el.isConnected) el.load();
					}).catch(() => {});
				}
			}).observe(el, {attributes: true, attributeFilter: ["src"]});

			if (el.paused) {
				const failed = await new Promise(resolve => {
					el.addEventListener("play", () => resolve(false), {once: true});
					el.addEventListener("error", () => resolve(true), {once: true});
				});
				if (failed) return;
			}

			if (!audio) {
				audio = new AudioBooster();
				updateVolume();
			}

			// The page may already own this element's WebAudio graph (only one
			// MediaElementSource per element is allowed): in that case leave
			// the page's audio completely alone instead of throwing.
			try {
				audio.connectMediaElement(el);
				connected.add(el);
			}
			catch (error) {
				log("Could not connect media element (page owns its WebAudio graph?):", error);
				return;
			}
		}
	}

	const MEDIA_TAGS_SELECTOR = "video, audio, iframe, source";
	onNodeCreation(onMediaElementCreation, {type: Node.ELEMENT_NODE, selector: MEDIA_TAGS_SELECTOR})

	function initialScan() {
		const found = document.querySelectorAll(MEDIA_TAGS_SELECTOR);
		reportMediaSources(found);
		found.forEach(onMediaElementCreation);
	}
	initialScan();
	if (document.readyState == "loading") {
		document.addEventListener("DOMContentLoaded", initialScan, {once: true});
	}


	// RESUME AUDIO CONTEXT ON FIRST USER INTERACTION
	const resumeAudio = () => {
		if (audio && audio.audioCtx.state === "suspended") {
			audio.audioCtx.resume();
			log("Resumed AudioContext");
		}
	};
	document.addEventListener("click", resumeAudio, {once: true});
	document.addEventListener("keydown", resumeAudio, {once: true});
})();

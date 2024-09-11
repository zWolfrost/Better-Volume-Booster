// UPDATE SETTINGS WITH DEFAULTS IF NOT SET
browser.storage.local.get().then(storage => {
	browser.storage.local.set({
		...storage,

		options: {
			volumeMultiplierPercentLimit: storage.options?.volumeMultiplierPercentLimit ?? 500,
			showVolumeMultiplier: storage.options?.showVolumeMultiplier ?? "both",
			includePermissionSubdomains: storage.options?.includePermissionSubdomains ?? false,
			sendCookiesInMediaRequests: storage.options?.sendCookiesInMediaRequests ?? "never"
		},

		global: {
			volumeMultiplierPercent: storage.global?.volumeMultiplierPercent ?? 100,
			mono: storage.global?.mono ?? false
		}
	})
})


// SEND COOKIES IN MEDIA REQUESTS
browser.runtime.onMessage.addListener(async msg => {
	const storage = await browser.storage.local.get();

	const optionSendCookie = storage.options.sendCookiesInMediaRequests
	const localSendCookie = storage[msg.domain]?.sendCookiesInMediaRequests ?? false

	if ((optionSendCookie == "always") || (optionSendCookie == "ask" && localSendCookie)) {
		const domain = msg.domain.split(".").slice(-2).join(".");
		const cookies = await browser.cookies.getAll({domain: domain});
		const cookieString = '"' + cookies.map(cookie => `${cookie.name}=${cookie.value}`).join("; ") + '"'

		browser.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: [2],
			addRules: [{
				"id": 2,
				"priority": 1,
				"action": {
					"type": "modifyHeaders",
					"requestHeaders": [{
						"header": "Cookie",
						"operation": "set",
						"value": cookieString
					}]
				},
				"condition": {
					"resourceTypes": ["media"]
				}
			}]
		});
	}
	else {
		browser.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: [2]
		});
	}
});
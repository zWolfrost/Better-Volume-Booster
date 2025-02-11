// UPDATE SETTINGS WITH DEFAULTS IF NOT SET
browser.storage.local.get().then(storage => {
	browser.storage.local.set({
		...storage,

		options: {
			volumeMultiplierPercentLimit: storage.options?.volumeMultiplierPercentLimit ?? 500,
			showVolumeMultiplier: storage.options?.showVolumeMultiplier ?? "both",
			specifyPermissionSubdomains: storage.options?.specifyPermissionSubdomains ?? storage.options?.includePermissionSubdomains ?? false
		},

		global: {
			volumeMultiplierPercent: storage.global?.volumeMultiplierPercent ?? 100,
			mono: storage.global?.mono ?? false
		}
	})
})


const EXCLUDE_HOSTNAME_CHECKBOX_ID = "exclude-hostname"
const SEND_COOKIES_CHECKBOX_ID = "send-cookies"


function updateContextMenu(hostname, storage) {
	browser.contextMenus.removeAll()

	browser.contextMenus.create({
		id: EXCLUDE_HOSTNAME_CHECKBOX_ID,
		title: `Exclude "${hostname}" from audio boosting`,
		type: "checkbox",
		contexts: ["action"],
		checked: storage?.[hostname]?.excluded ?? false
	});

	browser.contextMenus.create({
		id: SEND_COOKIES_CHECKBOX_ID,
		title: `Send cookies to "${hostname}" media requests`,
		type: "checkbox",
		contexts: ["action"],
		checked: storage?.[hostname]?.sendCookiesInMediaRequests ?? false
	});
}


browser.contextMenus.onClicked.addListener(async (info, tab) => {
	const hostname = new URL(tab.url).hostname;
	const storage = await browser.storage.local.get(hostname);

	let properties = {};

	switch (info.menuItemId) {
		case SEND_COOKIES_CHECKBOX_ID:
			properties = {sendCookiesInMediaRequests: !(storage?.[hostname]?.sendCookiesInMediaRequests ?? false)}
			break;
		case EXCLUDE_HOSTNAME_CHECKBOX_ID:
			properties = {excluded: !(storage?.[hostname]?.excluded ?? false)}
			break;
		default:
			return;
	}

	await browser.storage.local.set({
		[hostname]: {
			...storage?.[hostname],
			...properties
		}
	});

	browser.tabs.reload(tab.id);
});


browser.tabs.onActivated.addListener(async activeTab => {
	const hostname = await browser.tabs.get(activeTab.tabId).then(tab => new URL(tab.url).hostname);
	if (!hostname) return;

	const storage = await browser.storage.local.get();

	updateContextMenu(hostname, storage);
});


browser.runtime.onMessage.addListener(async msg => {
	const storage = await browser.storage.local.get();

	const hostname = msg.hostname;
	const domain = hostname.split(".").slice(-2).join(".");

	const isExcluded = storage?.[hostname]?.excluded ?? false
	const sendCookies = storage?.[hostname]?.sendCookiesInMediaRequests ?? false

	updateContextMenu(hostname, storage);

	if (!isExcluded) {
		browser.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: [1],
			addRules: [{
				"id": 1,
				"priority": 1,
				"action": {
					"type": "modifyHeaders",
					"responseHeaders": [
						{
							"header": "Access-Control-Allow-Origin",
							"operation": "set",
							"value": "*"
						}
					]
				},
				"condition": {
					"resourceTypes": ["media"]
				}
			}]
		});
	}
	else {
		browser.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: [1]
		});
	}

	if (!isExcluded && sendCookies) {
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
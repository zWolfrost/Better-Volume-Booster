"use strict";

const HOSTNAME_TITLE_NORMAL_ID = "hostname-title";
const EXCLUDE_HOSTNAME_CHECKBOX_ID = "exclude-hostname"
const RELOAD_MEDIA_ELEMENTS_CHECKBOX_ID = "reload-media-elements"
const SEND_COOKIES_CHECKBOX_ID = "send-cookies"


// CONTEXT MENU SETUP
browser.contextMenus.onShown.addListener(async (info, tab) => {
	if (!tab.url) return;

	const hostname = new URL(tab.url).hostname;
	const storage = await getStorage(hostname);

	await browser.contextMenus.create({
		id: HOSTNAME_TITLE_NORMAL_ID,
		title: `Settings for ${hostname}:`,
		type: "normal",
		contexts: ["action"],
		enabled: false
	})

	await browser.contextMenus.create({
		id: EXCLUDE_HOSTNAME_CHECKBOX_ID,
		title: "Exclude from audio boosting",
		type: "checkbox",
		contexts: ["action"],
		checked: storage[hostname].excluded
	});

	await browser.contextMenus.create({
		id: RELOAD_MEDIA_ELEMENTS_CHECKBOX_ID,
		title: "Preemptively reload media elements",
		type: "checkbox",
		contexts: ["action"],
		checked: storage[hostname].reloadMediaElements
	});

	await browser.contextMenus.create({
		id: SEND_COOKIES_CHECKBOX_ID,
		title: "Send cookies to media requests",
		type: "checkbox",
		contexts: ["action"],
		checked: storage[hostname].sendCookiesInMediaRequests
	});

	browser.contextMenus.refresh();
})

browser.contextMenus.onHidden.addListener(() => browser.contextMenus.removeAll())


browser.contextMenus.onClicked.addListener(async (info, tab) => {
	const hostname = new URL(tab.url).hostname;
	const storage = await getStorage(hostname);

	let propertyName = {
		[EXCLUDE_HOSTNAME_CHECKBOX_ID]: "excluded",
		[RELOAD_MEDIA_ELEMENTS_CHECKBOX_ID]: "reloadMediaElements",
		[SEND_COOKIES_CHECKBOX_ID]: "sendCookiesInMediaRequests"
	}[info.menuItemId]

	await setStorage({ [hostname]: { [propertyName]: !storage[hostname][propertyName] } });

	browser.tabs.reload(tab.id);
});


browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status === "complete" && tab.url) {
		browser.tabs.sendMessage(tabId, {action: "updateVolume"});
	}
});


// DECLARATIVE NET REQUESTS RULES SETUP
browser.runtime.onMessage.addListener(async msg => {
	if (msg.action == "setupRequests") {
		const hostname = msg.hostname;
		const domain = hostname.split(".").slice(-2).join(".");

		const storage = await getStorage(hostname);

		if (!storage[hostname].excluded) {
			await browser.declarativeNetRequest.updateDynamicRules({
				removeRuleIds: [1],
				addRules: [{
					"id": 1,
					"priority": 1,
					"action": {
						"type": "modifyHeaders",
						"responseHeaders": [{
							"header": "Access-Control-Allow-Origin",
							"operation": "set",
							"value": "*"
						}]
					},
					"condition": {
						"resourceTypes": ["media"]
					}
				}]
			});
		}
		else {
			await browser.declarativeNetRequest.updateDynamicRules({
				removeRuleIds: [1]
			});
		}

		if (!storage[hostname].excluded && storage[hostname].sendCookiesInMediaRequests) {
			const cookies = await browser.cookies.getAll({domain: domain});
			const cookieString = '"' + cookies.map(cookie => `${cookie.name}=${cookie.value}`).join("; ") + '"'

			await browser.declarativeNetRequest.updateDynamicRules({
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
			await browser.declarativeNetRequest.updateDynamicRules({
				removeRuleIds: [2]
			});
		}
	}
});
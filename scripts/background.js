"use strict";

const HOSTNAME_TITLE_NORMAL_ID = "hostname-title";
const EXCLUDE_HOSTNAME_CHECKBOX_ID = "exclude-hostname"
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
		[SEND_COOKIES_CHECKBOX_ID]: "sendCookiesInMediaRequests"
	}[info.menuItemId]

	await setStorage({ [hostname]: { [propertyName]: !storage[hostname][propertyName] } });

	await DNRsetupCORS(await getStorage());
	await DNRsetupCookies(hostname, await getStorage(hostname));

	browser.tabs.reload(tab.id);
});


browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status === "complete" && tab.url) {
		browser.tabs.sendMessage(tabId, {action: "updateVolume", url: tab.url});
	}
});


// DECLARATIVE NET REQUESTS RULES SETUP
browser.runtime.onMessage.addListener(async (message, sender) => {
	const url = sender.tab.url;
	const hostname = new URL(url).hostname;
	const storage = await getStorage(hostname);

	if (message.action == "updateRequests") {
		await DNRsetupCookies(hostname, storage);
	}

	return {url: url, storage: storage};
});


async function DNRsetupCORS(storage) {
	const excludedHostnames = Object.keys(storage).filter(host => storage[host].excluded);

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
				"resourceTypes": ["media"],
				"excludedInitiatorDomains": excludedHostnames
			}
		}]
	});

	console.log("CORS DNR rules updated with excluded domains: ", excludedHostnames);
}

async function DNRsetupCookies(hostname, storage) {
	if (!storage[hostname].excluded && storage[hostname].sendCookiesInMediaRequests) {
		const domain = hostname.split(".").slice(-2).join(".");

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

		console.log("Cookies DNR rule added for domain: ", hostname);
	}
	else {
		await browser.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: [2]
		});
	}
}

getStorage().then(DNRsetupCORS);
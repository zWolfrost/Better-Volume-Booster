"use strict";

const MIN_VOLUME_MULTIPLIER_LIMIT = 100;
const MAX_VOLUME_MULTIPLIER_LIMIT = 1000;

const VOLUME_MULTIPLIER_LIMIT_RANGE = document.getElementById("volume-multiplier-limit-range");
const VOLUME_MULTIPLIER_LIMIT_COUNTER = document.getElementById("volume-multiplier-limit-counter");
const SHOW_VOLUME_MULTIPLIER_SELECT = document.getElementById("show-volume-multiplier-select");
const SPECIFY_PERMISSION_SUBDOMAINS_CHECKBOX = document.getElementById("specify-permission-subdomain-checkbox");
const APPLY_DEFAULT_LOCAL_SETTINGS_CHECKBOX = document.getElementById("apply-default-local-settings-checkbox");
const MORE_INFORMATION_BUTTON = document.getElementById("more-information-button");
const RESET_STORAGE_BUTTON = document.getElementById("reset-storage-button");


(async () => {
	const storage = await getStorage()
	volumeMultiplierLimit.inputs.forEach(input => {
		input.min = MIN_VOLUME_MULTIPLIER_LIMIT
		input.max = MAX_VOLUME_MULTIPLIER_LIMIT
		input.value = storage.options.volumeMultiplierPercentLimit
	})

	SHOW_VOLUME_MULTIPLIER_SELECT.value = storage.options.showVolumeMultiplier;
	SPECIFY_PERMISSION_SUBDOMAINS_CHECKBOX.checked = storage.options.specifyPermissionSubdomains;
	APPLY_DEFAULT_LOCAL_SETTINGS_CHECKBOX.checked = storage.options.applyDefaultLocalSettings;
})();


const setOptions = properties => setStorage({ options: { ...properties } })

const volumeMultiplierLimit = new VolumeOptions(
	[VOLUME_MULTIPLIER_LIMIT_COUNTER, VOLUME_MULTIPLIER_LIMIT_RANGE],
	() => setOptions({ volumeMultiplierPercentLimit: volumeMultiplierLimit.volume })
)
SHOW_VOLUME_MULTIPLIER_SELECT.addEventListener("change", e => setOptions({showVolumeMultiplier: e.target.value}))
SPECIFY_PERMISSION_SUBDOMAINS_CHECKBOX.addEventListener("change", e => setOptions({specifyPermissionSubdomains: e.target.checked}))
APPLY_DEFAULT_LOCAL_SETTINGS_CHECKBOX.addEventListener("change", e => setOptions({applyDefaultLocalSettings: e.target.checked}))

MORE_INFORMATION_BUTTON.addEventListener("click", () => {
	alert(`Unfortunately the firefox extension API has some missing functions relative to chrome (probably for privacy's sake, so you can't just, for example, send all the audio coming from the browser to some 3rd party server).\n
That's why most, if not all firefox audio booster extensions (including this one), don't work on websites that use javascript to play audio.\n
That being said, this extension offers some workarounds to fix most websites, but they are not perfect. That's why the options get a lot technical, even though they are for a simple audio booster.\n
If you have any questions about the options, feel free to open an issue on github and ask me.`)
})

RESET_STORAGE_BUTTON.addEventListener("click", async () => {
	if (confirm("Are you sure you want to clear all settings and reset them to default?")) {
		await browser.storage.local.clear()
		browser.runtime.reload()
	}
})
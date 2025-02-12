"use strict"

const MIN_VOLUME_MULTIPLIER_LIMIT = 100;
const MAX_VOLUME_MULTIPLIER_LIMIT = 1000;

const VOLUME_MULTIPLIER_LIMIT_RANGE = document.getElementById("volume-multiplier-limit-range");
const VOLUME_MULTIPLIER_LIMIT_COUNTER = document.getElementById("volume-multiplier-limit-counter");
const SHOW_VOLUME_MULTIPLIER_SELECT = document.getElementById("show-volume-multiplier-select");
const SPECIFY_PERMISSION_SUBDOMAINS_CHECKBOX = document.getElementById("specify-permission-subdomain-checkbox");
const MORE_INFORMATION_BUTTON = document.getElementById("more-information-button");
const RESET_STORAGE_BUTTON = document.getElementById("reset-storage-button");


function refreshSettings() {
	browser.storage.local.get().then(storage => {
		volumeMultiplierLimit.forEachInput(input => {
			input.min = MIN_VOLUME_MULTIPLIER_LIMIT
			input.max = MAX_VOLUME_MULTIPLIER_LIMIT
			input.value = storage.options.volumeMultiplierPercentLimit
		})

		SHOW_VOLUME_MULTIPLIER_SELECT.value = storage.options.showVolumeMultiplier;
		SPECIFY_PERMISSION_SUBDOMAINS_CHECKBOX.checked = storage.options.specifyPermissionSubdomains;
	})
}

function setOptions() {
	browser.storage.local.set({
		options: {
			volumeMultiplierPercentLimit: +volumeMultiplierLimit.inputs[0].value,
			showVolumeMultiplier: SHOW_VOLUME_MULTIPLIER_SELECT.value,
			specifyPermissionSubdomains: SPECIFY_PERMISSION_SUBDOMAINS_CHECKBOX.checked
		}
	})
}


const volumeMultiplierLimit = new VolumeOptions([VOLUME_MULTIPLIER_LIMIT_COUNTER, VOLUME_MULTIPLIER_LIMIT_RANGE], setOptions)

RESET_STORAGE_BUTTON.addEventListener("click", () => {
	if (confirm("Are you sure you want to clear all settings and reset them to default?")) {
		browser.storage.local.clear().then(() => browser.runtime.reload())
	}
})

SHOW_VOLUME_MULTIPLIER_SELECT.addEventListener("change", setOptions)
SPECIFY_PERMISSION_SUBDOMAINS_CHECKBOX.addEventListener("change", setOptions)
MORE_INFORMATION_BUTTON.addEventListener("click", () => {
	alert(`Unfortunately the firefox extension API has some missing functions relative to chrome (probably for privacy's sake, so you can't just, for example, send all the audio coming from the browser to some 3rd party server).\n
That's why most, if not all firefox audio booster extensions (including this one), don't work on websites that use javascript to play audio.\n
That being said, this extension offers some workarounds to fix most websites, but they are not perfect. That's why the options get a lot technical, even though they are for a simple audio booster.\n
If you have any questions about the options, feel free to open an issue on github and ask me.`)
})


refreshSettings();
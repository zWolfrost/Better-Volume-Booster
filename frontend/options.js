"use strict"

const MIN_VOLUME_MULTIPLIER_LIMIT = 100;
const MAX_VOLUME_MULTIPLIER_LIMIT = 1000;

const VOLUME_MULTIPLIER_LIMIT_RANGE = document.getElementById("volume-multiplier-limit-range");
const VOLUME_MULTIPLIER_LIMIT_COUNTER = document.getElementById("volume-multiplier-limit-counter");
const SHOW_VOLUME_MULTIPLIER_SELECT = document.getElementById("show-volume-multiplier-select");
const RESET_STORAGE_BUTTON = document.getElementById("reset-storage-button");
const INCLUDE_PERMISSION_SUBDOMAINS_CHECKBOX = document.getElementById("include-permission-subdomain-checkbox");


function refreshSettings() {
	browser.storage.local.get().then(storage => {
		volumeMultiplierLimit.forEachInput(input => input.min = MIN_VOLUME_MULTIPLIER_LIMIT)
		volumeMultiplierLimit.forEachInput(input => input.max = MAX_VOLUME_MULTIPLIER_LIMIT)

		volumeMultiplierLimit.forEachInput(input => input.value = storage.options.volumeMultiplierPercentLimit)

		SHOW_VOLUME_MULTIPLIER_SELECT.value = storage.options.showVolumeMultiplier;
		INCLUDE_PERMISSION_SUBDOMAINS_CHECKBOX.checked = storage.options.includePermissionSubdomains;
	})
}

function setOptions() {
	browser.storage.local.set({
		options: {
			volumeMultiplierPercentLimit: +volumeMultiplierLimit.inputs[0].value,
			showVolumeMultiplier: SHOW_VOLUME_MULTIPLIER_SELECT.value,
			includePermissionSubdomains: INCLUDE_PERMISSION_SUBDOMAINS_CHECKBOX.checked
		}
	})
}


const volumeMultiplierLimit = new VolumeOptions([VOLUME_MULTIPLIER_LIMIT_COUNTER, VOLUME_MULTIPLIER_LIMIT_RANGE], setOptions)

RESET_STORAGE_BUTTON.addEventListener("click", () => {
	if (confirm("Are you sure you want to reset all storage and settings to default?")) {
		browser.storage.local.clear().then(() => browser.runtime.reload())
	}
})

SHOW_VOLUME_MULTIPLIER_SELECT.addEventListener("change", setOptions)
INCLUDE_PERMISSION_SUBDOMAINS_CHECKBOX.addEventListener("change", setOptions)


refreshSettings();
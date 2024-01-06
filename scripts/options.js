"use strict"

const MIN_VOLUME_MULTIPLIER_LIMIT = 100;
const MAX_VOLUME_MULTIPLIER_LIMIT = 1000;

const VOLUME_MULTIPLIER_LIMIT_RANGE = document.getElementById("volume-multiplier-limit-range");
const VOLUME_MULTIPLIER_LIMIT_COUNTER = document.getElementById("volume-multiplier-limit-counter");
const SHOW_VOLUME_MULTIPLIER_SELECT = document.getElementById("show-volume-multiplier-select");
const RESET_STORAGE_BUTTON = document.getElementById("reset-storage-button");
const DISABLE_ANY_PROMPT_CHECKBOX = document.getElementById("disable-any-prompt-checkbox");
const INCLUDE_PERMISSION_SUBDOMAINS_CHECKBOX = document.getElementById("include-permission-subdomain-checkbox");


function updateSettings()
{
   browser.storage.local.get().then(storage =>
   {
      volumeMultiplierLimit.forEachInput(input => input.min = MIN_VOLUME_MULTIPLIER_LIMIT)
      volumeMultiplierLimit.forEachInput(input => input.max = MAX_VOLUME_MULTIPLIER_LIMIT)

      volumeMultiplierLimit.forEachInput(input => input.value = storage.options.volumeMultiplierPercentLimit)

      SHOW_VOLUME_MULTIPLIER_SELECT.value = storage.options.showVolumeMultiplier;
      DISABLE_ANY_PROMPT_CHECKBOX.checked = storage.options.disableAnyPrompt;
      INCLUDE_PERMISSION_SUBDOMAINS_CHECKBOX.checked = storage.options.includePermissionSubdomains;
   })
}

function setOptions()
{
   browser.storage.local.set({
      options: {
         volumeMultiplierPercentLimit: +volumeMultiplierLimit.inputs[0].value,
         showVolumeMultiplier: SHOW_VOLUME_MULTIPLIER_SELECT.value,
         disableAnyPrompt: DISABLE_ANY_PROMPT_CHECKBOX.checked,
         includePermissionSubdomains: INCLUDE_PERMISSION_SUBDOMAINS_CHECKBOX.checked
      }
   })
}


const volumeMultiplierLimit = new VolumeOptions([VOLUME_MULTIPLIER_LIMIT_COUNTER, VOLUME_MULTIPLIER_LIMIT_RANGE], setOptions)

RESET_STORAGE_BUTTON.addEventListener("click", async () =>
{
   const confirmed = confirm("Are you sure you want to clear all storage and reset all the settings to default?");

   if (confirmed)
   {
      await browser.storage.local.clear()
      browser.runtime.reload()
   }
})

SHOW_VOLUME_MULTIPLIER_SELECT.addEventListener("change", setOptions)
DISABLE_ANY_PROMPT_CHECKBOX.addEventListener("change", setOptions)
INCLUDE_PERMISSION_SUBDOMAINS_CHECKBOX.addEventListener("change", setOptions)


updateSettings();
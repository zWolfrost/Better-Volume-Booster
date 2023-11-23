"use strict"

const DEF_VOLUME_MULTIPLIER_LIMIT = 500;
const MIN_VOLUME_MULTIPLIER_LIMIT = 100;
const MAX_VOLUME_MULTIPLIER_LIMIT = 1000;

const VOLUME_MULTIPLIER_LIMIT_RANGE = document.getElementById("volume-multiplier-limit-range");
const VOLUME_MULTIPLIER_LIMIT_COUNTER = document.getElementById("volume-multiplier-limit-counter");
const HIDE_LOCAL_VOLUME_MULTIPLIER = document.getElementById("hide-local-volume-multiplier");
const RESET_STORAGE_BUTTON = document.getElementById("reset-storage-button");


function updateInputs()
{
   browser.storage.local.get().then(storage =>
   {
      volumeMultiplierLimit.forEachInput(input => input.min = MIN_VOLUME_MULTIPLIER_LIMIT)
      volumeMultiplierLimit.forEachInput(input => input.max = MAX_VOLUME_MULTIPLIER_LIMIT)

      volumeMultiplierLimit.forEachInput(input => input.value = storage.options.volumeMultiplierPercentLimit)

      HIDE_LOCAL_VOLUME_MULTIPLIER.checked = storage.options.hideLocalVolumeMultiplier
   })
}

function setVolumeOptions()
{
   browser.storage.local.set({
      options: {
         volumeMultiplierPercentLimit: +volumeMultiplierLimit.inputs[0].value,
         hideLocalVolumeMultiplier: HIDE_LOCAL_VOLUME_MULTIPLIER.checked
      }
   })
}


const volumeMultiplierLimit = new VolumeOptions([VOLUME_MULTIPLIER_LIMIT_COUNTER, VOLUME_MULTIPLIER_LIMIT_RANGE], setVolumeOptions)

RESET_STORAGE_BUTTON.addEventListener("click", async () =>
{
   const confirmed = confirm("Are you sure you want to clear all storage and reset all the settings to default?");

   if (confirmed)
   {
      await browser.storage.local.clear()
      browser.runtime.reload()
   }
})

HIDE_LOCAL_VOLUME_MULTIPLIER.addEventListener("change", setVolumeOptions)


updateInputs();
"use strict"

const MIN_VOLUME_MULTIPLIER_LIMIT = 100;
const MAX_VOLUME_MULTIPLIER_LIMIT = 1000;

const VOLUME_MULTIPLIER_LIMIT_RANGE = document.getElementById("volume-multiplier-limit-range");
const VOLUME_MULTIPLIER_LIMIT_COUNTER = document.getElementById("volume-multiplier-limit-counter");
const KEEP_VOLUME_MULTIPLIER_SELECT = document.getElementById("keep-volume-multiplier-select");
const RESET_STORAGE_BUTTON = document.getElementById("reset-storage-button");


function updateInputs()
{
   browser.storage.local.get().then(storage =>
   {
      volumeMultiplierLimit.forEachInput(input => input.min = MIN_VOLUME_MULTIPLIER_LIMIT)
      volumeMultiplierLimit.forEachInput(input => input.max = MAX_VOLUME_MULTIPLIER_LIMIT)

      volumeMultiplierLimit.forEachInput(input => input.value = storage.options.volumeMultiplierPercentLimit)

      KEEP_VOLUME_MULTIPLIER_SELECT.value = storage.options.keepVolumeMultiplier;
   })
}

function setVolumeOptions()
{
   browser.storage.local.set({
      options: {
         volumeMultiplierPercentLimit: +volumeMultiplierLimit.inputs[0].value,
         keepVolumeMultiplier: KEEP_VOLUME_MULTIPLIER_SELECT.value
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

KEEP_VOLUME_MULTIPLIER_SELECT.addEventListener("change", setVolumeOptions)


updateInputs();
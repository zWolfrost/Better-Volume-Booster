"use strict"

const DEF_VOLUME_MULTIPLIER_LIMIT = 500;
const MIN_VOLUME_MULTIPLIER_LIMIT = 100;
const MAX_VOLUME_MULTIPLIER_LIMIT = 1000;

const VOLUME_MULTIPLIER_LIMIT_RANGE = document.getElementById("volume-multiplier-limit-range");
const VOLUME_MULTIPLIER_LIMIT_COUNTER = document.getElementById("volume-multiplier-limit-counter");


function setVolumeOptions()
{
   browser.storage.local.set({
      options: {
         volumeMultiplierPercentLimit: +volumeMultiplierLimit.inputs[0].value
      }
   })
}

const volumeMultiplierLimit = new VolumeOptions([VOLUME_MULTIPLIER_LIMIT_COUNTER, VOLUME_MULTIPLIER_LIMIT_RANGE], setVolumeOptions)


function updateInputs()
{
   browser.storage.local.get().then(storage =>
   {
      volumeMultiplierLimit.forEachInput(input => input.min = MIN_VOLUME_MULTIPLIER_LIMIT)
      volumeMultiplierLimit.forEachInput(input => input.max = MAX_VOLUME_MULTIPLIER_LIMIT)

      volumeMultiplierLimit.forEachInput(input => input.value = storage.options.volumeMultiplierPercentLimit)
   })
}

updateInputs();
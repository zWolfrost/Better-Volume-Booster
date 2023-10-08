"use strict"

const DEF_VOLUME_MULTIPLIER_LIMIT = 500;
const MIN_VOLUME_MULTIPLIER_LIMIT = 200;
const MAX_VOLUME_MULTIPLIER_LIMIT = 1000;

const VOLUME_MULTIPLIER_LIMIT = document.getElementById("volume-multiplier-limit");
const VOLUME_MULTIPLIER_LIMIT_COUNTER = document.getElementById("volume-multiplier-limit-counter");



function updateInputs()
{
   browser.storage.local.get().then(storage =>
   {
      VOLUME_MULTIPLIER_LIMIT.min = MIN_VOLUME_MULTIPLIER_LIMIT
      VOLUME_MULTIPLIER_LIMIT.max = MAX_VOLUME_MULTIPLIER_LIMIT

      VOLUME_MULTIPLIER_LIMIT.value = storage.options.volumeMultiplierPercentLimit
      VOLUME_MULTIPLIER_LIMIT_COUNTER.value = storage.options.volumeMultiplierPercentLimit
   })
}

function setStorageOnInput(node, callback)
{
   node.addEventListener("input", e => browser.storage.local.set(callback(e.target)) )
}

function parseVolume(volume, min, max)
{
   let parsed = parseInt(volume)

   if (isNaN(parsed) || parsed < min) return min
   else if (parsed > max) return max

   return parsed
}



updateInputs();


[VOLUME_MULTIPLIER_LIMIT, VOLUME_MULTIPLIER_LIMIT_COUNTER].forEach(node =>
{
   setStorageOnInput(node, target =>
   {
      target.value = parseVolume(target.value, MIN_VOLUME_MULTIPLIER_LIMIT, MAX_VOLUME_MULTIPLIER_LIMIT)

      VOLUME_MULTIPLIER_LIMIT.value = target.value
      VOLUME_MULTIPLIER_LIMIT_COUNTER.value = target.value

      return { options: {volumeMultiplierPercentLimit: target.value} }
   })
});
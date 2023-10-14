"use strict"

const MIN_VOLUME_MULTIPLIER = 0;

const DOMAIN_TEXT = document.getElementById("domain-text");
const GLOBAL_VOLUME_MULTIPLIER = document.getElementById("global-volume-multiplier");
const GLOBAL_VOLUME_MULTIPLIER_COUNTER = document.getElementById("global-volume-multiplier-counter");
const LOCAL_VOLUME_MULTIPLIER = document.getElementById("local-volume-multiplier");
const LOCAL_VOLUME_MULTIPLIER_COUNTER = document.getElementById("local-volume-multiplier-counter");
const DELETE_LOCAL_VOLUME_MULTIPLIER_BUTTON = document.getElementById("delete-local-volume-multiplier");
const DELETE_LOCAL_VOLUME_MULTIPLIER_ICON = document.querySelector("#delete-local-volume-multiplier > img");



function getURL()
{
   return new Promise((resolve, reject) =>
      chrome.tabs.query({active: true, currentWindow: true}, tabs => resolve(tabs[0]?.url))
   );
}

function updateInputs(domain)
{
   browser.storage.local.get().then(storage =>
   {
      GLOBAL_VOLUME_MULTIPLIER.max = storage.options.volumeMultiplierPercentLimit
      LOCAL_VOLUME_MULTIPLIER.max = storage.options.volumeMultiplierPercentLimit

      GLOBAL_VOLUME_MULTIPLIER.value = storage.global.volumeMultiplierPercent
      GLOBAL_VOLUME_MULTIPLIER_COUNTER.value = storage.global.volumeMultiplierPercent

      if (domain && storage[domain])
      {
         LOCAL_VOLUME_MULTIPLIER.value = storage[domain].volumeMultiplierPercent
         LOCAL_VOLUME_MULTIPLIER_COUNTER.value = storage[domain].volumeMultiplierPercent
      }
      else
      {
         LOCAL_VOLUME_MULTIPLIER.value = storage.global.volumeMultiplierPercent
         LOCAL_VOLUME_MULTIPLIER_COUNTER.value = storage.global.volumeMultiplierPercent
         LOCAL_VOLUME_MULTIPLIER.classList.add("gray")
         DELETE_LOCAL_VOLUME_MULTIPLIER_ICON.classList.add("gray")
      }
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

function onPopupOpen(url)
{
   const domain = url ? new URL(url)?.hostname : url;

   updateInputs(domain);


   [GLOBAL_VOLUME_MULTIPLIER, GLOBAL_VOLUME_MULTIPLIER_COUNTER].forEach(node =>
   {
      setStorageOnInput(node, target =>
      {
         target.value = parseVolume(target.value, GLOBAL_VOLUME_MULTIPLIER.min, GLOBAL_VOLUME_MULTIPLIER.max)

         GLOBAL_VOLUME_MULTIPLIER.value = target.value
         GLOBAL_VOLUME_MULTIPLIER_COUNTER.value = target.value

         if (LOCAL_VOLUME_MULTIPLIER.classList.contains("gray"))
         {
            LOCAL_VOLUME_MULTIPLIER.value = target.value
            LOCAL_VOLUME_MULTIPLIER_COUNTER.value = target.value
         }

         return { global: {volumeMultiplierPercent: target.value} }
      })
   });


   if (domain)
   {
      DOMAIN_TEXT.innerText = domain;
      DOMAIN_TEXT.classList.add("url");

      GLOBAL_VOLUME_MULTIPLIER.style.maxWidth = LOCAL_VOLUME_MULTIPLIER.offsetWidth + "px";

      [LOCAL_VOLUME_MULTIPLIER, LOCAL_VOLUME_MULTIPLIER_COUNTER].forEach(node =>
      {
         setStorageOnInput(node, target =>
         {
            target.value = parseVolume(target.value, LOCAL_VOLUME_MULTIPLIER.min, LOCAL_VOLUME_MULTIPLIER.max)

            LOCAL_VOLUME_MULTIPLIER.value = target.value
            LOCAL_VOLUME_MULTIPLIER_COUNTER.value = target.value

            if (LOCAL_VOLUME_MULTIPLIER.classList.contains("gray"))
            {
               LOCAL_VOLUME_MULTIPLIER.classList.remove("gray")
               DELETE_LOCAL_VOLUME_MULTIPLIER_ICON.classList.remove("gray")
            }

            return { [domain]: {volumeMultiplierPercent: target.value} }
         })
      })

      DELETE_LOCAL_VOLUME_MULTIPLIER_BUTTON.addEventListener("click", () =>
      {
         browser.storage.local.set({ [domain]: undefined }).then(() => updateInputs(domain))
      })
   }
   else
   {
      LOCAL_VOLUME_MULTIPLIER.parentElement.classList.add("hidden");
      document.getElementsByClassName("fake-trash-can")[0].classList.add("hidden");
   }
}



getURL().then(url => onPopupOpen(url));
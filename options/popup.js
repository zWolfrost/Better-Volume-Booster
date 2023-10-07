"use strict"

const GLOBAL_VOLUME_MULTIPLIER = document.getElementById("global-volume-multiplier");
const GLOBAL_VOLUME_MULTIPLIER_COUNTER = document.getElementById("global-volume-multiplier-counter");
const LOCAL_VOLUME_MULTIPLIER = document.getElementById("local-volume-multiplier");
const LOCAL_VOLUME_MULTIPLIER_COUNTER = document.getElementById("local-volume-multiplier-counter");
const DELETE_LOCAL_VOLUME_MULTIPLIER_BUTTON = document.getElementById("delete-local-volume-multiplier");
const DELETE_LOCAL_VOLUME_MULTIPLIER_ICON = document.querySelector("#delete-local-volume-multiplier > img");

GLOBAL_VOLUME_MULTIPLIER.addEventListener("input", e => GLOBAL_VOLUME_MULTIPLIER_COUNTER.value = e.target.value)
LOCAL_VOLUME_MULTIPLIER.addEventListener("input", e => LOCAL_VOLUME_MULTIPLIER_COUNTER.value = e.target.value)

GLOBAL_VOLUME_MULTIPLIER_COUNTER.addEventListener("input", e => GLOBAL_VOLUME_MULTIPLIER.value = e.target.value)
LOCAL_VOLUME_MULTIPLIER_COUNTER.addEventListener("input", e => LOCAL_VOLUME_MULTIPLIER.value = e.target.value)



function getURL()
{
   return new Promise((resolve, reject) =>
      chrome.tabs.query({active: true, currentWindow: true}, tabs =>
      {
         const tab = tabs[0];

         if (tab)
         {
            const url = new URL(tab.url);
            resolve(url)
         }
         else
         {
            reject(null)
         }
      })
   );
}

function updateInputs(domain)
{
   browser.storage.local.get().then(storage =>
   {
      GLOBAL_VOLUME_MULTIPLIER_COUNTER.value = GLOBAL_VOLUME_MULTIPLIER.value = storage.global.volumeMultiplierPercent
      if (storage[domain])
      {
         LOCAL_VOLUME_MULTIPLIER_COUNTER.value = LOCAL_VOLUME_MULTIPLIER.value = storage[domain].volumeMultiplierPercent
      }
      else
      {
         LOCAL_VOLUME_MULTIPLIER_COUNTER.value = LOCAL_VOLUME_MULTIPLIER.value = storage.global.volumeMultiplierPercent
         LOCAL_VOLUME_MULTIPLIER.classList.add("gray")
         DELETE_LOCAL_VOLUME_MULTIPLIER_ICON.classList.add("gray")
      }
   })
}

function setStorageOnInput(node, callback)
{
   node.addEventListener("input", e => browser.storage.local.set(callback(e.target)) )
}



getURL().then(url =>
{
   const domain = url.hostname;

   updateInputs(domain);


   [GLOBAL_VOLUME_MULTIPLIER, GLOBAL_VOLUME_MULTIPLIER_COUNTER].forEach(node =>
   {
      setStorageOnInput(node, target =>
      {
         if (LOCAL_VOLUME_MULTIPLIER.classList.contains("gray"))
         {
            LOCAL_VOLUME_MULTIPLIER_COUNTER.value = LOCAL_VOLUME_MULTIPLIER.value = target.value
         }

         return { global: {volumeMultiplierPercent: +target.value} }
      })
   });


   [LOCAL_VOLUME_MULTIPLIER, LOCAL_VOLUME_MULTIPLIER_COUNTER].forEach(node =>
   {
      setStorageOnInput(node, target =>
      {
         if (LOCAL_VOLUME_MULTIPLIER.classList.contains("gray"))
         {
            LOCAL_VOLUME_MULTIPLIER.classList.remove("gray")
            DELETE_LOCAL_VOLUME_MULTIPLIER_ICON.classList.remove("gray")
         }

         return { [domain]: {volumeMultiplierPercent: +target.value} }
      })
   })


   DELETE_LOCAL_VOLUME_MULTIPLIER_BUTTON.addEventListener("click", () =>
   {
      browser.storage.local.set({ [domain]: undefined }).then(() => updateInputs(domain))
   })
})
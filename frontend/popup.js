"use strict"

const DOMAIN_TEXT = document.getElementById("domain-text");
const GLOBAL_VOLUME_MULTIPLIER_RANGE = document.getElementById("global-volume-multiplier-range");
const GLOBAL_VOLUME_MULTIPLIER_COUNTER = document.getElementById("global-volume-multiplier-counter");
const LOCAL_VOLUME_MULTIPLIER_RANGE = document.getElementById("local-volume-multiplier-range");
const LOCAL_VOLUME_MULTIPLIER_COUNTER = document.getElementById("local-volume-multiplier-counter");
const FLIP_GLOBAL_SOUND_MODE = document.getElementById("flip-global-sound-mode");
const FLIP_LOCAL_SOUND_MODE = document.getElementById("flip-local-sound-mode");
const DELETE_LOCAL_VOLUME_OPTIONS = document.getElementById("delete-local-volume-multiplier");


class NoteFlipper
{
   constructor(button, callback)
   {
      this.button = button;

      this.button.addEventListener("click", () =>
      {
         this.isMono = !this.isMono;

         callback(this.isMono);
      })
   }

   get isMono()
   {
      return this.button.classList.contains("quaver");
   }
   set isMono(mono)
   {
      this.button.classList.remove("quaver", "beam");
      this.button.classList.add(mono ? "quaver" : "beam");
   }
}

function getURL()
{
   return new Promise((resolve, reject) =>
      chrome.tabs.query({active: true, currentWindow: true}, tabs => resolve(tabs[0]?.url))
   );
}


function hideLocalOptions()
{
   LOCAL_VOLUME_MULTIPLIER_RANGE.parentElement.classList.add("hidden");
   GLOBAL_VOLUME_MULTIPLIER_RANGE.parentElement.classList.add("single-option")

   document.querySelectorAll(".fake").forEach(node => node.classList.add("hidden"))
}
function hideGlobalOptions()
{
   GLOBAL_VOLUME_MULTIPLIER_RANGE.parentElement.classList.add("hidden");
   LOCAL_VOLUME_MULTIPLIER_RANGE.parentElement.classList.add("single-option")
}
function syncRangesWidths()
{
   const minVolumeMultiplierRangeWidth = Math.min(LOCAL_VOLUME_MULTIPLIER_RANGE.offsetWidth, GLOBAL_VOLUME_MULTIPLIER_RANGE.offsetWidth);
   LOCAL_VOLUME_MULTIPLIER_RANGE.style.maxWidth = GLOBAL_VOLUME_MULTIPLIER_RANGE.style.maxWidth = minVolumeMultiplierRangeWidth + "px";
}


function animate(element, name, seconds=1, mode="ease-in-out", repetitions=1, reset=true)
{
   return new Promise(resolve =>
   {
      if (reset == true && element.style.animationName === name)
      {
         element.style.animation = "none";
         element.offsetHeight;
         element.style.animation = "none";
      }

      element.style.animation = `${name} ${seconds}s ${mode} ${repetitions}`;

      element.addEventListener("animationend", function()
      {
         element.style.animation = "none";
         resolve();
      }, {once: true});
   })
}


(async () =>
{
   function updateInputs()
   {
      const RANGE_TOTAL_STEPS = 100;

      browser.storage.local.get().then(storage =>
      {
         const localIsAvailable = domain && storage[domain];
         const domainGlobalFallback = localIsAvailable ? domain : "global";

         globalVolumeOptions.enabled = !localIsAvailable;
         localVolumeOptions.enabled = localIsAvailable;

         globalMonoNoteFlipper.isMono = storage.global.mono;
         localMonoNoteFlipper.isMono = storage[domainGlobalFallback].mono;

         globalVolumeOptions.forEachInput(input =>
         {
            input.max = storage.options.volumeMultiplierPercentLimit;
            input.value = storage.global.volumeMultiplierPercent;
         })

         localVolumeOptions.forEachInput(input =>
         {
            input.max = storage.options.volumeMultiplierPercentLimit;
            input.value = storage[domainGlobalFallback].volumeMultiplierPercent;
         })

         GLOBAL_VOLUME_MULTIPLIER_RANGE.step = Math.round(GLOBAL_VOLUME_MULTIPLIER_RANGE.max / RANGE_TOTAL_STEPS);
         LOCAL_VOLUME_MULTIPLIER_RANGE.step = Math.round(LOCAL_VOLUME_MULTIPLIER_RANGE.max / RANGE_TOTAL_STEPS);

         if (domain)
         {
            DOMAIN_TEXT.innerText = domain;

            switch (storage.options.keepVolumeMultiplier)
            {
               case "both": syncRangesWidths(); break;
               case "global": hideLocalOptions(); break;
               case "local": hideGlobalOptions(); break;
            }
         }
         else hideLocalOptions();
      })
   }

   function setGlobalVolumeOptions()
   {
      browser.storage.local.set({
         global: {
            volumeMultiplierPercent: +globalVolumeOptions.inputs[0].value,
            mono: globalMonoNoteFlipper.isMono
         },
      })
   }
   function setLocalVolumeOptions()
   {
      browser.storage.local.set({
         [domain]: {
            volumeMultiplierPercent: +localVolumeOptions.inputs[0].value,
            mono: localMonoNoteFlipper.isMono
         },
      })
   }


   const url = await getURL();
   const domain = url ? new URL(url)?.hostname : url


   const localVolumeOptions = new VolumeOptions([LOCAL_VOLUME_MULTIPLIER_COUNTER, LOCAL_VOLUME_MULTIPLIER_RANGE], value =>
   {
      localVolumeOptions.enabled = true;
      globalVolumeOptions.enabled = false;

      setLocalVolumeOptions();
   }, {links: [FLIP_LOCAL_SOUND_MODE, DELETE_LOCAL_VOLUME_OPTIONS]})

   const globalVolumeOptions = new VolumeOptions([GLOBAL_VOLUME_MULTIPLIER_COUNTER, GLOBAL_VOLUME_MULTIPLIER_RANGE], value =>
   {
      if (!localVolumeOptions.enabled)
      {
         localVolumeOptions.forEachInput(input => input.value = value);
      }

      setGlobalVolumeOptions();
   }, {links: [FLIP_GLOBAL_SOUND_MODE]})



   const localMonoNoteFlipper = new NoteFlipper(FLIP_LOCAL_SOUND_MODE, () =>
   {
      animate(FLIP_LOCAL_SOUND_MODE, "bounce", 0.1);

      localVolumeOptions.enabled = true;
      globalVolumeOptions.enabled = false;

      setLocalVolumeOptions();
   })

   const globalMonoNoteFlipper = new NoteFlipper(FLIP_GLOBAL_SOUND_MODE, isMono =>
   {
      animate(FLIP_GLOBAL_SOUND_MODE, "bounce", 0.1);

      if (!localVolumeOptions.enabled)
      {
         localMonoNoteFlipper.isMono = isMono;
      }

      setGlobalVolumeOptions();
   })



   DELETE_LOCAL_VOLUME_OPTIONS.addEventListener("click", () =>
   {
      globalVolumeOptions.enabled = true;
      localVolumeOptions.enabled = false;

      localVolumeOptions.forEachInput(input => input.value = globalVolumeOptions.inputs[0].value);

      localMonoNoteFlipper.isMono = globalMonoNoteFlipper.isMono;

      browser.storage.local.remove(domain);
   })


   updateInputs();
})()
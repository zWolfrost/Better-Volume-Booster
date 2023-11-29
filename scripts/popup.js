"use strict"

const DOMAIN_TEXT = document.getElementById("domain-text");
const GLOBAL_VOLUME_MULTIPLIER_RANGE = document.getElementById("global-volume-multiplier-range");
const GLOBAL_VOLUME_MULTIPLIER_COUNTER = document.getElementById("global-volume-multiplier-counter");
const LOCAL_VOLUME_MULTIPLIER_RANGE = document.getElementById("local-volume-multiplier-range");
const LOCAL_VOLUME_MULTIPLIER_COUNTER = document.getElementById("local-volume-multiplier-counter");
const FLIP_GLOBAL_SOUND_MODE = document.getElementById("flip-global-sound-mode");
const FLIP_LOCAL_SOUND_MODE = document.getElementById("flip-local-sound-mode");
const DELETE_LOCAL_VOLUME_OPTIONS = document.getElementById("delete-local-volume-multiplier");
const MEDIA_SOURCES_MESSAGE = document.getElementById("media-sources-message");
const MEDIA_SOURCES_LIST = document.getElementById("media-sources-list");
const ASK_PERMISSIONS_BUTTON = document.getElementById("ask-permissions-button");
const ENABLE_ALL_PERMISSIONS_BUTTON = document.getElementById("enable-all-permissions-button");
const NO_MEDIA_DETECTED_MESSAGE = document.getElementById("no-media-detected-message");



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

function getCurrentTab()
{
   return new Promise((resolve, reject) => browser.tabs.query({active: true, currentWindow: true}, tabs => resolve(tabs[0])))
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


function addPermissionToMediaSourcesList(domain)
{
   const chkbox = document.createElement("input");
   chkbox.type = "checkbox";
   chkbox.checked = true;
   chkbox.name = domain;
   chkbox.classList.add("media-source-checkbox");

   const label = document.createElement("label");
   label.innerText = domain;
   label.for = domain;
   label.classList.add("url");

   const li = document.createElement("li");
   li.appendChild(chkbox);
   li.appendChild(label);
   MEDIA_SOURCES_LIST.appendChild(li);
}


(async () =>
{
   function log(...args)
   {
      browser.scripting.executeScript({ target: {tabId: tab.id}, func: args => console.log(args), args: args });
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

   function updatePopup()
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

            switch (storage.options.showVolumeMultiplier)
            {
               case "both": syncRangesWidths(); break;
               case "global": hideLocalOptions(); break;
               case "local": hideGlobalOptions(); break;
            }

            if (storage.options.disablePermissionPrompt == false)
            {
               updateMediaSourceDomains({ includePermissionSubdomains: storage.options.includePermissionSubdomains });
            }
         }
         else
         {
            hideLocalOptions();
         }
      })
   }
   async function updateMediaSourceDomains({ includePermissionSubdomains })
   {
      function getMediaSourcesDomains()
      {
         const foundMediaElements = document.querySelectorAll("video, audio");
         let sourceDomains = [];

         for (let el of foundMediaElements)
         {
            try /* el.src */
            {
               let hostname = new URL(el.currentSrc).origin.split("/").at(-1);
               sourceDomains.push(hostname);
            }
            catch{}
         }

         return sourceDomains;
      }

      if (domain)
      {
         const mediaSourcesResult = await browser.scripting.executeScript({ target: {tabId: tab.id, allFrames: true}, /* injectImmediately: true, */ func: getMediaSourcesDomains });
         const mediaSourcesCleaned = mediaSourcesResult.map(res => res.result).flat().filter(el => el);

         //log(mediaSourcesResult)

         if (mediaSourcesCleaned.length > 0)
         {
            let mediaSourcesRange = [domain, ...mediaSourcesCleaned]
            if (!includePermissionSubdomains) mediaSourcesRange = mediaSourcesRange.map(hostname => hostname.split(".").slice(-2).join("."));

            const mediaSourcesUnique = [...new Set(mediaSourcesRange)];
            //const mediaSourcesNeeded = await Promise.all( mediaSourcesRange.filter( async source => !(await browser.permissions.contains({ origins: [`*://*.${source}/*`] })) ) );

            //log(mediaSourcesUnique)

            let mediaSourcesNeeded = [];
            for (let source of mediaSourcesUnique)
            {
               if (!await browser.permissions.contains({ origins: [`*://*.${source}/*`] }))
               {
                  mediaSourcesNeeded.push(source);
               }
            }

            if (mediaSourcesNeeded.length > 0)
            {
               for (let source of mediaSourcesNeeded)
               {
                  addPermissionToMediaSourcesList(source);
               }

               MEDIA_SOURCES_MESSAGE.classList.remove("hidden");
            }
         }
         else
         {
            NO_MEDIA_DETECTED_MESSAGE.classList.remove("hidden");
         }
      }
   }


   const tab = await getCurrentTab();
   const url = tab?.url;
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

   ASK_PERMISSIONS_BUTTON.addEventListener("click", () =>
   {
      let mediaSources = [];

      for (let chkbox of document.getElementsByClassName("media-source-checkbox"))
      {
         if (chkbox.checked)
         {
            mediaSources.push(`*://*.${chkbox.name}/*`);
         }
      }

      browser.permissions.request({ origins: mediaSources }).then(granted =>
      {
         if (granted)
         {
            browser.tabs.reload(tab.id);
         }
      })
   })

   ENABLE_ALL_PERMISSIONS_BUTTON.addEventListener("click", () =>
   {
      browser.permissions.request({ origins: ["<all_urls>"] }).then(granted =>
      {
         if (granted)
         {
            browser.tabs.reload(tab.id);
         }
      })
   })


   updatePopup();
})()
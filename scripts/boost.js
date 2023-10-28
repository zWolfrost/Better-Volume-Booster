const DEBUG = false;


// GETTING ACTUAL DOMAIN NAME (BYPASSING IFRAME'S)
function getDomain()
{
   const url = self === top ? document.URL : document.referrer;
   return url == "" ? "blank" : new URL(url).hostname;
}

const domain = getDomain();
if (DEBUG) console.log(domain);



// SETTING UP VOLUME BOOSTER
class VolumeBooster
{
   constructor()
   {
      this.audioCtx = new AudioContext();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.connect(this.audioCtx.destination);
   }

   addMediaElement(el)
   {
      return this.audioCtx.createMediaElementSource(el).connect(this.gainNode);
   }

   get multiplier()
   {
      return this.gainNode.gain.value;
   }
   set multiplier(multiplier)
   {
      this.gainNode.gain.value = multiplier;
   }
}

const volumeBooster = new VolumeBooster();



// SETTING MUTATION OBSERVER TO WATCH FOR MEDIA ELEMENTS OR FINDING THEM IF THEY ALREADY EXIST
const boostClass = `_volume-boosted`;
const TAGS_TO_WATCH = ["video", "audio"];
const TAGS_TO_WATCH_SELECTOR = TAGS_TO_WATCH.join(",");


onNodeCreation(node =>
{
   let nodeList = [];
   if (node.matches(TAGS_TO_WATCH_SELECTOR)) nodeList.push(node);
   if (node.hasChildNodes()) nodeList.push(...node.querySelectorAll(TAGS_TO_WATCH_SELECTOR));

   for (let el of nodeList)
   {
      onMediaElementCreation(el);
   }
})

for (let el of document.querySelectorAll(TAGS_TO_WATCH_SELECTOR))
{
   onMediaElementCreation(el);
}


function onNodeCreation(callback)
{
   new MutationObserver(records =>
   {
      for (let mutation of records)
      {
         for (let node of mutation.addedNodes)
         {
            if (node.nodeType == Node.ELEMENT_NODE)
            {
               callback(node);
            }
         }
      }
   }).observe(document, {subtree: true, childList: true});
}

function onMediaElementCreation(el)
{
   if (el.classList.contains(boostClass) == false)
   {
      if (DEBUG) console.log(el);

      el.classList.add(boostClass);
      el.crossOrigin = "anonymous";
      volumeBooster.addMediaElement(el);
   }
}



// SETTING UP STORAGE LISTENER TO UPDATE VOLUME MULTIPLIER
const exponentialMultiplier = 1;

function updateVolume()
{
   browser.storage.local.get().then(storage =>
   {
      const volumeMultiplierPercent = storage[domain]?.volumeMultiplierPercent ?? storage.global.volumeMultiplierPercent;
      volumeBooster.multiplier = (volumeMultiplierPercent / 100) ** exponentialMultiplier;
   })
}

updateVolume();
browser.storage.onChanged.addListener(updateVolume)
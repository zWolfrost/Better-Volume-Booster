// SETTING UP AUDIO CONTEXT AND GAIN NODE
const domain = new URL(window.location.href).hostname;

const audioCtx = new AudioContext();
const gainNode = audioCtx.createGain();
gainNode.connect(audioCtx.destination);

window.boosterGainNode = gainNode;



// SETTING MUTATION OBSERVER TO WATCH FOR MEDIA ELEMENTS AND FINDING THEM IF THEY ALREADY EXIST
const TAGS_TO_WATCH = ["video", "audio"];
const TAGS_TO_WATCH_SELECTOR = TAGS_TO_WATCH.join(",");

new MutationObserver(records =>
{
   for (let mutation of records)
   {
      for (let node of mutation.addedNodes)
      {
         if (node.nodeType == Node.ELEMENT_NODE)
         {
            let nodeList = [];
            if (node.matches(TAGS_TO_WATCH_SELECTOR)) nodeList.push(node);
            if (node.hasChildNodes()) nodeList.push(...node.querySelectorAll(TAGS_TO_WATCH_SELECTOR));

            for (let el of nodeList)
            {
               console.log(node)
               onMediaElementCreation(el);
            }
         }
      }
   }
}).observe(document, {subtree: true, childList: true});

for (let node of document.querySelectorAll(TAGS_TO_WATCH_SELECTOR))
{
   onMediaElementCreation(node);
}



// SETTING UP STORAGE LISTENER TO UPDATE VOLUME
const exponentialMultiplier = 1.3;

function updateVolume()
{
   browser.storage.local.get().then(storage =>
   {
      const volumeMultiplierPercent = storage[domain]?.volumeMultiplierPercent ?? storage.global.volumeMultiplierPercent;
      window.boosterGainNode.gain.value = (volumeMultiplierPercent / 100) ** exponentialMultiplier;
   })
}

updateVolume();
browser.storage.onChanged.addListener(updateVolume)



// ADDING MEDIA ELEMENTS TO THE AUDIO CONTEXT
function onMediaElementCreation(el)
{
   const boostClass = `_volume-boosted`;

   if (el.classList.contains(boostClass) == false)
   {
      /* console.log(el) */
      el.classList.add(boostClass);
      el.crossOrigin = "anonymous";
      audioCtx.createMediaElementSource(el).connect(gainNode);
   }
}
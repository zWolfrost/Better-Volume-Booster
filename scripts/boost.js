// SETTING UP AUDIO CONTEXT AND GAIN NODE
const domain = new URL(window.location.href).hostname;

const audioCtx = new AudioContext();
const gainNode = audioCtx.createGain();
gainNode.connect(audioCtx.destination);

window.boosterGainNode = gainNode;



// SETTING MUTATION OBSERVER TO WATCH FOR MEDIA ELEMENTS AND FINDING THEM IF THEY ALREADY EXIST
const TAGS_TO_WATCH = ["video", "audio"];

new MutationObserver(records =>
{
   for (let mutation of records)
   {
      for (let node of mutation.addedNodes)
      {
         const tagName = node.tagName?.toLowerCase();

         if (TAGS_TO_WATCH.includes(tagName))
         {
            onMediaElementCreation(node);
         }
      }
   }
}).observe(document, {subtree: true, childList: true});



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
   console.log(el)
   audioCtx.createMediaElementSource(el).connect(gainNode);
}
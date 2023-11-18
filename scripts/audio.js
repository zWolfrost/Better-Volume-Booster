// GETTING ACTUAL DOMAIN NAME (BYPASSING IFRAME'S)
function getDomain()
{
   const url = window.self === window.top ? document.URL : document.referrer;
   return url == "" ? "blank" : new URL(url).hostname;
}

const domain = getDomain();

const DEBUG = false && (domain !== "blank");
if (DEBUG) console.log(domain);



// SETTING UP VOLUME BOOSTER
class AudioTweaker
{
   constructor()
   {
      this.context = new AudioContext();
      this.gainNode = this.context.createGain();
      this.gainNode.connect(this.context.destination);

      this.ORIGINAL_CHANNEL_COUNT = this.context.destination.channelCount;
      this.MONO_CHANNEL_COUNT = 1;
   }

   connectMediaElement(el)
   {
      return this.context.createMediaElementSource(el).connect(this.gainNode);
   }

   get gain()
   {
      return this.gainNode.gain.value;
   }
   set gain(gain)
   {
      this.gainNode.gain.value = gain;
   }

   get mono()
   {
      return this.context.destination.channelCount == this.MONO_CHANNEL_COUNT;
   }
   set mono(mono)
   {
      this.context.destination.channelCount = (mono ? this.MONO_CHANNEL_COUNT : this.ORIGINAL_CHANNEL_COUNT);
   }
}

const audio = new AudioTweaker();



// WATCH FOR MEDIA ELEMENTS OR FINDING THEM IF THEY ALREADY EXIST
const BOOSTED_CLASSNAME = `_volume-boosted`;
const MEDIA_TAGS_SELECTOR = ["video", "audio", /* "embed" */].join(",");


function onNodeCreation(callback, {type, selector} = {})
{
   function callbackWrapper(node)
   {
      if (type && node.nodeType != type) return;
      if (selector && !node.matches(selector)) return;

      callback(node);
   }

   new MutationObserver(records =>
   {
      for (let mutation of records)
      {
         for (let node of mutation.addedNodes)
         {
            let nodeList = [node];
            callbackWrapper(node);

            for (let node of nodeList)
            {
               for (let child of node.childNodes)
               {
                  nodeList.push(child);
                  callbackWrapper(child);
               }
            }
         }
      }
   }).observe(document, {subtree: true, childList: true});
}


onNodeCreation(onMediaElementCreation, {type: Node.ELEMENT_NODE, selector: MEDIA_TAGS_SELECTOR})
document.querySelectorAll(MEDIA_TAGS_SELECTOR).forEach(onMediaElementCreation);

function onMediaElementCreation(el)
{
   if (!el.classList.contains(BOOSTED_CLASSNAME))
   {
      if (DEBUG) console.log(el);

      el.classList.add(BOOSTED_CLASSNAME);
      el.crossOrigin = "anonymous";
      audio.connectMediaElement(el);
   }
}



// SETTING UP STORAGE LISTENER TO UPDATE VOLUME MULTIPLIER
function updateVolume()
{
   browser.storage.local.get().then(storage =>
   {
      const domainGlobalFallback = domain in storage ? domain : "global";

      audio.gain = storage[domainGlobalFallback].volumeMultiplierPercent / 100;
      audio.mono = storage[domainGlobalFallback].mono;

      if (DEBUG) console.log(storage[domainGlobalFallback].volumeMultiplierPercent, storage[domainGlobalFallback].mono);
   })
}

updateVolume();
browser.storage.onChanged.addListener(updateVolume);
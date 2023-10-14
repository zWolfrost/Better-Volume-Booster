const DEFAULT_STORAGE =
{
   options: {
      volumeMultiplierPercentLimit: 500
   },

   global: {
      volumeMultiplierPercent: 100
   }
}

browser.storage.local.get().then(storage =>
{
   if (storage.default)
   {
      browser.storage.local.set(storage)
   }
   else
   {
      browser.storage.local.set({...DEFAULT_STORAGE, default: true})
   }
})
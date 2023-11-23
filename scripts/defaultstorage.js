browser.storage.local.get().then(storage =>
{
   browser.storage.local.set(
   {
      ...storage,

      options: {
         ...storage.options,

         volumeMultiplierPercentLimit: storage.options?.volumeMultiplierPercentLimit ?? 500
      },

      global: {
         ...storage.global,

         volumeMultiplierPercent: storage.global?.volumeMultiplierPercent ?? 100,
         mono: storage.global?.mono ?? false
      }
   })
})
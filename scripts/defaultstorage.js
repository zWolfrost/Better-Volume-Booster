browser.storage.local.get().then(storage =>
{
   browser.storage.local.set(
   {
      ...storage,

      options: {
         ...storage.options,

         volumeMultiplierPercentLimit: storage.options?.volumeMultiplierPercentLimit ?? 500,
         keepVolumeMultiplier: storage.options?.hideLocalVolumeMultiplier ? "global" : storage.options?.keepVolumeMultiplier ?? "both",

         hideLocalVolumeMultiplier: undefined,
      },

      global: {
         ...storage.global,

         volumeMultiplierPercent: storage.global?.volumeMultiplierPercent ?? 100,
         mono: storage.global?.mono ?? false
      }
   })
})

/*

Replace options with this after backwards compatibility is no longer needed:

options: {
   ...storage.options,

   volumeMultiplierPercentLimit: storage.options?.volumeMultiplierPercentLimit ?? 500,
   keepVolumeMultiplier: storage.options?.keepVolumeMultiplier ?? "both"
},

*/
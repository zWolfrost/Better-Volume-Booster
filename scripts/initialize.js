browser.storage.local.get().then(storage =>
{
   browser.storage.local.set(
   {
      ...storage,

      options: {
         ...storage.options,

         volumeMultiplierPercentLimit: storage.options?.volumeMultiplierPercentLimit ?? 500,
         showVolumeMultiplier: storage.options?.hideLocalVolumeMultiplier ? "global" : storage.options?.keepVolumeMultiplier ?? storage.options?.showVolumeMultiplier ?? "both",

         hideLocalVolumeMultiplier: undefined,
         keepVolumeMultiplier: undefined
      },

      global: {
         ...storage.global,

         volumeMultiplierPercent: storage.global?.volumeMultiplierPercent ?? 100,
         mono: storage.global?.mono ?? false
      }
   })
})


/* Replace options with this when backwards compatibility is no longer needed: (current updates work from v1.0.0 to v1.7.1)

options: {
   ...storage.options,

   volumeMultiplierPercentLimit: storage.options?.volumeMultiplierPercentLimit ?? 500,
   showVolumeMultiplier: storage.options?.showVolumeMultiplier ?? "both"
},

*/
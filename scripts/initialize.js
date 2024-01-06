browser.storage.local.get().then(storage =>
{
   browser.storage.local.set(
   {
      ...storage,

      options: {
         ...storage.options,

         volumeMultiplierPercentLimit: storage.options?.volumeMultiplierPercentLimit ?? 500,
         // replace when backwards compatibility no longer needed with:
         // showVolumeMultiplier: storage.options?.showVolumeMultiplier ?? "both",
         showVolumeMultiplier: storage.options?.hideLocalVolumeMultiplier ? "global" : storage.options?.keepVolumeMultiplier ?? storage.options?.showVolumeMultiplier ?? "both",
         disablePermissionPrompt: storage.options?.disablePermissionPrompt ?? false,
         includePermissionSubdomains: storage.options?.includePermissionSubdomains ?? false,

         // remove when backwards compatibility no longer needed
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
browser.storage.local.get().then(storage =>
{
   browser.storage.local.set(
   {
      ...storage,

      options: {
         ...storage.options,

         volumeMultiplierPercentLimit: storage.options?.volumeMultiplierPercentLimit ?? 500,
         showVolumeMultiplier: storage.options?.showVolumeMultiplier ?? "both",
         // replace when backwards compatibility no longer needed with:
         // disableAnyPrompt: storage.options?.disableAnyPrompt ?? false,
         disableAnyPrompt: storage.options?.disablePermissionPrompt ?? storage.options?.disableAnyPrompt ?? false,
         includePermissionSubdomains: storage.options?.includePermissionSubdomains ?? false,

         // remove when backwards compatibility no longer needed
         disablePermissionPrompt: undefined
      },

      global: {
         ...storage.global,

         volumeMultiplierPercent: storage.global?.volumeMultiplierPercent ?? 100,
         mono: storage.global?.mono ?? false
      }
   })
})
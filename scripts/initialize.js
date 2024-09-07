browser.storage.local.get().then(storage => {
	browser.storage.local.set({
		...storage,

		options: {
			volumeMultiplierPercentLimit: storage.options?.volumeMultiplierPercentLimit ?? 500,
			showVolumeMultiplier: storage.options?.showVolumeMultiplier ?? "both",
			includePermissionSubdomains: storage.options?.includePermissionSubdomains ?? false
		},

		global: {
			volumeMultiplierPercent: storage.global?.volumeMultiplierPercent ?? 100,
			mono: storage.global?.mono ?? false
		}
	})
})

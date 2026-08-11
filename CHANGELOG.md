## Changelog
_Note that any version might include a number of stylistic changes, which are often not documented to avoid cluttering the changelog_

- **v1.1.0**:
<br>- Added a hard limit to the volume slider, and options to modify it to some degree.
<br>- Added support to far more websites.
<br>- Fixed bug where the extension would outright mute some videos / not mute videos when set to 0%.
<br>- Fixed bug where reloading the extension would stack the volume boosts.
<br>- Fixed bug where the extension would glitch out when the tab doesn't have a domain (e.g. `about:addons`).

- **v1.2.0**:
<br>- Made the volume sliders' wider and clearer.
<br>- Fixed bug where the limit would reset when refreshing the extension (by closing the browser).

- **v1.3.0**:
<br>- Added support for media elements in iframes.
<br>- Fixed bug where long domain names would overflow the slider.

- **v1.4.0**:
<br>- Added a mono/stereo sound option button.
<br>- Changed a lot of backend code, to make it easier to maintain.

- **v1.5.0**:
<br>- Added a "Reset to default" button to the options page.
<br>- Added a "Hide local volume multiplier" checkbox to the options page.
<br>- Changed the add-on's name from "Volume Booster Without Dementia" to a less outlandish one.
<br>- Fixed bug where really short domain names would misalign the sliders.

- **v1.6.0**:
<br>- Added a "Show only specific volume multiplier" selector to the options page.
<br>- Added a limit of 100 steps to the sliders, to reduce lag.

- **v1.7.0**:
<br>- Downgraded to manifest v2, in order to require the `<all_urls>` permission. Functionality is unaffected.
	- v1.7.1:
	<br>- Reverted a few stylistic changes from v1.7.0.
	- v1.7.2:
	<br>- Removed unnecessary "Block content on any page" permission.

- **v1.8.0**:
<br>- Reverted to manifest v3, and made the "Access your data for all websites" permission optional. Again.
<br>- Added a prompt when the extension needs to access data from domains in order to work.
<br>- Added an option to disable the prompt.

- **v1.9.0**:
<br>- Added an option to add subdomains to the permission prompt' websites.
<br>- Added a "No media detected" message.
<br>- Removed permission prompt when no media elements are found on a page.
	- v1.9.1:
	<br>- Fixed bug where the disable permission prompt checkbox won't show the actual set state.
	<br>- Fixed some settings wrong defaults.
	- v1.9.2:
	<br>- Fixed bug where the extension would create unnecessary & mute audio streams in the mixer.
	- v1.9.3:
	<br>- Fixed bug where the extension would create unnecessary audio streams for idle videos.

- **v1.10.0**:
<br>- Added a 500ms interval on which the popup will refresh the found media source domains.
<br>- Fixed bug where unchecking all websites permissions and asking for them anyway would refresh the page.
<br>- Fixed bug where the extension would not ask for the iframe source permission when the video is in an iframe.
	- v1.10.1:
	<br>- Fixed bug where the permissions checkboxes would not work (removed refresh interval, was a bad idea).
	<br>- Fixed bug where the extension would ask for "null" permissions.
	- v1.10.2:
	<br>- Fixed bug where the extension would not correctly parse urls with uncommon protocols.
	<br>- Marked the option "disable any prompt" as deprecated.
	<br>- Commented leftover debug logs.

- **v1.11.0**:
<br>- Added a button to restore the global volume multiplier to the default value.
<br>- Removed the "disable any prompt" option.
<br>- Local volume multiplier is now domain-specific instead of subdomain-specific.
<br>- Fixed bug where redundant domains would show up (e.g. `www.example.com` and `example.com`).
	- v1.11.1:
	<br>- Fixed inclusion of garbage files in the extension.

- **v1.12.0**:
<br>- Added a way to send cookies in the media request, to fix some websites (e.g. TikTok).
<br>- Added a "More information" button in the options.
<br>- Reverted to using a subdomain-specific local volume multiplier.

- **v1.13.0**:
<br>- Added a way to blacklist a subdomain in the extension context menu.
<br>- Moved the "send cookies in the media request" option to the extension context menu.
<br>- Added default values to the per-subdomain options, for some websites.
<br>- Changed extension's icon.

- **v1.14.0**:
<br>- Added a "session" volume multiplier, for temporary volume changes.
<br>- Added "show stereo/mono buttons" option.
<br>- Added an option to disable having default values to the per-subdomain options.
<br>- Fixed bug where the extension wouldn't remember the local TikTok volume options.
	- v1.14.1:
	<br>- Fixed some bugs in volume multipliers priority logic.
	- v1.14.2:
	<br>- Rolled back a change to fix the Paramount+ player.

- **v1.15.0**:
<br>- Added an hostname-specific option to preemptively reload media elements.
<br>- Fixed a bug where the local volume multiplier would not work.
	- v1.15.1:
	<br>- Fixed extension breaking media elements that load very fast. May introduce regressions.
	<br>- Fixed extension breaking media elements when autoplay is disabled.
	- v1.15.2:
	<br>- Rolled back a change to fix the Paramount+ player (again).

- **v1.16.0**:
<br>- Made the "cookies" permission optional; it's now requested only when enabling "Send cookies to media requests" for a site.
<br>- Removed the "scripting" permission; the popup no longer injects code into pages, frames report the cross-origin media hosts they embed on their own.
<br>- Replaced the rule that relaxed CORS for every media response on the web with rules scoped to each (page -> media domain) pair, created on demand and removed when no tab needs them anymore. Same-origin media is no longer modified at all.
<br>- Limited the cookie workaround to same-site media requests only, fixed its malformed cookie header value, and allowed multiple per-site cookie rules to coexist.
<br>- Cookie rules now refresh when the site's cookies change, and are removed when the permission is revoked.
<br>- The temporary "session" multiplier now lives in memory-only storage and is forgotten when the browser closes (values saved on disk by older versions are migrated).
<br>- Added a Privacy panel to the options page, with the cookies permission status and a "Forget per-site settings" button; "Clear all settings" now also clears session data.
<br>- Fixed bug where clicking a page before any media loaded could crash the content script.
<br>- Debug logs are now gated behind a flag in every context.

- **v1.17.0**:
<br>- Added a strict Content Security Policy to the popup and options pages.
<br>- The extension now shares only the minimal data (tab url + exclusion flag) with its content scripts instead of the whole settings object.
<br>- Hostnames received over internal messages are now validated before they can reach any header rule.
<br>- Fixed the permission prompt's hostname reduction to use true subdomain relations (the old logic could merge unrelated domains like `evilsite.com` into `site.com`), and bare domains now get their exact-origin permission pattern too.
<br>- Cookie rule installation now fails closed if the browser rejects it.
<br>- Cross-origin media that hasn't started loading is no longer force-restarted, and the extension no longer waits forever on media that errors out.
<br>- Fixed the add-on's icon size declarations.

- **v1.18.0**:
<br>- Cookie values re-attached by the workaround are now filtered to safe characters, so a malformed cookie can never inject header content.
<br>- The hard volume limit now also clamps already-saved volumes, so lowering the limit reins in older, higher values.
<br>- Fixed bug where `file://` pages (and pages without a hostname) were wrongly treated as excluded.
<br>- Fixed bug where the extension could throw on websites that already control their media with their own WebAudio graph; such pages are now left completely alone.
<br>- Audio contexts now also resume on key presses, not only on clicks.

- **v1.19.0**:
<br>- Fixed bug where header rules from a previous browser session could linger after a restart; the extension now re-syncs its rules on every boot (re-associating them with open tabs, removing unneeded ones and purging stale cookie rules).
<br>- Made the registrable-domain computation public-suffix aware (`co.uk`, `com.au`, ...), so the cookie workaround and the permission prompts can no longer collapse to an over-broad TLD scope; IPv4 addresses are handled too.
<br>- Volume updates are now broadcast only when the relevant settings actually change, reducing internal message noise.

- **v1.20.0**:
<br>- Limited the "Send cookies to media requests" workaround to the default container: container tabs neither create nor remove cookie rules, so cookies can never cross Multi-Account Container walls. The context menu item is labelled accordingly.
<br>- Volume changes now use a short ramp instead of an instant jump, so there are no audible pops when the multiplier changes mid-playback.

- **v1.21.0**:
<br>- Fixed bug where media inside cross-origin iframes would not get boosted (the scoped rules used the top page's hostname instead of the frame's own).
<br>- Added a confirmation before "enable it for all websites" requests access to all websites.
<br>- Slider drags are now coalesced into a single update instead of pinging every open tab on each movement.

- **v1.22.0**:
<br>- Fixed bug where players that swap a media element's source to another cross-origin host (playlists, CDN fallbacks) would stop working; the new scoped rule is requested when the source changes.
<br>- The permission prompt now offers only hosts that actually serve cross-origin media, never asking for more access than the page needs.
<br>- Raised the cap of simultaneous scoped rules from 300 to 1000, so heavy multi-tab sessions don't lose rules.

- **v1.23.0**:
<br>- Fixed bug where cross-origin media carrying its URL in a `<source>` child would connect silenced instead of being boosted.
<br>- Cross-origin media is now always fetched with its scoped rule already in place, so tainted (silenced) media can no longer occur.
<br>- Tightened the popup and options Content Security Policy further (workers, media, manifests and frames are now forbidden; none of them are used).
<br>- Fixed bug where opening the popup instantly on a fresh page could wrongly show "No media detected" while the page was still loading.

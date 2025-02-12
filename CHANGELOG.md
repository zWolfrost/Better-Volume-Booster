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
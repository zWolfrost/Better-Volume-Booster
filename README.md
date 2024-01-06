# Better Volume Booster
Have you ever had that issue where a volume booster add-on would just forget what volume did you set it to on a page, or would outright mute some pages? No? Well, I have, and it's quite frustrating. That's why I created this add-on.

This is a simple free & open-source add-on that allows you to boost the volume of any* page and will (thankfully) remember the volume you set it to.

It has two sliders: a global one and a domain-specific one. You can delete the domain-specific volume multiplier by clicking the trash can icon next to the slider. In that case, the global one will be used.

Clicking the note button will set the sound mode to either mono (♪) or stereo (♫). The default is stereo.

You can also go to the add-on's option page to change the hard volume boost limit to any value between 100% and 1000% (as well as other stuff). This is useful if you want to prevent yourself from accidentally setting the volume to a very high value and consequently blowing your ears off. The default is 500%.

*Its only (known) limitation is that it can't boost the volume of webpages which play DRM-protected content using JavaScript, such as Netflix and Spotify.

_I am not responsible for any damage to your ears or headphones that may result from the add-on use. Use the add-on responsibly and ensure your headphones can handle the boosted volume levels._

&nbsp;
## Availability
Available on the [Firefox Add-ons site](https://addons.mozilla.org/firefox/addon/better-volume-booster/) (AMO)

or directly on this GitHub repository's [releases](https://github.com/zWolfrost/Better-Volume-Booster/releases) page.

&nbsp;
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
  <br>- Commented leftover debug logs.
  <br>- Fixed bug where the extension would parse correctly urls with uncommon protocols.
  <br>- Marked the option "disable any prompt" as deprecated.
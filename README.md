# Better Volume Booster
Have you ever had that issue where a volume booster add-on would just forget what volume did you set it to on a page, or would outright mute some pages? No? Well, I have, and it's quite frustrating. That's why I created this add-on.

This is a simple free & open-source add-on that allows you to boost the volume of any* page and will (thankfully) remember the volume you set it to.

It has two sliders: a global one and a domain-specific one. You can delete the domain-specific volume multiplier by clicking the trash can icon next to the slider. In this case, the global one will be used.

Clicking the note button will set the sound mode to either mono (♪) or stereo (♫). The default is stereo.

You can also go to the add-on's option page to change the hard volume boost limit to any value between 100% and 1000% (as well as other stuff). This is useful if you want to prevent yourself from accidentally setting the volume to a very high value and consequently blowing your ears off. The default is 500%.

*Its only (known) limitation is that it can't boost the volume of pages which play audio using javascript because of DRM reasons, such as most of music streaming websites like Spotify or SoundCloud. It works, however, on all tested video streaming websites.

_I am not responsible for any damage to your ears or headphones that may result from the add-on use. Use the add-on responsibly and ensure your headphones can handle the boosted volume levels._

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
<br>- Added a "Keep only specific volume multiplier" selector to the options page.
<br>- Added a limit of 100 steps to the sliders, to reduce lag.

- **v1.7.0**:
<br>- Downgraded to manifest v2, in order to require the `<all_urls>` permission. Functionality is unaffected.
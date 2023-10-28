# Volume Booster Without Dementia
Have you ever had that issue where a volume booster add-on would just forget what volume did you set it to on a page? No? Well, I have, and it's quite frustrating. That's why I created this add-on.

It's a simple open-source add-on that allows you to boost the volume (max. 1000%) of any page and will (thankfully) remember the volume you set it to. It has two sliders: a global one and a per-domain one. You can delete the per-domain volume by clicking the trash can icon next to the slider. In that case, the global one will be used.

Its only (known) limitation is that it can't boost the volume of media elements with a non-existent html tag (e.g. music played using javascript).

**DISCLAIMER**: I am not responsible for any damage to your ears or headphones that may result from the add-on use. Use the add-on responsibly and ensure your headphones can handle the boosted volume levels.

&nbsp;
## Changelog
- **v1.1.0**:
<br>- Added a hard limit to the volume slider, and options to modify it to some degree.
<br>- Added support to far more websites.
<br>- Fixed bug where the extension would outright mute some videos / not mute videos when set to 0%.
<br>- Fixed bug where reloading the extension would stack the volume boosts. Now you'll have to reload the page to re-apply the volume boost.
<br>- Fixed bug where the extension would glitch out when the tab doesn't have a domain (e.g. `about:addons`).

- **v1.2.0**:
<br>- Made the volume slider wider and clearer.
<br>- Fixed bug where the limit would reset when refreshing the extension (by closing the browser).

- **v1.3.0**:
<br>- Added support for media elements in iframes (not entirely tested).
<br>- Fixed bug where long domain names would overflow the slider.
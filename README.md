# Volume Booster Without Dementia
Have you ever had that issue where a volume booster extension would just forget what volume did you set it to on a page? No? Well, I have. And it's annoying. So I made this extension to fix that problem.

It's a simple extension that allows you to boost the volume (max. 500%) of any page and will (thankfully) remember the volume you set it to. It has two sliders: a global one and a per-domain one. You can delete the per-domain volume by clicking the trash can icon next to the slider. In that case, this extension will use the global slider.

&nbsp;
## Changelog
- **v1.1.0**:
  - Added a hard limit to the volume slider, and options to modify it to some degree.
  - Added support to far more websites.
  - Fixed bug where the extension would outright mute some videos / not mute videos when set to 0%.
  - Fixed bug where reloading the extension would stack the volume boosts. Now you'll have to reload the page to re-apply the volume boost.
  - Fixed bug where the extension would glitch out when the tab doesn't have a domain (e.g. `about:addons`).
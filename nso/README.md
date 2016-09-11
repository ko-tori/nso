# ¡nso

Lost motivation for the js game, making an online collaborative editor now

Making osu! in js because all the other attempts i've seen are horrible.

## To Do:
- spinners
- placing objects
- adjustable grid level
- beatmap object to .osu
- switch difficulties
- import backgrounds and audio
- sync updates with server, eventually push updates to other clients

## Editor Log:
- 9/10: Started Log. Basic map loading and animation done.

## Log:

- scroll to adjust volume
- optimized slider loading (5x (or more) faster)
- 8/04/16
- added mouse input: mousedown, mouseup, mousebtnsenabled, also hit for future input handling
- implemented prefix loading (as defined in skin.ini), updated loadSkin accordingly, implemented HitCircleOverlap, added overlap param in concatImages
- 6/30/16
- tweaked size of combo numbers, option for different slider loading, sound bugfix? (workaround)
- centered welcome screen (i think)
- redid render_curve to make the slider body 75% transparent (but not the track)
- fixed i1 behavior in gameLoop and a fatal bug with combo numbering
- pre-rendering sliders turns out to be really fast, so sliders are now rendered before play begins (can still revert with some simple commenting and uncommenting)
- added base offset for beat calculation to osu-parser (in case uninherited points aren't on beat)
- audio not hardcoded anymore, also loading is added to the actual loading process (with status updates and callback)
- learned more express.js lol, can now parse any beatmap or skin on server with /parsemap/song_folder/map.osu and /parseskin/skin_name
- implemented skin.ini option HitCircleOverlayAboveNumber
- made slider body and border colors depend on skin.ini (or combo color if not specified in skin.ini)
- render_curve colors are now arrays of numbers in range (0,255), not (0,1), adjusted toRGB accordingly and added colorToArray
- add full skin.ini support (incl. auto-rotation) to cursor rendering loop (except cursortrail rotate)
- implement server side skin.ini processing at /parseskin, commit to new osu-parser, /parse changed to /parsemap
- reimplemented combo numbers, now pre-rendered and cached
- tweaked render_curve to draw at double size to improve quality, adjusted gameLoop accordingly
- restructure loadSkin to ensure they are loaded (added callback)
- 6/29/16
- implement transform to scale and center playarea in screen
- restructured drawing loop to improve organization
- added combo numbers
- added approachcircles to loop, also pre-render them with tint
- added sliders to drawing loop, updated sliderlib for compatibility
- added loadanim, debug mode
- basic drawing loop, hitcircle, hitcircleoverlay
- branched slider generation with rendersliders
- added initialization function gameStart()
- tint function, process combo colors, pre-render colored circles
- fork to osu-parser and implement parsing of combo colors
- welcome screen, nso favicon
- skin loading
- audio loading
- 6/28/16
- sliderlib implemented, line, bezier, and passthrough sliders can be rendered
- server side beatmap processing with osu-parser
- cursor/cursor trail, expanding with z/x
- fullscreen and cursor lock
- start 6/27/16

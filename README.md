# Multiskolan

Ett futuristiskt lärospel med tre delar: ABC Skolan, Matteskolan och Ord skolan.

Just nu finns startmenyn. Öppna `index.html` i webbläsaren, eller kör som Static Site på Render.

## 3D-gubbar

Gubbarna bygger på **Kenney – Animated Characters** (modell `characterMedium.fbx` och animationerna idle, jump och run). Licens: CC0 (fri att använda). Skins i `assets/skins/` är Kenneys originaltexturer och används som "Färdiga dräkter".

Egna gubbar målas i koden (`js/skin.js`) direkt på modellens texturkarta, och hattar, kjolar och hårtofsar är 3D-delar som sitter fast på huvud- och höftbenet (`js/avatar.js`).

## Gårdar i Guldmyntsjakten

Lada, staket och väderkvarn ligger som OBJ-filer i `assets/props/` och placeras ut i `js/world.js` (`loadFarms`). Fyra gårdar placeras automatiskt på plana platser, en i varje hörn av kartan.

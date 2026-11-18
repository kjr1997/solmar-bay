# Solmar Bay

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/kjr1997/solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/kjr1997/solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01)

A sun-soaked open-world crime game, built for the [make.fun](https://make.fun/bounty/gta6-01) **gta6-01** bounty. No Rockstar assets, no copied code — the city, the story, the cars and the sound are all original.

## The game

You are new in **Solmar Bay**, a coastal city of avenues, beaches and bad decisions. Steal cars, outrun the SBPD, run jobs for **Rico** the fixer — and pull off the Bay Heist.

- **A city to explore** — six districts (Old Town, Downtown, Palm Heights, Marina, Industrial, Beachfront), a beach, a marina bay, parks and parking lots, all on foot or behind the wheel.
- **Traffic and pedestrians** — cars drive the road grid, pedestrians walk the sidewalks and run when a crime happens next to them.
- **Cars to steal** — parked cars are free to take; occupied ones need a carjacking. Sedans, taxis, vans, trucks, a V8 muscle car and the **Comet GT** sports car, each with its own handling.
- **Wanted level** — 1 to 5 stars. Foot cops chase and bust you, cruisers chase and ram you. Hide to cool off, or pay a visit to **Spray 'n' Go** for a new paint job and a clean record.
- **Five story jobs** — First Wheels, Package Run, Taxi Shift, Hot Pursuit, and the Bay Heist: crack the Solmar Bank vault and escape with four stars.
- **Side work** — 15 hidden packages ($100 each), taxi fares after the taxi job, cash dropped by knocked-down pedestrians.
- **HUD with minimap** — cash, health, car condition, wanted stars, mission line, district name, and an off-screen arrow to the next marker.
- **Sound, synthesized live** — engine hum, two-tone sirens, pickups, crashes and jingles. No audio files.
- **Save** — cash, jobs and packages persist in your browser (localStorage).

## Play

Open `game/index.html` in a desktop browser, or serve the folder:

```sh
node serve.ts
# then open http://localhost:8080
```

No network, no build step, no dependencies — plain ES modules and a canvas.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk and drive |
| Shift | Run / boost |
| E | Get in or out of a car |
| Space | Punch on foot, handbrake in a car |
| P / Esc | Pause |
| H | How to play |
| M | Mute |
| N (title) | New game (clears the save) |

## Structure

- `game/src/config.js` — tuning, palette, car types
- `game/src/city.js` — the city: roads, blocks, buildings, landmarks, road graph
- `game/src/vehicles.js` — car physics and collisions
- `game/src/traffic.js` — traffic AI
- `game/src/peds.js` — pedestrian AI
- `game/src/police.js` — wanted level, foot cops, cruisers
- `game/src/missions.js` — the five-job story, fares, hidden packages
- `game/src/player.js` — on-foot and driving controls, carjacking, punching
- `game/src/world.js` — the simulation: one state, one step
- `game/src/render.js` — drawing the city, cars, people and effects
- `game/src/hud.js` — HUD, minimap, menus
- `game/src/audio.js` — synthesized sound
- `game/src/input.js` — keyboard input
- `game/src/shots.js` — the four screenshot scenes (`?shot=cover|street|chase|mission`)
- `game/src/main.js` — boot and the game loop

Screenshots in `screenshots/` are real renders of the game's own code, staged by `shots.js` with a fixed seed.

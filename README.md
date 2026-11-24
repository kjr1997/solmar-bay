[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/kjr1997/solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/kjr1997/solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solmar Bay

A top-down 2D open-world crime game that runs entirely offline in your
browser — no downloads, no network requests, no assets beyond the code
itself. You wake up in Solmar Bay, a sun-soaked coastal city of six
districts: Old Town, Downtown, Palm Heights, Marina, Industrial and
Beachfront, with a beach and the open sea along its eastern edge.

## What you can do

- **Explore on foot or by car.** Walk, run and punch your way around the
  city, or hop into any parked car. Eight vehicle types handle differently,
  from the humble Hatchback to the Comet GT sports car waiting at the
  Marina dock. Cars with a driver in them can be carjacked — but that
  brings the law down on you.
- **Outrun the wanted system.** Stars rise from 0 to 5 for carjacking,
  hitting pedestrians, assault and ramming police cars. Foot cops chase,
  punch and try to arrest you; cruisers chase and ram your car. Hide for
  ten seconds and the heat cools one star every eight seconds — or pay
  $100 at Pay 'n Spray to clear your name and repair your ride.
- **Run five missions for Rico.** Steal a first car, deliver packages,
  work a timed taxi shift, lift the Comet GT under a three-star pursuit,
  and crack the Downtown vault in a four-star heist before escaping to
  the Hideout. Each pays cash, and the heist adds vault money on top.
- **Side hustles.** Fifteen hidden packages are scattered around the map
  ($100 each), knocked-down pedestrians drop cash, and after the taxi
  mission you can pick up fares in free roam.
- **A living city.** Traffic follows the road grid, pedestrians stroll the
  sidewalks and flee from danger, and the minimap tracks missions, cops,
  packages and your position. A zone banner announces each new district,
  and an edge arrow points to objectives off-screen.
- **Sound, synthesised live.** Engine hum, police sirens, pickup chimes,
  crash thuds and a bass music loop are all generated with WebAudio —
  there are no audio files at all.

## Controls

| Keys | Action |
| ---- | ------ |
| WASD | Walk / drive |
| Shift | Run |
| Space | Punch (on foot) / handbrake (driving) |
| E | Enter or exit a car |
| P / Esc | Pause |
| H | Help |
| M | Mute |

Progress — cash, mission progress and found packages — saves to the
browser automatically. On the title screen, press **Space** to continue
your saved game or **N** to start fresh.

## Playing it

```sh
node serve.ts
```

Then open <http://localhost:8080/> in a desktop browser. The game is
plain static files under `game/` with no build step.

## Submitting

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to the output directory and writes `dossier.json` with
the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built for the make.fun **gta6-01** bounty. Solmar Bay, its characters,
vehicles, story and music are all original — nothing here comes from any
commercial game.

## License

MIT — see [LICENSE](LICENSE).

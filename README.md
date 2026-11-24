[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/kjr1997/solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/kjr1997/solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solmar Bay

A top-down 2D open-world crime game that runs entirely offline in a desktop
browser — no build step, no network requests, no downloaded assets. Drive
around a sun-soaked coastal city, steal cars, outrun the police, run jobs for
the fixer Rico, and hunt down hidden packages.

## The city

Solmar Bay is 3600 × 2600 units of avenues, streets, parks, parking lots, a
beachfront, and a marina bay, split into six districts: Old Town, Downtown,
Palm Heights, Marina, Industrial, and Beachfront. Traffic flows along the
roads and pedestrians wander the sidewalks.

## How to play

- **On foot:** WASD to move, Shift to sprint, Space to punch, E to get in a car.
- **Driving:** WASD to drive, Space for the handbrake, E to get out.
- **Wanted level:** 0–5 stars. Carjacking, hitting pedestrians, assault, and
  ramming police cars all raise it. Foot cops chase, punch, and arrest you;
  police cruisers chase and ram your car. Lie low for 10 seconds and the heat
  drops one star every 8 seconds. Pay 'n Spray clears your wanted level and
  repairs your car for $100.
- **Missions:** five jobs from Rico, unlocked in order — steal a car, run
  packages, drive a taxi shift against the clock, steal the Comet GT from the
  docks under a 3-star wanted level, and crack the bay vault under 4 stars.
- **Side work:** 15 hidden packages worth $100 each, cash dropped by
  pedestrians you knock down, and taxi fares once you've finished the third job.
- **Save:** cash, mission progress, and packages are kept in localStorage.
  On the title screen, press Space to continue or N for a new game.
- **Keys:** P or Esc pauses, H shows help, M mutes the sound.

## Sound

Every sound is synthesized live with WebAudio — engine hum, police sirens,
pickup chimes, crash thuds, and a bassline that keeps the city moving. No
audio files are loaded.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

To hand the entry in (as the competition requires):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots are taken from the game's own `?shot=` scenes
(`cover`, `street`, `chase`, `mission`, each with `seed=1` for a fully
deterministic frame). The four shots in `screenshots/` are, in order: the
Comet GT on Ocean Ave at 2 stars, a walk down the beachfront promenade, a
4-star muscle-car chase on Main St, and the 5-star vault-heist escape.

## License

MIT — see `LICENSE`.

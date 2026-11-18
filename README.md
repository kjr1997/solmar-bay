[![gta6-01](https://make.fun/c/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/c/gta6-01/kjr1997/solmar-bay/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/c/gta6-01/kjr1997/solmar-bay/reward.svg)](https://make.fun/c/gta6-01)

# Solmar Bay

Solmar Bay is a top-down 2D open-world crime game that runs entirely offline in a desktop browser. You arrive in a sun-soaked coastal city of six districts — Old Town, Downtown, Palm Heights, Marina, Industrial and Beachfront — with a pocket full of nothing and a fixer named Rico who always has one more job.

## What you do

- **Explore on foot and by car.** Walk the avenues, run, punch, and hop into any of eight vehicle types — from a humble hatchback to the Comet GT sports car. Parked cars are free to take; occupied ones are a carjacking, and the law notices.
- **Outrun the law.** A five-star wanted system: foot cops chase, punch and arrest you, cruisers ram your car. Hide for ten seconds and the heat cools off, or pay $100 at Pay 'n Spray to clear it and fix your ride.
- **Work Rico's five jobs.** Steal a first set of wheels, run packages across town, drive a timed taxi shift, steal the Comet GT from the Marina under three stars, and crack the Downtown vault for a $2,000 score plus $2,000 in vault cash.
- **Make side money.** Fifteen hidden packages pay $100 each, taxi fares pay after job three, and knocked-down pedestrians drop cash. Progress, cash and packages save automatically in the browser.

## Controls

WASD move / drive, Shift run, Space punch (on foot) or handbrake (driving), E enter / exit a car, P or Esc pause, H help, M mute. Space continues a save from the title screen, N starts a new game.

## Tech

Pure static files under `game/` — no build step, no network requests, no external assets. All art is drawn on canvas and all sound (engine, siren, pickups, impacts, music) is synthesised with WebAudio. The source is split into focused modules: config, random, world, input, audio, save, player, vehicles, traffic, police, missions, render, hud, shots and the main loop.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Screenshots live in `screenshots/`; `shots.json` records the four deterministic scenes (`?shot=cover|street|chase|mission&seed=1`). The entry program is `main.ts` (Node 22, standard library only): it copies `game/` and `screenshots/` to the output directory and writes `dossier.json`. Run it twice and the output bytes are identical — the build is fully deterministic.

## License

MIT — see `LICENSE`.

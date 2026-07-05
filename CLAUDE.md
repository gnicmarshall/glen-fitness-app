# Glen's Fitness App (PWA)

Personal workout PWA: vanilla JS, localStorage + Firebase sync, offline
service worker. Live on GitHub Pages under `/glen-fitness-app/` and also
served from the remote assistant's clone (systemd service `fitness-app`).

**Deploy:** push to GitHub. **Every deploy: bump `CACHE_NAME` in `sw.js`** or
users keep the stale cached version.
**Git:** the remote Telegram assistant also pushes to this repo — `git pull` first.
**Firebase project:** `glen-fitness` (not the budget projects).

## Glen's goal (context for any training/nutrition change)
Lean "Brad Pitt in Fight Club" look: ~10–12% body fat, visible-but-modest
muscle, V-taper. Start point (health report): 184cm, ~95.8kg, 23.2% BF.
Two-stage cut: first milestone **89kg (~17%)**, THEN decide whether to push
leaner. This is not skinny-chasing — muscle retention matters.

## The programme — hard constraints (from `deep-research-report.md` + his health report)
The training programme is an **elastic 3-day A/B/C split**, defined in
`js/data.js` (`SESSIONS`). Read `deep-research-report.md` before restructuring
anything — it is the evidence base, and Glen has been burned by an AI
rearranging his programme to match an external chat while ignoring it.

- **Do NOT collapse to 2 days.** A+B are the non-negotiable floor (every major
  muscle ~2×/week); C is the bonus when fresh. The extra volume protects
  muscle through the cut.
- **Shoulder mobility is a real bottleneck** → keep shoulder-friendly exercise
  selection (neutral-grip/machine/landmine pressing, chest-supported rows,
  pulldowns, trap-bar) and KEEP face pulls / cable Y-raises / posture work —
  they are therapeutic, not filler. Don't strip them as "sprawl".
- **No bent-over rows** — stated dislike, and the report favours
  chest-supported/pulldown alternatives anyway.
- **Keep the conditioning finishers** — mildly raised cholesterol + fat-loss
  goal.
- **Side delts are the biggest visual lever** for his goal — lateral raises
  stay prioritised across all days.

If Glen himself proposes a change that conflicts with the above, don't
silently comply: show him what the report/health constraints say and let him
overrule explicitly.

## AI Coach (`js/coach.js`)
In-app Claude chat using **Glen's own Anthropic API key** — localStorage key
`fitplan_anthropic_key`, sent only to api.anthropic.com with the
direct-browser-access header. No backend; never route the key anywhere else.
System prompt auto-builds from `SESSIONS` + recent `workoutLog` + goal and
health constraints. Default model `claude-sonnet-4-6`, prompt caching on
(~1–2p/question). If models are deprecated, update the default here and in
`js/coach.js` together.

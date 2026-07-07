# Glen's Fitness App (PWA)

Personal workout PWA: vanilla JS, localStorage + Firebase sync, offline
service worker. Live on GitHub Pages under `/glen-fitness-app/` and also
served from the remote assistant's clone (systemd service `fitness-app`).

**Deploy:** push to GitHub. **Every deploy: bump `CACHE_NAME` in `sw.js`** or
users keep the stale cached version.
**Git:** the remote Telegram assistant also pushes to this repo — `git pull` first.
**Firebase project:** `glen-fitness` (not the budget projects).

**Color system (`css/app.css` `:root`):** `--text` (ink) is the primary
interactive/chrome color — buttons, active tab, focus rings, coach FAB/chat
bubble. Hue (`--orange`/`--cyan`/`--green`/`--purple`/`--amber`/`--teal`) is
reserved for data identity only (calories/weight/protein/training/warning/
mobility) and stays out of primary chrome — don't put a hue back on `.btn` or
`.tab-btn.active`, that's the "cartoony" look Glen asked to move away from.
Tinted backgrounds derive from `--x-rgb` companions
(`rgba(var(--orange-rgb), 0.1)`) rather than hardcoded rgba — add a new
`-rgb` pair alongside any new hue token.

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

## AI food estimate (`js/app.js` → `estimateFoodViaClaude`)
Two entry points on the Fuel/Eat tab's Log Food form, both calling the shared
`estimateFoodViaClaude` helper: "✨ AI" (`aiEstimateFood`, text → kcal/protein)
and "📷" (`aiEstimateFoodPhoto` → `handleFoodPhoto`, camera/photo → name +
kcal/protein, via `resizeImageToBase64` capped at 1200px to keep upload size
and vision tokens down). Model `claude-sonnet-5` (Glen's choice — accurate
and far cheaper than Fable 5 for this task; the Coach stays on
`claude-sonnet-4-6`, these two are intentionally independent), using the same
`fitplan_anthropic_key` as the Coach, `output_config.format` (JSON schema, no
tool use needed) for strict numeric fields, `output_config.effort: 'medium'`
(bumped from 'low' for accuracy — this is inherently an estimate, not a
lookup, since there's no nutrition-database tool call involved).

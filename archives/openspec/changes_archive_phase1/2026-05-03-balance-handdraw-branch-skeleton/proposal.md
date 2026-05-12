## Why

The hand-drawn branch demo now shows useful organic stroke styles, but its skeleton can still look visually unbalanced and hard to use for future text placement. The next step is to improve the demo layout rules so all visual modes share a readable, balanced branch skeleton before renderer integration is considered.

## What Changes

- Update the root-level `handdraw-branch-demo/` to use a shared branch skeleton for Baseline, Organic, and Jittered modes.
- Balance main branches by leaf-node visual weight, allowing spatial left/right placement to differ from semantic input order.
- Keep semantic order intact in data and preserve relative order within each side where possible.
- Split sibling child branches around the parent branch direction; for 1-to-2 structures, place one child above and one below the parent.
- For 4+ child structures, place child anchors along the parent branch in multiple segments instead of fanning all children from one point.
- Spread 4+ child terminals across readable vertical lanes while keeping horizontal text-bearing room near the branch ends.
- Constrain terminal branch directions toward horizontal reading lanes, with a maximum terminal angle of about 30 degrees from horizontal.
- Keep Baseline as a traditional smooth mind-map branch style, while Organic/Jittered only change rendering style on the same skeleton.
- Add Playwright verification and screenshots for the updated demo behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `handdraw-branch-demo`: Refine the demo skeleton layout rules for balanced, readable branch placement across Baseline, Organic, and Jittered modes.

## Impact

- Affects only the root-level `handdraw-branch-demo/` prototype and its verification script.
- Updates OpenSpec artifacts for the demo capability.
- Does not change production renderer output, CLI behavior, `.omm` files, or Web preview behavior.

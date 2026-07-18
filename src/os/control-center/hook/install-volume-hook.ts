// ─── Non-invasive site-wide volume hook ─────────────────────────────
// Patches the WebAudio graph ONCE so every sound any app produces is routed
// through a per-context "master gain" node before reaching the speakers.
// The Control Center slider drives that gain, so game volume is controlled
// without touching any game's sound.ts.
//
// How: games call `someNode.connect(ctx.destination)` to reach the output.
// We intercept AudioNode.prototype.connect and, whenever the target is the
// context's raw destination, reroute through a lazily-created GainNode whose
// value tracks getMasterVolume(). Everything else passes through untouched.

import { getMasterVolume, subscribeMasterVolume } from "./master-volume";

let installed = false;

export function installVolumeHook(): void {
  if (installed) return;
  if (typeof window === "undefined") return;
  if (typeof AudioNode === "undefined" || !AudioNode.prototype.connect) return;
  installed = true;

  const origConnect = AudioNode.prototype.connect;
  // Per-context master gain. WeakMap so contexts can be GC'd freely.
  const masters = new WeakMap<BaseAudioContext, GainNode>();
  // Strong refs to live gains so we can update them on volume change.
  const live = new Set<GainNode>();

  function masterFor(ctx: BaseAudioContext): GainNode {
    let g = masters.get(ctx);
    if (!g) {
      g = ctx.createGain();
      g.gain.value = getMasterVolume();
      // Wire master → real speaker output with the ORIGINAL connect so this
      // internal edge isn't itself intercepted (which would recurse).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (origConnect as any).call(g, ctx.destination);
      masters.set(ctx, g);
      live.add(g);
    }
    return g;
  }

  AudioNode.prototype.connect = function (
    this: AudioNode,
    target: AudioNode | AudioParam,
    ...rest: unknown[]
  ): AudioNode | void {
    const ctx = this.context;
    // Reroute only edges aimed at the raw speaker output; skip the master's
    // own edge to destination so we never loop.
    if (
      target &&
      ctx &&
      target === (ctx as BaseAudioContext).destination &&
      this !== masters.get(ctx)
    ) {
      const g = masterFor(ctx);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      origConnect.call(this, g as any, ...(rest as any[]));
      return g; // keep chaining semantics (connect returns the target node)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (origConnect as any).call(this, target, ...(rest as any[]));
  } as typeof AudioNode.prototype.connect;

  // Live-update every master gain when the Control Center slider moves.
  subscribeMasterVolume((v) => {
    live.forEach((g) => {
      try {
        g.gain.value = v;
      } catch {
        /* node detached — ignore */
      }
    });
  });
}

// Install on import so a single side-effect import is enough (zero game edits).
installVolumeHook();

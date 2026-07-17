// Side-effect import: installs the site-wide WebAudio volume hook once, at the
// moment Control Center is first pulled in (desktop boot) — before any game
// creates its AudioContext. This is what makes the slider control game volume
// without editing any game's sound.ts.
import "./installVolumeHook";

export { ControlCenterMenu } from "./ControlCenterMenu";
export { useVolume } from "./useVolume";
export {
  getMasterVolume,
  setMasterVolume,
  subscribeMasterVolume,
} from "./masterVolume";
export { installVolumeHook } from "./installVolumeHook";

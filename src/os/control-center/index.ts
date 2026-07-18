// Side-effect import: installs the site-wide WebAudio volume hook once, at the
// moment Control Center is first pulled in (desktop boot) — before any game
// creates its AudioContext. This is what makes the slider control game volume
// without editing any game's sound.ts.
import "./hook/install-volume-hook";

export { ControlCenterMenu } from "./ControlCenterMenu";
export { installVolumeHook } from "./hook/install-volume-hook";
export {
  getMasterVolume,
  setMasterVolume,
  subscribeMasterVolume,
} from "./hook/master-volume";
export { useVolume } from "./hook/use-volume";

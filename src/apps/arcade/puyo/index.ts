// Public barrel. The Arcade hub only consumes { Game } and { Icon }; puyoApp is
// exported for standalone launch. Engine + config are re-exported for any
// callers that want the pure logic.
export { puyoApp } from "./App";
export { default as cover } from "./assets/puyo-cover.png";
export { Game } from "./Game";
export { Icon } from "./Icon";
export * from "./lib/config";
export * as engine from "./lib/engine";
export type { ChainStep, Color, Grid, Mode, Piece } from "./lib/types";

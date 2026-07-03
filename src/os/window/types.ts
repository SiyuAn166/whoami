import type { CSSProperties } from 'react';

export type WindowState = 'normal' | 'maximized' | 'minimized' | 'closed';

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface Size {
    w: number;
    h: number;
}

/**
 * Chrome-only, app-agnostic description of one open window. `Window` never
 * looks past these fields — content is always opaque `children` supplied by
 * whatever app spawned the instance.
 */
export interface WindowInstance {
    id: string;
    appId: string;
    title: string;
    rect: Rect;
    state: WindowState;
    zIndex: number;
    minSize?: Size;
    resizable?: boolean;
}

export const MENUBAR_H = 28;
export const TOP_GAP = 12;
export const EDGE = 8; // viewport margin a window can't cross
export const DOCK_H = 86; // dock height + bottom margin (14px margin + ~70px dock + buffer)
export const MIN_W = 440;
export const MIN_H = 300;
export const DEFAULT_MAX_W = 1152; // 72rem

export const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
export const vp = () => ({ vw: window.innerWidth, vh: window.innerHeight });
export const COARSE = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

/** Default centered geometry for a freshly-opened window, offset slightly per open count so stacked windows are visible. */
export function defaultRect(size?: Size, minSize?: Size, offset = 0): Rect {
    const { vw, vh } = vp();
    const w = Math.min(size?.w ?? DEFAULT_MAX_W, vw - 2 * EDGE);
    const h = Math.min(size?.h ?? MIN_H, vh - (MENUBAR_H + TOP_GAP) - DOCK_H);
    const baseX = Math.round((vw - w) / 2);
    const baseY = MENUBAR_H + TOP_GAP;
    const shift = offset * 28;
    return clampRect({ x: baseX + shift, y: baseY + shift, w, h }, minSize);
}

export function maxedRect(): Rect {
    const { vw, vh } = vp();
    return { x: EDGE, y: MENUBAR_H + 4, w: vw - 2 * EDGE, h: vh - (MENUBAR_H + 4) - DOCK_H };
}

/** Keep a rect within the viewport (above menubar, below dock) and above the minimum size. */
export function clampRect(r: Rect, minSize?: Size): Rect {
    const { vw, vh } = vp();
    const minW = minSize?.w ?? MIN_W;
    const minH = minSize?.h ?? MIN_H;
    const w = clamp(r.w, Math.min(minW, vw - 2 * EDGE), vw - 2 * EDGE);
    const h = clamp(r.h, Math.min(minH, vh - (MENUBAR_H + 4) - DOCK_H), vh - (MENUBAR_H + 4) - DOCK_H);
    return {
        w, h,
        x: clamp(r.x, EDGE, vw - EDGE - w),
        y: clamp(r.y, MENUBAR_H + 4, vh - DOCK_H - h),
    };
}

/** Resize handles: edges (inset from corners) + corners. */
export const HANDLES: { dir: string; style: CSSProperties }[] = [
    { dir: 'n', style: { top: 0, left: 14, right: 14, height: 6, cursor: 'ns-resize' } },
    { dir: 's', style: { bottom: 0, left: 14, right: 14, height: 6, cursor: 'ns-resize' } },
    { dir: 'e', style: { top: 14, bottom: 14, right: 0, width: 6, cursor: 'ew-resize' } },
    { dir: 'w', style: { top: 14, bottom: 14, left: 0, width: 6, cursor: 'ew-resize' } },
    { dir: 'nw', style: { top: 0, left: 0, width: 14, height: 14, cursor: 'nwse-resize' } },
    { dir: 'ne', style: { top: 0, right: 0, width: 14, height: 14, cursor: 'nesw-resize' } },
    { dir: 'sw', style: { bottom: 0, left: 0, width: 14, height: 14, cursor: 'nesw-resize' } },
    { dir: 'se', style: { bottom: 0, right: 0, width: 14, height: 14, cursor: 'nwse-resize' } },
];

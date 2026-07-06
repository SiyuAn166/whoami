import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MatrixRain } from "./MatrixRain";
import { Prompt } from "./shell/TerminalText";
import { runCommand } from "./shell/commands";
import { suggest } from "./shell/completion";
import { COARSE_POINTER, HINTS, HOST, USER } from "./shell/constants";
import { nowString } from "./shell/format";
import type { Line, ShellProps } from "./shell/types";
import { buildFS, pathString, type VDir } from "./vfs";

import "./Terminal.css";

export function Shell({ data, theme, setTheme }: ShellProps) {
  const fs = useMemo<VDir>(() => buildFS(data), [data]);
  const [cwd, setCwd] = useState<string[]>([]);

  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const [matrixOn, setMatrixOn] = useState(false);
  // Block cursor + ghost only make sense when the caret is at the end of the input.
  const [caretAtEnd, setCaretAtEnd] = useState(true);

  const idRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const sizerRef = useRef<HTMLSpanElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nextId = () => ++idRef.current;

  const pushCmd = (
    prompt: string,
    cmd: string,
    output: React.ReactNode | null,
  ) => setLines((l) => [...l, { id: nextId(), prompt, cmd, output }]);

  // ── Command interpreter ───────────────────────────────────────────────
  const execute = (raw: string) =>
    runCommand(raw, {
      fs,
      cwd,
      theme,
      data,
      history,
      setCwd,
      setLines,
      setTheme,
      setMatrixOn,
      pushCmd,
    });

  // Keep a stable handle to the latest interpreter for the boot sequence
  // (written in an effect, never during render).
  const executeRef = useRef(execute);
  useEffect(() => {
    executeRef.current = execute;
  });

  // ── Boot sequence: MOTD only ─────────────────────────────────────────────
  // StrictMode-safe: the first (discarded) dev mount is cancelled before it
  // marks `booted`, so the real mount runs the sequence exactly once.
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current) return;
    let cancelled = false;

    if (!cancelled) {
      bootedRef.current = true;
      const motd = (
        <div style={{ color: "var(--fg-dim)" }}>
          <div>Last login: {nowString()} on ttys000</div>
          <div style={{ marginTop: 4 }}>
            Welcome to{" "}
            <span style={{ color: "var(--accent)" }}>
              {USER}@{HOST}
            </span>
            . Type <span style={{ color: "var(--info)" }}>help</span> or click a
            chip below to explore.
          </div>
        </div>
      );
      setLines((l) => [
        ...l,
        { id: (idRef.current += 1), prompt: null, cmd: null, output: motd },
      ]);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the live input width synced to its text (transparent caret + custom cursor),
  // but never wider than the row — long commands scroll inside the input, not the window.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (sizerRef.current && el) {
      const avail = (el.parentElement?.clientWidth ?? Infinity) - 14;
      el.style.width =
        Math.max(0, Math.min(sizerRef.current.offsetWidth, avail)) + "px";
    }
  }, [input]);

  // Auto-scroll to the prompt as the scrollback grows. Scroll only the terminal's
  // own window body (not any ancestor scroll container) to avoid nudging the desktop.
  useEffect(() => {
    const body = bottomRef.current?.closest(".shell-window");
    if (body) body.scrollTop = body.scrollHeight;
    else bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  const ghost = suggest(input, fs, cwd);

  const runInput = () => {
    const cmd = input;
    execute(cmd);
    if (cmd.trim()) setHistory((h) => [...h, cmd.trim()]);
    setInput("");
    setHistIndex(-1);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      runInput();
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      if (ghost) setInput(input + ghost);
      return;
    }

    if (e.key === "ArrowRight" && ghost) {
      const el = e.currentTarget;
      if (el.selectionStart === input.length) {
        e.preventDefault();
        setInput(input + ghost);
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const idx = Math.min(histIndex + 1, history.length - 1);
      setHistIndex(idx);
      setInput(history[history.length - 1 - idx]);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIndex <= -1) return;
      const idx = histIndex - 1;
      setHistIndex(idx);
      setInput(idx === -1 ? "" : history[history.length - 1 - idx]);
      return;
    }
  };

  const runChip = (cmd: string) => {
    setInput("");
    execute(cmd);
    if (cmd.trim()) setHistory((h) => [...h, cmd.trim()]);
    setHistIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <>
      {matrixOn && (
        <MatrixRain
          onDone={() => {
            setMatrixOn(false);
            inputRef.current?.focus();
          }}
        />
      )}

      <section
        className="text-[13px] leading-relaxed shell-window"
        onClick={() => inputRef.current?.focus()}
        style={{ fontFamily: "Monaco, Consolas, 'Courier New', monospace" }}
      >
        {/* Scrollback */}
        <div className="space-y-3">
          {lines.map((line) => (
            <div key={line.id}>
              {line.prompt !== null && (
                <div className="flex flex-wrap">
                  <Prompt
                    path={line.prompt
                      .replace(`${USER}@${HOST} `, "")
                      .replace(" %", "")}
                  />
                  <span style={{ color: "var(--fg)" }}>&nbsp;{line.cmd}</span>
                </div>
              )}
              {line.output !== null && (
                <div className="mt-1">{line.output}</div>
              )}
            </div>
          ))}
        </div>

        {/* Live input row */}
        <div className="flex items-center mt-3">
          <Prompt path={pathString(cwd)} />
          <span
            className="shell-input-wrap"
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              flex: 1,
              minWidth: 0,
              marginLeft: "1ch",
            }}
          >
            <span
              ref={sizerRef}
              aria-hidden="true"
              style={{
                visibility: "hidden",
                position: "absolute",
                whiteSpace: "pre",
                left: 0,
                top: 0,
                fontFamily: "inherit",
                fontSize: "inherit",
              }}
            >
              {input}
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setHistIndex(-1);
                setCaretAtEnd(
                  e.target.selectionStart === e.target.value.length,
                );
              }}
              onKeyDown={handleKey}
              onKeyUp={(e) =>
                setCaretAtEnd(
                  e.currentTarget.selectionStart ===
                    e.currentTarget.value.length,
                )
              }
              onSelect={(e) =>
                setCaretAtEnd(
                  e.currentTarget.selectionStart ===
                    e.currentTarget.value.length,
                )
              }
              onClick={(e) =>
                setCaretAtEnd(
                  e.currentTarget.selectionStart ===
                    e.currentTarget.value.length,
                )
              }
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="shell-input bg-transparent outline-none border-none"
              style={{
                color: "var(--fg)",
                caretColor: caretAtEnd ? "transparent" : "var(--fg)",
                fontFamily: "inherit",
                fontSize: "inherit",
                padding: 0,
                margin: 0,
                minWidth: 0,
                width: "0px",
              }}
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Terminal command input"
              autoFocus={!COARSE_POINTER}
            />
            {caretAtEnd && (
              <span
                className={`term-cursor ${isFocused ? "active" : "inactive"}`}
                aria-hidden="true"
              >
                {ghost[0]}
              </span>
            )}
            {caretAtEnd && ghost && ghost.length > 1 && (
              <span style={{ color: "var(--fg-dim)", whiteSpace: "pre" }}>
                {ghost.slice(1)}
              </span>
            )}
          </span>
        </div>

        {/* Clickable command chips */}
        <div
          className="flex flex-wrap gap-2 mt-4"
          style={{ userSelect: "none" }}
        >
          {HINTS.map((h) => (
            <button
              key={h}
              onClick={(e) => {
                e.stopPropagation();
                runChip(h);
              }}
              className="px-2 py-0.5 rounded-md"
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
                color: "var(--fg-dim)",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {h}
            </button>
          ))}
        </div>

        <div ref={bottomRef} />
      </section>
    </>
  );
}

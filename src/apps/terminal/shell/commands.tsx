import type { ReactNode } from "react";
import type { PortfolioData } from "../../../types/portfolio";
import { ExperienceSection } from "../../section/experience";
import { IdentitySection } from "../../section/identity";
import { ProjectSection } from "../../section/projects";
import { SkillSection } from "../../section/skills";
import type { VDir } from "../vfs";
import { isDir, listDir, pathString, resolve, treeString } from "../vfs";
import { ContactCard } from "./ContactCard";
import { Text } from "./TerminalText";
import { HELP, HOST, USER } from "./constants";
import { manPage, renderFile, resolveOpen } from "./file-system";
import { nowString, randomFortune } from "./format";

export interface CmdCtx {
  fs: VDir;
  cwd: string[];
  theme: "dark" | "light";
  data: PortfolioData;
  history: string[];
  setCwd: (s: string[]) => void;
  setLines: (
    updater: (lines: import("./types").Line[]) => import("./types").Line[],
  ) => void;
  setTheme: (t: "dark" | "light") => void;
  setMatrixOn: (b: boolean) => void;
  pushCmd: (prompt: string, cmd: string, output: ReactNode) => void;
}

export function runCommand(raw: string, ctx: CmdCtx): void {
  const {
    fs,
    theme,
    data,
    history,
    setCwd,
    setLines,
    setTheme,
    setMatrixOn,
    pushCmd,
  } = ctx;
  const cmdline = raw.trim();
  const here = ctx.cwd;
  const promptPath = pathString(here);
  const prompt = `${USER}@${HOST} ${promptPath} %`;

  if (cmdline === "") {
    pushCmd(prompt, "", null);
    return;
  }

  const [name, ...args] = cmdline.split(/\s+/);
  const arg = cmdline.slice(name.length).trim();
  // First non-flag token — lets `ls -la projects`, `ls -la` etc. behave.
  const pathArg = args.find((a) => !a.startsWith("-")) ?? "";
  let output: ReactNode | null = null;

  switch (name) {
    case "clear":
      setLines(() => []);
      return;

    case "help":
      output = (
        <div
          className="grid gap-x-6 gap-y-0.5"
          style={{ gridTemplateColumns: "auto 1fr" }}
        >
          {HELP.map((h) => (
            <div key={h.name} style={{ display: "contents" }}>
              <span style={{ color: "var(--accent)" }}>{h.name}</span>
              <span style={{ color: "var(--fg-dim)" }}>{h.desc}</span>
            </div>
          ))}
        </div>
      );
      break;

    case "pwd":
      output = (
        <Text>{`/Users/${USER}${here.length ? "/" + here.join("/") : ""}`}</Text>
      );
      break;

    case "ls": {
      const target = resolve(fs, here, pathArg || ".");
      if (!target) {
        output = (
          <Text color="var(--error)">{`ls: ${pathArg}: No such file or directory`}</Text>
        );
        break;
      }
      if (!isDir(target.node)) {
        output = <Text>{target.node.name}</Text>;
        break;
      }
      const entries = listDir(target.node);
      output = (
        <div className="flex flex-wrap gap-x-5 gap-y-0.5">
          {entries.map((e) => (
            <span
              key={e}
              style={{ color: e.endsWith("/") ? "var(--info)" : "var(--fg)" }}
            >
              {e}
            </span>
          ))}
        </div>
      );
      break;
    }

    case "cd": {
      const target = resolve(fs, here, pathArg || "~");
      if (!target) {
        output = (
          <Text color="var(--error)">{`cd: no such file or directory: ${pathArg}`}</Text>
        );
        break;
      }
      if (!isDir(target.node)) {
        output = (
          <Text color="var(--error)">{`cd: not a directory: ${pathArg}`}</Text>
        );
        break;
      }
      setCwd(target.segs);
      break;
    }

    case "cat": {
      if (!pathArg) {
        output = <Text color="var(--fg-dim)">usage: cat &lt;file&gt;</Text>;
        break;
      }
      const target = resolve(fs, here, pathArg);
      if (!target) {
        output = (
          <Text color="var(--error)">{`cat: ${pathArg}: No such file or directory`}</Text>
        );
        break;
      }
      if (isDir(target.node)) {
        output = (
          <Text color="var(--error)">{`cat: ${pathArg}: Is a directory`}</Text>
        );
        break;
      }
      output = renderFile(target.node.render, target.node.text, data);
      break;
    }

    case "tree":
      output = <Text color="var(--fg-dim)">{`~\n${treeString(fs)}`}</Text>;
      break;

    case "whoami":
    case "about":
    case "neofetch":
      output = (
        <IdentitySection
          identity={data.identity}
          experience={data.experience}
          meta={data.meta}
        />
      );
      break;

    case "kubectl": {
      // `kubectl get <resource>` — route by resource word, ignore flags like `-n siyu`.
      const resource =
        args.find((a) => /^(roles?|projects?|skills?)$/.test(a)) ?? "roles";
      if (/^proj/.test(resource))
        output = <ProjectSection projects={data.projects} variant="terminal" />;
      else if (/^skill/.test(resource))
        output = <SkillSection skills={data.skills} variant="terminal" />;
      else
        output = (
          <ExperienceSection entries={data.experience} variant="terminal" />
        );
      break;
    }

    case "experience":
    case "work":
      output = (
        <ExperienceSection entries={data.experience} variant="terminal" />
      );
      break;

    case "projects":
      output = <ProjectSection projects={data.projects} variant="terminal" />;
      break;

    case "skills":
      output = <SkillSection skills={data.skills} variant="terminal" />;
      break;

    case "contact":
      output = <ContactCard data={data} />;
      break;

    case "open": {
      const url = resolveOpen(fs, here, pathArg);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        output = <Text color="var(--fg-dim)">{`Opening ${url} …`}</Text>;
      } else
        output = (
          <Text color="var(--error)">{`open: ${pathArg || "(nothing)"}: no link available`}</Text>
        );
      break;
    }

    case "theme": {
      const t = arg.toLowerCase();
      if (t === "dark" || t === "light") {
        setTheme(t);
        output = <Text color="var(--fg-dim)">{`appearance → ${t}`}</Text>;
      } else {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        output = <Text color="var(--fg-dim)">{`appearance → ${next}`}</Text>;
      }
      break;
    }

    case "matrix":
      setMatrixOn(true);
      output = <Text color="var(--accent)">Wake up, Neo… 🐇</Text>;
      break;

    case "fortune":
      output = <Text color="var(--fg-dim)">{randomFortune()}</Text>;
      break;

    case "date":
      output = <Text>{nowString()}</Text>;
      break;

    case "echo":
      output = <Text>{arg}</Text>;
      break;

    case "uname":
      output = (
        <Text>
          {data.meta.commands?.uname ?? "Darwin portfolio 24.5.0 arm64"}
        </Text>
      );
      break;

    case "history":
      output = (
        <Text color="var(--fg-dim)">
          {history
            .map((h, i) => `${String(i + 1).padStart(3)}  ${h}`)
            .join("\n") || "(empty)"}
        </Text>
      );
      break;

    case "man":
      output = manPage(args[0]);
      break;

    case "sudo":
      output = arg.includes("hire") ? (
        <Text color="var(--ok)">
          Permission granted. siyu has been added to your team. 🎉 (run
          `contact`)
        </Text>
      ) : (
        <Text color="var(--error)">{`${USER} is not in the sudoers file. This incident has been reported.`}</Text>
      );
      break;

    case "vim":
    case "vi":
    case "nano":
    case "emacs":
      output = (
        <Text color="var(--fg-dim)">
          E: to exit, type `:q` then Enter — (just kidding, there's no escaping
          a good portfolio)
        </Text>
      );
      break;

    case ":q":
    case ":q!":
    case ":wq":
      output = <Text color="var(--fg-dim)">left the editor.</Text>;
      break;

    case "exit":
    case "logout":
      output = (
        <Text color="var(--fg-dim)">
          [Process completed] — refresh to start a new session.
        </Text>
      );
      break;

    default:
      output = (
        <Text color="var(--error)">{`zsh: command not found: ${name}`}</Text>
      );
  }

  pushCmd(prompt, raw, output);
}

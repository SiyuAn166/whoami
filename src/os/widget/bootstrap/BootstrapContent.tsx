import { CursorIcon, DockIcon, DragIcon } from "./BootstrapIcons";
import "./BootstrapWidget.css";

const STEPS = [
  {
    icon: <CursorIcon />,
    tone: "blue",
    title: "Right click",
    desc: "Open the menu",
  },
  {
    icon: <DockIcon />,
    tone: "green",
    title: "Dock",
    desc: "Launch apps below",
  },
  {
    icon: <DragIcon />,
    tone: "purple",
    title: "Drag",
    desc: "Move & resize windows",
  },
];

export function BootstrapContent() {
  return (
    <div className="stw-root">
      <header className="stw-head">
        <div className="stw-welcome">
          Hi, there <span className="stw-wave">👋</span>
        </div>
        <h2 className="stw-title">Welcome to my macOS‑inspired portfolio</h2>
        <p className="stw-intro">
          A desktop built in the browser — explore it like the real thing.
        </p>
      </header>

      <ol className="stw-steps">
        {STEPS.map((s) => (
          <li className="stw-step" key={s.title}>
            <span className={`stw-icon stw-icon--${s.tone}`}>{s.icon}</span>
            <span className="stw-step-text">
              <span className="stw-step-title">{s.title}</span>
              <span className="stw-step-desc">{s.desc}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

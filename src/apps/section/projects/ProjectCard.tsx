import type { Project } from "../../../types/portfolio";

import styles from "./ProjectCard.module.css";

interface ProjectCardProps {
  project: Project;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "var(--ok)",
  STABLE: "var(--info)",
  BETA: "var(--warn)",
  ARCHIVED: "var(--fg-dim)",
  WIP: "var(--warn)",
};

export function ProjectCard({ project }: ProjectCardProps) {
  const statusColor = STATUS_COLORS[project.status] ?? "var(--fg-dim)";

  const handleClick = () => {
    if (project.url) window.open(project.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={`${styles.projectCard} p-3`}
      onClick={project.url ? handleClick : undefined}
      style={{ cursor: project.url ? "pointer" : "default" }}
      role={project.url ? "link" : undefined}
      tabIndex={project.url ? 0 : undefined}
      onKeyDown={(e) => {
        if (project.url && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Header */}
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
          <span
            className="font-semibold text-[14px] truncate"
            style={{ color: "var(--fg)" }}
          >
            {project.name}
          </span>
          <span
            className="text-[12px] flex-shrink-0"
            style={{ color: "var(--fg-dim)" }}
          >
            {project.version}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className="inline-block rounded-full"
            style={{
              width: "7px",
              height: "7px",
              backgroundColor: statusColor,
            }}
            aria-hidden="true"
          />
          <span className="text-[11px]" style={{ color: "var(--fg-dim)" }}>
            {project.status}
          </span>
          {project.url && (
            <span className="text-[12px]" style={{ color: "var(--info)" }}>
              ↗
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p
        className="text-[13px] leading-relaxed mb-3"
        style={{
          color: "var(--fg-dim)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {project.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-md"
            style={{
              backgroundColor: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--fg-dim)",
            }}
          >
            {tag}
          </span>
        ))}
        {project.license && (
          <span
            className="px-2 py-0.5 rounded-md"
            style={{
              backgroundColor: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--fg-dim)",
            }}
          >
            {project.license}
          </span>
        )}
      </div>
    </div>
  );
}

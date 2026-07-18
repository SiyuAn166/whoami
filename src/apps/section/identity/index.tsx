import type { ExperienceEntry, Identity, Meta } from "../../../types/portfolio";

interface IdentitySectionProps {
  identity: Identity;
  experience: ExperienceEntry[];
  meta?: Meta;
}

/**
 * The `cat README.md` / `whoami` output — a GitHub-style profile README
 * rendered in the terminal palette: H1 name, blockquote headline, a
 * location + status line, link buttons, and the bio.
 */
export function IdentitySection({
  identity,
  experience,
  meta,
}: IdentitySectionProps) {
  const currentRole =
    experience.find((e) => e.current)?.title ?? "Software Engineer";
  const headline = identity.headline ?? currentRole;

  const github =
    meta?.commands?.social?.replace("→", "").trim() ?? "github.com/SiyuAn166";
  const email =
    meta?.contactLinks?.find((l) => l.label === "Email")?.value ??
    "siyu.an166@gmail.com";
  const linkedin =
    meta?.contactLinks?.find((l) => l.label === "LinkedIn")?.value ??
    "linkedin.com/in/siyu-an-bc";

  return (
    <section className="max-w-2xl">
      {/* # H1 — name */}
      <h1
        style={{
          fontSize: "26px",
          fontWeight: 700,
          color: "var(--fg)",
          lineHeight: 1.2,
        }}
      >
        {identity.title} <span aria-hidden>👋</span>
      </h1>
      <div
        style={{
          height: 1,
          background: "var(--border)",
          margin: "10px 0 14px",
        }}
      />

      {/* > blockquote — headline */}
      <blockquote
        style={{
          borderLeft: "3px solid var(--accent)",
          paddingLeft: "12px",
          margin: "0 0 16px",
          color: "var(--fg-dim)",
        }}
      >
        {headline}
      </blockquote>

      {/* location · status */}
      <div
        className="flex flex-wrap items-center gap-x-6 gap-y-1.5"
        style={{ marginBottom: "16px", color: "var(--fg-dim)" }}
      >
        <span>📍 Vancouver, BC, Canada</span>
        <span className="inline-flex items-center gap-2">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--ok)",
              display: "inline-block",
              flexShrink: 0,
            }}
            aria-hidden
          />
          <span style={{ color: "var(--ok)" }}>open to opportunities</span>
        </span>
      </div>

      {/* link buttons */}
      <div className="flex flex-wrap gap-2" style={{ marginBottom: "18px" }}>
        <LinkButton href={`https://${github}`} label="GitHub" />
        <LinkButton href={`https://${linkedin}`} label="LinkedIn" />
        <LinkButton href={`mailto:${email}`} label="Email" external={false} />
      </div>

      {/* bio */}
      <p
        style={{
          color: "var(--fg-dim)",
          lineHeight: 1.75,
          wordBreak: "break-word",
        }}
      >
        {identity.tagline}
      </p>
    </section>
  );
}

function LinkButton({
  href,
  label,
  external = true,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="px-3 py-1 rounded-md inline-flex items-center gap-1.5"
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        color: "var(--info)",
        fontSize: "13px",
        textDecoration: "none",
      }}
    >
      {label}
      {external && (
        <span aria-hidden style={{ opacity: 0.7 }}>
          ↗
        </span>
      )}
    </a>
  );
}

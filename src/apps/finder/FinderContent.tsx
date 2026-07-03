import type { PortfolioData } from "../../types/portfolio";
import { FinderSidebar } from "./FinderSidebar";
import "./finder.css";
import { useFinderNav } from "./finderNav";
import { ExperienceSection } from "./section/experience/ExperienceSection";
import { ProjectSection } from "./section/projects/ProjectSection";
import { CapabilitiesSection } from "./section/skills/SkillSection";

export function FinderContent({ data }: { data: PortfolioData }) {
  const { section, sidebarOpen } = useFinderNav();
  return (
    <div className="finder">
      {sidebarOpen && <FinderSidebar />}
      <div className="finder-pane">
        {section === "experience" && (
          <ExperienceSection entries={data.experience} variant="finder" />
        )}
        {section === "projects" && (
          <ProjectSection projects={data.projects} variant="finder" />
        )}
        {section === "skills" && (
          <CapabilitiesSection skills={data.skills} variant="finder" />
        )}
      </div>
    </div>
  );
}

import type { PortfolioData } from "../../types/portfolio";
import { AboutMeSection } from "../section/aboutme/AboutMeSection";
import { ExperienceSection } from "../section/experience/ExperienceSection";
import { ProjectSection } from "../section/projects/ProjectSection";
import { CapabilitiesSection } from "../section/skills/SkillSection";
import { FinderSidebar } from "./Sidebar";
import { useFinderNav } from "./nav";

import "./style.css";

export function FinderContent({ data }: { data: PortfolioData }) {
  const { section, sidebarOpen } = useFinderNav();
  return (
    <div className="finder">
      {sidebarOpen && <FinderSidebar />}
      <div className="finder-pane">
        {section === "about" && (
          <AboutMeSection
            identity={data.identity}
            meta={data.meta}
            variant="finder"
          />
        )}
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

import { AboutMeSection } from "../section/about-me";
import { ExperienceSection } from "../section/experience";
import { ProjectSection } from "../section/projects";
import { SkillSection } from "../section/skills";
import { toggleSidebar, useFinderNav } from "./nav";
import { FinderSidebar } from "./Sidebar";

import type { PortfolioData } from "../../types/portfolio";

import styles from "./Finder.module.css";

export function FinderContent({ data }: { data: PortfolioData }) {
  const { section, sidebarOpen } = useFinderNav();
  return (
    <div className={styles.finder}>
      {sidebarOpen && (
        <>
          <FinderSidebar />
          <button
            type="button"
            className={styles.finderBackdrop}
            aria-label="Close sidebar"
            onClick={toggleSidebar}
          />
        </>
      )}
      <div className={styles.finderPane}>
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
          <SkillSection skills={data.skills} variant="finder" />
        )}
      </div>
    </div>
  );
}

import { ExperienceSection } from './section/ExperienceSection';
import { ProjectSection } from './section/ProjectSection';
import { CapabilitiesSection } from './section/SkillSection';
import type { PortfolioData } from '../../types/portfolio';
import { FinderSidebar } from './FinderSidebar';
import { useFinderNav } from './finderNav';
import '../../styles/finder.css';

export function FinderContent({ data }: { data: PortfolioData }) {
  const { section, sidebarOpen } = useFinderNav();
  return (
    <div className="finder">
      {sidebarOpen && <FinderSidebar />}
      <div className="finder-pane">
        {section === 'experience' && <ExperienceSection entries={data.experience} variant="finder" />}
        {section === 'projects' && <ProjectSection projects={data.projects} variant="finder" />}
        {section === 'skills' && <CapabilitiesSection skills={data.skills} variant="finder" />}
      </div>
    </div>
  );
}

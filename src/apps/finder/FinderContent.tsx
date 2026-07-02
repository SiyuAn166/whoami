import { ExperienceSection } from '../../components/ExperienceSection';
import { ProjectsSection } from '../../components/ProjectsSection';
import { CapabilitiesSection } from '../../components/SkillSection';
import type { PortfolioData } from '../../types';
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
        {section === 'projects' && <ProjectsSection projects={data.projects} variant="finder" />}
        {section === 'skills' && <CapabilitiesSection skills={data.skills} variant="finder" />}
      </div>
    </div>
  );
}

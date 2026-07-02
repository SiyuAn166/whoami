import { useState } from 'react';
import { ExperienceSection } from '../../components/ExperienceSection';
import { ProjectsSection } from '../../components/ProjectsSection';
import { CapabilitiesSection } from '../../components/SkillSection';
import type { PortfolioData } from '../../types';
import { FinderSidebar, type FinderSection } from './FinderSidebar';

export function FinderContent({ data }: { data: PortfolioData }) {
    const [section, setSection] = useState<FinderSection>('experience');
    return (
        <div style={{ display: 'flex', minHeight: '100%', margin: '-20px -22px' }}>
            <FinderSidebar selected={section} onSelect={setSection} />
            <div style={{ flex: 1, minWidth: 0, padding: '20px 22px' }}>
                {section === 'experience' && <ExperienceSection entries={data.experience} variant="finder" />}
                {section === 'projects' && <ProjectsSection projects={data.projects} variant="finder" />}
                {section === 'skills' && <CapabilitiesSection skills={data.skills} variant='finder' />}
            </div>
        </div>
    );
}

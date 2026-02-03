'use client';

import { PageContainer, SectionContainer } from '@components/Container';
import { DUMMY_PROJECTS } from '@data';
import { ProjectCard } from '@components/ProjectCard';

export default function TeamMatchingPortalPage() {
  return (
    <PageContainer>
      <SectionContainer>
        <h1 className="text-4xl md:text-6xl font-semibold mb-12 text-ycs-pink">
          Team Matching Portal
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {DUMMY_PROJECTS.map((project) => (
            <ProjectCard key={project.projectName} project={project} />
          ))}
        </div>
      </SectionContainer>
    </PageContainer>
  );
}

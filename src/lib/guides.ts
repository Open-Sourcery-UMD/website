/**
 * The guides' sections, shared by the guide pages (their "On this page"
 * lists) and the cards that link to them, so the two can't drift apart.
 */
export interface GuideSectionInfo {
  id: string;
  title: string;
}

export const LEAD_DEVELOPER_GUIDE_SECTIONS: GuideSectionInfo[] = [
  { id: 'role', title: 'Your Role & Responsibilities' },
  { id: 'getting-started', title: 'Getting Started: Setting Up Your Project' },
  { id: 'running', title: 'Running Your Project' },
  { id: 'sprints', title: 'Sprints & Hack Sessions' },
  { id: 'team', title: 'Growing & Supporting Your Team' },
  { id: 'connected', title: 'Staying Connected' },
];

export const DEVELOPER_GUIDE_SECTIONS: GuideSectionInfo[] = [
  { id: 'getting-started', title: 'Getting Started: Joining a Project' },
  { id: 'working', title: 'Working on Your Project' },
  { id: 'beyond', title: 'Beyond Your Team' },
  { id: 'connected', title: 'Staying Connected' },
];

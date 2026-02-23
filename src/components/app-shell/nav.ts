export type NavItem = {
  label: string;
  href: string;
};

export const PRIMARY_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Candidats', href: '/candidates' },
  { label: 'Offres', href: '/job-posts' },
  { label: 'Communication', href: '/messages' },
  { label: 'Entrevues', href: '/interviews' },
  { label: 'Documents', href: '/documents' },
  { label: 'AI', href: '/ai' },
  { label: 'Performances', href: '/performance' },
  { label: 'Historique', href: '/history' }
];

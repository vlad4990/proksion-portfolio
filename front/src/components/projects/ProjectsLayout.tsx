import { useCallback, useEffect, useRef, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Grid } from './Grid';
import { fetchProjects, type ProjectTile } from '@/lib/api';
import { projectsTree } from '@/lib/projects-tree';
import './projects.css';

interface Props {
  initialSection: string;
  initialSubsection: string;
  initialTiles: ProjectTile[];
}

export function ProjectsLayout({
  initialSection,
  initialSubsection,
  initialTiles,
}: Props) {
  const [section, setSection] = useState(initialSection);
  const [subsection, setSubsection] = useState(initialSubsection);
  const [tiles, setTiles] = useState<ProjectTile[]>(initialTiles);
  const [loading, setLoading] = useState(false);

  const fetchSeq = useRef(0);

  const load = useCallback(async (s: string, sub: string) => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    try {
      const data = await fetchProjects(s, sub);
      if (fetchSeq.current === seq) {
        setTiles(data);
      }
    } finally {
      if (fetchSeq.current === seq) {
        setLoading(false);
      }
    }
  }, []);

  const navigate = useCallback(
    (nextSection: string, nextSub: string) => {
      if (nextSection === section && nextSub === subsection) return;

      const url = `/projects/${nextSection}/${nextSub}`;
      history.pushState({ section: nextSection, subsection: nextSub }, '', url);

      setSection(nextSection);
      setSubsection(nextSub);
      void load(nextSection, nextSub);
    },
    [section, subsection, load],
  );

  useEffect(() => {
    const onPop = () => {
      const match = location.pathname.match(/^\/projects\/([^/]+)\/([^/]+)/);
      if (!match) return;
      const [, s, sub] = match;
      if (!s || !sub) return;
      setSection(s);
      setSubsection(sub);
      void load(s, sub);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [load]);

  return (
    <div className="projects">
      <Sidebar
        tree={projectsTree}
        activeSection={section}
        activeSub={subsection}
        onNavigate={navigate}
      />
      <Grid tiles={tiles} loading={loading} />
    </div>
  );
}

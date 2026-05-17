import type { CSSProperties } from 'react';
import type { ProjectTile, ProjectTileFill } from '@/lib/api';

interface Props {
  tiles: ProjectTile[];
  loading: boolean;
}

const FILL_VAR: Record<ProjectTileFill, string> = {
  'paper-300': 'var(--c-paper-300)',
  'paper-400': 'var(--c-paper-400)',
  'paper-500': 'var(--c-paper-500)',
  'paper-600': 'var(--c-paper-600)',
};

function tileStyle(t: ProjectTile): CSSProperties {
  if (t.image) {
    return {
      height: t.height,
      background: `url(${t.image}) center / cover no-repeat`,
    };
  }
  return {
    height: t.height,
    background: t.fill ? FILL_VAR[t.fill] : 'var(--c-paper-400)',
  };
}

export function Grid({ tiles, loading }: Props) {
  if (loading) return <GridSkeleton />;

  return (
    <div className="projects__grid">
      {tiles.map((t) => (
        <div
          key={t.id}
          className="tile"
          style={tileStyle(t)}
          role="img"
          aria-label={t.title ?? 'Проект'}
        />
      ))}
    </div>
  );
}

const SKELETON_HEIGHTS = [
  320, 240, 420, 280, 200, 360, 320, 180, 440, 260, 320, 220,
] as const;

function GridSkeleton() {
  return (
    <div className="projects__grid projects__grid--loading" aria-busy="true">
      {SKELETON_HEIGHTS.map((h, i) => (
        <div key={i} className="tile tile--skeleton" style={{ height: h }} />
      ))}
    </div>
  );
}

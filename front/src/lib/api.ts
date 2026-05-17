export type ProjectTileFill = 'paper-300' | 'paper-400' | 'paper-500' | 'paper-600';

export type ProjectTile = {
  id: string;
  /** desired tile height in px on desktop; mobile reflows */
  height: number;
  /** if set — image url; otherwise solid fill from a paper-* token */
  image?: string;
  fill?: ProjectTileFill;
  title?: string;
};

const STUB_TILES: readonly ProjectTile[] = [
  { id: 't1', height: 320, fill: 'paper-400' },
  { id: 't2', height: 240, fill: 'paper-600' },
  { id: 't3', height: 420, image: '/assets/project-success.png' },
  { id: 't4', height: 280, fill: 'paper-300' },
  { id: 't5', height: 200, fill: 'paper-500' },
  { id: 't6', height: 360, fill: 'paper-400' },
  { id: 't7', height: 320, image: '/assets/project-post.png' },
  { id: 't8', height: 180, fill: 'paper-600' },
  { id: 't9', height: 440, fill: 'paper-300' },
  { id: 't10', height: 260, fill: 'paper-400' },
  { id: 't11', height: 320, fill: 'paper-500' },
  { id: 't12', height: 220, fill: 'paper-600' },
  { id: 't13', height: 380, fill: 'paper-400' },
  { id: 't14', height: 200, fill: 'paper-300' },
  { id: 't15', height: 300, fill: 'paper-500' },
  { id: 't16', height: 240, fill: 'paper-400' },
];

export async function fetchProjects(
  _section: string,
  _subsection: string,
): Promise<ProjectTile[]> {
  await new Promise((r) => setTimeout(r, 250));
  return STUB_TILES.map((t) => ({ ...t }));
}

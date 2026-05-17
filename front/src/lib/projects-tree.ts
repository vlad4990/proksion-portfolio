export type ProjectSubsection = {
  id: string;
  label: string;
};

export type ProjectSection = {
  id: string;
  label: string;
  children: readonly ProjectSubsection[];
};

const LEAF_CHILD: ProjectSubsection = { id: 'all', label: '' };

export const projectsTree: readonly ProjectSection[] = [
  {
    id: 'press-f',
    label: 'Press F',
    children: [
      { id: 'banners', label: 'Баннера' },
      { id: 'vitriny', label: 'Витрины товаров' },
      { id: 'posts', label: 'Посты в соц.сети' },
    ],
  },
  {
    id: 'kupikod',
    label: 'KUPIKOD',
    children: [
      { id: 'banners', label: 'Баннера' },
      { id: 'youtube', label: 'YouTube обложки' },
      { id: 'posts', label: 'Посты в соц.сети' },
    ],
  },
  {
    id: 'drawing',
    label: 'Рисование',
    children: [
      { id: 'painting', label: 'Живопись' },
      { id: 'drawing', label: 'Рисунок' },
      { id: 'digital', label: 'Диджитал арт' },
    ],
  },
  { id: 'sketchbook', label: 'Sketchbook', children: [LEAF_CHILD] },
  { id: 'uiux', label: 'UI/UX кейсы', children: [LEAF_CHILD] },
];

export const DEFAULT_SECTION = 'press-f';
export const DEFAULT_SUBSECTION = 'banners';

export function findSection(id: string): ProjectSection | undefined {
  return projectsTree.find((s) => s.id === id);
}

export function findSubsection(
  sectionId: string,
  subId: string,
): ProjectSubsection | undefined {
  return findSection(sectionId)?.children.find((c) => c.id === subId);
}

export function isLeafSection(section: ProjectSection): boolean {
  return section.children.length === 1 && section.children[0]!.id === 'all';
}

export function firstChildId(section: ProjectSection): string {
  return section.children[0]?.id ?? 'all';
}

import type { ProjectSection } from '@/lib/projects-tree';
import { firstChildId, isLeafSection } from '@/lib/projects-tree';

interface Props {
  tree: readonly ProjectSection[];
  activeSection: string;
  activeSub: string;
  onNavigate: (section: string, sub: string) => void;
}

export function Sidebar({ tree, activeSection, activeSub, onNavigate }: Props) {
  return (
    <nav className="projects__sidebar" aria-label="Категории проектов">
      {tree.map((group) => {
        const isActive = activeSection === group.id;
        const leaf = isLeafSection(group);
        const titleClass =
          'sidebar-group__title' + (isActive ? ' sidebar-group__title--active' : '');
        return (
          <div key={group.id} className="sidebar-group">
            <button
              type="button"
              className={titleClass}
              onClick={() => onNavigate(group.id, firstChildId(group))}
            >
              {isActive && (
                <img
                  src="/assets/icon-marker-pixel.svg"
                  alt=""
                  className="sidebar-group__marker"
                  aria-hidden="true"
                />
              )}
              {group.label}
            </button>
            {isActive && !leaf && (
              <ul className="sidebar-group__children">
                {group.children.map((child) => {
                  const isActiveChild = activeSub === child.id;
                  const childClass =
                    'sidebar-child' + (isActiveChild ? ' sidebar-child--active' : '');
                  return (
                    <li key={child.id}>
                      <button
                        type="button"
                        className={childClass}
                        onClick={() => onNavigate(group.id, child.id)}
                      >
                        {child.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

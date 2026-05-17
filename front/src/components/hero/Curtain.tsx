import { useEffect, useState, type ReactNode } from 'react';
import './Curtain.css';

const STORAGE_KEY = 'proksion:curtain:dismissed';
const DISMISS_DURATION_MS = 600;

type Phase = 'visible' | 'dismissing' | 'gone';

export function Curtain({ children }: { children?: ReactNode }) {
  /* Стартуем с 'visible' и на сервере, и на клиенте — иначе React
     получает гидратационный mismatch (server: рендерит .curtain,
     client: возвращает null из-за sessionStorage). Флаг читаем в
     useEffect — он срабатывает сразу после первой коммитации и
     синхронно снимает занавес, ещё до того, как браузер успеет
     отрисовать его. */
  const [phase, setPhase] = useState<Phase>('visible');

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(STORAGE_KEY) === '1') {
        setPhase('gone');
      }
    } catch {
      /* sessionStorage недоступен — оставляем занавес */
    }
  }, []);

  const dismiss = () => setPhase((p) => (p === 'visible' ? 'dismissing' : p));

  useEffect(() => {
    if (phase !== 'dismissing') return;
    const t = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* sessionStorage недоступен — занавес всё равно уходит */
      }
      setPhase('gone');
    }, DISMISS_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'gone') {
      document.documentElement.style.overflow = '';
      return;
    }
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'visible') return;
    const onInput = () => dismiss();
    window.addEventListener('wheel', onInput, { passive: true, once: true });
    window.addEventListener('touchstart', onInput, { passive: true, once: true });
    window.addEventListener('keydown', onInput, { once: true });
    return () => {
      window.removeEventListener('wheel', onInput);
      window.removeEventListener('touchstart', onInput);
      window.removeEventListener('keydown', onInput);
    };
  }, [phase]);

  if (phase === 'gone') return null;

  return (
    <div
      className={`curtain${phase === 'dismissing' ? ' curtain--dismissing' : ''}`}
      onClick={dismiss}
      role="button"
      tabIndex={0}
      aria-label="Войти на сайт"
    >
      {children}
    </div>
  );
}

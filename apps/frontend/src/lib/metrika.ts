declare global {
  interface Window {
    ym?: (id: number, method: string, ...args: unknown[]) => void;
  }
}

const ID = Number(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID ?? '110270689');

export const ym = {
  hit(url: string) {
    window.ym?.(ID, 'hit', url);
  },
  goal(target: string, params?: Record<string, unknown>) {
    window.ym?.(ID, 'reachGoal', target, params);
  },
};

import { describe, expect, it } from 'vitest';
import { screenFromPath, screenPaths } from './routes';

describe('screen routes', () => {
  it('すべての画面を一意のパスへ変換できる', () => {
    const paths = Object.values(screenPaths);
    expect(new Set(paths).size).toBe(paths.length);
    Object.entries(screenPaths).forEach(([screen, path]) => {
      expect(screenFromPath(path)).toBe(screen);
    });
  });

  it('未定義のパスは画面として扱わない', () => {
    expect(screenFromPath('/unknown')).toBeNull();
  });
});

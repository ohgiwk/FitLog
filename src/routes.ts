import type { Screen } from './types';

export const screenPaths: Record<Screen, string> = {
  home: '/',
  select: '/exercises/select',
  exerciseEdit: '/exercises/edit',
  detail: '/workouts/detail',
  exerciseHistory: '/workouts/history',
  goalAchievements: '/achievements',
  presetEdit: '/training-menus/edit',
  presetExerciseSelect: '/training-menus/exercises',
  trainingMenu: '/training-menus',
  analysis: '/analysis',
  partEdit: '/settings/parts',
  exerciseManage: '/settings/exercises',
  settings: '/settings',
  notificationSettings: '/settings/notifications',
  privacyPolicy: '/settings/privacy',
  termsOfService: '/settings/terms',
  accountManagement: '/settings/backup/account',
  forgotPassword: '/settings/backup/password',
  backup: '/settings/backup',
};

const screensByPath = new Map(
  Object.entries(screenPaths).map(([screen, path]) => [path, screen as Screen]),
);

export function screenFromPath(pathname: string) {
  return screensByPath.get(pathname) ?? null;
}

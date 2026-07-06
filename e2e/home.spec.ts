import { expect, test, type Page } from '@playwright/test';

const appPath = '/FitLog/';
const exerciseName = 'ベンチプレス';
const storeKey = 'fit-log-v2';

async function openFreshApp(page: Page) {
  await page.goto(appPath);
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'トレーニングを開始' })).toBeVisible();
}

async function startExercise(page: Page) {
  await page.getByRole('button', { name: '種目を選んで開始' }).click();
  await expect(page.getByText('種目を選択')).toBeVisible();
  await page.getByRole('button', { name: exerciseName, exact: true }).click();
  await expect(page.getByText(exerciseName).first()).toBeVisible();
}

async function fillFirstSet(page: Page, weight: string, reps: string) {
  const setInputs = page.locator('.detail-table input');
  await expect(setInputs.first()).toBeVisible();
  await setInputs.nth(0).fill(weight);
  await setInputs.nth(1).fill(reps);
  await expect
    .poll(async () =>
      page.evaluate(
        ({ key, exercise, weight, reps }) => {
          const raw = window.localStorage.getItem(key);
          if (!raw) return false;
          const state = JSON.parse(raw) as {
            workouts?: {
              name?: string;
              sets?: { weight?: number | null; recordValue?: number | null }[];
            }[];
          };
          return state.workouts?.some(
            (workout) =>
              workout.name === exercise &&
              workout.sets?.some(
                (set) => set.weight === Number(weight) && set.recordValue === Number(reps),
              ),
          );
        },
        { key: storeKey, exercise: exerciseName, weight, reps },
      ),
    )
    .toBe(true);
}

test.beforeEach(async ({ page }) => {
  await openFreshApp(page);
});

test('起動してホームが表示される', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'メニューを開く' })).toBeVisible();
  await expect(page.getByRole('button', { name: '今日の日付へ移動' })).toBeVisible();
  await expect(page.getByRole('button', { name: '種目を選んで開始' })).toBeVisible();
});

test('トレーニング開始からセット入力まででき、リロード後も残る', async ({ page }) => {
  await startExercise(page);
  await fillFirstSet(page, '60', '10');

  await page.getByRole('button', { name: '戻る' }).click();
  const exerciseCard = page.locator('.exercise-card').filter({ hasText: exerciseName });
  await expect(page.getByRole('button', { name: `${exerciseName}の詳細を開く` })).toBeAttached();
  await expect(exerciseCard.locator('td.weight').first()).toContainText('60.0');
  await expect(exerciseCard.locator('td.reps').first()).toContainText('10');

  await page.reload();
  const reloadedExerciseCard = page.locator('.exercise-card').filter({ hasText: exerciseName });
  await expect(reloadedExerciseCard).toBeVisible();
  await expect(reloadedExerciseCard.locator('td.weight').first()).toContainText('60.0');
  await expect(reloadedExerciseCard.locator('td.reps').first()).toContainText('10');
});

test('狭い幅でカレンダー、ドロワー、FAB を操作できる', async ({ page }) => {
  await page.getByRole('button', { name: 'カレンダーの週表示と月表示を切り替え' }).click();
  await expect(page.getByRole('button', { name: 'カレンダーを閉じる' })).toBeVisible();
  await page.getByRole('button', { name: 'カレンダーを閉じる' }).click();
  await expect(page.getByRole('button', { name: 'カレンダーを閉じる' })).toBeHidden();

  await page.getByRole('button', { name: 'メニューを開く' }).click();
  await expect(page.getByRole('dialog', { name: 'メニュー' })).toBeVisible();
  await expect(page.getByRole('button', { name: '設定' })).toBeVisible();
  await page.getByRole('button', { name: '閉じる' }).click();
  await expect(page.getByRole('dialog', { name: 'メニュー' })).toBeHidden();

  await startExercise(page);
  await page.getByRole('button', { name: '戻る' }).click();
  await expect(page.getByRole('button', { name: '種目を追加' })).toBeVisible();
  await page.getByRole('button', { name: '種目を追加' }).click();
  await expect(page.getByText('種目を選択')).toBeVisible();
});

test('設定のデータ管理とバックアップ導線が表示できる', async ({ page }) => {
  await page.getByRole('button', { name: 'メニューを開く' }).click();
  await page.getByRole('button', { name: '設定' }).click();
  await expect(page.getByText('設定')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'データ管理' })).toBeVisible();

  await page.getByRole('button', { name: 'バックアップ' }).click();
  await expect(page.getByText('バックアップ').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ローカルバックアップ' })).toBeVisible();
  await expect(page.getByRole('button', { name: '記録を書き出す' })).toBeVisible();
  await expect(page.getByRole('button', { name: '記録を読み込む' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'クラウドバックアップ' })).toBeVisible();
});

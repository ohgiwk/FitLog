import { expect, test, type Page } from '@playwright/test';

const appPath = '/FitLog/';
const exerciseName = 'ベンチプレス';
const secondExerciseName = 'スクワット';
const storeKey = 'fit-log-v2';

async function openFreshApp(page: Page) {
  await page.goto(appPath);
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'トレーニングを開始' })).toBeVisible();
}

async function startExercise(page: Page, name = exerciseName) {
  await page.getByRole('button', { name: '種目を選んで開始' }).click();
  await expect(page.getByText('種目を選択')).toBeVisible();
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page.getByText(name).first()).toBeVisible();
}

async function fillFirstSet(page: Page, weight: string, reps: string, name = exerciseName) {
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
        { key: storeKey, exercise: name, weight, reps },
      ),
    )
    .toBe(true);
}

async function createRecordedWorkout(page: Page, weight = '60', reps = '10') {
  await startExercise(page);
  await fillFirstSet(page, weight, reps);
}

async function openDrawer(page: Page) {
  await page.getByRole('button', { name: 'メニューを開く' }).click();
  await expect(page.getByRole('dialog', { name: 'メニュー' })).toBeVisible();
}

async function openSettings(page: Page) {
  await openDrawer(page);
  await page.getByRole('button', { name: '設定' }).click();
  await expect(page.getByText('設定')).toBeVisible();
}

async function openBackupScreen(page: Page) {
  await openSettings(page);
  await page.getByRole('button', { name: 'バックアップ' }).click();
  await expect(page.getByRole('heading', { name: 'ローカルバックアップ' })).toBeVisible();
}

async function expectHomeWorkoutValue(page: Page, name: string, weight: string, reps: string) {
  const exerciseCard = page.locator('.exercise-card').filter({ hasText: name });
  await expect(exerciseCard).toBeVisible();
  await expect(exerciseCard.locator('td.weight').first()).toContainText(weight);
  await expect(exerciseCard.locator('td.reps').first()).toContainText(reps);
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
  await openSettings(page);
  await expect(page.getByRole('heading', { name: 'データ管理' })).toBeVisible();

  await page.getByRole('button', { name: 'バックアップ' }).click();
  await expect(page.getByText('バックアップ').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ローカルバックアップ' })).toBeVisible();
  await expect(page.getByRole('button', { name: '記録を書き出す' })).toBeVisible();
  await expect(page.getByRole('button', { name: '記録を読み込む' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'クラウドバックアップ' })).toBeVisible();
});

test('JSONバックアップを書き出して復元できる', async ({ page }) => {
  await createRecordedWorkout(page, '62.5', '8');
  await page.getByRole('button', { name: '戻る' }).click();

  await openBackupScreen(page);
  const exportDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '記録を書き出す' }).click();
  const exportDownload = await exportDownloadPromise;
  const exportPath = await exportDownload.path();
  if (!exportPath) throw new Error('バックアップファイルの保存先を取得できませんでした');

  await page.getByRole('button', { name: '戻る' }).click();
  await page.getByRole('button', { name: '戻る' }).click();
  await page.getByRole('button', { name: `${exerciseName}を削除` }).click();
  await expect(page.getByRole('dialog', { name: '記録を削除しますか？' })).toBeVisible();
  await page
    .getByRole('dialog', { name: '記録を削除しますか？' })
    .getByRole('button', { name: '削除' })
    .click();
  await expect(page.locator('.exercise-card').filter({ hasText: exerciseName })).toHaveCount(0);

  await openBackupScreen(page);
  await page.locator('input[type="file"]').setInputFiles(exportPath);
  await expect(page.getByRole('dialog', { name: '記録を読み込みますか？' })).toBeVisible();
  const beforeImportDownloadPromise = page.waitForEvent('download');
  await page
    .getByRole('dialog', { name: '記録を読み込みますか？' })
    .getByRole('button', { name: '読み込む' })
    .click();
  await beforeImportDownloadPromise;

  await expect
    .poll(async () =>
      page.evaluate(
        ({ key, exercise }) => {
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
              workout.sets?.some((set) => set.weight === 62.5 && set.recordValue === 8),
          );
        },
        { key: storeKey, exercise: exerciseName },
      ),
    )
    .toBe(true);
  await page.reload();
  await expectHomeWorkoutValue(page, exerciseName, '62.5', '8');
});

test('トレーニングを終了して再開できる', async ({ page }) => {
  await createRecordedWorkout(page);
  await page.getByRole('button', { name: '戻る' }).click();
  await page.getByRole('button', { name: 'トレーニングを終了' }).click();

  await expect(page.getByRole('dialog', { name: 'お疲れ様でした！' })).toBeVisible();
  await expect(page.getByText('合計セット数')).toBeVisible();
  await page.getByRole('button', { name: '閉じる' }).click();
  await expect(page.getByRole('button', { name: 'トレーニング結果を見る' })).toBeVisible();

  await page.getByRole('button', { name: `${exerciseName}の詳細を開く` }).click();
  await expect(page.locator('.detail-table input').first()).not.toBeEditable();
  await page.getByRole('button', { name: '戻る' }).click();

  await page.getByRole('button', { name: '再開' }).click();
  await page.getByRole('button', { name: `${exerciseName}の詳細を開く` }).click();
  await expect(page.locator('.detail-table input').first()).toBeEditable();
});

test('入力した記録が履歴と分析に反映される', async ({ page }) => {
  await createRecordedWorkout(page, '70', '5');

  await page.getByRole('button', { name: '履歴' }).click();
  await expect(page.getByRole('region', { name: 'ベスト記録' })).toBeVisible();
  await expect(page.getByText('MAX 1RM')).toBeVisible();
  await expect(page.getByText('最大重量')).toBeVisible();
  await expect(page.locator('.history-card').filter({ hasText: '70.0' })).toBeVisible();

  await page.getByRole('button', { name: '成長グラフを開く' }).click();
  await expect(page.getByRole('heading', { name: '成長グラフ' })).toBeVisible();
  await expect(page.getByText(exerciseName).first()).toBeVisible();

  await page.getByRole('button', { name: '分析メニューへ戻る' }).click();
  await page.getByRole('button', { name: '自己ベスト' }).click();
  await expect(page.getByRole('heading', { name: '自己ベスト' })).toBeVisible();
  await expect(page.getByLabel('自己ベスト一覧')).toContainText(exerciseName);

  await page.getByRole('button', { name: '分析メニューへ戻る' }).click();
  await page.getByRole('button', { name: '実施回数' }).click();
  await expect(page.getByRole('heading', { name: '実施回数' })).toBeVisible();
  await expect(page.getByRole('img', { name: `胸 ${exerciseName} 1回` })).toBeVisible();
});

test('種目を追加、編集、削除できる', async ({ page }) => {
  const createdExerciseName = 'E2Eプレス';
  const updatedExerciseName = 'E2Eプレス改';

  await openSettings(page);
  await page.getByRole('button', { name: '種目を編集' }).click();
  await expect(page.getByText('種目一覧を編集')).toBeVisible();
  await page.getByRole('button', { name: '胸に種目を追加' }).click();

  await expect(page.getByText('種目を追加')).toBeVisible();
  await page.getByLabel('種目名').fill(createdExerciseName);
  await page.getByRole('button', { name: '追加' }).click();
  await expect(
    page.locator('.exercise-option.edit-row').filter({ hasText: createdExerciseName }),
  ).toBeVisible();

  const createdRow = page
    .locator('.exercise-option.edit-row')
    .filter({ hasText: createdExerciseName });
  await createdRow.getByRole('button', { name: '種目を編集' }).click();
  await page.getByLabel('種目名').fill(updatedExerciseName);
  await page.getByRole('button', { name: '保存' }).click();
  await expect(
    page.locator('.exercise-option.edit-row').filter({ hasText: updatedExerciseName }),
  ).toBeVisible();

  const updatedRow = page
    .locator('.exercise-option.edit-row')
    .filter({ hasText: updatedExerciseName });
  await updatedRow.getByRole('button', { name: '種目を削除' }).click();
  await expect(
    page.locator('.exercise-option.edit-row').filter({ hasText: updatedExerciseName }),
  ).toHaveCount(0);
});

test('トレーニングメニューを作成して開始できる', async ({ page }) => {
  const menuName = 'E2Eメニュー';

  await openDrawer(page);
  await page.getByRole('button', { name: 'トレーニングメニュー', exact: true }).click();
  await expect(page.getByText('トレーニングメニュー').first()).toBeVisible();
  await page.getByRole('button', { name: 'トレーニングメニューを追加' }).click();

  await expect(page.getByText('メニュー編集')).toBeVisible();
  await page.getByLabel('メニュー名').fill(menuName);
  await page.getByRole('button', { name: '種目を選択' }).click();
  await page.getByRole('button', { name: exerciseName, exact: true }).click();
  await page.getByRole('tab', { name: '脚' }).click();
  await page.getByRole('button', { name: secondExerciseName, exact: true }).click();
  await page.getByRole('button', { name: '完了' }).click();
  await expect(page.locator('small').filter({ hasText: '2種目選択中' })).toBeVisible();
  await page.getByRole('button', { name: '保存' }).click();

  await expect(page.locator('.preset-plan-row').filter({ hasText: menuName })).toContainText(
    '2種目',
  );
  await page.getByRole('button', { name: '戻る' }).click();
  await page.getByLabel('トレーニングメニューを選択').selectOption({ label: menuName });
  await page.getByRole('button', { name: 'トレーニングメニューから開始' }).click();

  await expect(page.locator('.exercise-card').filter({ hasText: exerciseName })).toBeVisible();
  await expect(
    page.locator('.exercise-card').filter({ hasText: secondExerciseName }),
  ).toBeVisible();
});

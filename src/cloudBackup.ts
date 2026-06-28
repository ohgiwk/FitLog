import { Session, User } from '@supabase/supabase-js';
import { getDeviceId } from './device';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { State } from './types';
import { uid } from './utils';

export type CloudBackup = {
  id: string;
  createdAt: string;
  deviceId: string | null;
  exerciseCount: number;
  workoutCount: number;
  lastWorkoutDate: string | null;
};

type CloudBackupRow = {
  id: string;
  device_id: string | null;
  state_json: State;
  state_schema_version: number;
  created_at: string;
};

/**
 * Supabaseが利用可能な状態かを返す
 */
export function cloudBackupAvailable() {
  return isSupabaseConfigured();
}

/**
 * 現在の認証セッションを取得する
 */
export async function getCloudSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * 認証状態の変更を購読する
 */
export function onCloudAuthChange(callback: (session: Session | null) => void) {
  const supabase = getSupabaseClient();
  if (!supabase) return () => undefined;
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}

/**
 * メールアドレスとパスワードで新規登録する
 */
export async function signUpWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
}

/**
 * メールアドレスとパスワードでログインする
 */
export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
}

/**
 * ログアウトする。ローカルデータは削除しない
 */
export async function signOutCloud() {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * ユーザーと端末のメタデータを作成または更新する
 */
export async function ensureCloudProfile(user: User) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const deviceId = getDeviceId();
  const now = new Date().toISOString();
  const { error: profileError } = await supabase.from('profiles').upsert({
    user_id: user.id,
    updated_at: now,
  });
  if (profileError) throw profileError;
  const { error: deviceError } = await supabase.from('devices').upsert({
    id: deviceId,
    user_id: user.id,
    name: navigator.userAgent,
    platform: navigator.platform,
    last_seen_at: now,
  });
  if (deviceError) throw deviceError;
}

/**
 * Stateの概要をバックアップ一覧表示用に作る
 */
export function summarizeState(state: State) {
  const workoutDates = state.workouts.map((workout) => workout.date).sort();
  return {
    exerciseCount: state.exercises.length,
    workoutCount: state.workouts.length,
    lastWorkoutDate: workoutDates[workoutDates.length - 1] ?? null,
  };
}

/**
 * クラウドに現在のState全体を保存する
 */
export async function createCloudBackup(state: State) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured');
  const session = await getCloudSession();
  if (!session) throw new Error('Not signed in');
  await ensureCloudProfile(session.user);
  const { error } = await supabase.from('cloud_backups').insert({
    id: uid(),
    user_id: session.user.id,
    device_id: getDeviceId(),
    state_json: state,
    state_schema_version: state.schemaVersion,
  });
  if (error) throw error;
  await pruneCloudBackups(session.user.id);
}

/**
 * 最新バックアップ一覧を取得する
 */
export async function listCloudBackups(): Promise<CloudBackup[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('cloud_backups')
    .select('id, device_id, state_json, state_schema_version, created_at')
    .order('created_at', { ascending: false })
    .limit(5)
    .returns<CloudBackupRow[]>();
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    deviceId: row.device_id,
    ...summarizeState(row.state_json),
  }));
}

/**
 * 指定したバックアップのStateを取得する
 */
export async function fetchCloudBackupState(id: string): Promise<State> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('cloud_backups')
    .select('state_json')
    .eq('id', id)
    .single()
    .returns<{ state_json: State }>();
  if (error) throw error;
  return data.state_json;
}

/**
 * 指定したクラウドバックアップを削除する
 */
export async function deleteCloudBackup(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.from('cloud_backups').delete().eq('id', id);
  if (error) throw error;
}

/**
 * 最新5件だけ残し、古いバックアップを削除する
 */
async function pruneCloudBackups(userId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { data, error } = await supabase
    .from('cloud_backups')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<{ id: string }[]>();
  if (error) throw error;
  const oldIds = data.slice(5).map((backup) => backup.id);
  if (oldIds.length === 0) return;
  const { error: deleteError } = await supabase.from('cloud_backups').delete().in('id', oldIds);
  if (deleteError) throw deleteError;
}

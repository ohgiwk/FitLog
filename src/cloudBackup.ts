import { FirebaseError } from 'firebase/app';
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithCredential,
  signInWithPopup,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import {
  Firestore,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { getDeviceId } from './device';
import { getFirebaseClient, isFirebaseConfigured } from './firebaseClient';
import { State } from './types';
import { uid } from './utils';

export type CloudBackup = {
  id: string;
  source: 'account' | 'device' | 'legacy';
  createdAt: string;
  deviceId: string | null;
  deviceName: string | null;
  exerciseCount: number;
  workoutCount: number;
  lastWorkoutDate: string | null;
};

export type SignUpResult = {
  alreadyRegistered: boolean;
};

type CloudAuthOperation = 'signUp' | 'signIn' | 'googleSignIn' | 'passwordReset';

const authRequestTimeoutMs = 15_000;

/**
 * WebView 上で認証通信が完了しない場合も画面を待機状態のままにしない
 */
function withAuthTimeout<T>(request: Promise<T>) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      const error = new Error('Authentication request timed out') as Error & { code: string };
      error.code = 'auth/request-timeout';
      reject(error);
    }, authRequestTimeoutMs);
    request.then(resolve, reject).finally(() => window.clearTimeout(timeoutId));
  });
}

type CloudBackupRow = {
  id: string;
  deviceId: string | null;
  stateJson: State;
  stateSchemaVersion: number;
  createdAt: string;
};

type DeviceBackupRow = {
  name?: string;
  stateJson?: State;
  stateSchemaVersion?: number;
  backupUpdatedAt?: string;
};

function isUserAlreadyRegisteredError(error: unknown) {
  return error instanceof FirebaseError && error.code === 'auth/email-already-in-use';
}

/**
 * Firebase Authentication のエラーを操作内容に合わせた案内へ変換する
 */
export function cloudAuthErrorMessage(error: unknown, operation: CloudAuthOperation) {
  const code =
    error instanceof FirebaseError
      ? error.code
      : typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : '';

  if (code === 'auth/invalid-email') return 'メールアドレスの形式を確認してください';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'メールアドレスまたはパスワードが正しくありません';
  }
  if (code === 'auth/user-disabled') return 'このアカウントは無効になっています';
  if (code === 'auth/too-many-requests') {
    return '試行回数が多すぎます。時間をおいて再度お試しください';
  }
  if (code === 'auth/network-request-failed') {
    return '通信に失敗しました。インターネット接続を確認してください';
  }
  if (code === 'auth/request-timeout') {
    return '認証サーバーから応答がありません。通信環境を確認して再度お試しください';
  }
  if (code === 'auth/operation-not-allowed') {
    return operation === 'googleSignIn'
      ? 'Googleログインが有効になっていません'
      : 'メールアドレス認証が有効になっていません';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'SIGN_IN_CANCELLED') {
    return 'Googleログインをキャンセルしました';
  }
  if (code === 'auth/weak-password') return 'より安全なパスワードを設定してください';

  if (operation === 'signUp') return '新規登録に失敗しました';
  if (operation === 'signIn') return 'ログインに失敗しました';
  if (operation === 'googleSignIn') return 'Googleログインに失敗しました';
  return 'パスワード再設定メールの送信に失敗しました';
}

/**
 * Firestore のエラーをバックアップ画面向けの案内へ変換する
 */
export function cloudBackupErrorMessage(error: unknown) {
  const code =
    error instanceof FirebaseError
      ? error.code
      : typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : '';
  const message = error instanceof Error ? error.message : '';

  if (code === 'permission-denied' || message.includes('Missing or insufficient permissions')) {
    return 'Firestoreの権限設定を確認してください';
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return 'クラウドへ接続できませんでした。通信環境を確認して再度お試しください';
  }
  if (code === 'resource-exhausted') {
    return 'クラウドの利用上限に達しています';
  }
  if (message.includes('Unsupported field value')) return '保存データの形式を確認してください';
  const detail = code || message || 'unknown';
  return `クラウドバックアップに失敗しました（${detail.slice(0, 120)}）`;
}

type CloudSession = {
  user: User;
};

function requireFirebaseClient() {
  const client = getFirebaseClient();
  if (!client) throw new Error('Firebase is not configured');
  return client;
}

function getUserDocPath(userId: string) {
  return ['users', userId] as const;
}

function getUserBackupsPath(userId: string) {
  return ['users', userId, 'backups'] as const;
}

function getUserDevicesPath(userId: string) {
  return ['users', userId, 'devices'] as const;
}

/**
 * Firebaseが利用可能な状態かを返す
 */
export function cloudBackupAvailable() {
  return isFirebaseConfigured();
}

/**
 * 現在の認証セッションを取得する
 */
export async function getCloudSession(): Promise<CloudSession | null> {
  const client = getFirebaseClient();
  if (!client) return null;
  await client.auth.authStateReady();
  return client.auth.currentUser ? { user: client.auth.currentUser } : null;
}

/**
 * 認証状態の変更を購読する
 */
export function onCloudAuthChange(callback: (session: CloudSession | null) => void) {
  const client = getFirebaseClient();
  if (!client) return () => undefined;
  return onAuthStateChanged(client.auth, (user) => callback(user ? { user } : null));
}

/**
 * メールアドレスとパスワードで新規登録する
 */
export async function signUpWithPassword(email: string, password: string) {
  const { auth } = requireFirebaseClient();
  try {
    const result = await withAuthTimeout(createUserWithEmailAndPassword(auth, email, password));
    await withAuthTimeout(sendEmailVerification(result.user));
  } catch (error) {
    if (isUserAlreadyRegisteredError(error)) return { alreadyRegistered: true };
    throw error;
  }
  return { alreadyRegistered: false };
}

/**
 * メールアドレスとパスワードでログインする
 */
export async function signInWithPassword(email: string, password: string) {
  const { auth } = requireFirebaseClient();
  await withAuthTimeout(signInWithEmailAndPassword(auth, email, password));
}

/**
 * WebまたはiOSのGoogleアカウントでFirebaseへログインする
 */
export async function signInWithGoogle() {
  const { auth } = requireFirebaseClient();
  if (!Capacitor.isNativePlatform()) {
    await withAuthTimeout(signInWithPopup(auth, new GoogleAuthProvider()));
    return;
  }
  const clientId =
    typeof import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID === 'string'
      ? import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID
      : '';
  if (!clientId) {
    const error = new Error('Google web client ID is not configured') as Error & { code: string };
    error.code = 'auth/operation-not-allowed';
    throw error;
  }
  await GoogleSignIn.initialize({ clientId });
  const result = await GoogleSignIn.signIn();
  const credential = GoogleAuthProvider.credential(result.idToken);
  await withAuthTimeout(signInWithCredential(auth, credential));
}

/**
 * ログイン中ユーザーのパスワードを変更する
 */
export async function updateCloudPassword(password: string) {
  const { auth } = requireFirebaseClient();
  if (!auth.currentUser) throw new Error('Not signed in');
  await updatePassword(auth.currentUser, password);
}

/**
 * パスワード再設定メールを送信する
 */
export async function sendCloudPasswordReset(email: string) {
  const { auth } = requireFirebaseClient();
  await withAuthTimeout(sendPasswordResetEmail(auth, email));
}

/**
 * ログアウトする。ローカルデータは削除しない
 */
export async function signOutCloud() {
  const client = getFirebaseClient();
  if (!client) return;
  await signOut(client.auth);
  if (Capacitor.isNativePlatform()) {
    await GoogleSignIn.signOut().catch(() => undefined);
  }
}

/**
 * ユーザーと端末のメタデータを作成または更新する
 */
export async function ensureCloudProfile(user: User) {
  const client = getFirebaseClient();
  if (!client) return;
  const deviceId = getDeviceId();
  const now = new Date().toISOString();
  await setDoc(
    doc(client.db, ...getUserDocPath(user.uid)),
    {
      email: user.email ?? null,
      updatedAt: now,
    },
    { merge: true },
  );
  await setDoc(
    doc(client.db, ...getUserDevicesPath(user.uid), deviceId),
    {
      name: navigator.userAgent,
      platform: navigator.platform,
      lastSeenAt: now,
    },
    { merge: true },
  );
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
  const { db } = requireFirebaseClient();
  const session = await getCloudSession();
  if (!session) throw new Error('Not signed in');
  await ensureCloudProfile(session.user);
  const backupId = uid();
  const now = new Date().toISOString();
  await setDoc(doc(db, ...getUserBackupsPath(session.user.uid), backupId), {
    deviceId: getDeviceId(),
    stateJson: state,
    stateSchemaVersion: state.schemaVersion,
    createdAt: now,
  });
  await pruneCloudBackups(session.user.uid);
}

/**
 * アカウント共通の固定ドキュメントへ最新版を上書き保存する
 */
export async function saveAccountCloudBackup(state: State) {
  const { db } = requireFirebaseClient();
  const session = await getCloudSession();
  if (!session) throw new Error('Not signed in');
  const now = new Date().toISOString();
  await setDoc(
    doc(db, ...getUserBackupsPath(session.user.uid), 'current'),
    {
      deviceId: getDeviceId(),
      stateJson: state,
      stateSchemaVersion: state.schemaVersion,
      createdAt: now,
    },
  );
  await setDoc(
    doc(db, ...getUserDocPath(session.user.uid)),
    { email: session.user.email ?? null, updatedAt: now },
    { merge: true },
  );
  return now;
}

/**
 * 最新バックアップ一覧を取得する
 */
export async function listCloudBackups(): Promise<CloudBackup[]> {
  const client = getFirebaseClient();
  if (!client) return [];
  const session = await getCloudSession();
  if (!session) return [];
  const [legacySnapshot, deviceSnapshot] = await Promise.all([
    getDocs(
    query(
      collection(client.db, ...getUserBackupsPath(session.user.uid)),
      orderBy('createdAt', 'desc'),
      limit(5),
    )),
    getDocs(collection(client.db, ...getUserDevicesPath(session.user.uid))),
  ]);
  const accountBackups = legacySnapshot.docs.flatMap((backupDoc) => {
    const row = { id: backupDoc.id, ...backupDoc.data() } as CloudBackupRow;
    if (row.id !== 'current') return [];
    return {
      id: row.id,
      source: 'account' as const,
      createdAt: row.createdAt,
      deviceId: row.deviceId,
      deviceName: null,
      ...summarizeState(row.stateJson),
    };
  });
  const legacyBackups = legacySnapshot.docs.flatMap((backupDoc) => {
    const row = { id: backupDoc.id, ...backupDoc.data() } as CloudBackupRow;
    if (row.id === 'current') return [];
    return [{
      id: row.id,
      source: 'legacy' as const,
      createdAt: row.createdAt,
      deviceId: row.deviceId,
      deviceName: null,
      ...summarizeState(row.stateJson),
    }];
  });
  const deviceBackups = deviceSnapshot.docs.flatMap((deviceDoc) => {
    const row = deviceDoc.data() as DeviceBackupRow;
    if (!row.stateJson || !row.backupUpdatedAt) return [];
    return [{
      id: deviceDoc.id,
      source: 'device' as const,
      createdAt: row.backupUpdatedAt,
      deviceId: deviceDoc.id,
      deviceName: row.name ?? null,
      ...summarizeState(row.stateJson),
    }];
  });
  return [...accountBackups, ...deviceBackups, ...legacyBackups].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

/**
 * 指定したバックアップのStateを取得する
 */
export async function fetchCloudBackupState(id: string, source: CloudBackup['source'] = 'legacy'): Promise<State> {
  const { db } = requireFirebaseClient();
  const session = await getCloudSession();
  if (!session) throw new Error('Not signed in');
  const backupRef = source === 'device'
    ? doc(db, ...getUserDevicesPath(session.user.uid), id)
    : doc(db, ...getUserBackupsPath(session.user.uid), id);
  const backupSnapshot = await getDoc(backupRef);
  if (!backupSnapshot.exists()) throw new Error('Backup not found');
  const row = backupSnapshot.data() as CloudBackupRow | DeviceBackupRow;
  if (!row.stateJson) throw new Error('Backup not found');
  return row.stateJson;
}

/**
 * 指定したクラウドバックアップを削除する
 */
export async function deleteCloudBackup(id: string, source: CloudBackup['source'] = 'legacy') {
  const { db } = requireFirebaseClient();
  const session = await getCloudSession();
  if (!session) throw new Error('Not signed in');
  const backupRef = source === 'device'
    ? doc(db, ...getUserDevicesPath(session.user.uid), id)
    : doc(db, ...getUserBackupsPath(session.user.uid), id);
  await deleteDoc(backupRef);
}

/**
 * ログイン中のクラウドアカウントを削除する。ローカルデータは削除しない
 */
export async function deleteCloudAccount() {
  const { auth, db } = requireFirebaseClient();
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  await deleteUserCloudData(db, user.uid);
  await deleteUser(user);
}

/**
 * 最新5件だけ残し、古いバックアップを削除する
 */
async function pruneCloudBackups(userId: string) {
  const { db } = requireFirebaseClient();
  const snapshot = await getDocs(
    query(collection(db, ...getUserBackupsPath(userId)), orderBy('createdAt', 'desc')),
  );
  const oldDocs = snapshot.docs.slice(5);
  if (oldDocs.length === 0) return;
  const batch = writeBatch(db);
  oldDocs.forEach((backupDoc) => batch.delete(backupDoc.ref));
  await batch.commit();
}

/**
 * ユーザー配下のクラウドデータを削除する
 */
async function deleteUserCloudData(db: Firestore, userId: string) {
  const batch = writeBatch(db);
  const backupSnapshot = await getDocs(collection(db, ...getUserBackupsPath(userId)));
  backupSnapshot.docs.forEach((backupDoc) => batch.delete(backupDoc.ref));
  const deviceSnapshot = await getDocs(collection(db, ...getUserDevicesPath(userId)));
  deviceSnapshot.docs.forEach((deviceDoc) => batch.delete(deviceDoc.ref));
  batch.delete(doc(db, ...getUserDocPath(userId)));
  await batch.commit();
}

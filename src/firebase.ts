import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  collection,
  getDocs,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { AvatarProfile, MouthCalibration } from './data/avatars';
import {
  type UserMedicalProfile,
  DEFAULT_USER_MEDICAL_PROFILE,
  saveLocalMedicalProfile,
} from './data/medicalEncyclopedia';
import type { VoiceToneProfile } from './data/voiceTones';

// Silence internal Firestore WebChannel timeout warnings in iframe/proxy environments
try {
  setLogLevel('silent');
} catch {
  // ignore
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = (() => {
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
})();
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function isOfflineFirestoreError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes('client is offline') ||
    msg.includes('could not reach cloud firestore backend') ||
    msg.includes('unavailable') ||
    msg.includes('network-request-failed')
  );
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  if (!isOfflineFirestoreError(error)) {
    console.warn('Firestore Error: ', JSON.stringify(errInfo));
  }
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot without triggering fatal console.error on transient offline states
async function testConnection() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is operating in offline fallback mode.');
    }
  }
}
void testConnection();

export async function signInWithGooglePopup(): Promise<User | null> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebaseUser(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged, type User };

export interface CloudUserProfileData {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  activeTab?: 'chat' | 'whatsapp' | 'tiktok' | 'script' | 'scheduler' | 'medical' | 'voice_clone';
  selectedAvatarId?: string;
  linkedTikTokUsername?: string;
  whatsAppPhone?: string;
  mouthCalibrationJson?: string;
  medicalProfileJson?: string;
  role: 'user' | 'admin';
  updatedAt: string;
}

export async function saveUserProfileToCloud(
  user: User,
  prefs: {
    activeTab?: 'chat' | 'whatsapp' | 'tiktok' | 'script' | 'scheduler' | 'medical' | 'voice_clone';
    selectedAvatarId?: string;
    linkedTikTokUsername?: string;
    whatsAppPhone?: string;
    mouthCalibration?: MouthCalibration;
    medicalProfile?: UserMedicalProfile;
  }
): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const existingSnap = await getDoc(doc(db, 'users', user.uid));
    const existingRole =
      existingSnap.exists() && existingSnap.data()?.role === 'admin' ? 'admin' : 'user';

    const payload: CloudUserProfileData = {
      uid: user.uid,
      displayName: (user.displayName || 'مستخدم استوديو قيس').slice(0, 120),
      email: (user.email || '').slice(0, 254),
      photoURL: (user.photoURL || '').slice(0, 2048),
      activeTab: prefs.activeTab || 'chat',
      selectedAvatarId: (prefs.selectedAvatarId || 'ahlam-live').slice(0, 120),
      linkedTikTokUsername: (prefs.linkedTikTokUsername || '@sa_12sa_12').slice(0, 100),
      whatsAppPhone: (prefs.whatsAppPhone || '00967737109011').slice(0, 40),
      mouthCalibrationJson: prefs.mouthCalibration
        ? JSON.stringify(prefs.mouthCalibration).slice(0, 2000)
        : '',
      ...(prefs.medicalProfile
        ? { medicalProfileJson: JSON.stringify(prefs.medicalProfile).slice(0, 15000) }
        : {}),
      role: existingRole,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', user.uid), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadUserProfileFromCloud(
  uid: string
): Promise<CloudUserProfileData | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as CloudUserProfileData;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Cloud sync function that automatically updates the user's saved medical profile in Firestore
 * whenever they edit their information in the app, ensuring their health data is accessible across devices.
 */
export async function syncMedicalProfileToCloud(
  profile: UserMedicalProfile,
  explicitUid?: string
): Promise<{ syncedToCloud: boolean; updatedAt: string }> {
  const updatedLocal = saveLocalMedicalProfile(profile);
  const targetUid = explicitUid || auth.currentUser?.uid;

  if (!targetUid) {
    return { syncedToCloud: false, updatedAt: updatedLocal.updatedAt };
  }

  const docPath = `users/${targetUid}/medicalProfile/main`;
  try {
    const cleanPayload = {
      ownerUid: targetUid,
      fullName: String(updatedLocal.fullName || '').slice(0, 150),
      age:
        typeof updatedLocal.age === 'number' && !isNaN(updatedLocal.age)
          ? Math.max(0, Math.min(130, updatedLocal.age))
          : 0,
      gender: String(updatedLocal.gender || ''),
      bloodType: String(updatedLocal.bloodType || 'غير محدد').slice(0, 20),
      weightKg:
        typeof updatedLocal.weightKg === 'number' && !isNaN(updatedLocal.weightKg)
          ? Math.max(0, Math.min(400, updatedLocal.weightKg))
          : 0,
      heightCm:
        typeof updatedLocal.heightCm === 'number' && !isNaN(updatedLocal.heightCm)
          ? Math.max(0, Math.min(260, updatedLocal.heightCm))
          : 0,
      allergies: (updatedLocal.allergies || []).slice(0, 50).map((s) => String(s).slice(0, 120)),
      chronicConditions: (updatedLocal.chronicConditions || [])
        .slice(0, 50)
        .map((s) => String(s).slice(0, 120)),
      currentMedications: (updatedLocal.currentMedications || [])
        .slice(0, 50)
        .map((s) => String(s).slice(0, 120)),
      pastSurgeries: (updatedLocal.pastSurgeries || [])
        .slice(0, 50)
        .map((s) => String(s).slice(0, 120)),
      familyHistory: (updatedLocal.familyHistory || [])
        .slice(0, 50)
        .map((s) => String(s).slice(0, 120)),
      bloodPressureBaseline: String(updatedLocal.bloodPressureBaseline || '120/80').slice(0, 40),
      fastingGlucoseBaseline: String(updatedLocal.fastingGlucoseBaseline || '90').slice(0, 40),
      smokingStatus: ['never', 'former', 'current'].includes(updatedLocal.smokingStatus)
        ? updatedLocal.smokingStatus
        : 'never',
      emergencyContactName: String(updatedLocal.emergencyContactName || '').slice(0, 150),
      emergencyContactPhone: String(updatedLocal.emergencyContactPhone || '').slice(0, 50),
      medicalNotes: String(updatedLocal.medicalNotes || '').slice(0, 4000),
      updatedAt: updatedLocal.updatedAt,
    };

    await setDoc(doc(db, 'users', targetUid, 'medicalProfile', 'main'), cleanPayload, {
      merge: true,
    });

    if (auth.currentUser && auth.currentUser.uid === targetUid) {
      await setDoc(
        doc(db, 'users', targetUid),
        {
          uid: targetUid,
          role: 'user',
          medicalProfileJson: JSON.stringify(updatedLocal).slice(0, 15000),
          updatedAt: updatedLocal.updatedAt,
        },
        { merge: true }
      );
    }

    return { syncedToCloud: true, updatedAt: updatedLocal.updatedAt };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function loadMedicalProfileFromCloud(
  uid: string
): Promise<UserMedicalProfile | null> {
  const docPath = `users/${uid}/medicalProfile/main`;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'medicalProfile', 'main'));
    if (!snap.exists()) return null;
    const d = snap.data();
    const profile: UserMedicalProfile = {
      ...DEFAULT_USER_MEDICAL_PROFILE,
      fullName: d.fullName || '',
      age: d.age ? Number(d.age) : '',
      gender: d.gender === 'male' || d.gender === 'female' ? d.gender : '',
      bloodType: d.bloodType || 'غير محدد',
      weightKg: d.weightKg ? Number(d.weightKg) : '',
      heightCm: d.heightCm ? Number(d.heightCm) : '',
      allergies: Array.isArray(d.allergies) ? d.allergies : [],
      chronicConditions: Array.isArray(d.chronicConditions) ? d.chronicConditions : [],
      currentMedications: Array.isArray(d.currentMedications) ? d.currentMedications : [],
      pastSurgeries: Array.isArray(d.pastSurgeries) ? d.pastSurgeries : [],
      familyHistory: Array.isArray(d.familyHistory) ? d.familyHistory : [],
      bloodPressureBaseline: d.bloodPressureBaseline || '120/80',
      fastingGlucoseBaseline: d.fastingGlucoseBaseline || '90',
      smokingStatus: d.smokingStatus || 'never',
      emergencyContactName: d.emergencyContactName || '',
      emergencyContactPhone: d.emergencyContactPhone || '',
      medicalNotes: d.medicalNotes || '',
      updatedAt: d.updatedAt || new Date().toISOString(),
    };
    saveLocalMedicalProfile(profile);
    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

export function subscribeToMedicalProfileInCloud(
  uid: string,
  onProfileUpdate: (profile: UserMedicalProfile) => void
): Unsubscribe {
  const docPath = `users/${uid}/medicalProfile/main`;
  return onSnapshot(
    doc(db, 'users', uid, 'medicalProfile', 'main'),
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      const profile: UserMedicalProfile = {
        ...DEFAULT_USER_MEDICAL_PROFILE,
        fullName: d.fullName || '',
        age: d.age ? Number(d.age) : '',
        gender: d.gender === 'male' || d.gender === 'female' ? d.gender : '',
        bloodType: d.bloodType || 'غير محدد',
        weightKg: d.weightKg ? Number(d.weightKg) : '',
        heightCm: d.heightCm ? Number(d.heightCm) : '',
        allergies: Array.isArray(d.allergies) ? d.allergies : [],
        chronicConditions: Array.isArray(d.chronicConditions) ? d.chronicConditions : [],
        currentMedications: Array.isArray(d.currentMedications) ? d.currentMedications : [],
        pastSurgeries: Array.isArray(d.pastSurgeries) ? d.pastSurgeries : [],
        familyHistory: Array.isArray(d.familyHistory) ? d.familyHistory : [],
        bloodPressureBaseline: d.bloodPressureBaseline || '120/80',
        fastingGlucoseBaseline: d.fastingGlucoseBaseline || '90',
        smokingStatus: d.smokingStatus || 'never',
        emergencyContactName: d.emergencyContactName || '',
        emergencyContactPhone: d.emergencyContactPhone || '',
        medicalNotes: d.medicalNotes || '',
        updatedAt: d.updatedAt || new Date().toISOString(),
      };
      saveLocalMedicalProfile(profile);
      onProfileUpdate(profile);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, docPath);
      } catch {
        // logged by handleFirestoreError
      }
    }
  );
}

export async function saveClonedVoiceToCloud(
  uid: string,
  profile: VoiceToneProfile,
  metrics?: {
    fundamentalHz?: number;
    spectralCentroidHz?: number;
    roughness?: number;
    echo?: number;
  }
): Promise<void> {
  const path = `users/${uid}/clonedVoices/${profile.id}`;
  try {
    const payload = {
      id: profile.id.slice(0, 120),
      ownerUid: uid,
      name: profile.name.slice(0, 120),
      gender: profile.gender === 'male' ? 'male' : 'female',
      geminiVoice: String(profile.geminiVoice || 'Aoede').slice(0, 60),
      defaultPitch: typeof profile.defaultPitch === 'number' ? profile.defaultPitch : 1.0,
      defaultRate: typeof profile.defaultRate === 'number' ? profile.defaultRate : 1.0,
      fundamentalHz: metrics?.fundamentalHz ?? 185,
      spectralCentroidHz: metrics?.spectralCentroidHz ?? 1650,
      roughness: metrics?.roughness ?? 0,
      echo: metrics?.echo ?? 0,
      profileJson: JSON.stringify(profile).slice(0, 25000),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', uid, 'clonedVoices', profile.id), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadClonedVoicesFromCloud(uid: string): Promise<VoiceToneProfile[]> {
  const path = `users/${uid}/clonedVoices`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'clonedVoices'));
    const list: VoiceToneProfile[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d?.profileJson) {
        try {
          const parsed = JSON.parse(d.profileJson) as VoiceToneProfile;
          if (parsed && parsed.id && parsed.name) {
            list.push(parsed);
          }
        } catch {
          // ignore malformed json
        }
      }
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteClonedVoiceFromCloud(uid: string, voiceId: string): Promise<void> {
  const path = `users/${uid}/clonedVoices/${voiceId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'clonedVoices', voiceId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveAvatarConfigToCloud(
  uid: string,
  avatar: AvatarProfile
): Promise<void> {
  const path = `users/${uid}/avatars/${avatar.id}`;
  try {
    const mc = avatar.mouthConfig;
    const payload = {
      id: avatar.id.slice(0, 120),
      ownerUid: uid,
      name: (avatar.name || 'شخصية مخصصة').slice(0, 120),
      role: (avatar.role || '').slice(0, 200),
      dialect: (avatar.dialect || 'فصحى معاصرة').slice(0, 100),
      voiceName: (avatar.voiceName || 'ahlam_soft').slice(0, 100),
      speechPitch: typeof avatar.speechPitch === 'number' ? avatar.speechPitch : 1.0,
      speechRate: typeof avatar.speechRate === 'number' ? avatar.speechRate : 1.0,
      mouthX: typeof mc?.x === 'number' ? mc.x : 50,
      mouthY: typeof mc?.y === 'number' ? mc.y : 52,
      mouthScale: typeof mc?.scale === 'number' ? mc.scale : 1.0,
      sensitivity: typeof mc?.sensitivity === 'number' ? mc.sensitivity : 1.35,
      noiseThreshold: typeof mc?.noiseThreshold === 'number' ? mc.noiseThreshold : 0.015,
      smoothing: typeof mc?.smoothing === 'number' ? mc.smoothing : 0.12,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', uid, 'avatars', avatar.id), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadSavedAvatarConfigsFromCloud(
  uid: string
): Promise<Record<string, Partial<AvatarProfile>>> {
  const path = `users/${uid}/avatars`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'avatars'));
    const map: Record<string, Partial<AvatarProfile>> = {};
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d && d.id) {
        map[d.id] = {
          id: d.id,
          name: d.name,
          role: d.role,
          dialect: d.dialect,
          voiceName: d.voiceName,
          speechPitch: d.speechPitch,
          speechRate: d.speechRate,
          mouthConfig: {
            x: typeof d.mouthX === 'number' ? d.mouthX : 50,
            y: typeof d.mouthY === 'number' ? d.mouthY : 52,
            scale: typeof d.mouthScale === 'number' ? d.mouthScale : 1.0,
            mode: 'natural-warp',
            sensitivity: typeof d.sensitivity === 'number' ? d.sensitivity : 1.35,
            noiseThreshold: typeof d.noiseThreshold === 'number' ? d.noiseThreshold : 0.015,
            smoothing: typeof d.smoothing === 'number' ? d.smoothing : 0.12,
            latencyOffsetMs: 0,
          },
        };
      }
    });
    return map;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

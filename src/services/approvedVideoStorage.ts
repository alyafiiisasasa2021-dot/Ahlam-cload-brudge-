/**
 * approvedVideoStorage.ts
 * تخزين الفيديو المعتمد الدائم في المتصفح عبر IndexedDB
 * يحفظ ملف الفيديو المرفوع ليبقى هو الفيديو المعتمد للشخصية في جميع الأوضاع وحتى بعد تحديث الصفحة
 */

import type { MouthCalibration } from '../data/avatars';

const DB_NAME = 'AhlamApprovedVideoStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'approved_video_store';
const PRIMARY_KEY = 'default_approved_video';

export interface StoredApprovedVideoRecord {
  id: string;
  videoBlob: Blob;
  fileName: string;
  mimeType: string;
  posterDataUrl: string;
  mouthConfig?: MouthCalibration;
  updatedAt: number;
}

export interface LoadedApprovedVideo {
  videoObjectUrl: string;
  fileName: string;
  mimeType: string;
  posterDataUrl: string;
  mouthConfig?: MouthCalibration;
  updatedAt: number;
}

let activeObjectUrl: string | null = null;

function openVideoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB غير مدعوم في هذا المتصفح'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * يستخرج لقطة مصغرة (Poster Frame) من الفيديو لاستخدامها كأيقونة مصغرة فقط عند الحاجة
 */
export function extractVideoPosterFrame(videoObjectUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve('');
      return;
    }
    const tempVideo = document.createElement('video');
    let resolved = false;
    const finish = (dataUrl: string) => {
      if (!resolved) {
        resolved = true;
        resolve(dataUrl);
      }
    };

    const timeout = setTimeout(() => finish(''), 3500);

    tempVideo.preload = 'metadata';
    tempVideo.src = videoObjectUrl;
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    tempVideo.currentTime = 0.15;

    tempVideo.onloadeddata = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = tempVideo.videoWidth || 480;
        canvas.height = tempVideo.videoHeight || 640;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          clearTimeout(timeout);
          finish(canvas.toDataURL('image/jpeg', 0.82));
          return;
        }
      } catch {
        // ignore
      }
      clearTimeout(timeout);
      finish('');
    };

    tempVideo.onerror = () => {
      clearTimeout(timeout);
      finish('');
    };

    tempVideo.load();
  });
}

/**
 * حفظ الفيديو الجديد في IndexedDB ليكون هو الفيديو المعتمد الدائم
 */
export async function saveApprovedVideo(
  fileOrBlob: File | Blob,
  mouthConfig?: MouthCalibration
): Promise<LoadedApprovedVideo> {
  const fileName =
    fileOrBlob instanceof File && fileOrBlob.name
      ? fileOrBlob.name
      : `approved_video_${Date.now()}.mp4`;
  const mimeType = fileOrBlob.type || 'video/mp4';

  const prevUrl = activeObjectUrl;
  const videoObjectUrl = URL.createObjectURL(fileOrBlob);
  activeObjectUrl = videoObjectUrl;
  if (prevUrl && prevUrl !== videoObjectUrl) {
    setTimeout(() => {
      try {
        URL.revokeObjectURL(prevUrl);
      } catch {
        // ignore
      }
    }, 15000);
  }

  const posterDataUrl = await extractVideoPosterFrame(videoObjectUrl);
  const updatedAt = Date.now();

  try {
    const db = await openVideoDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredApprovedVideoRecord = {
        id: PRIMARY_KEY,
        videoBlob: fileOrBlob,
        fileName,
        mimeType,
        posterDataUrl,
        mouthConfig,
        updatedAt,
      };
      store.put(record);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // Even if IndexedDB fails in private browsing, keep the in-memory object URL active
  }

  const loaded: LoadedApprovedVideo = {
    videoObjectUrl,
    fileName,
    mimeType,
    posterDataUrl,
    mouthConfig,
    updatedAt,
  };

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('approved-video-updated', { detail: { approvedVideo: loaded } })
    );
  }

  return loaded;
}

/**
 * تحميل الفيديو المعتمد المحفوظ من IndexedDB عند فتح التطبيق
 */
export async function loadApprovedVideo(): Promise<LoadedApprovedVideo | null> {
  try {
    const db = await openVideoDB();
    const record = await new Promise<StoredApprovedVideoRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(PRIMARY_KEY);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as StoredApprovedVideoRecord) || null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });

    if (!record || !record.videoBlob) {
      return null;
    }

    const prevUrl = activeObjectUrl;
    const videoObjectUrl = URL.createObjectURL(record.videoBlob);
    activeObjectUrl = videoObjectUrl;
    if (prevUrl && prevUrl !== videoObjectUrl) {
      setTimeout(() => {
        try {
          URL.revokeObjectURL(prevUrl);
        } catch {
          // ignore
        }
      }, 15000);
    }

    return {
      videoObjectUrl,
      fileName: record.fileName || 'approved_video.mp4',
      mimeType: record.mimeType || 'video/mp4',
      posterDataUrl: record.posterDataUrl || '',
      mouthConfig: record.mouthConfig,
      updatedAt: record.updatedAt || Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * إزالة الفيديو المحفوظ من IndexedDB لإضافة فيديو جديد من الصفر
 */
export async function clearApprovedVideo(): Promise<void> {
  if (activeObjectUrl) {
    try {
      URL.revokeObjectURL(activeObjectUrl);
    } catch {
      // ignore
    }
    activeObjectUrl = null;
  }

  try {
    const db = await openVideoDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(PRIMARY_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // ignore
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('approved-video-updated', { detail: { approvedVideo: null } })
    );
  }
}

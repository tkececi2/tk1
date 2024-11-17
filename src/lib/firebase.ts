import { initializeApp, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { FirebaseError } from 'firebase/app';
import toast from 'react-hot-toast';

const firebaseConfig = {
  apiKey: "AIzaSyAGLu35FxS8Z51SBdpOvoaAdqPSG0l2di4",
  authDomain: "arizalar-955b6.firebaseapp.com",
  projectId: "arizalar-955b6",
  storageBucket: "arizalar-955b6.firebasestorage.app",
  messagingSenderId: "802092171880",
  appId: "1:802092171880:web:0ab6c609e002ed22a531dd"
};

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  if (error instanceof Error && error.message.includes('already exists')) {
    app = getApp();
  } else {
    throw error;
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const handleFirestoreError = (error: unknown) => {
  console.error('Firestore Error:', error);
  
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
        toast.error('Bu işlem için yetkiniz bulunmuyor');
        break;
      case 'unavailable':
        toast.error('Sunucu bağlantısı kurulamadı. İnternet bağlantınızı kontrol edin');
        break;
      case 'not-found':
        toast.error('İstenen kayıt bulunamadı');
        break;
      case 'storage/unknown':
        toast.error('Dosya yükleme hatası. Lütfen daha sonra tekrar deneyin');
        break;
      default:
        toast.error('Bir hata oluştu: ' + error.message);
    }
  } else if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error('Beklenmeyen bir hata oluştu');
  }
};

export const handleStorageError = (error: unknown) => {
  console.error('Storage Error:', error);
  
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'storage/unauthorized':
        toast.error('Dosya yükleme yetkisi yok');
        break;
      case 'storage/canceled':
        toast.error('Dosya yükleme iptal edildi');
        break;
      case 'storage/unknown':
        toast.error('Dosya yükleme hatası. Lütfen daha sonra tekrar deneyin');
        break;
      case 'storage/quota-exceeded':
        toast.error('Depolama kotası aşıldı');
        break;
      case 'storage/invalid-checksum':
        toast.error('Dosya bozuk veya eksik');
        break;
      case 'storage/retry-limit-exceeded':
        toast.error('Yükleme zaman aşımına uğradı, lütfen tekrar deneyin');
        break;
      case 'storage/invalid-url':
        toast.error('Geçersiz dosya URL\'i');
        break;
      case 'storage/object-not-found':
        toast.error('Dosya bulunamadı');
        break;
      case 'storage/server-file-wrong-size':
        toast.error('Dosya boyutu hatalı');
        break;
      default:
        toast.error('Dosya yükleme hatası: ' + error.message);
    }
  } else if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error('Beklenmeyen bir hata oluştu');
  }
};

export default app;
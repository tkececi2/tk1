import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';

export const createAdminUser = async () => {
  const adminEmail = "admin@example.com";
  const adminPassword = "admin123";

  try {
    // Check if admin already exists
    const adminQuery = await getDoc(doc(db, 'kullanicilar', 'admin'));
    if (adminQuery.exists()) {
      return { success: true, message: 'Yönetici hesabı zaten mevcut' };
    }

    // Create admin user in Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    
    // Create admin document in Firestore
    await setDoc(doc(db, 'kullanicilar', userCredential.user.uid), {
      id: userCredential.user.uid,
      email: adminEmail,
      ad: "Admin User",
      rol: "yonetici",
      olusturmaTarihi: new Date(),
      guncellenmeTarihi: new Date(),
      fotoURL: `https://ui-avatars.com/api/?name=Admin+User&background=random`
    });

    return { success: true, message: 'Yönetici hesabı başarıyla oluşturuldu' };
  } catch (error: any) {
    console.error('Yönetici hesabı oluşturulurken hata:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      return { 
        success: false, 
        message: 'Bu e-posta adresi zaten kullanımda. Lütfen giriş yapmayı deneyin.' 
      };
    }
    
    return { 
      success: false, 
      message: 'Yönetici hesabı oluşturulurken bir hata oluştu' 
    };
  }
};
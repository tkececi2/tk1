import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { Kullanici } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  kullanici: Kullanici | null;
  loading: boolean;
  cikisYap: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  kullanici: null,
  loading: true,
  cikisYap: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [kullanici, setKullanici] = useState<Kullanici | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          const kullaniciDoc = await getDoc(doc(db, 'kullanicilar', user.uid));
          if (kullaniciDoc.exists()) {
            const userData = {
              id: kullaniciDoc.id,
              ...kullaniciDoc.data()
            } as Kullanici;
            
            setKullanici(prev => 
              JSON.stringify(prev) !== JSON.stringify(userData) ? userData : prev
            );
          } else {
            await signOut(auth);
            setKullanici(null);
            toast.error('Kullanıcı bilgileri bulunamadı');
          }
        } catch (error) {
          console.error('Kullanıcı bilgileri alınamadı:', error);
          toast.error('Kullanıcı bilgileri yüklenemedi');
          await signOut(auth);
          setKullanici(null);
        }
      } else {
        setKullanici(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const cikisYap = async () => {
    try {
      await signOut(auth);
      toast.success('Başarıyla çıkış yapıldı');
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
      toast.error('Çıkış yapılırken bir hata oluştu');
    }
  };

  return (
    <AuthContext.Provider value={{ user, kullanici, loading, cikisYap }}>
      {children}
    </AuthContext.Provider>
  );
};
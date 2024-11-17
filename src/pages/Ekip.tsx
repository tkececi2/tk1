import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Mail, Phone, Trash2, X } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import type { Kullanici } from '../types';

interface EkipFormu {
  ad: string;
  email: string;
  telefon: string;
  rol: 'tekniker' | 'muhendis' | 'yonetici';
  sifre: string;
  sifreTekrar: string;
}

export const Ekip: React.FC = () => {
  const { kullanici } = useAuth();
  const [ekipUyeleri, setEkipUyeleri] = useState<Kullanici[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [formAcik, setFormAcik] = useState(false);
  const [form, setForm] = useState<EkipFormu>({
    ad: '',
    email: '',
    telefon: '',
    rol: 'tekniker',
    sifre: '',
    sifreTekrar: ''
  });

  // Yönetici kontrolü
  const isYonetici = kullanici?.rol === 'yonetici';

  useEffect(() => {
    if (!kullanici) return;

    const ekipQuery = query(
      collection(db, 'kullanicilar'),
      orderBy('ad')
    );
    
    const unsubscribe = onSnapshot(ekipQuery, (snapshot) => {
      const ekipListesi = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }) as Kullanici)
        .filter(uye => ['tekniker', 'muhendis', 'yonetici'].includes(uye.rol));
      
      setEkipUyeleri(ekipListesi);
      setYukleniyor(false);
    }, (error) => {
      console.error('Ekip listesi getirilemedi:', error);
      toast.error('Ekip listesi yüklenirken bir hata oluştu');
      setYukleniyor(false);
    });

    return () => unsubscribe();
  }, [kullanici]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isYonetici) {
      toast.error('Bu işlem için yönetici yetkisi gerekiyor');
      return;
    }

    if (form.sifre !== form.sifreTekrar) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    if (form.sifre.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }

    setYukleniyor(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.sifre);
      
      await setDoc(doc(db, 'kullanicilar', userCredential.user.uid), {
        id: userCredential.user.uid,
        ad: form.ad,
        email: form.email,
        telefon: form.telefon || '',
        rol: form.rol,
        olusturmaTarihi: new Date(),
        guncellenmeTarihi: new Date(),
        fotoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(form.ad)}&background=random`
      });

      toast.success('Ekip üyesi başarıyla eklendi');
      setFormAcik(false);
      setForm({
        ad: '',
        email: '',
        telefon: '',
        rol: 'tekniker',
        sifre: '',
        sifreTekrar: ''
      });
    } catch (error: any) {
      console.error('Ekip üyesi ekleme hatası:', error);
      let errorMessage = 'Ekip üyesi eklenirken bir hata oluştu';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Bu e-posta adresi zaten kullanımda';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Bu işlem için yetkiniz bulunmuyor';
      }
      
      toast.error(errorMessage);
    } finally {
      setYukleniyor(false);
    }
  };

  const handleSil = async (id: string) => {
    if (!isYonetici) {
      toast.error('Bu işlem için yönetici yetkisi gerekiyor');
      return;
    }

    if (id === kullanici?.id) {
      toast.error('Kendinizi silemezsiniz');
      return;
    }

    if (!window.confirm('Bu ekip üyesini silmek istediğinizden emin misiniz?')) return;

    setYukleniyor(true);
    try {
      await deleteDoc(doc(db, 'kullanicilar', id));
      toast.success('Ekip üyesi başarıyla silindi');
    } catch (error) {
      console.error('Ekip üyesi silme hatası:', error);
      toast.error('Ekip üyesi silinirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  if (!isYonetici) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-500">Bu sayfaya erişim yetkiniz yok.</p>
      </div>
    );
  }

  if (yukleniyor) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ekip Yönetimi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Toplam {ekipUyeleri.length} üye
          </p>
        </div>
        <button
          onClick={() => setFormAcik(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Yeni Ekip Üyesi Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ekipUyeleri.map((uye) => (
          <div
            key={uye.id}
            className="bg-white overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300"
          >
            <div className="p-6">
              <div className="flex items-center">
                <img
                  src={uye.fotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(uye.ad)}&background=random`}
                  alt={uye.ad}
                  className="h-16 w-16 rounded-full ring-2 ring-white"
                />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">{uye.ad}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {uye.rol.charAt(0).toUpperCase() + uye.rol.slice(1)}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center text-sm text-gray-500">
                  <Mail className="h-5 w-5 mr-2 text-gray-400" />
                  {uye.email}
                </div>
                {uye.telefon && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Phone className="h-5 w-5 mr-2 text-gray-400" />
                    {uye.telefon}
                  </div>
                )}
              </div>

              {kullanici?.id !== uye.id && (
                <div className="mt-6">
                  <button
                    onClick={() => handleSil(uye.id)}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Sil
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {formAcik && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">
                  Yeni Ekip Üyesi Ekle
                </h2>
                <button
                  onClick={() => setFormAcik(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  required
                  value={form.ad}
                  onChange={e => setForm(prev => ({ ...prev, ad: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  E-posta
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Şifre
                </label>
                <input
                  type="password"
                  required
                  value={form.sifre}
                  onChange={e => setForm(prev => ({ ...prev, sifre: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Şifre Tekrar
                </label>
                <input
                  type="password"
                  required
                  value={form.sifreTekrar}
                  onChange={e => setForm(prev => ({ ...prev, sifreTekrar: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={form.telefon}
                  onChange={e => setForm(prev => ({ ...prev, telefon: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rol
                </label>
                <select
                  required
                  value={form.rol}
                  onChange={e => setForm(prev => ({ ...prev, rol: e.target.value as 'tekniker' | 'muhendis' | 'yonetici' }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                >
                  <option value="tekniker">Tekniker</option>
                  <option value="muhendis">Mühendis</option>
                  <option value="yonetici">Yönetici</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setFormAcik(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={yukleniyor}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                >
                  {yukleniyor ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Ekleniyor...</span>
                    </>
                  ) : (
                    'Ekle'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
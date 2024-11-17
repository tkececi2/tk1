import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { MusteriForm } from '../components/MusteriForm';
import { MusteriKart } from '../components/MusteriKart';
import { SilmeOnayModal } from '../components/SilmeOnayModal';
import toast from 'react-hot-toast';
import type { Kullanici } from '../types';

interface Saha {
  id: string;
  ad: string;
}

export const Musteriler: React.FC = () => {
  const { kullanici } = useAuth();
  const [musteriler, setMusteriler] = useState<Kullanici[]>([]);
  const [sahalar, setSahalar] = useState<Saha[]>([]);
  const [formAcik, setFormAcik] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [silmeOnayModal, setSilmeOnayModal] = useState<string | null>(null);

  // Yönetici kontrolü
  const isYonetici = kullanici?.rol === 'yonetici';

  useEffect(() => {
    if (!isYonetici) {
      toast.error('Bu sayfaya erişim yetkiniz yok');
      return;
    }

    const unsubscribes: (() => void)[] = [];

    const veriGetir = async () => {
      try {
        // Sahaları getir
        const sahaQuery = query(collection(db, 'sahalar'), orderBy('ad'));
        const sahaUnsubscribe = onSnapshot(sahaQuery, (snapshot) => {
          const sahaListesi = snapshot.docs.map(doc => ({
            id: doc.id,
            ad: doc.data().ad
          }));
          setSahalar(sahaListesi);
        }, (error) => {
          console.error('Saha listesi getirilemedi:', error);
          toast.error('Saha listesi yüklenirken bir hata oluştu');
        });
        unsubscribes.push(sahaUnsubscribe);

        // Müşterileri getir
        const musteriQuery = query(
          collection(db, 'kullanicilar'),
          where('rol', '==', 'musteri'),
          orderBy('ad')
        );

        const musteriUnsubscribe = onSnapshot(musteriQuery, (snapshot) => {
          const musteriListesi = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Kullanici[];
          
          setMusteriler(musteriListesi);
          setYukleniyor(false);
        }, (error) => {
          console.error('Müşteri listesi getirilemedi:', error);
          toast.error('Müşteri listesi yüklenirken bir hata oluştu');
          setYukleniyor(false);
        });
        unsubscribes.push(musteriUnsubscribe);

      } catch (error) {
        console.error('Veri getirme hatası:', error);
        toast.error('Veriler yüklenirken bir hata oluştu');
        setYukleniyor(false);
      }
    };

    veriGetir();

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [isYonetici]);

  const handleSil = async (id: string) => {
    if (!isYonetici) {
      toast.error('Bu işlem için yönetici yetkisi gerekiyor');
      return;
    }

    setYukleniyor(true);
    try {
      await deleteDoc(doc(db, 'kullanicilar', id));
      toast.success('Müşteri başarıyla silindi');
      setSilmeOnayModal(null);
    } catch (error) {
      console.error('Müşteri silme hatası:', error);
      toast.error('Müşteri silinirken bir hata oluştu');
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
          <h1 className="text-2xl font-bold text-gray-900">Müşteri Yönetimi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Toplam {musteriler.length} müşteri
          </p>
        </div>
        <button
          onClick={() => setFormAcik(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Yeni Müşteri Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {musteriler.map((musteri) => (
          <MusteriKart
            key={musteri.id}
            musteri={musteri}
            sahaAdi={sahalar.find(s => s.id === musteri.saha)?.ad || 'Bilinmeyen Saha'}
            onSil={() => setSilmeOnayModal(musteri.id)}
          />
        ))}
      </div>

      {formAcik && (
        <MusteriForm
          sahalar={sahalar}
          onClose={() => setFormAcik(false)}
        />
      )}

      {silmeOnayModal && (
        <SilmeOnayModal
          onConfirm={() => handleSil(silmeOnayModal)}
          onCancel={() => setSilmeOnayModal(null)}
        />
      )}
    </div>
  );
};
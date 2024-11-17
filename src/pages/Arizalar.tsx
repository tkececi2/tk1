import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, where, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Filter, MapPin, Trash2, Eye, LayoutGrid, List } from 'lucide-react';
import { ArizaForm } from '../components/ArizaForm';
import { ArizaDetayModal } from '../components/ArizaDetayModal';
import { ArizaKart } from '../components/ArizaKart';
import type { Ariza } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export const Arizalar: React.FC = () => {
  const navigate = useNavigate();
  const { kullanici } = useAuth();
  const [aramaMetni, setAramaMetni] = useState('');
  const [formAcik, setFormAcik] = useState(false);
  const [arizalar, setArizalar] = useState<Ariza[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sahalar, setSahalar] = useState<Record<string, string>>({});
  const [secilenSaha, setSecilenSaha] = useState<string>('');
  const [silmeOnayModal, setSilmeOnayModal] = useState<string | null>(null);
  const [seciliAriza, setSeciliAriza] = useState<Ariza | null>(null);
  const [gorunumTipi, setGorunumTipi] = useState<'kart' | 'liste'>('kart');
  const [kullanicilar, setKullanicilar] = useState<Record<string, any>>({});

  useEffect(() => {
    const kullanicilariGetir = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'kullanicilar'));
        const kullaniciMap: Record<string, any> = {};
        snapshot.docs.forEach(doc => {
          kullaniciMap[doc.id] = doc.data();
        });
        setKullanicilar(kullaniciMap);
      } catch (error) {
        console.error('Kullanıcı bilgileri alınamadı:', error);
      }
    };

    kullanicilariGetir();
  }, []);

  useEffect(() => {
    const sahalariGetir = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'sahalar'));
        const sahaMap: Record<string, string> = {};
        snapshot.docs.forEach(doc => {
          sahaMap[doc.id] = doc.data().ad;
        });
        setSahalar(sahaMap);
      } catch (error) {
        console.error('Sahalar getirilemedi:', error);
      }
    };

    sahalariGetir();
  }, []);

  useEffect(() => {
    const arizalariGetir = async () => {
      if (!kullanici) return;

      try {
        let q;
        if (kullanici.rol === 'musteri') {
          // Müşteri sadece kendi sahalarına ait arızaları görebilir
          if (!kullanici.sahalar?.length) {
            setArizalar([]);
            return;
          }
          q = query(
            collection(db, 'arizalar'),
            where('saha', 'in', kullanici.sahalar),
            orderBy('olusturmaTarihi', 'desc')
          );
        } else if (secilenSaha) {
          q = query(
            collection(db, 'arizalar'),
            where('saha', '==', secilenSaha),
            orderBy('olusturmaTarihi', 'desc')
          );
        } else {
          q = query(
            collection(db, 'arizalar'),
            orderBy('olusturmaTarihi', 'desc')
          );
        }

        const snapshot = await getDocs(q);
        const arizaVerileri = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Ariza[];
        
        setArizalar(arizaVerileri);
      } catch (error) {
        console.error('Arıza verisi alınamadı:', error);
        toast.error('Arızalar yüklenirken bir hata oluştu');
      } finally {
        setYukleniyor(false);
      }
    };

    arizalariGetir();
  }, [kullanici, secilenSaha]);

  const handleSil = async (id: string) => {
    if (!kullanici?.rol || !['yonetici', 'tekniker', 'muhendis'].includes(kullanici.rol)) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    try {
      await deleteDoc(doc(db, 'arizalar', id));
      setArizalar(prev => prev.filter(a => a.id !== id));
      toast.success('Arıza kaydı başarıyla silindi');
      setSilmeOnayModal(null);
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Arıza kaydı silinirken bir hata oluştu');
    }
  };

  const filtrelenmisArizalar = arizalar.filter((ariza) =>
    ariza.baslik.toLowerCase().includes(aramaMetni.toLowerCase()) ||
    ariza.konum.toLowerCase().includes(aramaMetni.toLowerCase())
  );

  if (yukleniyor) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Arızalar</h1>
        <div className="flex items-center space-x-4">
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setGorunumTipi('kart')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                gorunumTipi === 'kart'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setGorunumTipi('liste')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                gorunumTipi === 'liste'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          {kullanici?.rol !== 'musteri' && (
            <button 
              onClick={() => setFormAcik(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              Yeni Arıza Kaydı
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
              placeholder="Arıza ara..."
            />
          </div>
        </div>
        {kullanici?.rol !== 'musteri' && (
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={secilenSaha}
                onChange={(e) => setSecilenSaha(e.target.value)}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
              >
                <option value="">Tüm Sahalar</option>
                {Object.entries(sahalar).map(([id, ad]) => (
                  <option key={id} value={id}>{ad}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {gorunumTipi === 'kart' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrelenmisArizalar.map((ariza) => (
            <ArizaKart
              key={ariza.id}
              ariza={ariza}
              sahaAdi={sahalar[ariza.saha] || 'Bilinmeyen Saha'}
              kullaniciAdi={kullanicilar[ariza.olusturanKisi]?.ad || 'Yükleniyor...'}
              onClick={() => setSeciliAriza(ariza)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Başlık
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Oluşturan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtrelenmisArizalar.map((ariza) => (
                  <tr
                    key={ariza.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSeciliAriza(ariza)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ariza.baslik}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sahalar[ariza.saha] || 'Bilinmeyen Saha'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ariza.durum === 'cozuldu' ? 'bg-green-100 text-green-800' :
                        ariza.durum === 'devam-ediyor' ? 'bg-yellow-100 text-yellow-800' :
                        ariza.durum === 'beklemede' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {ariza.durum.charAt(0).toUpperCase() + ariza.durum.slice(1).replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {kullanicilar[ariza.olusturanKisi]?.ad || 'Yükleniyor...'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ariza.olusturmaTarihi.toDate()).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSeciliAriza(ariza);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {kullanici?.rol && ['yonetici', 'tekniker', 'muhendis'].includes(kullanici.rol) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSilmeOnayModal(ariza.id);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formAcik && <ArizaForm onClose={() => setFormAcik(false)} />}

      {silmeOnayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Arıza Kaydını Sil
            </h3>
            <p className="text-gray-500 mb-4">
              Bu arıza kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSilmeOnayModal(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={() => handleSil(silmeOnayModal)}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {seciliAriza && (
        <ArizaDetayModal
          ariza={seciliAriza}
          onClose={() => setSeciliAriza(null)}
        />
      )}
    </div>
  );
};
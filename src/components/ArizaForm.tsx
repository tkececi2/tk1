import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, addDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, X } from 'lucide-react';
import { uploadMultipleFiles } from '../utils/uploadHelpers';
import { format } from 'date-fns';
import { LoadingSpinner } from './LoadingSpinner';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
}

interface Saha {
  id: string;
  ad: string;
}

interface Kullanici {
  id: string;
  ad: string;
  rol: string;
}

export const ArizaForm: React.FC<Props> = ({ onClose }) => {
  const { kullanici } = useAuth();
  const navigate = useNavigate();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [fotograflar, setFotograflar] = useState<File[]>([]);
  const [onizlemeler, setOnizlemeler] = useState<string[]>([]);
  const [fotografYukleniyor, setFotografYukleniyor] = useState(false);
  const [yuklemeYuzdesi, setYuklemeYuzdesi] = useState(0);
  const [sahalar, setSahalar] = useState<Saha[]>([]);
  const [teknisyenler, setTeknisyenler] = useState<Kullanici[]>([]);
  
  const [form, setForm] = useState({
    baslik: '',
    aciklama: '',
    konum: '',
    saha: '',
    oncelik: 'orta' as 'dusuk' | 'orta' | 'yuksek' | 'acil',
    atananKisi: '',
    olusturmaTarihi: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  });

  useEffect(() => {
    const veriGetir = async () => {
      try {
        // Sahaları getir
        const sahaSnapshot = await getDocs(query(collection(db, 'sahalar')));
        const sahaListesi = sahaSnapshot.docs.map(doc => ({
          id: doc.id,
          ad: doc.data().ad
        }));
        setSahalar(sahaListesi);

        // Teknisyenleri getir
        const teknisyenSnapshot = await getDocs(
          query(
            collection(db, 'kullanicilar'),
            where('rol', 'in', ['tekniker', 'muhendis'])
          )
        );
        const teknisyenListesi = teknisyenSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Kullanici[];
        setTeknisyenler(teknisyenListesi);
      } catch (error) {
        console.error('Veri getirme hatası:', error);
        toast.error('Veriler yüklenirken bir hata oluştu');
      }
    };

    veriGetir();
  }, []);

  const handleFotografSecimi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files);
    
    // Dosya kontrollerini yap
    if (fotograflar.length + files.length > 5) {
      toast.error('En fazla 5 fotoğraf yükleyebilirsiniz');
      return;
    }

    const buyukDosyalar = files.filter(file => file.size > 5 * 1024 * 1024);
    if (buyukDosyalar.length > 0) {
      toast.error('Her fotoğraf en fazla 5MB olabilir');
      return;
    }

    const gecersizDosyalar = files.filter(file => !file.type.startsWith('image/'));
    if (gecersizDosyalar.length > 0) {
      toast.error('Sadece resim dosyaları yükleyebilirsiniz');
      return;
    }

    // Önizlemeleri göster
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOnizlemeler(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setFotograflar(prev => [...prev, ...files]);
    e.target.value = ''; // Input'u temizle
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!kullanici?.id) {
      toast.error('Oturum süreniz dolmuş');
      return;
    }

    if (!form.baslik || !form.aciklama || !form.saha) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    setYukleniyor(true);
    let fotografURLleri: string[] = [];

    try {
      if (fotograflar.length > 0) {
        setFotografYukleniyor(true);
        
        fotografURLleri = await uploadMultipleFiles(
          fotograflar,
          'arizalar',
          (progress) => setYuklemeYuzdesi(progress)
        );
      }

      const arizaData = {
        ...form,
        durum: 'acik',
        olusturmaTarihi: new Date(form.olusturmaTarihi),
        guncellenmeTarihi: new Date(),
        olusturanKisi: kullanici.id,
        fotograflar: fotografURLleri,
        yorumlar: []
      };

      const docRef = await addDoc(collection(db, 'arizalar'), arizaData);
      
      toast.success('Arıza kaydı oluşturuldu');
      onClose();
      navigate(`/arizalar/${docRef.id}`);

    } catch (error: any) {
      console.error('Hata:', error);
      toast.error('Bir hata oluştu: ' + error.message);
    } finally {
      setYukleniyor(false);
      setFotografYukleniyor(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Yeni Arıza Kaydı
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Oluşturma Tarihi ve Saati
            </label>
            <input
              type="datetime-local"
              value={form.olusturmaTarihi}
              onChange={(e) => setForm(prev => ({
                ...prev,
                olusturmaTarihi: e.target.value
              }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Başlık
            </label>
            <input
              type="text"
              required
              value={form.baslik}
              onChange={e => setForm(prev => ({ ...prev, baslik: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              disabled={yukleniyor}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Açıklama
            </label>
            <textarea
              required
              value={form.aciklama}
              onChange={e => setForm(prev => ({ ...prev, aciklama: e.target.value }))}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              disabled={yukleniyor}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Konum
            </label>
            <input
              type="text"
              required
              value={form.konum}
              onChange={e => setForm(prev => ({ ...prev, konum: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              disabled={yukleniyor}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Saha
            </label>
            <select
              required
              value={form.saha}
              onChange={e => setForm(prev => ({ ...prev, saha: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              disabled={yukleniyor}
            >
              <option value="">Saha Seçin</option>
              {sahalar.map(saha => (
                <option key={saha.id} value={saha.id}>
                  {saha.ad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Atanan Teknisyen
            </label>
            <select
              value={form.atananKisi}
              onChange={e => setForm(prev => ({ ...prev, atananKisi: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              disabled={yukleniyor}
            >
              <option value="">Teknisyen Seçin</option>
              {teknisyenler.map(teknisyen => (
                <option key={teknisyen.id} value={teknisyen.id}>
                  {teknisyen.ad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Öncelik
            </label>
            <select
              value={form.oncelik}
              onChange={e => setForm(prev => ({ ...prev, oncelik: e.target.value as 'dusuk' | 'orta' | 'yuksek' | 'acil' }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              disabled={yukleniyor}
            >
              <option value="dusuk">Düşük</option>
              <option value="orta">Orta</option>
              <option value="yuksek">Yüksek</option>
              <option value="acil">Acil</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fotoğraflar
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-yellow-600 hover:text-yellow-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-yellow-500">
                    <span>Fotoğraf Yükle</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFotografSecimi}
                      className="sr-only"
                      disabled={yukleniyor}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, GIF - En fazla 5MB
                </p>
              </div>
            </div>

            {onizlemeler.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                {onizlemeler.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Önizleme ${index + 1}`}
                      className="h-24 w-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setOnizlemeler(prev => prev.filter((_, i) => i !== index));
                        setFotograflar(prev => prev.filter((_, i) => i !== index));
                      }}
                      className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1"
                      disabled={yukleniyor}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {fotografYukleniyor && (
              <div className="mt-4">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-yellow-600 bg-yellow-200">
                        Yükleniyor
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-yellow-600">
                        {Math.round(yuklemeYuzdesi)}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-yellow-200">
                    <div
                      style={{ width: `${yuklemeYuzdesi}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-yellow-500 transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={yukleniyor}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={yukleniyor}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
            >
              {yukleniyor ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Kaydediliyor...</span>
                </>
              ) : (
                'Kaydet'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
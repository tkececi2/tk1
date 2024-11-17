import React, { useState } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { doc, updateDoc, Timestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { uploadMultipleFiles } from '../utils/uploadHelpers';
import { 
  X, 
  MapPin, 
  Building, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  MessageSquare,
  User,
  Image as ImageIcon,
  Send,
  Upload
} from 'lucide-react';
import type { Ariza } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { FileUploadZone } from './FileUploadZone';
import toast from 'react-hot-toast';

interface Props {
  ariza: Ariza;
  sahaAdi: string;
  onClose: () => void;
}

const durumRenkleri = {
  'acik': 'bg-red-100 text-red-800',
  'devam-ediyor': 'bg-yellow-100 text-yellow-800',
  'beklemede': 'bg-blue-100 text-blue-800',
  'cozuldu': 'bg-green-100 text-green-800'
};

const oncelikRenkleri = {
  'dusuk': 'bg-gray-100 text-gray-800',
  'orta': 'bg-blue-100 text-blue-800',
  'yuksek': 'bg-orange-100 text-orange-800',
  'acil': 'bg-red-100 text-red-800'
};

export const ArizaDetayModal: React.FC<Props> = ({ ariza, sahaAdi, onClose }) => {
  const { kullanici } = useAuth();
  const [seciliFoto, setSeciliFoto] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [yeniYorum, setYeniYorum] = useState('');
  const [yorumGonderiliyor, setYorumGonderiliyor] = useState(false);
  const [cozumFormAcik, setCozumFormAcik] = useState(false);
  const [cozumFormu, setCozumFormu] = useState({
    aciklama: '',
    malzemeler: [''],
    tamamlanmaTarihi: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    fotograflar: [] as File[]
  });
  const [yuklemeYuzdesi, setYuklemeYuzdesi] = useState(0);

  // Yönetici, tekniker veya mühendis kontrolü
  const canSolve = kullanici?.rol && ['yonetici', 'tekniker', 'muhendis'].includes(kullanici.rol);

  const handleFotoTikla = (foto: string) => {
    setYukleniyor(true);
    const img = new Image();
    img.src = foto;
    img.onload = () => {
      setSeciliFoto(foto);
      setYukleniyor(false);
    };
    img.onerror = () => {
      setYukleniyor(false);
      toast.error('Fotoğraf yüklenirken bir hata oluştu');
    };
  };

  const handleYorumGonder = async () => {
    if (!kullanici || !yeniYorum.trim()) return;

    setYorumGonderiliyor(true);
    try {
      const docRef = doc(db, 'arizalar', ariza.id);
      await updateDoc(docRef, {
        yorumlar: arrayUnion({
          id: crypto.randomUUID(),
          kullaniciId: kullanici.id,
          kullaniciAdi: kullanici.ad,
          mesaj: yeniYorum.trim(),
          tarih: Timestamp.now()
        }),
        guncellenmeTarihi: Timestamp.now()
      });

      setYeniYorum('');
      toast.success('Yorum eklendi');
    } catch (error) {
      console.error('Yorum gönderme hatası:', error);
      toast.error('Yorum gönderilemedi');
    } finally {
      setYorumGonderiliyor(false);
    }
  };

  const handleCozumKaydet = async () => {
    if (!kullanici || !canSolve) return;

    if (!cozumFormu.aciklama.trim()) {
      toast.error('Lütfen çözüm açıklaması girin');
      return;
    }

    if (cozumFormu.fotograflar.length === 0) {
      toast.error('Lütfen en az bir çözüm fotoğrafı ekleyin');
      return;
    }

    setYukleniyor(true);

    try {
      // Önce fotoğrafları yükle
      const fotografURLleri = await uploadMultipleFiles(
        cozumFormu.fotograflar,
        'cozumler',
        (progress) => setYuklemeYuzdesi(progress)
      );

      const docRef = doc(db, 'arizalar', ariza.id);
      const guncellemeler = {
        durum: 'cozuldu',
        guncellenmeTarihi: Timestamp.now(),
        cozum: {
          aciklama: cozumFormu.aciklama,
          malzemeler: cozumFormu.malzemeler.filter(m => m.trim()),
          tamamlanmaTarihi: Timestamp.fromDate(new Date(cozumFormu.tamamlanmaTarihi)),
          tamamlayanKisi: kullanici.id,
          fotograflar: fotografURLleri
        }
      };

      await updateDoc(docRef, guncellemeler);
      toast.success('Arıza çözüldü olarak işaretlendi');
      onClose();
    } catch (error) {
      console.error('Çözüm kaydetme hatası:', error);
      toast.error('Çözüm kaydedilirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {ariza.baslik}
          </h2>
          <div className="flex items-center space-x-4">
            {!ariza.cozum && canSolve && (
              <button
                onClick={() => setCozumFormAcik(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Çözüldü İşaretle
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${durumRenkleri[ariza.durum]}`}>
                    {ariza.durum === 'acik' && <AlertTriangle className="w-4 h-4 mr-1" />}
                    {ariza.durum === 'devam-ediyor' && <Clock className="w-4 h-4 mr-1" />}
                    {ariza.durum === 'beklemede' && <Clock className="w-4 h-4 mr-1" />}
                    {ariza.durum === 'cozuldu' && <CheckCircle className="w-4 h-4 mr-1" />}
                    {ariza.durum.charAt(0).toUpperCase() + ariza.durum.slice(1).replace('-', ' ')}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${oncelikRenkleri[ariza.oncelik]}`}>
                    {ariza.oncelik.charAt(0).toUpperCase() + ariza.oncelik.slice(1)} Öncelik
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-500">
                  <Building className="h-5 w-5 mr-2 text-gray-400" />
                  {sahaAdi}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                  {ariza.konum}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                  {format(ariza.olusturmaTarihi.toDate(), 'dd MMMM yyyy HH:mm', { locale: tr })}
                </div>
                {ariza.cozum && (
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                    Çözüm: {format(ariza.cozum.tamamlanmaTarihi.toDate(), 'dd MMMM yyyy HH:mm', { locale: tr })}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Açıklama</h4>
                <p className="text-sm text-gray-500 whitespace-pre-wrap">
                  {ariza.aciklama}
                </p>
              </div>

              {ariza.cozum && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Çözüm Detayları</h4>
                  <p className="text-sm text-gray-500 whitespace-pre-wrap">
                    {ariza.cozum.aciklama}
                  </p>
                  {ariza.cozum.malzemeler && ariza.cozum.malzemeler.length > 0 && (
                    <div className="mt-2">
                      <h5 className="text-sm font-medium text-gray-700">Kullanılan Malzemeler:</h5>
                      <ul className="mt-1 list-disc list-inside text-sm text-gray-500">
                        {ariza.cozum.malzemeler.map((malzeme, index) => (
                          <li key={index}>{malzeme}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {ariza.cozum.fotograflar && ariza.cozum.fotograflar.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Çözüm Fotoğrafları:</h5>
                      <div className="grid grid-cols-2 gap-4">
                        {ariza.cozum.fotograflar.map((foto, index) => (
                          <div key={index} className="relative aspect-square">
                            <img
                              src={foto}
                              alt={`Çözüm fotoğrafı ${index + 1}`}
                              className="absolute inset-0 w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => handleFotoTikla(foto)}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIi8+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIi8+PC9zdmc+';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              {ariza.fotograflar && ariza.fotograflar.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Arıza Fotoğrafları</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {ariza.fotograflar.map((foto, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={foto}
                          alt={`Arıza fotoğrafı ${index + 1}`}
                          className="absolute inset-0 w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => handleFotoTikla(foto)}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIi8+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIi8+PC9zdmc+';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">Fotoğraf bulunmuyor</p>
                  </div>
                </div>
              )}

              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  <MessageSquare className="inline-block h-4 w-4 mr-1" />
                  Yorumlar
                </h4>
                <div className="space-y-4">
                  {ariza.yorumlar?.map((yorum: any) => (
                    <div key={yorum.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-gray-900">{yorum.kullaniciAdi}</span>
                        <span className="text-sm text-gray-500">
                          {format(yorum.tarih.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-700">{yorum.mesaj}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex space-x-2">
                  <input
                    type="text"
                    value={yeniYorum}
                    onChange={(e) => setYeniYorum(e.target.value)}
                    placeholder="Yorumunuzu yazın..."
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                  <button
                    onClick={handleYorumGonder}
                    disabled={!yeniYorum.trim() || yorumGonderiliyor}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                  >
                    {yorumGonderiliyor ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Gönder
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Çözüm Formu Modal */}
        {cozumFormAcik && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-lg w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Çözüm Detayları</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Çözüm Tarihi ve Saati
                  </label>
                  <input
                    type="datetime-local"
                    value={cozumFormu.tamamlanmaTarihi}
                    onChange={e => setCozumFormu(prev => ({
                      ...prev,
                      tamamlanmaTarihi: e.target.value
                    }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Çözüm Açıklaması
                  </label>
                  <textarea
                    value={cozumFormu.aciklama}
                    onChange={e => setCozumFormu(prev => ({ ...prev, aciklama: e.target.value }))}
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    placeholder="Arıza nasıl çözüldü?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Çözüm Fotoğrafları
                  </label>
                  <FileUploadZone
                    onFileSelect={(files) => setCozumFormu(prev => ({ ...prev, fotograflar: files }))}
                    selectedFiles={cozumFormu.fotograflar}
                    onFileRemove={(index) => {
                      setCozumFormu(prev => ({
                        ...prev,
                        fotograflar: prev.fotograflar.filter((_, i) => i !== index)
                      }));
                    }}
                    maxFiles={5}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kullanılan Malzemeler
                  </label>
                  {cozumFormu.malzemeler.map((malzeme, index) => (
                    <div key={index} className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        value={malzeme}
                        onChange={e => {
                          const yeniMalzemeler = [...cozumFormu.malzemeler];
                          yeniMalzemeler[index] = e.target.value;
                          setCozumFormu(prev => ({ ...prev, malzemeler: yeniMalzemeler }));
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                        placeholder="Malzeme adı"
                      />
                      {index === cozumFormu.malzemeler.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setCozumFormu(prev => ({
                            ...prev,
                            malzemeler: [...prev.malzemeler, '']
                          }))}
                          className="mt-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          +
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const yeniMalzemeler = cozumFormu.malzemeler.filter((_, i) => i !== index);
                            setCozumFormu(prev => ({ ...prev, malzemeler: yeniMalzemeler }));
                          }}
                          className="mt-1 px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50"
                        >
                          -
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {yuklemeYuzdesi > 0 && yuklemeYuzdesi < 100 && (
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-yellow-600 bg-yellow-200">
                          Fotoğraflar Yükleniyor
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
                )}

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setCozumFormAcik(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleCozumKaydet}
                    disabled={yukleniyor || !cozumFormu.aciklama.trim() || cozumFormu.fotograflar.length === 0}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    {yukleniyor ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Kaydediliyor...</span>
                      </>
                    ) : (
                      'Çözüldü Olarak İşaretle'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fotoğraf Modal */}
        {seciliFoto && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
            onClick={() => setSeciliFoto(null)}
          >
            <button
              onClick={() => setSeciliFoto(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={seciliFoto}
              alt="Büyük fotoğraf görünümü"
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
};
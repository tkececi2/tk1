import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { AlertCircle, Clock, CheckCircle, Loader, User, MapPin, Building, Image, X, ZoomIn } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Ariza } from '../types';
import { ArizaDetayModal } from './ArizaDetayModal';

const durumRenkleri = {
  'acik': 'bg-red-100 text-red-800',
  'devam-ediyor': 'bg-yellow-100 text-yellow-800',
  'beklemede': 'bg-blue-100 text-blue-800',
  'cozuldu': 'bg-green-100 text-green-800'
};

const durumIkonlari = {
  'acik': AlertCircle,
  'devam-ediyor': Loader,
  'beklemede': Clock,
  'cozuldu': CheckCircle
};

const oncelikRenkleri = {
  'dusuk': 'bg-gray-100 text-gray-800',
  'orta': 'bg-blue-100 text-blue-800',
  'yuksek': 'bg-orange-100 text-orange-800',
  'acil': 'bg-red-100 text-red-800'
};

interface Props {
  arizalar: Ariza[];
  yukleniyor: boolean;
  isMusteri?: boolean;
}

interface Saha {
  id: string;
  ad: string;
}

export const ArizaListesi: React.FC<Props> = ({ arizalar, yukleniyor, isMusteri }) => {
  const navigate = useNavigate();
  const [sahalar, setSahalar] = useState<Record<string, string>>({});
  const [seciliFoto, setSeciliFoto] = useState<string | null>(null);
  const [seciliAriza, setSeciliAriza] = useState<Ariza | null>(null);

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

  const handleFotoTikla = async (e: React.MouseEvent, foto: string) => {
    e.stopPropagation();
    try {
      const response = await fetch(foto, { method: 'HEAD' });
      if (response.ok) {
        setSeciliFoto(foto);
      } else {
        console.error('Fotoğrafa erişilemiyor');
      }
    } catch (error) {
      console.error('Fotoğraf kontrolü sırasında hata:', error);
    }
  };

  if (yukleniyor) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="h-8 w-8 text-yellow-500 animate-spin" />
      </div>
    );
  }

  if (arizalar.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Henüz arıza kaydı bulunmuyor.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fotoğraf
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Arıza No
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Başlık
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Saha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Konum
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Durum
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Öncelik
              </th>
              {!isMusteri && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Oluşturan
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tarih
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {arizalar.map((ariza) => {
              const DurumIkonu = durumIkonlari[ariza.durum];
              const sahaAdi = sahalar[ariza.saha] || 'Bilinmeyen Saha';
              const fotograf = ariza.fotograflar?.[0];
              
              return (
                <tr
                  key={ariza.id}
                  onClick={() => setSeciliAriza(ariza)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="relative group">
                      {fotograf ? (
                        <>
                          <img
                            src={fotograf}
                            alt="Arıza fotoğrafı"
                            className="h-12 w-12 rounded object-cover group-hover:opacity-75 transition-opacity"
                            onClick={(e) => handleFotoTikla(e, fotograf)}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIi8+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIi8+PC9zdmc+';
                            }}
                          />
                          {ariza.fotograflar && ariza.fotograflar.length > 1 && (
                            <span className="absolute -top-2 -right-2 bg-gray-800 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              +{ariza.fotograflar.length - 1}
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded flex items-center justify-center">
                            <ZoomIn className="hidden group-hover:block text-white h-5 w-5" />
                          </div>
                        </>
                      ) : (
                        <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center">
                          <Image className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{ariza.id.slice(-6).toUpperCase()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ariza.baslik}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-1 text-gray-400" />
                      {sahaAdi}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      {ariza.ko num}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${durumRenkleri[ariza.durum]}`}>
                      <DurumIkonu className="h-4 w-4 mr-1" />
                      {ariza.durum.charAt(0).toUpperCase() + ariza.durum.slice(1).replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${oncelikRenkleri[ariza.oncelik]}`}>
                      {ariza.oncelik.charAt(0).toUpperCase() + ariza.oncelik.slice(1)}
                    </span>
                  </td>
                  {!isMusteri && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1 text-gray-400" />
                        {ariza.olusturanKisiAdi}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(ariza.olusturmaTarihi.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Fotoğraf Modal */}
      {seciliFoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSeciliFoto(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSeciliFoto(null);
              }}
              className="absolute -top-12 right-0 text-white hover:text-gray-300"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={seciliFoto}
              alt="Büyük fotoğraf görünümü"
              className="rounded-lg max-h-[80vh] mx-auto"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIi8+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIi8+PC9zdmc+';
              }}
            />
          </div>
        </div>
      )}

      {/* Arıza Detay Modal */}
      {seciliAriza && (
        <ArizaDetayModal
          ariza={seciliAriza}
          onClose={() => setSeciliAriza(null)}
        />
      )}
    </>
  );
};
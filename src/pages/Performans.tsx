import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { differenceInDays, format, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { 
  Award, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  X, 
  User, 
  Calendar, 
  CheckCircle,
  Timer,
  Target,
  Star,
  Activity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Ariza, Kullanici } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ArizaDetayModal } from '../components/ArizaDetayModal';
import toast from 'react-hot-toast';
import { formatCozumSuresi } from '../utils/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CalisanPerformans {
  id: string;
  ad: string;
  cozulenArizaSayisi: number;
  ortalamaCozumSuresi: number;
  memnuniyetPuani: number;
  cozulenArizalar: Ariza[];
  basariOrani: number;
  oncelikDagilimi: {
    dusuk: number;
    orta: number;
    yuksek: number;
    acil: number;
  };
}

export const Performans: React.FC = () => {
  const { kullanici } = useAuth();
  const [calisanlar, setCalisanlar] = useState<CalisanPerformans[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [tarihAraligi, setTarihAraligi] = useState('30');
  const [seciliCalisan, setSeciliCalisan] = useState<CalisanPerformans | null>(null);
  const [seciliAriza, setSeciliAriza] = useState<Ariza | null>(null);
  const [sahalar, setSahalar] = useState<Record<string, string>>({});
  const [toplamAriza, setToplamAriza] = useState(0);

  useEffect(() => {
    const veriGetir = async () => {
      try {
        // Sahaları getir
        const sahaSnapshot = await getDocs(collection(db, 'sahalar'));
        const sahaMap: Record<string, string> = {};
        sahaSnapshot.docs.forEach(doc => {
          sahaMap[doc.id] = doc.data().ad;
        });
        setSahalar(sahaMap);

        // Çalışan listesini al
        const calisanQuery = query(
          collection(db, 'kullanicilar'),
          where('rol', 'in', ['tekniker', 'muhendis'])
        );
        const calisanSnapshot = await getDocs(calisanQuery);
        const calisanVerileri = calisanSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Kullanici[];

        // Arıza verilerini al
        const arizaQuery = query(collection(db, 'arizalar'));
        const arizaSnapshot = await getDocs(arizaQuery);
        const arizaVerileri = arizaSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Ariza[];

        setToplamAriza(arizaVerileri.length);

        // Çalışan performans verilerini hesapla
        const performansVerileri = calisanVerileri.map(calisan => {
          // Çalışan tarafından çözülen arızaları bul
          const cozulenArizalar = arizaVerileri.filter(
            ariza => ariza.cozum && ariza.cozum.tamamlayanKisi === calisan.id
          );

          // Çözüm sürelerini hesapla
          const cozumSureleri = cozulenArizalar.map(ariza => {
            const baslangic = ariza.olusturmaTarihi.toDate();
            const bitis = ariza.cozum!.tamamlanmaTarihi.toDate();
            return differenceInDays(bitis, baslangic);
          });

          const ortalamaCozumSuresi = cozumSureleri.length > 0
            ? cozumSureleri.reduce((a, b) => a + b, 0) / cozumSureleri.length
            : 0;

          // Başarı oranı hesapla
          const basariOrani = (cozulenArizalar.length / Math.max(1, arizaVerileri.length)) * 100;

          // Öncelik dağılımını hesapla
          const oncelikDagilimi = {
            dusuk: cozulenArizalar.filter(a => a.oncelik === 'dusuk').length,
            orta: cozulenArizalar.filter(a => a.oncelik === 'orta').length,
            yuksek: cozulenArizalar.filter(a => a.oncelik === 'yuksek').length,
            acil: cozulenArizalar.filter(a => a.oncelik === 'acil').length
          };

          // Memnuniyet puanını hesapla
          const memnuniyetPuani = Math.min(5, (cozulenArizalar.length * 0.5) + 3);

          return {
            id: calisan.id,
            ad: calisan.ad,
            cozulenArizaSayisi: cozulenArizalar.length,
            ortalamaCozumSuresi,
            memnuniyetPuani,
            cozulenArizalar,
            basariOrani,
            oncelikDagilimi
          };
        });

        // Performansa göre sırala
        const siraliPerformans = performansVerileri.sort((a, b) => b.cozulenArizaSayisi - a.cozulenArizaSayisi);
        setCalisanlar(siraliPerformans);
      } catch (error) {
        console.error('Veri alınamadı:', error);
        toast.error('Performans verileri yüklenirken bir hata oluştu');
      } finally {
        setYukleniyor(false);
      }
    };

    veriGetir();
  }, [kullanici, tarihAraligi]);

  if (yukleniyor) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performans Raporları</h1>
          <p className="mt-1 text-sm text-gray-500">
            Toplam {calisanlar.length} çalışan, {toplamAriza} arıza kaydı
          </p>
        </div>
        <select
          value={tarihAraligi}
          onChange={(e) => setTarihAraligi(e.target.value)}
          className="rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <option value="30">Son 30 Gün</option>
          <option value="90">Son 90 Gün</option>
          <option value="180">Son 180 Gün</option>
          <option value="365">Son 1 Yıl</option>
        </select>
      </div>

      {/* En İyi Performans Gösteren Çalışanlar */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {calisanlar.slice(0, 3).map((calisan, index) => (
          <div 
            key={calisan.id} 
            className="bg-white overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
            onClick={() => setSeciliCalisan(calisan)}
          >
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {index === 0 ? (
                    <div className="p-3 bg-yellow-50 rounded-xl">
                      <Award className="h-8 w-8 text-yellow-500" />
                    </div>
                  ) : index === 1 ? (
                    <div className="p-3 bg-gray-100 rounded-xl">
                      <Award className="h-8 w-8 text-gray-400" />
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-900/10 rounded-xl">
                      <Award className="h-8 w-8 text-yellow-700" />
                    </div>
                  )}
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {calisan.ad}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-bold text-gray-900">
                        {calisan.cozulenArizaSayisi} Arıza
                      </div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                        <TrendingUp className="self-center flex-shrink-0 h-5 w-5 text-green-500" />
                        <span className="ml-1">
                          %{Math.round(calisan.basariOrani)}
                        </span>
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <Timer className="h-5 w-5 text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Ort. Süre</span>
                  </div>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {calisan.ortalamaCozumSuresi.toFixed(1)} gün
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Puan</span>
                  </div>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {calisan.memnuniyetPuani.toFixed(1)}/5
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performans Grafikleri */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Çözülen Arıza Sayısı */}
        <div className="bg-white shadow-lg rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">
              Çözülen Arıza Sayıları
            </h2>
            <div className="flex items-center text-sm text-gray-500">
              <Activity className="h-5 w-5 mr-2" />
              Toplam: {calisanlar.reduce((acc, curr) => acc + curr.cozulenArizaSayisi, 0)}
            </div>
          </div>
          <Bar
            data={{
              labels: calisanlar.map(t => t.ad),
              datasets: [{
                label: 'Çözülen Arıza',
                data: calisanlar.map(t => t.cozulenArizaSayisi),
                backgroundColor: 'rgba(234, 179, 8, 0.8)',
                borderRadius: 8,
                borderSkipped: false,
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  padding: 12,
                  titleFont: {
                    size: 14,
                    weight: 'bold'
                  },
                  bodyFont: {
                    size: 13
                  },
                  cornerRadius: 8
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1,
                    font: {
                      size: 12
                    }
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                  }
                },
                x: {
                  ticks: {
                    font: {
                      size: 12
                    }
                  },
                  grid: {
                    display: false
                  }
                }
              }
            }}
          />
        </div>

        {/* Ortalama Çözüm Süreleri */}
        <div className="bg-white shadow-lg rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">
              Ortalama Çözüm Süreleri
            </h2>
            <div className="flex items-center text-sm text-gray-500">
              <Timer className="h-5 w-5 mr-2" />
              Ort: {(calisanlar.reduce((acc, curr) => acc + curr.ortalamaCozumSuresi, 0) / calisanlar.length).toFixed(1)} gün
            </div>
          </div>
          <Line
            data={{
              labels: calisanlar.map(t => t.ad),
              datasets: [{
                label: 'Ortalama Süre (Gün)',
                data: calisanlar.map(t => t.ortalamaCozumSuresi),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgb(59, 130, 246)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  padding: 12,
                  titleFont: {
                    size: 14,
                    weight: 'bold'
                  },
                  bodyFont: {
                    size: 13
                  },
                  cornerRadius: 8
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: (value) => `${value} gün`,
                    font: {
                      size: 12
                    }
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                  }
                },
                x: {
                  ticks: {
                    font: {
                      size: 12
                    }
                  },
                  grid: {
                    display: false
                  }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Detaylı Performans Tablosu */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            Detaylı Performans Tablosu
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Çalışan
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Çözülen Arıza
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Başarı Oranı
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Ort. Çözüm Süresi
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Öncelik Dağılımı
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Memnuniyet
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {calisanlar.map((calisan) => (
                <tr 
                  key={calisan.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSeciliCalisan(calisan)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                          <User className="h-6 w-6 text-yellow-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{calisan.ad}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {calisan.cozulenArizaSayisi}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      %{Math.round(calisan.basariOrani)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {calisan.ortalamaCozumSuresi.toFixed(1)} gün
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-1">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        D: {calisan.oncelikDagilimi.dusuk}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        O: {calisan.oncelikDagilimi.orta}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                        Y: {calisan.oncelikDagilimi.yuksek}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                        A: {calisan.oncelikDagilimi.acil}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 mr-2">
                        {calisan.memnuniyetPuani.toFixed(1)}
                      </span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(calisan.memnuniyetPuani)
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Çalışan Detay Modal */}
      {seciliCalisan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-yellow-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {seciliCalisan.ad}
                </h2>
              </div>
              <button
                onClick={() => setSeciliCalisan(null)}
                className="text-gray-400 hover:text-gray-500 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-yellow-50 p-6 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-8 w-8 text-yellow-600" />
                    <div>
                      <div className="text-yellow-800 text-sm font-medium">Toplam Çözülen</div>
                      <div className="text-2xl font-bold text-yellow-900">{seciliCalisan.cozulenArizaSayisi} Arıza</div>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 p-6 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-8 w-8 text-blue-600" />
                    <div>
                      <div className="text-blue-800 text-sm font-medium">Ortalama Çözüm</div>
                      <div className="text-2xl font-bold text-blue-900">{seciliCalisan.ortalamaCozumSuresi.toFixed(1)} Gün</div>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-6 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Target className="h-8 w-8 text-green-600" />
                    <div>
                      <div className="text-green-800 text-sm font-medium">Başarı Oranı</div>
                      <div className="text-2xl font-bold text-green-900">%{Math.round(seciliCalisan.basariOrani)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Çözülen Arızalar
                </h3>
                {seciliCalisan.cozulenArizalar.map((ariza) => (
                  <div
                    key={ariza.id}
                    className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-300 cursor-pointer"
                    onClick={() => setSeciliAriza(ariza)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{ariza.baslik}</h3>
                        <p className="text-sm text-gray-500 mt-1">{sahalar[ariza.saha]}</p>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>{format(ariza.cozum!.tamamlanmaTarihi.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 line-clamp-2">{ariza.aciklama}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Çözüm süresi: {formatCozumSuresi(
                          ariza.olusturmaTarihi.toDate(),
                          ariza.cozum!.tamamlanmaTarihi.toDate()
                        )}</span>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ariza.oncelik === 'acil' ? 'bg-red-100 text-red-800' :
                        ariza.oncelik === 'yuksek' ? 'bg-orange-100 text-orange-800' :
                        ariza.oncelik === 'orta' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ariza.oncelik.charAt(0).toUpperCase() + ariza.oncelik.slice(1)} Öncelik
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Arıza Detay Modal */}
      {seciliAriza && (
        <ArizaDetayModal
          ariza={seciliAriza}
          sahaAdi={sahalar[seciliAriza.saha]}
          onClose={() => setSeciliAriza(null)}
        />
      )}
    </div>
  );
};
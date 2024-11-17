import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { differenceInDays, format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
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
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  Filter,
  BarChart2,
  PieChart,
  TrendingUp,
  MapPin,
  LayoutGrid,
  List
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Ariza } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { RaporOzeti } from '../components/RaporOzeti';
import { RaporDetayModal } from '../components/RaporDetayModal';
import toast from 'react-hot-toast';

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

export const Raporlar: React.FC = () => {
  const { kullanici } = useAuth();
  const [arizalar, setArizalar] = useState<Ariza[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [tarihAraligi, setTarihAraligi] = useState('30');
  const [sahalar, setSahalar] = useState<Record<string, string>>({});
  const [secilenSaha, setSecilenSaha] = useState<string>('');
  const [gorunumTipi, setGorunumTipi] = useState<'ozet' | 'detay' | 'liste'>('ozet');
  const [seciliAriza, setSeciliAriza] = useState<Ariza | null>(null);

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

        // Arızaları getir
        let arizaQuery;
        if (kullanici?.rol === 'musteri' && kullanici.saha) {
          arizaQuery = query(
            collection(db, 'arizalar'),
            where('saha', '==', kullanici.saha)
          );
        } else if (secilenSaha) {
          arizaQuery = query(
            collection(db, 'arizalar'),
            where('saha', '==', secilenSaha)
          );
        } else {
          arizaQuery = query(collection(db, 'arizalar'));
        }

        const snapshot = await getDocs(arizaQuery);
        const arizaVerileri = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Ariza[];
        
        setArizalar(arizaVerileri.sort((a, b) => 
          b.olusturmaTarihi.toDate().getTime() - a.olusturmaTarihi.toDate().getTime()
        ));
      } catch (error) {
        console.error('Veri alınamadı:', error);
        toast.error('Veriler yüklenirken bir hata oluştu');
      } finally {
        setYukleniyor(false);
      }
    };

    veriGetir();
  }, [kullanici, secilenSaha]);

  const filtreliArizalar = arizalar.filter(ariza => {
    const tarih = ariza.olusturmaTarihi.toDate();
    const sinir = subMonths(new Date(), parseInt(tarihAraligi) / 30);
    return tarih >= sinir;
  });

  const handleRaporIndir = () => {
    try {
      const headers = ['Arıza No', 'Başlık', 'Saha', 'Durum', 'Öncelik', 'Oluşturma Tarihi', 'Çözüm Tarihi'];
      const rows = filtreliArizalar.map(ariza => [
        ariza.id.slice(-6).toUpperCase(),
        ariza.baslik,
        sahalar[ariza.saha] || ariza.saha,
        ariza.durum.charAt(0).toUpperCase() + ariza.durum.slice(1).replace('-', ' '),
        ariza.oncelik.charAt(0).toUpperCase() + ariza.oncelik.slice(1),
        format(ariza.olusturmaTarihi.toDate(), 'dd.MM.yyyy HH:mm'),
        ariza.cozum ? format(ariza.cozum.tamamlanmaTarihi.toDate(), 'dd.MM.yyyy HH:mm') : '-'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ariza-raporu-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success('Rapor başarıyla indirildi');
    } catch (error) {
      console.error('Rapor indirme hatası:', error);
      toast.error('Rapor indirilirken bir hata oluştu');
    }
  };

  const durumDagilimi = {
    labels: ['Açık', 'Devam Ediyor', 'Beklemede', 'Çözüldü'],
    datasets: [{
      data: [
        filtreliArizalar.filter(a => a.durum === 'acik').length,
        filtreliArizalar.filter(a => a.durum === 'devam-ediyor').length,
        filtreliArizalar.filter(a => a.durum === 'beklemede').length,
        filtreliArizalar.filter(a => a.durum === 'cozuldu').length
      ],
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',
        'rgba(234, 179, 8, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)'
      ]
    }]
  };

  const aylikTrend = {
    labels: Array.from({ length: 6 }, (_, i) => 
      format(subMonths(new Date(), 5 - i), 'MMMM', { locale: tr })
    ),
    datasets: [{
      label: 'Arıza Sayısı',
      data: Array.from({ length: 6 }, (_, i) => {
        const ay = subMonths(new Date(), 5 - i);
        return filtreliArizalar.filter(ariza => {
          const arizaTarihi = ariza.olusturmaTarihi.toDate();
          return arizaTarihi.getMonth() === ay.getMonth() &&
                 arizaTarihi.getFullYear() === ay.getFullYear();
        }).length;
      }),
      borderColor: 'rgb(234, 179, 8)',
      backgroundColor: 'rgba(234, 179, 8, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  const oncelikDagilimi = {
    labels: ['Düşük', 'Orta', 'Yüksek', 'Acil'],
    datasets: [{
      data: [
        filtreliArizalar.filter(a => a.oncelik === 'dusuk').length,
        filtreliArizalar.filter(a => a.oncelik === 'orta').length,
        filtreliArizalar.filter(a => a.oncelik === 'yuksek').length,
        filtreliArizalar.filter(a => a.oncelik === 'acil').length
      ],
      backgroundColor: [
        'rgba(156, 163, 175, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ]
    }]
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {kullanici?.rol === 'musteri' 
              ? `${sahalar[kullanici.saha || '']} Raporları` 
              : 'Arıza Raporları'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Detaylı arıza istatistikleri ve analizler
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {kullanici?.rol !== 'musteri' && (
            <select
              value={secilenSaha}
              onChange={(e) => setSecilenSaha(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="">Tüm Sahalar</option>
              {Object.entries(sahalar).map(([id, ad]) => (
                <option key={id} value={id}>{ad}</option>
              ))}
            </select>
          )}
          <select
            value={tarihAraligi}
            onChange={(e) => setTarihAraligi(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="30">Son 30 Gün</option>
            <option value="90">Son 90 Gün</option>
            <option value="180">Son 180 Gün</option>
            <option value="365">Son 1 Yıl</option>
          </select>
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setGorunumTipi('ozet')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                gorunumTipi === 'ozet'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <PieChart className="h-4 w-4" />
            </button>
            <button
              onClick={() => setGorunumTipi('detay')}
              className={`px-4 py-2 text-sm font-medium border-t border-b ${
                gorunumTipi === 'detay'
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
          <button
            onClick={handleRaporIndir}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
          >
            <Download className="h-4 w-4 mr-2" />
            CSV İndir
          </button>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Açık Arızalar
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {filtreliArizalar.filter(a => a.durum === 'acik').length}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Devam Eden
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {filtreliArizalar.filter(a => a.durum === 'devam-ediyor').length}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Çözülen
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {filtreliArizalar.filter(a => a.durum === 'cozuldu').length}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Çözüm Oranı
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {filtreliArizalar.length > 0
                        ? Math.round((filtreliArizalar.filter(a => a.durum === 'cozuldu').length / filtreliArizalar.length) * 100)
                        : 0}%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {gorunumTipi === 'ozet' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Aylık Arıza Trendi</h2>
            <Line
              data={aylikTrend}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }}
            />
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Durum Dağılımı</h2>
            <div className="h-64">
              <Doughnut
                data={durumDagilimi}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6 lg:col-span-2">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Öncelik Dağılımı</h2>
            <Bar
              data={oncelikDagilimi}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      ) : gorunumTipi === 'detay' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtreliArizalar.map((ariza) => (
            <RaporOzeti
              key={ariza.id}
              ariza={ariza}
              sahaAdi={sahalar[ariza.saha] || ariza.saha}
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
                    Arıza No
                  </th>
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
                    Öncelik
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Oluşturma Tarihi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Çözüm Tarihi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtreliArizalar.map((ariza) => (
                  <tr
                    key={ariza.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSeciliAriza(ariza)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{ariza.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ariza.baslik}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sahalar[ariza.saha] || ariza.saha}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ariza.oncelik === 'acil' ? 'bg-red-100 text-red-800' :
                        ariza.oncelik === 'yuksek' ? 'bg-orange-100 text-orange-800' :
                        ariza.oncelik === 'orta' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ariza.oncelik.charAt(0).toUpperCase() + ariza.oncelik.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(ariza.olusturmaTarihi.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ariza.cozum
                        ? format(ariza.cozum.tamamlanmaTarihi.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {seciliAriza && (
        <RaporDetayModal
          ariza={seciliAriza}
          sahaAdi={sahalar[seciliAriza.saha] || seciliAriza.saha}
          onClose={() => setSeciliAriza(null)}
        />
      )}
    </div>
  );
};
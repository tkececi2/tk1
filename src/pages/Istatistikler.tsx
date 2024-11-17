import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, subMonths } from 'date-fns';
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
import { Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Ariza } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
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

export const Istatistikler: React.FC = () => {
  const { kullanici } = useAuth();
  const [arizalar, setArizalar] = useState<Ariza[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [tarihAraligi, setTarihAraligi] = useState('30');
  const [sahalar, setSahalar] = useState<Record<string, string>>({});

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
        if (kullanici?.rol === 'musteri') {
          if (!kullanici.sahalar?.length) {
            setArizalar([]);
            return;
          }
          arizaQuery = query(
            collection(db, 'arizalar'),
            where('saha', 'in', kullanici.sahalar)
          );
        } else {
          arizaQuery = query(collection(db, 'arizalar'));
        }

        const snapshot = await getDocs(arizaQuery);
        const arizaVerileri = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          sahaAdi: sahaMap[doc.data().saha] || 'Bilinmeyen Saha'
        })) as (Ariza & { sahaAdi: string })[];
        
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
  }, [kullanici]);

  const filtreliArizalar = arizalar.filter(ariza => {
    const tarih = ariza.olusturmaTarihi.toDate();
    const sinir = subMonths(new Date(), parseInt(tarihAraligi) / 30);
    return tarih >= sinir;
  });

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          {kullanici?.rol === 'musteri' 
            ? `${sahalar[kullanici.sahalar?.[0] || '']} İstatistikleri` 
            : 'Arıza İstatistikleri'}
        </h1>
        <div className="flex items-center space-x-4">
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
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Toplam Arıza
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {filtreliArizalar.length}
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
                <Clock className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Açık Arızalar
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {filtreliArizalar.filter(a => a.durum !== 'cozuldu').length}
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
                <CheckCircle2 className="h-6 w-6 text-gray-400" />
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
    </div>
  );
};
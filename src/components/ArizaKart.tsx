import React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { AlertTriangle, Clock, CheckCircle, Image as ImageIcon, MapPin, Building, User } from 'lucide-react';
import type { Ariza } from '../types';

interface Props {
  ariza: Ariza;
  sahaAdi: string;
  kullaniciAdi: string;
  onClick: () => void;
}

const durumRenkleri = {
  'acik': 'bg-red-100 text-red-800',
  'devam-ediyor': 'bg-yellow-100 text-yellow-800',
  'beklemede': 'bg-blue-100 text-blue-800',
  'cozuldu': 'bg-green-100 text-green-800'
};

const durumIkonlari = {
  'acik': AlertTriangle,
  'devam-ediyor': Clock,
  'beklemede': Clock,
  'cozuldu': CheckCircle
};

export const ArizaKart: React.FC<Props> = ({ ariza, sahaAdi, kullaniciAdi, onClick }) => {
  const DurumIkonu = durumIkonlari[ariza.durum];
  const fotograf = ariza.fotograflar?.[0];

  return (
    <div 
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-video">
        {fotograf ? (
          <img
            src={fotograf}
            alt="Arıza fotoğrafı"
            className="w-full h-full object-cover rounded-t-lg"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIi8+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIi8+PC9zdmc+';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-t-lg">
            <ImageIcon className="h-12 w-12 text-gray-400" />
          </div>
        )}
        {ariza.fotograflar && ariza.fotograflar.length > 1 && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
            +{ariza.fotograflar.length - 1}
          </div>
        )}
        <div className="absolute bottom-2 right-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${durumRenkleri[ariza.durum]}`}>
            <DurumIkonu className="h-3.5 w-3.5 mr-1" />
            {ariza.durum.charAt(0).toUpperCase() + ariza.durum.slice(1).replace('-', ' ')}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {ariza.baslik}
        </h3>
        
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex items-center">
            <Building className="h-4 w-4 mr-2" />
            {sahaAdi}
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2" />
            {ariza.konum}
          </div>
          <div className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            {kullaniciAdi}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <span>
            {format(ariza.olusturmaTarihi.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })}
          </span>
          {ariza.cozum && (
            <span className="text-green-600">
              Çözüldü: {format(ariza.cozum.tamamlanmaTarihi.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
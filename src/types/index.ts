export type KullaniciRolu = 'tekniker' | 'muhendis' | 'yonetici';

export interface Kullanici {
  id: string;
  email: string;
  rol: KullaniciRolu;
  ad: string;
  fotoURL?: string;
  telefon?: string;
}

export type ArizaDurumu = 'acik' | 'devam-ediyor' | 'beklemede' | 'cozuldu';
export type ArizaOnceligi = 'dusuk' | 'orta' | 'yuksek' | 'acil';

export interface Ariza {
  id: string;
  baslik: string;
  aciklama: string;
  konum: string;
  durum: ArizaDurumu;
  oncelik: ArizaOnceligi;
  olusturmaTarihi: any; // Firebase Timestamp
  guncellenmeTarihi: any; // Firebase Timestamp
  olusturanKisi: string;
  atananKisi?: string;
  fotograflar: string[];
  yorumlar: Yorum[];
  saha: string;
  cozum?: {
    aciklama: string;
    malzemeler: string[];
    tamamlanmaTarihi: any; // Firebase Timestamp
    tamamlayanKisi: string;
  };
}

export interface Yorum {
  id: string;
  metin: string;
  olusturmaTarihi: any; // Firebase Timestamp
  olusturanKisi: string;
  ekler?: string[];
}

export interface Saha {
  id: string;
  ad: string;
  konum: string;
  kapasite: string;
  aciklama?: string;
}
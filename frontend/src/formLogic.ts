// Validasi murni untuk form Lapor Barang. Dipakai LaporBarang.tsx dan formLogic.test.ts.

export const MAX_BYTES = 5 * 1024 * 1024;
export const EXT_DIIZINKAN = ['jpg', 'jpeg', 'png', 'webp'];

export type BerkasFoto = { name: string; size: number };

export type HasilFoto =
  | { ok: true }
  | { ok: false; kind: 'kosong' | 'format' | 'size'; title: string; text: string };

export type NilaiForm = {
  foto: BerkasFoto | null;
  kategori: string;
  lokasi: string;
  lokasiDetail?: string;
  waktu: string; // "YYYY-MM-DDTHH:mm"
};

export type FieldError = { field: 'foto' | 'kategori' | 'lokasi' | 'lokasi-detail' | 'waktu'; message: string };

export function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
}

export function validateFoto(file: BerkasFoto | null): HasilFoto {
  if (!file) return { ok: false, kind: 'kosong', title: '', text: 'Foto barang wajib diunggah.' };
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!EXT_DIIZINKAN.includes(ext)) {
    return {
      ok: false,
      kind: 'format',
      title: 'Format foto tidak didukung',
      text: `File .${ext} belum didukung. Gunakan JPG, JPEG, PNG, atau WEBP.`,
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      kind: 'size',
      title: 'Ukuran foto lebih dari 5 MB',
      text: `Foto berukuran ${formatMB(file.size)}. Kompres atau pilih foto lain di bawah 5 MB.`,
    };
  }
  return { ok: true };
}

export function validateForm(values: NilaiForm, now?: number): FieldError[] {
  const errors: FieldError[] = [];
  const foto = validateFoto(values.foto);
  if (!foto.ok) errors.push({ field: 'foto', message: foto.text });
  if (!values.kategori) errors.push({ field: 'kategori', message: 'Pilih salah satu kategori.' });
  if (!values.lokasi) errors.push({ field: 'lokasi', message: 'Lokasi wajib dipilih.' });
  else if (values.lokasi === 'Lainnya' && !String(values.lokasiDetail || '').trim())
    errors.push({ field: 'lokasi-detail', message: 'Tulis detail lokasinya.' });
  if (!values.waktu) errors.push({ field: 'waktu', message: 'Tanggal dan waktu kejadian wajib diisi.' });
  else if (new Date(values.waktu).getTime() > (now ?? Date.now()))
    errors.push({ field: 'waktu', message: 'Waktu kejadian tidak boleh setelah sekarang.' });
  return errors;
}

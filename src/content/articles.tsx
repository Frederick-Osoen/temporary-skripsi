import Link from 'next/link'
import { STANDARD_HOURS } from '@/lib/orders/schedule'

export type Article = {
  slug: string
  title: string
  description: string
  date: string // YYYY-MM-DD
  minutes: number
  body: React.ReactNode
}

// Konten statis untuk SEO. Angka di sini patokan umum, bukan janji; tiap artikel mengarahkan ke admin.
export const ARTICLES: Article[] = [
  {
    slug: 'berapa-pk-ac-untuk-ruangan-4x6',
    title: 'Berapa PK AC untuk ruangan 4×6 meter?',
    description: 'Cara cepat menghitung kebutuhan PK AC dari luas ruangan, dengan contoh ruangan 4×6 m dan kapan perlu naik satu tingkat.',
    date: '2026-10-23',
    minutes: 3,
    body: (
      <>
        <p>
          Ruangan 4×6 meter luasnya 24 m². Untuk ruangan biasa dengan plafon sekitar 3 meter dan tidak terkena matahari
          langsung, patokan yang umum dipakai adalah kebutuhan pendinginan sekitar <strong>500 BTU/jam per m²</strong>.
        </p>
        <p>24 m² × 500 BTU/jam = <strong>12.000 BTU/jam</strong>.</p>
        <h2>Ubah BTU ke PK</h2>
        <p>Konversi kasar yang sering dipakai di Indonesia:</p>
        <table>
          <thead>
            <tr><th>PK</th><th>Kapasitas pendinginan</th></tr>
          </thead>
          <tbody>
            <tr><td>½ PK</td><td>±5.000 BTU/jam</td></tr>
            <tr><td>¾ PK</td><td>±7.000 BTU/jam</td></tr>
            <tr><td>1 PK</td><td>±9.000 BTU/jam</td></tr>
            <tr><td>1½ PK</td><td>±12.000 BTU/jam</td></tr>
            <tr><td>2 PK</td><td>±18.000 BTU/jam</td></tr>
          </tbody>
        </table>
        <p>Jadi ruangan 4×6 m umumnya cukup dengan <strong>AC 1½ PK</strong>.</p>
        <h2>Kapan perlu naik satu tingkat?</h2>
        <ul>
          <li>Dinding atau jendela terkena matahari sore secara langsung.</li>
          <li>Plafon lebih tinggi dari 3 meter.</li>
          <li>Ruangan sering diisi banyak orang, misalnya ruang rapat.</li>
          <li>Ada sumber panas seperti dapur, mesin, atau banyak lampu.</li>
        </ul>
        <p>Dalam kondisi seperti itu, AC 2 PK biasanya lebih nyaman.</p>
        <h2>Untuk acara di tenda</h2>
        <p>
          Tenda acara jauh lebih panas daripada ruangan berdinding: atapnya tipis, sisi-sisinya sering terbuka, dan tamunya
          banyak. Di sini yang dipakai biasanya AC standing berkapasitas besar. Coba{' '}
          <Link href="/kalkulator">kalkulator kebutuhan</Link> untuk perkiraan jumlah unitnya, lalu pastikan ke admin.
        </p>
      </>
    ),
  },
  {
    slug: 'cara-memilih-kapasitas-genset-untuk-acara',
    title: 'Cara memilih kapasitas genset untuk acara',
    description: 'Menghitung kVA genset dari total beban listrik acara: AC, lampu, dan sound system, plus cadangan untuk lonjakan arus.',
    date: '2026-10-23',
    minutes: 4,
    body: (
      <>
        <p>
          Genset yang terlalu kecil membuat listrik turun di tengah acara. Yang terlalu besar membuang biaya sewa dan solar.
          Hitungannya sebenarnya sederhana.
        </p>
        <h2>1. Jumlahkan semua beban</h2>
        <p>
          Catat daya (watt) setiap peralatan yang menyala bersamaan: AC, lampu, sound system, kulkas, mesin kopi, dan lainnya.
          Lihat label di peralatan atau tanyakan ke vendornya.
        </p>
        <h2>2. Tambahkan cadangan</h2>
        <p>
          Kompresor AC menarik arus lebih besar sesaat ketika mulai menyala. Karena itu tambahkan cadangan sekitar
          <strong> 20–30%</strong> dari total beban.
        </p>
        <h2>3. Ubah watt ke kVA</h2>
        <p>
          Kapasitas genset ditulis dalam kVA. Untuk perkiraan, pakai faktor daya <strong>0,8</strong>: kVA = watt ÷ 0,8 ÷ 1.000.
        </p>
        <h2>Contoh</h2>
        <p>
          Total beban 16.000 W. Ditambah cadangan 25% menjadi 20.000 W. Dibagi 0,8 menjadi 25.000 VA, atau{' '}
          <strong>25 kVA</strong>. Pilih genset dengan kapasitas yang sama atau setingkat di atasnya.
        </p>
        <h2>Hal lain yang sering terlupa</h2>
        <ul>
          <li>Tempatkan genset di luar tenda dan jauh dari tamu: suaranya bising dan ada gas buang.</li>
          <li>Pastikan jalur kabel aman dari lalu-lalang tamu dan tidak tergenang air.</li>
          <li>
            Perhatikan lama pemakaian. Di JJ Teknik standarnya {STANDARD_HOURS} jam per hari; lebih dari itu dihitung overtime
            per jam.
          </li>
        </ul>
        <p>
          Kalau Anda menyewa AC dari kami, kapasitas genset bisa direkomendasikan otomatis di halaman{' '}
          <Link href="/estimasi">estimasi biaya</Link> berdasarkan jumlah AC.
        </p>
      </>
    ),
  },
  {
    slug: 'checklist-sewa-ac-untuk-acara-di-tenda',
    title: 'Checklist sewa AC untuk acara di tenda',
    description: 'Daftar yang perlu disiapkan sebelum menyewa AC standing dan genset untuk pernikahan atau acara di tenda.',
    date: '2026-10-23',
    minutes: 3,
    body: (
      <>
        <p>Supaya pemasangan lancar dan tamu tetap sejuk, siapkan hal-hal ini sebelum menghubungi vendor AC.</p>
        <h2>Jauh hari sebelum acara</h2>
        <ul>
          <li>Tanggal dan jam acara, termasuk berapa jam AC dan genset perlu menyala.</li>
          <li>Ukuran tenda (panjang × lebar) dan perkiraan jumlah tamu.</li>
          <li>Sumber listrik: cukup dari PLN setempat, atau perlu genset.</li>
          <li>Akses kendaraan ke lokasi: apakah mobil pickup atau truk bisa masuk sampai dekat tenda.</li>
        </ul>
        <h2>Penempatan unit</h2>
        <ul>
          <li>AC standing biasanya diletakkan di sisi tenda, dengan arah tiupan ke area tamu.</li>
          <li>Jangan sampai lubang udara tertutup dekorasi atau kain tenda.</li>
          <li>Untuk area terbuka atau semi-terbuka, misty fan sering lebih efektif.</li>
          <li>Siapkan titik aman untuk genset di luar tenda.</li>
        </ul>
        <h2>Sehari sebelum acara</h2>
        <ul>
          <li>Pastikan ada orang di lokasi yang bisa menerima tim pemasang.</li>
          <li>Tenda sebaiknya sudah berdiri, supaya posisi AC bisa langsung ditentukan.</li>
        </ul>
        <h2>Hari acara</h2>
        <ul>
          <li>Nyalakan AC lebih awal sebelum tamu datang, supaya udara di dalam tenda sudah turun suhunya.</li>
          <li>Simpan nomor WhatsApp admin vendor untuk keperluan mendadak.</li>
        </ul>
        <p>
          Sudah punya angka kasarnya? Hitung biayanya di halaman <Link href="/estimasi">estimasi</Link>, lalu kirim ke admin
          untuk dikonfirmasi.
        </p>
      </>
    ),
  },
  {
    slug: 'berapa-ac-standing-untuk-acara-100-orang',
    title: 'Berapa AC standing untuk acara 100 orang?',
    description: 'Patokan jumlah AC standing 5 PK dari jumlah tamu dan luas area, plus kapan kebutuhan harus dihitung manual bersama admin.',
    date: '2026-10-27',
    minutes: 3,
    body: (
      <>
        <p>
          Dari pengalaman kami menyewakan AC standing 5 PK, satu unit paling optimal untuk ruangan sekitar{' '}
          <strong>4×5 meter (20 m²)</strong> dengan <strong>15–20 orang</strong>. Satu unit memang masih bisa menjangkau area
          sampai sekitar 10×10 meter, tetapi dinginnya tidak lagi merata.
        </p>
        <h2>Hitungan cepat</h2>
        <ul>
          <li>Dari luas: luas area ÷ 20 m².</li>
          <li>Dari tamu: jumlah tamu ÷ 15–20 orang.</li>
          <li>Pakai angka yang lebih besar dari keduanya.</li>
        </ul>
        <p>
          Contoh acara 100 tamu di area 120 m²: dari luas butuh sekitar 6 unit, dari tamu sekitar 5–7 unit. Jadi rencanakan
          sekitar <strong>6 unit</strong>.
        </p>
        <h2>Tenda dan area terbuka butuh lebih banyak</h2>
        <p>
          Tenda dan area semi-terbuka lebih panas daripada ruangan tertutup, jadi jumlah unitnya biasanya perlu ditambah.{' '}
          <Link href="/kalkulator">Kalkulator kebutuhan</Link> kami sudah memperhitungkannya, tetapi angka finalnya tetap
          dipastikan admin.
        </p>
        <h2>Di atas 20 unit</h2>
        <p>
          Kebutuhan sebesar itu biasanya memakai genset 250 kVA dan perlu dihitung manual, mulai dari pembagian beban sampai
          jalur kabel. Langsung <Link href="/kontak">chat admin</Link> dengan menyebut lokasi, luas area, dan jumlah tamu.
        </p>
      </>
    ),
  },
  {
    slug: 'cara-menghitung-overtime-sewa-genset',
    title: 'Cara menghitung overtime sewa genset',
    description: 'Sewa genset dihitung per hari dengan jatah pemakaian standar. Ini cara menghitung kelebihan jamnya, lengkap dengan contoh.',
    date: '2026-10-27',
    minutes: 2,
    body: (
      <>
        <p>
          Harga sewa genset sudah mencakup pemakaian standar <strong>{STANDARD_HOURS} jam per hari</strong>. Bila genset
          menyala lebih lama, kelebihannya dihitung sebagai overtime per jam, dibulatkan ke atas, dengan tarif sesuai
          kapasitas genset.
        </p>
        <h2>Contoh</h2>
        <p>
          Genset 30 kVA dengan tarif overtime Rp100.000 per jam dipakai 15 jam dalam satu hari:
        </p>
        <ul>
          <li>{STANDARD_HOURS} jam pertama: sudah termasuk harga sewa harian.</li>
          <li>Kelebihan {15 - STANDARD_HOURS} jam × Rp100.000 = <strong>Rp{((15 - STANDARD_HOURS) * 100000).toLocaleString('id-ID')}</strong>.</li>
        </ul>
        <p>Bila sewa beberapa hari, jam lebih dihitung per hari.</p>
        <h2>Tarif tiap kapasitas berbeda</h2>
        <p>
          Semakin besar kapasitas genset, semakin besar tarif overtime per jamnya. Halaman{' '}
          <Link href="/estimasi">estimasi biaya</Link> menghitung overtime otomatis begitu Anda mengisi jam pemakaian, dan
          harga finalnya tetap dikonfirmasi admin.
        </p>
      </>
    ),
  },
  {
    slug: 'alur-sewa-ac-dan-genset-di-jj-teknik',
    title: 'Alur sewa AC dan genset di JJ Teknik',
    description: 'Dari hitung estimasi, chat admin, DP, pemasangan, sampai pembongkaran. Begini langkah menyewa AC standing dan genset.',
    date: '2026-10-27',
    minutes: 3,
    body: (
      <>
        <ol>
          <li>
            <strong>Hitung estimasi.</strong> Buka <Link href="/estimasi">estimasi biaya</Link>, pilih unit, tanggal, dan
            lokasi. Angkanya gambaran biaya, bukan harga final.
          </li>
          <li>
            <strong>Kirim ke admin lewat WhatsApp.</strong> Admin mengecek ketersediaan unit pada tanggal Anda dan
            menyepakati harga final.
          </li>
          <li>
            <strong>Bayar DP.</strong> Nominal DP fleksibel dan dibicarakan dengan admin. DP yang sudah dibayar pada dasarnya
            tidak dikembalikan; pada kasus tertentu admin dapat mempertimbangkannya.
          </li>
          <li>
            <strong>Pemasangan.</strong> Unit diantar dengan armada kami sendiri dan dipasang sehari sebelum acara.
          </li>
          <li>
            <strong>Acara berlangsung.</strong> Bila AC tidak mendinginkan sesuai yang dijanjikan, berlaku garansi dingin
            kami.
          </li>
          <li>
            <strong>Pembongkaran.</strong> Setelah acara selesai, tim kami mengambil kembali unitnya.
          </li>
        </ol>
        <p>
          Ongkir gratis dalam radius 25 km dari gudang di Pandaan. Kami melayani Jawa, Bali, dan Lombok; untuk lokasi lain
          ongkir ditentukan admin.
        </p>
      </>
    ),
  },
]

export const getArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug) ?? null

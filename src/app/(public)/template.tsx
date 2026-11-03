// Transisi masuk antarhalaman. Template dibuat ulang di setiap navigasi, jadi animasi CSS ini
// berjalan sekali per halaman baru. Sengaja CSS murni (bukan JS): jalan sebelum hydration,
// tidak menambah bundel, dan tidak menunda tampilan konten pertama.
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
    return <div className="page-enter">{children}</div>
}

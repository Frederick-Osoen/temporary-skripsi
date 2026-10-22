export type PublicProduct = {
  id: string
  name: string
  category: 'rental' | 'sales'
  base_price: number
  overtime_rate: number | null
  capacity_kva: number | null // terisi hanya untuk genset
  description: string | null
  image_path: string | null
}
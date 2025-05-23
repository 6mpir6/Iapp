export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  imageUrl: string
  badge?: string
  details?: string[]
  colors?: string[]
  sizes?: string[]
}

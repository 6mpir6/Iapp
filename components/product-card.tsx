"use client"

import { useState } from "react"
import type { Product } from "@/types/product"
import { Eye } from "lucide-react"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <>
      <div
        className="bg-white dark:bg-gray-800 overflow-hidden group transition duration-300"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative">
          <div className="relative h-64 overflow-hidden">
            <img
              src={product.imageUrl || "/placeholder.svg"}
              alt={product.name}
              className={`w-full h-full object-cover transition duration-500 ${isHovered ? "scale-105" : "scale-100"}`}
            />
            <div
              className={`absolute inset-0 bg-black transition-opacity duration-300 ${isHovered ? "opacity-10" : "opacity-0"}`}
            ></div>
          </div>

          {product.badge && (
            <div className="absolute top-0 left-0 bg-black text-white text-xs uppercase tracking-wider px-3 py-1">
              {product.badge}
            </div>
          )}

          <div
            className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`}
          >
            <div className="flex justify-center space-x-2">
              <button
                className="bg-white text-black p-2 hover:bg-black hover:text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  window.location.href = `/store/product/${product.id}`
                }}
                title="View product"
              >
                <Eye className="h-5 w-5" />
              </button>
              <button
                className="bg-white text-black p-2 hover:bg-black hover:text-white transition-colors"
                onClick={(e) => e.stopPropagation()}
                title="Add to wishlist"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-normal text-gray-900 dark:text-white mb-1 hover:underline underline-offset-4 uppercase tracking-wider text-sm">
                <a href={`/store/product/${product.id}`}>{product.name}</a>
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs uppercase">{product.category}</p>
            </div>
            <div className="text-right">
              <span className="font-normal text-gray-900 dark:text-white">${product.price.toFixed(2)}</span>
              {product.badge === "SALE" && (
                <p className="text-gray-900 dark:text-white text-xs line-through">
                  ${(product.price * 1.2).toFixed(2)}
                </p>
              )}
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">{product.description}</p>

          <div className="flex space-x-2">
            <button className="flex-1 bg-black text-white py-2.5 text-xs uppercase tracking-wider hover:bg-black/80 transition-colors duration-300 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              Add to Cart
            </button>
            <a
              href={`/store/product/${product.id}`}
              className="px-3 py-2.5 border border-black dark:border-white hover:bg-black hover:text-white transition-colors flex items-center justify-center"
              title="View details"
            >
              <Eye className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

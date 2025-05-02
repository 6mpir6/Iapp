"use client"

import { useState } from "react"
import { ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VisualizationModal } from "@/components/visualization-modal"
import { CheckoutButton } from "@/components/checkout-button"

interface CartItem {
  id: string
  name: string
  imageUrl: string
  price: number
  quantity: number
  size?: string
  color?: string
  category: string
}

interface CartDropdownProps {
  cartItems: CartItem[]
}

export function CartDropdown({ cartItems }: CartDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [visualizationModalOpen, setVisualizationModalOpen] = useState(false)

  // Calculate total items and price
  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0)
  const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  const handleVisualize = () => {
    setVisualizationModalOpen(true)
    setIsOpen(false) // Close the dropdown when opening the modal
  }

  // Determine product type based on category
  const getProductType = (category: string): "clothing" | "decor" | "other" => {
    if (category === "apparel" || category === "footwear" || category === "accessories") {
      return "clothing"
    } else if (category === "home") {
      return "decor"
    } else {
      return "other"
    }
  }

  return (
    <div className="relative">
      <button aria-label="Cart" className="relative focus:outline-none" onClick={toggleDropdown}>
        <ShoppingCart className="h-6 w-6 text-emerald-400" />
        <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {totalItems}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Your Cart ({totalItems} items)</h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {cartItems.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {cartItems.map((item) => (
                  <div key={`${item.id}-${item.size}-${item.color}`} className="p-3 flex items-center">
                    <div className="w-12 h-12 flex-shrink-0 mr-3">
                      <img
                        src={item.imageUrl || "/placeholder.svg"}
                        alt={item.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.size && `Size: ${item.size}`}
                        {item.size && item.color && " | "}
                        {item.color && `Color: ${item.color}`}
                      </p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">${item.price.toFixed(2)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">Your cart is empty</div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between mb-3">
              <span className="font-medium text-gray-900 dark:text-gray-100">Total:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">${totalPrice.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="w-full" onClick={() => (window.location.href = "/store/cart")}>
                View Cart
              </Button>

              <CheckoutButton
                hasItems={cartItems.length > 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Visualization Modal */}
      {cartItems.length > 0 && (
        <VisualizationModal
          isOpen={visualizationModalOpen}
          onClose={() => setVisualizationModalOpen(false)}
          productName={cartItems[0].name}
          productImageUrl={cartItems[0].imageUrl}
          productType={getProductType(cartItems[0].category)}
          productId={cartItems[0].id}
          initialProducts={cartItems.map((item) => ({
            id: item.id,
            name: item.name,
            description: "",
            price: item.price,
            category: item.category,
            imageUrl: item.imageUrl,
          }))}
        />
      )}
    </div>
  )
}

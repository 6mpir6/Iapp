"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { products } from "@/data/products"
import { Eye, Upload, Loader2, Download, Check, Search, Plus, X, Palette } from "lucide-react"
import { visualizeProduct } from "@/actions/visualize-product"
import type { Product } from "@/types/product"
import { Button } from "@/components/ui/button"
import { CreateStoreButton } from "@/components/create-store-button"

// Add the color palette array
const colorPalette = [
  { hex: "#000000", name: "Black" },
  { hex: "#FFFFFF", name: "White" },
  { hex: "#FF0000", name: "Red" },
  { hex: "#0000FF", name: "Blue" },
  { hex: "#008000", name: "Green" },
  { hex: "#FFFF00", name: "Yellow" },
  { hex: "#FFA500", name: "Orange" },
  { hex: "#800080", name: "Purple" },
  { hex: "#FFC0CB", name: "Pink" },
  { hex: "#A52A2A", name: "Brown" },
  { hex: "#808080", name: "Gray" },
  { hex: "#C0C0C0", name: "Silver" },
  { hex: "#FFD700", name: "Gold" },
  { hex: "#00FFFF", name: "Cyan" },
  { hex: "#FF00FF", name: "Magenta" },
]

export function VisualizerPlugin() {
  const [userImage, setUserImage] = useState<string | null>(null)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [uploadedProductImage, setUploadedProductImage] = useState<string | null>(null)
  const [uploadedProductName, setUploadedProductName] = useState<string>("")
  // Add new state variables for color picker
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedProductForColor, setSelectedProductForColor] = useState<string | null>(null)
  const [productColors, setProductColors] = useState<Record<string, { hex: string; name: string }>>({})

  // Filter products based on search query
  useEffect(() => {
    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    setFilteredProducts(filtered)
  }, [searchQuery])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setUserImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setUploadedProductImage(reader.result as string)
      // Set a default name based on the file name
      setUploadedProductName(file.name.split(".")[0].replace(/[_-]/g, " "))

      // Create a custom product from the uploaded image
      const customProduct: Product = {
        id: `custom-${Date.now()}`,
        name: file.name.split(".")[0].replace(/[_-]/g, " "),
        description: "Custom uploaded product",
        price: 0,
        category: "apparel",
        imageUrl: reader.result as string,
      }

      // Add the custom product to selected products
      if (selectedProducts.length < 4) {
        setSelectedProducts([...selectedProducts, customProduct])
      }
    }
    reader.readAsDataURL(file)
  }

  // Add the handleColorSelect function
  const handleColorSelect = (productId: string, hex: string, name: string) => {
    setProductColors({
      ...productColors,
      [productId]: { hex, name },
    })
    setShowColorPicker(false)
    setSelectedProductForColor(null)
  }

  // Update the handleVisualize function to include color information
  const handleVisualize = async () => {
    if (selectedProducts.length === 0) {
      setError("Please select at least one product to visualize")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await visualizeProduct({
        products: selectedProducts.map((p) => ({
          id: p.id,
          name: p.name,
          imageUrl: p.imageUrl,
          type: getProductType(p.category),
          color: productColors[p.id] || undefined,
        })),
        userImage: userImage || undefined,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      setGeneratedImage(result.visualizationUrl)
    } catch (err) {
      console.error("Visualization error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate visualization")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = () => {
    if (!generatedImage) return

    const a = document.createElement("a")
    a.href = generatedImage
    a.download = `stylehub-visualization-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const addProduct = (product: Product) => {
    if (selectedProducts.length < 4 && !selectedProducts.some((p) => p.id === product.id)) {
      setSelectedProducts([...selectedProducts, product])
    }
  }

  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== productId))
  }

  // Check if a product is already selected
  const isProductSelected = (productId: string) => {
    return selectedProducts.some((p) => p.id === productId)
  }

  // Helper function to determine product type
  const getProductType = (category: string): "clothing" | "decor" | "other" => {
    if (category === "apparel" || category === "footwear" || category === "accessories") {
      return "clothing"
    } else if (category === "home") {
      return "decor"
    } else {
      return "other"
    }
  }

  // Add the getColorIndicator function
  const getColorIndicator = (productId: string) => {
    if (productColors[productId]) {
      return (
        <div
          className="absolute bottom-2 right-2 w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600"
          style={{ backgroundColor: productColors[productId].hex }}
          title={`Color: ${productColors[productId].name}`}
        />
      )
    }
    return null
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Product Visualizer</h2>
          <CreateStoreButton />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/2">
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              See how products look on you or in your space before you buy. Upload a photo and select products to
              visualize.
            </p>

            <div className="space-y-6">
              {/* Selected Products */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Selected Products ({selectedProducts.length}/4)
                  </p>
                  <input
                    type="file"
                    id="product-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleProductImageUpload}
                  />
                  <label
                    htmlFor="product-upload"
                    className="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-2 py-1 rounded cursor-pointer flex items-center"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Upload Product
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {selectedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="relative bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-2 rounded"
                    >
                      <button
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                        onClick={() => removeProduct(product.id)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button
                        className="absolute top-2 right-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-1 rounded-full border border-gray-200 dark:border-gray-600"
                        onClick={() => {
                          setSelectedProductForColor(product.id)
                          setShowColorPicker(true)
                        }}
                        title="Change color"
                      >
                        <Palette className="h-3 w-3" />
                      </button>
                      <div className="h-16 flex items-center justify-center mb-1">
                        <img
                          src={product.imageUrl || "/placeholder.svg"}
                          alt={product.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <p className="text-xs text-center truncate">{product.name}</p>
                      {getColorIndicator(product.id)}
                    </div>
                  ))}

                  {selectedProducts.length < 4 && (
                    <button
                      className="h-28 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded flex flex-col items-center justify-center hover:border-emerald-500 transition-colors"
                      onClick={() => setShowProductSelector(true)}
                    >
                      <Plus className="h-6 w-6 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">Add Product</span>
                    </button>
                  )}
                </div>
              </div>

              {/* User Image Upload */}
              <div
                className="bg-white dark:bg-gray-700 h-40 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded hover:border-emerald-500 transition-colors relative"
                onClick={() => fileInputRef.current?.click()}
              >
                {userImage ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src={userImage || "/placeholder.svg"}
                      alt="User uploaded"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {getProductType() === "clothing"
                        ? "Upload a photo of yourself"
                        : getProductType() === "decor"
                          ? "Upload a photo of your room"
                          : "Upload a reference image"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Click to browse</p>
                  </>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>

              <Button
                onClick={handleVisualize}
                disabled={isLoading || selectedProducts.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white py-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Visualization"
                )}
              </Button>

              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 rounded-md text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="lg:w-1/2 flex flex-col items-center justify-center">
            <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 w-full max-w-md aspect-square flex items-center justify-center">
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">Generating visualization...</p>
                </div>
              ) : generatedImage ? (
                <img
                  src={generatedImage || "/placeholder.svg"}
                  alt="Visualization"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center text-center">
                  <Eye className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">
                    Select products and upload a photo to see how they look together
                  </p>
                </div>
              )}
            </div>

            {generatedImage && (
              <Button onClick={handleDownload} variant="outline" className="mt-4">
                <Download className="mr-2 h-4 w-4" />
                Download Visualization
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Product Selector Dialog */}
      {showProductSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Select Products to Visualize Together</h3>
              <button
                onClick={() => setShowProductSelector(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div>
                <input
                  type="file"
                  id="product-selector-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleProductImageUpload}
                />
                <label
                  htmlFor="product-selector-upload"
                  className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors uppercase tracking-wider text-xs"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Product
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1">
              {filteredProducts.map((product) => {
                const alreadySelected = isProductSelected(product.id)
                return (
                  <div
                    key={product.id}
                    className={`relative border ${
                      alreadySelected
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-gray-200 dark:border-gray-700"
                    } cursor-pointer hover:border-emerald-500 transition-colors p-2 rounded`}
                    onClick={() => {
                      if (!alreadySelected && selectedProducts.length < 4) {
                        addProduct(product)
                      }
                    }}
                  >
                    {alreadySelected && (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    <div className="h-24 flex items-center justify-center mb-2">
                      <img
                        src={product.imageUrl || "/placeholder.svg"}
                        alt={product.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <p className="text-xs text-center font-medium truncate text-gray-900 dark:text-gray-100">
                      {product.name}
                    </p>
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400 capitalize">
                      {product.category}
                    </p>
                  </div>
                )
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                  No products found matching your search
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => setShowProductSelector(false)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Color Picker Dialog */}
      {showColorPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 max-w-md w-full p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Select Color</h3>
              <button
                onClick={() => {
                  setShowColorPicker(false)
                  setSelectedProductForColor(null)
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {colorPalette.map((color) => (
                <button
                  key={color.hex}
                  className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center"
                  style={{ backgroundColor: color.hex }}
                  onClick={() => handleColorSelect(selectedProductForColor!, color.hex, color.name)}
                  title={color.name}
                >
                  {productColors[selectedProductForColor!]?.hex === color.hex && (
                    <Check
                      className={`h-5 w-5 ${
                        color.hex === "#FFFFFF" || color.hex === "#FFFF00" ? "text-black" : "text-white"
                      }`}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Custom Color</label>
              <input
                type="color"
                className="w-full h-10 p-0 border-0"
                value={productColors[selectedProductForColor!]?.hex || "#000000"}
                onChange={(e) => {
                  const hex = e.target.value
                  handleColorSelect(selectedProductForColor!, hex, "Custom")
                }}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setShowColorPicker(false)
                  setSelectedProductForColor(null)
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

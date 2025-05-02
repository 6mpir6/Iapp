"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Download, Upload, ImageIcon, Plus, X, Search, Check, Palette } from "lucide-react"
import { visualizeProduct } from "@/actions/visualize-product"
import type { Product } from "@/types/product"
import { products } from "@/data/products"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { PexelsImagePicker } from "./pexels-image-picker"
import { generateBulkImages } from "@/actions/generate-images"

interface VisualizationModalProps {
  isOpen: boolean
  onClose: () => void
  productName: string
  productImageUrl: string
  productType: "clothing" | "decor" | "other"
  productId: string
  initialProducts?: Product[]
}

// Add this predefined color palette array after the component props
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

export function VisualizationModal({
  isOpen,
  onClose,
  productName,
  productImageUrl,
  productType,
  productId,
  initialProducts,
}: VisualizationModalProps) {
  const [userImage, setUserImage] = useState<string | null>(null)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  // Add a new state for the edit prompt and editing state
  const [editPrompt, setEditPrompt] = useState<string>("")
  const [isEditing, setIsEditing] = useState(false)
  const [showImageOptions, setShowImageOptions] = useState(false)
  const [uploadedProductImage, setUploadedProductImage] = useState<string | null>(null)
  const [uploadedProductName, setUploadedProductName] = useState<string>("")
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedProductForColor, setSelectedProductForColor] = useState<string | null>(null)
  const [productColors, setProductColors] = useState<Record<string, { hex: string; name: string }>>({})

  // Initialize with the current product
  useEffect(() => {
    if (isOpen) {
      if (initialProducts && initialProducts.length > 0) {
        // Limit to 4 products if more are provided
        setSelectedProducts(initialProducts.slice(0, 4))
      } else {
        const currentProduct = products.find((p) => p.id === productId)
        if (currentProduct) {
          setSelectedProducts([currentProduct])
        }
      }
    }
  }, [isOpen, productId, initialProducts])

  // Filter products based on search query and category compatibility
  useEffect(() => {
    let filtered = products.filter(
      (p) =>
        // Don't include the current product in search results
        p.id !== productId &&
        // Filter by search query
        (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase())),
    )

    // For clothing, prioritize other clothing items
    if (productType === "clothing") {
      filtered = filtered.sort((a, b) => {
        const aIsClothing = a.category === "apparel" || a.category === "footwear" || a.category === "accessories"
        const bIsClothing = b.category === "apparel" || b.category === "footwear" || b.category === "accessories"

        if (aIsClothing && !bIsClothing) return -1
        if (!aIsClothing && bIsClothing) return 1
        return 0
      })
    }

    // For home decor, prioritize other home items
    if (productType === "decor") {
      filtered = filtered.sort((a, b) => {
        const aIsDecor = a.category === "home"
        const bIsDecor = b.category === "home"

        if (aIsDecor && !bIsDecor) return -1
        if (!aIsDecor && bIsDecor) return 1
        return 0
      })
    }

    setFilteredProducts(filtered)
  }, [searchQuery, productId, productType])

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
        category: productType === "clothing" ? "apparel" : productType === "decor" ? "home" : "accessories",
        imageUrl: reader.result as string,
      }

      // Add the custom product to selected products
      if (selectedProducts.length < 4) {
        setSelectedProducts([...selectedProducts, customProduct])
      }
    }
    reader.readAsDataURL(file)
  }

  // Add this function to handle color selection
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

  // Update the handleUpdateVisualization function to include color information
  const handleUpdateVisualization = async () => {
    if (!editPrompt.trim() && !userImage) return

    setIsEditing(true)
    setError(null)

    try {
      // Use the existing visualization as the starting point
      const updatedProducts = [...selectedProducts]

      const result = await visualizeProduct({
        products: updatedProducts.map((p) => ({
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
      setEditPrompt("") // Clear the edit prompt after successful update
    } catch (err) {
      console.error("Visualization update error:", err)
      setError(err instanceof Error ? err.message : "Failed to update visualization")
    } finally {
      setIsEditing(false)
    }
  }

  const handleDownload = () => {
    if (!generatedImage) return

    const a = document.createElement("a")
    a.href = generatedImage
    a.download = `${productName.replace(/\s+/g, "-").toLowerCase()}-visualization.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const resetModal = () => {
    setUserImage(null)
    setGeneratedImage(null)
    setError(null)
    setSelectedProducts([])
    setShowProductSelector(false)
    setSearchQuery("")
    onClose()
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

  // Add this function to get color indicator for a product
  const getColorIndicator = (productId: string) => {
    if (productColors[productId]) {
      return (
        <div
          className="absolute bottom-2 right-2 w-4 h-4 rounded-full border border-gray-200"
          style={{ backgroundColor: productColors[productId].hex }}
          title={`Color: ${productColors[productId].name}`}
        />
      )
    }
    return null
  }

  const [showImageReplacementModal, setShowImageReplacementModal] = useState(false)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [currentImageDescription, setCurrentImageDescription] = useState<string | undefined>(undefined)

  const handleImageSelect = (imageDataUri: string, source: "pexels" | "gemini", sourceId?: string) => {
    if (selectedImageId) {
      if (source === "pexels") {
        setUserImage(imageDataUri)
      } else if (source === "gemini") {
        setUserImage(imageDataUri)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetModal()}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Visualize Products Together</DialogTitle>
          <DialogDescription>See how multiple products look together or in your space</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
          <div className="space-y-4">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium">Selected Products ({selectedProducts.length}/4)</h3>

                {/* Add upload product photo button */}
                <div className="flex gap-2">
                  <input
                    type="file"
                    id="product-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleProductImageUpload}
                  />
                  <label
                    htmlFor="product-upload"
                    className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded cursor-pointer flex items-center"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Upload Product
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {selectedProducts.map((product) => (
                  <div key={product.id} className="relative bg-white rounded-md p-2 border border-gray-200">
                    <button
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                      onClick={() => removeProduct(product.id)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      className="absolute top-2 right-2 bg-white text-gray-700 p-1 rounded-full border border-gray-200"
                      onClick={() => {
                        setSelectedProductForColor(product.id)
                        setShowColorPicker(true)
                      }}
                      title="Change color"
                    >
                      <Palette className="h-3 w-3" />
                    </button>
                    <div className="h-24 flex items-center justify-center mb-2">
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
                    className="h-40 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center hover:border-emerald-500 transition-colors"
                    onClick={() => setShowProductSelector(true)}
                  >
                    <Plus className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Add Product</span>
                  </button>
                )}
              </div>
            </div>

            <div
              className="bg-gray-100 rounded-lg p-4 h-64 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 hover:border-emerald-500 transition-colors relative"
              onClick={() => {
                setSelectedImageId("userImage")
                setCurrentImageDescription(
                  productType === "clothing"
                    ? "photo of yourself"
                    : productType === "decor"
                      ? "photo of your room"
                      : "reference image",
                )
                setShowImageReplacementModal(true)
              }}
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
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    {productType === "clothing"
                      ? "Upload a photo of yourself (optional)"
                      : productType === "decor"
                        ? "Upload a photo of your room (optional)"
                        : "Upload a reference image (optional)"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Click to browse or drag and drop</p>
                </>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>

            {/* Add Generate Visualization button here when generatedImage exists */}
            {generatedImage && (
              <div className="mt-2 mb-2">
                <Button
                  onClick={handleVisualize}
                  disabled={isLoading || selectedProducts.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate New Visualization"
                  )}
                </Button>
              </div>
            )}

            {userImage && (
              <div className="flex justify-center">
                <button className="text-sm text-red-500 hover:text-red-700" onClick={() => setUserImage(null)}>
                  Remove image
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-gray-100 rounded-lg p-4 h-64 flex items-center justify-center overflow-hidden">
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-2" />
                  <p className="text-sm text-gray-500">Generating visualization...</p>
                </div>
              ) : generatedImage ? (
                <img
                  src={generatedImage || "/placeholder.svg"}
                  alt="Visualization"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center">
                  <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Visualization will appear here</p>
                </div>
              )}
            </div>
            <p className="text-sm text-center font-medium">Visualization</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-3 text-sm">{error}</div>
            )}

            {generatedImage && (
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="Describe how you want to edit this visualization..."
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px] resize-none"
                  />
                  <div className="absolute right-3 bottom-3">
                    <button
                      onClick={() => setShowImageOptions(!showImageOptions)}
                      className="text-gray-500 hover:text-emerald-600 transition-colors"
                      title="Add image"
                    >
                      <ImageIcon className="h-5 w-5" />
                    </button>

                    {showImageOptions && (
                      <div className="absolute bottom-full right-0 mb-2 bg-white shadow-lg rounded-md border border-gray-200 p-2 w-48">
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md flex items-center"
                          onClick={() => {
                            setSelectedImageId("userImage")
                            setCurrentImageDescription(
                              productType === "clothing"
                                ? "photo of yourself"
                                : productType === "decor"
                                  ? "photo of your room"
                                  : "reference image",
                            )
                            setShowImageReplacementModal(true)
                            setShowImageOptions(false)
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload new image
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md flex items-center"
                          onClick={() => {
                            setShowProductSelector(true)
                            setShowImageOptions(false)
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add another product
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleUpdateVisualization}
                  disabled={isEditing || (!editPrompt.trim() && !userImage)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Visualization"
                  )}
                </Button>
              </div>
            )}

            <div className="flex flex-col space-y-2">
              {!generatedImage && (
                <Button
                  onClick={handleVisualize}
                  disabled={isLoading || selectedProducts.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Visualization"
                  )}
                </Button>
              )}

              {generatedImage && (
                <Button onClick={handleDownload} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download Image
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetModal}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Product Selector Dialog */}

      <Dialog
        open={showProductSelector}
        onOpenChange={(open) => {
          // Only update the product selector state, not the parent dialog
          setShowProductSelector(open)
        }}
      >
        <DialogContent className="max-w-3xl w-[90vw] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Products to Visualize Together</DialogTitle>
            <DialogDescription>Choose up to 4 products to visualize together</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Add upload product option */}
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
                className="inline-flex items-center px-4 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 cursor-pointer"
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
                    alreadySelected ? "border-emerald-500 bg-emerald-50" : "border-gray-200"
                  } rounded-md p-2 cursor-pointer hover:border-emerald-500 transition-colors`}
                  onClick={() => {
                    if (!alreadySelected && selectedProducts.length < 4) {
                      addProduct(product)
                    }
                  }}
                >
                  {alreadySelected && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1">
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
                  <p className="text-xs text-center font-medium truncate">{product.name}</p>
                  <p className="text-xs text-center text-gray-500 capitalize">{product.category}</p>
                </div>
              )
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">No products found matching your search</div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={(e) => {
                // Prevent event from bubbling up to parent dialog
                e.stopPropagation()
                setShowProductSelector(false)
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Color Picker Modal */}
      <Dialog
        open={showColorPicker}
        onOpenChange={(open) => {
          if (!open) {
            setShowColorPicker(false)
            setSelectedProductForColor(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Color</DialogTitle>
            <DialogDescription>Choose a color for this product</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-5 gap-2 mb-4">
            {colorPalette.map((color) => (
              <button
                key={color.hex}
                className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center"
                style={{ backgroundColor: color.hex }}
                onClick={() => handleColorSelect(selectedProductForColor!, color.hex, color.name)}
                title={color.name}
              >
                {productColors[selectedProductForColor!]?.hex === color.hex && (
                  <Check
                    className={`h-5 w-5 ${color.hex === "#FFFFFF" || color.hex === "#FFFF00" ? "text-black" : "text-white"}`}
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

          <DialogFooter>
            <Button
              onClick={() => {
                setShowColorPicker(false)
                setSelectedProductForColor(null)
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ImageReplacementModal
        isOpen={showImageReplacementModal}
        onClose={() => setShowImageReplacementModal(false)}
        onImageSelect={handleImageSelect}
        imageId={selectedImageId || ""}
        currentImageDescription={currentImageDescription}
      />
    </Dialog>
  )
}

interface ImageReplacementModalProps {
  isOpen: boolean
  onClose: () => void
  onImageSelect: (imageDataUri: string, source: "pexels" | "gemini", sourceId?: string) => void
  imageId: string
  currentImageDescription?: string
}

export function ImageReplacementModal({
  isOpen,
  onClose,
  onImageSelect,
  imageId,
  currentImageDescription = "",
}: ImageReplacementModalProps) {
  const [activeTab, setActiveTab] = useState<"pexels" | "gemini">("pexels")
  const [pexelsQuery, setPexelsQuery] = useState(currentImageDescription || "")
  const [geminiPrompt, setGeminiPrompt] = useState(currentImageDescription || "")
  const [selectedPexelsImage, setSelectedPexelsImage] = useState<{ url: string; id?: string } | null>(null)
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; id: string }>>([])
  const [selectedGeminiImage, setSelectedGeminiImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isInserting, setIsInserting] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Enhance the description for better search results
      const enhancedDescription = currentImageDescription
        ? currentImageDescription.replace(/placeholder/gi, "").trim()
        : ""

      setPexelsQuery(enhancedDescription || "")
      setGeminiPrompt(enhancedDescription || "")
      setSelectedPexelsImage(null)
      setSelectedGeminiImage(null)
      setGeneratedImages([])
    }
  }, [isOpen, currentImageDescription])

  // Handle Pexels image selection
  const handlePexelsImageSelect = (imageDataUri: string, pexelsId?: string) => {
    setSelectedPexelsImage({ url: imageDataUri, id: pexelsId })
  }

  // Handle Gemini image generation
  const handleGenerateImages = async () => {
    if (!geminiPrompt.trim()) return

    setIsGenerating(true)
    setGeneratedImages([])
    setSelectedGeminiImage(null)

    try {
      const result = await generateBulkImages({
        prompt: geminiPrompt,
        count: 4, // Generate 4 images at once
      })

      setGeneratedImages(result.images)
    } catch (error) {
      console.error("Error generating images:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle image selection and insertion
  const handleInsert = () => {
    setIsInserting(true)

    try {
      if (activeTab === "pexels" && selectedPexelsImage) {
        onImageSelect(selectedPexelsImage.url, "pexels", selectedPexelsImage.id)
      } else if (activeTab === "gemini" && selectedGeminiImage) {
        onImageSelect(selectedGeminiImage, "gemini")
      }
    } finally {
      setIsInserting(false)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <DialogHeader>
          <DialogTitle>Replace Image</DialogTitle>
          <DialogDescription>Choose a replacement image from Pexels or generate one with Gemini</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "pexels" | "gemini")}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="pexels">Pexels Photos</TabsTrigger>
            <TabsTrigger value="gemini">Generate with Gemini</TabsTrigger>
          </TabsList>

          <TabsContent value="pexels" className="space-y-4">
            <PexelsImagePicker
              onImageSelect={handlePexelsImageSelect}
              defaultQuery={pexelsQuery}
              selectedImageUrl={selectedPexelsImage?.url}
            />
          </TabsContent>

          <TabsContent value="gemini" className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Input
                value={geminiPrompt}
                onChange={(e) => setGeminiPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleGenerateImages()}
              />
              <Button
                onClick={handleGenerateImages}
                disabled={isGenerating || !geminiPrompt.trim()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Images"
                )}
              </Button>
            </div>

            {isGenerating ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : generatedImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 bg-white dark:bg-transparent">
                {generatedImages.map((image) => (
                  <div
                    key={image.id}
                    className={`relative aspect-square overflow-hidden rounded-md border-2 cursor-pointer transition-all ${
                      selectedGeminiImage === image.url
                        ? "border-emerald-500 shadow-lg"
                        : "border-gray-300 dark:border-gray-700 hover:border-gray-500 dark:hover:border-gray-500"
                    }`}
                    onClick={() => setSelectedGeminiImage(image.url)}
                  >
                    <img
                      src={image.url || "/placeholder.svg"}
                      alt={`Generated image ${image.id}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
                <p>Enter a prompt and click Generate to create images with Gemini</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleInsert}
            disabled={
              isInserting ||
              (activeTab === "pexels" && !selectedPexelsImage) ||
              (activeTab === "gemini" && !selectedGeminiImage)
            }
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isInserting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Replacing...
              </>
            ) : (
              "Replace Image"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

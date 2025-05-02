"use client"

import type React from "react"
import { useState, useRef, type ChangeEvent } from "react"
import {
  type UseFormRegister,
  type FieldErrors,
  type UseFormSetValue,
  type Control,
  useFieldArray,
  type UseFormGetValues,
} from "react-hook-form"
import type { StoreFormData, ProductRow } from "@/types/store"
import { Button } from "@/components/ui/button"
import { Loader2, FileUp, PlusCircle, X, ImageIcon, Plus } from "lucide-react"
import Papa from "papaparse"

const generateId = () => Math.random().toString(36).substring(2, 15)

interface Props {
  register: UseFormRegister<StoreFormData>
  control: Control<StoreFormData>
  errors: FieldErrors<StoreFormData>
  setValue: UseFormSetValue<StoreFormData>
  getValues: UseFormGetValues<StoreFormData>
}

type ProductColumnKey = keyof Omit<ProductRow, "id" | "imageUrls">

export const ProductsStep: React.FC<Props> = ({ register, control, errors, setValue, getValues }) => {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "products",
    keyName: "rowId",
  })

  const [csvError, setCsvError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [aiLoading, setAiLoading] = useState<{ [key: string]: boolean }>({})
  const [aiError, setAiError] = useState<{ [key: string]: string | null }>({})
  const [expandedImageRows, setExpandedImageRows] = useState<string[]>([])

  // Ref for the hidden CSV file input
  const csvInputRef = useRef<HTMLInputElement>(null)

  // Function to trigger click on hidden CSV input
  const onCSVButtonClick = () => csvInputRef.current?.click()

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    setCsvError(null)

    Papa.parse<Omit<ProductRow, "id" | "imageUrls">>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData: ProductRow[] = results.data
          .map((row) => ({
            id: generateId(),
            title: row.title || row.Title || "",
            imageUrl: row.imageUrl || row["Image URL"] || row.image || "",
            imageUrls: [], // Initialize empty array for multiple images
            description: row.description || row.Description || "",
            price: row.price || row.Price || "",
          }))
          .filter((row) => row.title || row.description)

        if (results.errors.length > 0) {
          console.error("CSV Parsing Errors:", results.errors)
          setCsvError(`Errors found during parsing. Check console. Processed ${parsedData.length} rows.`)
        }

        if (parsedData.length > 0) {
          setValue("products", parsedData, { shouldValidate: true, shouldDirty: true })
        } else if (!results.errors.length) {
          setCsvError(
            "CSV parsed, but no valid product rows found. Check headers (Title, Image URL, Description, Price).",
          )
        }
        setIsParsing(false)
        event.target.value = ""
      },
      error: (error) => {
        console.error("CSV Parsing Failed:", error)
        setCsvError(`Failed to parse CSV: ${error.message}`)
        setIsParsing(false)
        event.target.value = ""
      },
    })
  }

  const addRow = () => {
    append({ id: generateId(), title: "", imageUrl: "", imageUrls: [], description: "", price: "" })
  }

  const handleAiFill = async (rowIndex: number, columnKey: ProductColumnKey) => {
    const loadingKey = `${rowIndex}-${columnKey}`
    setAiLoading((prev) => ({ ...prev, [loadingKey]: true }))
    setAiError((prev) => ({ ...prev, [loadingKey]: null }))

    const currentRowData = getValues(`products.${rowIndex}`)
    const context = { ...currentRowData }
    delete context.id

    try {
      // Simulate image generation specifically takes longer
      if (columnKey === "imageUrl") {
        await new Promise((resolve) => setTimeout(resolve, 2000)) // Add specific delay for image
      }

      const response = await fetch("/api/generate-cell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex, columnKey, context }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to generate value" }))
        throw new Error(errorData.message || "API error")
      }

      const data = await response.json()
      update(rowIndex, { ...currentRowData, [columnKey]: data.value })
    } catch (err: any) {
      setAiError((prev) => ({ ...prev, [loadingKey]: err.message || "Generation failed" }))
    } finally {
      setAiLoading((prev) => ({ ...prev, [loadingKey]: false }))
    }
  }

  // Handler for individual image upload per row
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, rowIndex: number) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      // Set image URL as Base64 Data URL
      setValue(`products.${rowIndex}.imageUrl`, reader.result as string, {
        shouldValidate: true,
        shouldDirty: true,
      })

      // Also add to the imageUrls array
      const currentImageUrls = getValues(`products.${rowIndex}.imageUrls`) || []
      setValue(`products.${rowIndex}.imageUrls`, [...currentImageUrls, reader.result as string], {
        shouldValidate: true,
        shouldDirty: true,
      })
    }
    reader.readAsDataURL(file)
    e.target.value = "" // Reset the file input after selection
  }

  // Toggle expanded image row
  const toggleExpandedImageRow = (rowId: string) => {
    setExpandedImageRows((prev) => (prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]))
  }

  // Add additional image URL to a product
  const addImageUrl = (rowIndex: number) => {
    const currentImageUrls = getValues(`products.${rowIndex}.imageUrls`) || []
    setValue(`products.${rowIndex}.imageUrls`, [...currentImageUrls, ""], {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  // Remove an image URL from a product
  const removeImageUrl = (rowIndex: number, imageIndex: number) => {
    const currentImageUrls = getValues(`products.${rowIndex}.imageUrls`) || []
    setValue(
      `products.${rowIndex}.imageUrls`,
      currentImageUrls.filter((_, idx) => idx !== imageIndex),
      { shouldValidate: true, shouldDirty: true },
    )
  }

  // Define columns for the grid
  const columns: { key: ProductColumnKey; label: string; type: "text" | "textarea" | "url" | "number" }[] = [
    { key: "title", label: "Title", type: "text" },
    { key: "imageUrl", label: "Primary Image", type: "url" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "price", label: "Price", type: "number" },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[color:var(--primary-color)]">Step 4: Products</h2>

      {/* CSV Upload Section - Updated */}
      <div className="flex items-center space-x-2 mb-4">
        <Button
          type="button"
          onClick={onCSVButtonClick}
          disabled={isParsing}
          className="flex items-center gap-2"
          variant="default"
        >
          {isParsing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              <FileUp className="h-4 w-4" />
              Bulk Upload CSV
            </>
          )}
        </Button>
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden" // Hide the raw input
          disabled={isParsing}
        />
        {csvError && <p className="text-xs text-red-600 dark:text-red-400">{csvError}</p>}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-4">
        Expected columns: Title, Image URL, Description, Price
      </p>

      {/* Editable Grid Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Edit Products</h3>
        {errors.products?.root && (
          <p className="text-xs text-red-600 dark:text-red-400">{errors.products.root.message}</p>
        )}
        {errors.products &&
          typeof errors.products === "object" &&
          !Array.isArray(errors.products) &&
          errors.products.message && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.products.message}</p>
          )}

        <div className="overflow-x-auto">
          <div className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-[var(--border-radius)]">
            {/* Header Row */}
            <div className="flex bg-gray-50 dark:bg-gray-800 p-2 font-medium text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {columns.map((col) => (
                <div key={col.key} className={`px-3 py-1 flex-1 ${col.key === "description" ? "flex-[2]" : ""}`}>
                  {col.label}
                </div>
              ))}
              <div className="w-28 px-3 py-1 text-right">Actions</div> {/* Width for buttons */}
            </div>

            {/* Data Rows */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {fields.map((field, index) => (
                <div key={field.rowId}>
                  <div className="flex items-start p-2 hover:bg-gray-50 dark:hover:bg-gray-750">
                    {columns.map((col) => (
                      <div
                        key={col.key}
                        className={`px-3 py-1 flex-1 ${col.key === "description" ? "flex-[2]" : ""} relative group`}
                      >
                        {/* Conditional rendering for input types */}
                        {col.type === "textarea" ? (
                          <textarea
                            {...register(`products.${index}.${col.key}` as const, {
                              required: col.key === "title" || col.key === "description" ? "Required" : false,
                            })}
                            rows={2}
                            className="mt-1 block w-full text-sm rounded-[var(--border-radius)] border-gray-300 shadow-sm focus:border-[color:var(--primary-color)] focus:ring-[color:var(--primary-color)] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder={col.label}
                          />
                        ) : col.key === "imageUrl" ? (
                          <div className="space-y-2">
                            <div className="relative">
                              <input
                                type="url"
                                {...register(`products.${index}.${col.key}` as const)}
                                className="mt-1 block w-full text-sm rounded-[var(--border-radius)] border-gray-300 shadow-sm focus:border-[color:var(--primary-color)] focus:ring-[color:var(--primary-color)] dark:bg-gray-700 dark:border-gray-600 dark:text-white pt-7"
                                placeholder="Primary Image URL"
                              />

                              {/* Image Preview */}
                              {getValues(`products.${index}.imageUrl`) && (
                                <div className="absolute right-1 top-3 h-5 w-5 overflow-hidden rounded-sm">
                                  <img
                                    src={getValues(`products.${index || "/placeholder.svg"}.imageUrl`)}
                                    alt="Preview"
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      ;(e.target as HTMLImageElement).style.display = "none"
                                    }}
                                  />
                                </div>
                              )}

                              {/* Upload and AI buttons */}
                              <div className="absolute top-1 left-1 flex space-x-1">
                                <label
                                  htmlFor={`upload-${field.rowId}`}
                                  className="text-[10px] bg-[color:var(--primary-color)] text-white px-1 py-0.5 rounded cursor-pointer hover:opacity-80"
                                  title="Upload Image"
                                >
                                  Upload
                                </label>
                                <input
                                  id={`upload-${field.rowId}`}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleImageUpload(e, index)}
                                />

                                <button
                                  type="button"
                                  onClick={() => handleAiFill(index, "imageUrl")}
                                  disabled={aiLoading[`${index}-imageUrl`]}
                                  title="Generate Image with AI"
                                  className="text-[10px] bg-blue-100 dark:bg-blue-900 text-[color:var(--primary-color)] rounded-[var(--border-radius)] p-0.5 disabled:opacity-50"
                                >
                                  {aiLoading[`${index}-imageUrl`] ? (
                                    <svg
                                      className="animate-spin h-3 w-3 text-[color:var(--primary-color)]"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      ></path>
                                    </svg>
                                  ) : (
                                    "AI Img"
                                  )}
                                </button>
                              </div>

                              {/* Toggle multiple images button */}
                              <button
                                type="button"
                                onClick={() => toggleExpandedImageRow(field.rowId)}
                                className="absolute top-1 right-1 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                title="Manage Multiple Images"
                              >
                                <ImageIcon className="h-3 w-3" />
                              </button>
                            </div>

                            {/* AI Error */}
                            {aiError[`${index}-imageUrl`] && (
                              <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">
                                {aiError[`${index}-imageUrl`]}
                              </p>
                            )}
                          </div>
                        ) : (
                          <input
                            type={col.type === "number" ? "number" : col.type === "url" ? "url" : "text"}
                            step={col.type === "number" ? "0.01" : undefined}
                            {...register(`products.${index}.${col.key}` as const, {
                              required: col.key === "title" ? "Required" : false,
                              valueAsNumber: col.type === "number" ? true : false,
                            })}
                            className="mt-1 block w-full text-sm rounded-[var(--border-radius)] border-gray-300 shadow-sm focus:border-[color:var(--primary-color)] focus:ring-[color:var(--primary-color)] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder={col.label}
                          />
                        )}

                        {/* AI Fill Button for non-image fields */}
                        {col.key !== "imageUrl" && (
                          <button
                            type="button"
                            onClick={() => handleAiFill(index, col.key as ProductColumnKey)}
                            disabled={aiLoading[`${index}-${col.key}`]}
                            title={`Generate ${col.label} with AI`}
                            className="absolute top-1 right-1 p-0.5 bg-blue-100 dark:bg-blue-900 text-[color:var(--primary-color)] rounded-[var(--border-radius)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-[10px] disabled:opacity-50"
                          >
                            {aiLoading[`${index}-${col.key}`] ? (
                              <svg
                                className="animate-spin h-3 w-3 text-[color:var(--primary-color)]"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                            ) : (
                              "AI ✨"
                            )}
                          </button>
                        )}

                        {/* Cell Validation Error */}
                        {errors.products?.[index]?.[col.key] && (
                          <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">
                            {errors.products[index]?.[col.key]?.message}
                          </p>
                        )}

                        {/* AI Error for non-image fields */}
                        {col.key !== "imageUrl" && aiError[`${index}-${col.key}`] && (
                          <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">
                            {aiError[`${index}-${col.key}`]}
                          </p>
                        )}
                      </div>
                    ))}

                    {/* Action Buttons per Row */}
                    <div className="w-28 px-3 py-1 flex flex-col items-end space-y-1">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-xs"
                        title="Remove Row"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Expanded Image URLs Section */}
                  {expandedImageRows.includes(field.rowId) && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 pl-12 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium">Additional Images</h4>
                        <button
                          type="button"
                          onClick={() => addImageUrl(index)}
                          className="text-xs flex items-center gap-1 text-[color:var(--primary-color)] hover:underline"
                        >
                          <Plus className="h-3 w-3" /> Add Image URL
                        </button>
                      </div>

                      {/* List of additional image URLs */}
                      <div className="space-y-2">
                        {getValues(`products.${index}.imageUrls`)?.map((_, imageIndex) => (
                          <div key={imageIndex} className="flex items-center gap-2">
                            <div className="flex-1 relative">
                              <input
                                type="url"
                                {...register(`products.${index}.imageUrls.${imageIndex}` as const)}
                                className="block w-full text-sm rounded-[var(--border-radius)] border-gray-300 shadow-sm focus:border-[color:var(--primary-color)] focus:ring-[color:var(--primary-color)] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder={`Additional Image URL ${imageIndex + 1}`}
                              />

                              {/* Image preview thumbnail */}
                              {getValues(`products.${index}.imageUrls.${imageIndex}`) && (
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 overflow-hidden rounded-sm">
                                  <img
                                    src={
                                      getValues(`products.${index || "/placeholder.svg"}.imageUrls.${imageIndex}`) ||
                                      "/placeholder.svg"
                                    }
                                    alt="Preview"
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      ;(e.target as HTMLImageElement).style.display = "none"
                                    }}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Upload button for this image URL */}
                            <label
                              htmlFor={`upload-additional-${field.rowId}-${imageIndex}`}
                              className="text-[10px] bg-[color:var(--primary-color)] text-white px-1 py-0.5 rounded cursor-pointer hover:opacity-80"
                              title="Upload Image"
                            >
                              Upload
                            </label>
                            <input
                              id={`upload-additional-${field.rowId}-${imageIndex}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setValue(`products.${index}.imageUrls.${imageIndex}`, reader.result as string, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                  })
                                }
                                reader.readAsDataURL(file)
                                e.target.value = ""
                              }}
                            />

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => removeImageUrl(index, imageIndex)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              title="Remove Image"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}

                        {/* Empty state if no additional images */}
                        {(!getValues(`products.${index}.imageUrls`) ||
                          getValues(`products.${index}.imageUrls`).length === 0) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                            No additional images. Click "Add Image URL" to add more images.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add Row Button */}
        <div className="flex justify-center">
          <Button type="button" onClick={addRow} variant="outline" className="mt-2 flex items-center gap-1">
            <PlusCircle className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>
    </div>
  )
}

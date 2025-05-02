"use client"

import type React from "react"
import { useState } from "react"
import { useForm, type SubmitHandler } from "react-hook-form"
import type { StoreFormData } from "@/types/store"
import { BasicInfoStep } from "./BasicInfoStep"
import { LogoStep } from "./LogoStep"
import { DescriptionStep } from "./DescriptionStep"
import { ProductsStep } from "./ProductsStep"
import { ThemeStep } from "./ThemeStep"
import { SummaryStep } from "./SummaryStep"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

const TOTAL_STEPS = 6

const defaultValues: StoreFormData = {
  storeName: "",
  storeDescription: "",
  logoUrl: "",
  theme: "modern",
  products: [{ id: "1", title: "", imageUrl: "", description: "", price: "" }],
}

export const StoreWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm<StoreFormData>({
    defaultValues,
    mode: "onChange",
  })

  const nextStep = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const onSubmit: SubmitHandler<StoreFormData> = async (data) => {
    setIsLoading(true)
    setSubmitError(null)

    try {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({ message: "Failed to create store." }))
        throw new Error(result.message || "Failed to create store.")
      }

      const result = await response.json()
      router.push(`/store/${result.storeId}`)
    } catch (error: any) {
      console.error("Error creating store:", error)
      setSubmitError(error.message || "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfoStep register={register} errors={errors} />
      case 2:
        return <LogoStep register={register} errors={errors} setValue={setValue} getValues={getValues} />
      case 3:
        return <DescriptionStep register={register} errors={errors} />
      case 4:
        return (
          <ProductsStep
            register={register}
            control={control}
            errors={errors}
            setValue={setValue}
            getValues={getValues}
          />
        )
      case 5:
        return <ThemeStep register={register} errors={errors} setValue={setValue} getValues={getValues} />
      case 6:
        return <SummaryStep getValues={getValues} />
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[color:var(--primary-color)]">Create Your Store</h1>
          <div className="text-sm text-gray-500">
            Step {currentStep} of {TOTAL_STEPS}
          </div>
        </div>

        {renderStep()}

        {submitError && <div className="p-3 bg-red-100 text-red-700 rounded-md">{submitError}</div>}

        <div className="flex justify-between pt-4">
          {currentStep > 1 ? (
            <Button type="button" onClick={prevStep} variant="outline">
              Previous
            </Button>
          ) : (
            <div></div> // Empty div for spacing
          )}

          {currentStep < TOTAL_STEPS ? (
            <Button type="button" onClick={nextStep}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading || !isValid}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Your Store"
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

"use client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

interface MovieFormProps {
  data: {
    prompt: string
    numberOfClips: number
    clipDuration: number
    transitionDuration: number
  }
  onChange: (data: any) => void
  disabled?: boolean
}

export function MovieForm({ data, onChange, disabled = false }: MovieFormProps) {
  const handleChange = (field: string, value: any) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="movie-prompt">Movie Prompt</Label>
        <Input
          id="movie-prompt"
          placeholder="Describe the movie scene you want to generate..."
          value={data.prompt}
          onChange={(e) => handleChange("prompt", e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="number-of-clips">Number of Clips: {data.numberOfClips}</Label>
        </div>
        <Slider
          id="number-of-clips"
          min={1}
          max={5}
          step={1}
          value={[data.numberOfClips]}
          onValueChange={(value) => handleChange("numberOfClips", value[0])}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="clip-duration">Clip Duration: {data.clipDuration}s</Label>
        </div>
        <Slider
          id="clip-duration"
          min={5}
          max={8}
          step={1}
          value={[data.clipDuration]}
          onValueChange={(value) => handleChange("clipDuration", value[0])}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="transition-duration">Transition Duration: {data.transitionDuration}s</Label>
        </div>
        <Slider
          id="transition-duration"
          min={0.5}
          max={2}
          step={0.5}
          value={[data.transitionDuration]}
          onValueChange={(value) => handleChange("transitionDuration", value[0])}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

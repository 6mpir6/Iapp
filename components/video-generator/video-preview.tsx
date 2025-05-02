import { Film } from "lucide-react"

interface VideoPreviewProps {
  videoUrl: string | null
}

export function VideoPreview({ videoUrl }: VideoPreviewProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 h-full flex flex-col">
      {videoUrl ? (
        <div className="flex flex-col h-full">
          <div className="flex-grow relative min-h-[240px]">
            <video src={videoUrl} className="w-full h-full object-contain" controls autoPlay playsInline />
          </div>
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex justify-center">
            <a
              href={videoUrl}
              download="ai-generated-video.mp4"
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download Video
            </a>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full min-h-[240px] p-6">
          <Film className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 text-center">Video Preview</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
            Your generated video will appear here. Add scenes to the timeline and click "Generate Video" to create your
            video.
          </p>
        </div>
      )}
    </div>
  )
}

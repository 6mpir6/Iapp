"use client"

import { useState } from "react"

export function SearchBar() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={`relative transition-all duration-300 ${isExpanded ? "w-full md:w-80" : "w-auto"}`}>
      {isExpanded ? (
        <div className="flex items-center border-b border-white">
          <input
            type="text"
            placeholder="Search products..."
            className="w-full bg-transparent border-none text-white px-4 py-2 focus:outline-none placeholder:text-white/70"
            autoFocus
          />
          <button className="p-2 text-white" onClick={() => setIsExpanded(false)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      ) : (
        <button className="p-2 text-white hidden md:block" onClick={() => setIsExpanded(true)}>
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
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

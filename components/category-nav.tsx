export function CategoryNav() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="text-2xl font-normal mb-12 uppercase tracking-wider text-gray-900 dark:text-white">Categories</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8">
        <a href="#apparel" className="group">
          <div className="flex flex-col items-center transition-all duration-300">
            <div className="w-16 h-16 flex items-center justify-center mb-4 border border-gray-900 dark:border-white group-hover:bg-gray-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-gray-900 text-gray-900 dark:text-white transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <span className="font-normal uppercase tracking-wider text-sm text-gray-900 dark:text-white">Apparel</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">42 Products</span>
          </div>
        </a>

        <a href="#footwear" className="group">
          <div className="flex flex-col items-center transition-all duration-300">
            <div className="w-16 h-16 flex items-center justify-center mb-4 border border-gray-900 dark:border-white group-hover:bg-gray-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-gray-900 text-gray-900 dark:text-white transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <span className="font-normal uppercase tracking-wider text-sm text-gray-900 dark:text-white">Footwear</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">28 Products</span>
          </div>
        </a>

        <a href="#accessories" className="group">
          <div className="flex flex-col items-center transition-all duration-300">
            <div className="w-16 h-16 flex items-center justify-center mb-4 border border-gray-900 dark:border-white group-hover:bg-gray-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-gray-900 text-gray-900 dark:text-white transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 8v13m0-13V6a4 4 0 00-4-4H8.8a4 4 0 00-4 4v12h10.2a4 4 0 004-4V8h-7z"
                />
              </svg>
            </div>
            <span className="font-normal uppercase tracking-wider text-sm text-gray-900 dark:text-white">
              Accessories
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">36 Products</span>
          </div>
        </a>

        <a href="#home" className="group">
          <div className="flex flex-col items-center transition-all duration-300">
            <div className="w-16 h-16 flex items-center justify-center mb-4 border border-gray-900 dark:border-white group-hover:bg-gray-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-gray-900 text-gray-900 dark:text-white transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <span className="font-normal uppercase tracking-wider text-sm text-gray-900 dark:text-white">Home</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">24 Products</span>
          </div>
        </a>

        <a href="#fitness" className="group">
          <div className="flex flex-col items-center transition-all duration-300">
            <div className="w-16 h-16 flex items-center justify-center mb-4 border border-gray-900 dark:border-white group-hover:bg-gray-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-gray-900 text-gray-900 dark:text-white transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
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
            </div>
            <span className="font-normal uppercase tracking-wider text-sm text-gray-900 dark:text-white">Fitness</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">18 Products</span>
          </div>
        </a>
      </div>
    </div>
  )
}

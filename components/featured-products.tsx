export function FeaturedProducts() {
  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Featured Products</h2>
          <p className="text-gray-600 dark:text-gray-300">Our most popular items this season</p>
        </div>
        <div className="mt-4 md:mt-0">
          <a
            href="#"
            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400 font-medium flex items-center"
          >
            View All
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Featured Product 1 */}
        <a
          href="/store/product/nike-air-max"
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden group hover:shadow-lg transition duration-300"
        >
          <div className="relative">
            <div className="relative h-80 overflow-hidden">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Nike%20Air%20Max%20Nuaxis.jpg-QZjb3wNhRXllOM8owGO0DRnWCJ1n0p.jpeg"
                alt="Nike Air Max Nuaxis"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            </div>
            <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              NEW
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex justify-center space-x-2">
                <button className="bg-white text-gray-900 p-2 rounded-full hover:bg-emerald-500 hover:text-white transition-colors">
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </button>
                <button className="bg-white text-gray-900 p-2 rounded-full hover:bg-emerald-500 hover:text-white transition-colors">
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
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">Nike Air Max Nuaxis</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Footwear</p>
              </div>
              <span className="font-bold text-lg text-gray-900 dark:text-white">$129.99</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Breathable and comfortable, perfect for everyday life.
            </p>
            <button className="w-full bg-gray-900 text-white py-3 rounded-md hover:bg-emerald-600 transition duration-300 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              Add to Cart
            </button>
          </div>
        </a>

        {/* Featured Product 2 */}
        <a
          href="/store/product/outworked-hoodie"
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden group hover:shadow-lg transition duration-300"
        >
          <div className="relative">
            <div className="relative h-80 overflow-hidden">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/I%20Outworked%20You%20Hoodie%202.jpg-irrr9cRt2Ksk3iRdJCajlGv6X2uSoz.jpeg"
                alt="I Outworked You Hoodie"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            </div>
            <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              BESTSELLER
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex justify-center space-x-2">
                <button className="bg-white text-gray-900 p-2 rounded-full hover:bg-emerald-500 hover:text-white transition-colors">
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </button>
                <button className="bg-white text-gray-900 p-2 rounded-full hover:bg-emerald-500 hover:text-white transition-colors">
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
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">I Outworked You Hoodie</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Apparel</p>
              </div>
              <span className="font-bold text-lg text-gray-900 dark:text-white">$65.00</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Soft, smooth, and stylish for cooler evenings.
            </p>
            <button className="w-full bg-gray-900 text-white py-3 rounded-md hover:bg-emerald-600 transition duration-300 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              Add to Cart
            </button>
          </div>
        </a>

        {/* Featured Product 3 */}
        <a
          href="/store/product/velvet-sofa"
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden group hover:shadow-lg transition duration-300"
        >
          <div className="relative">
            <div className="relative h-80 overflow-hidden">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Laurindo%2070%27%27%20Velvet%20Sofa%203.WEBP-r4kv9W0oerc6KKIDPfiSruGbz1pRZi.webp"
                alt="Laurindo 70'' Velvet Sofa"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            </div>
            <div className="absolute top-4 right-4 bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              SALE
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex justify-center space-x-2">
                <button className="bg-white text-gray-900 p-2 rounded-full hover:bg-emerald-500 hover:text-white transition-colors">
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </button>
                <button className="bg-white text-gray-900 p-2 rounded-full hover:bg-emerald-500 hover:text-white transition-colors">
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
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">Laurindo 70'' Velvet Sofa</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Home</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-lg text-gray-900 dark:text-white">$899.99</span>
                <p className="text-red-500 text-sm line-through">$1,199.99</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Mid-century modern design with luxurious velvet upholstery.
            </p>
            <button className="w-full bg-gray-900 text-white py-3 rounded-md hover:bg-emerald-600 transition duration-300 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              Add to Cart
            </button>
          </div>
        </a>
      </div>
    </div>
  )
}

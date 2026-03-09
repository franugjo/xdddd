/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',      // To wymusza wygenerowanie statycznego HTML
  basePath: '/xx',       // To mówi Next.js, że strona leży w podfolderze /xx/
  images: {
    unoptimized: true,   // GitHub Pages nie obsługuje automatycznej optymalizacji zdjęć Next.js
  },
};

export default nextConfig;

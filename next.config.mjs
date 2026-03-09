/** @type {import('next').NextConfig} */
const nextConfig = {
  // Wymusza wygenerowanie statycznych plików HTML/CSS/JS
  output: 'export',
  
  // Informuje Next.js, że strona będzie pod adresem /xdddd/
  basePath: '/xdddd',
  
  // Wyłącza optymalizację obrazów (wymagane na GitHub Pages)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

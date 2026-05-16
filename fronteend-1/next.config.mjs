/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "hebbkx1anhila5yf.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
}

export default nextConfig

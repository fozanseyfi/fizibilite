/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Türkçe metinlerdeki apostrof/entity lint kurallarını build'de atla; TS tip kontrolü açık kalır.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

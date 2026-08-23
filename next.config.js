/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  experimental: {
    serverActions: {
      // Las imágenes viajan al bucket DENTRO de una Server Action
      // (ver app/admin/productos/actions.ts). El límite por defecto del
      // body de una Server Action es 1 MB: sin esto, cualquier foto de
      // producto real fallaría con "Body exceeded 1mb limit" y el
      // error ni siquiera llegaría claro a la UI.
      // 8 MB = 5 MB de límite por archivo (lib/image-upload.ts) más el
      // overhead del multipart. Se sube UN archivo por request, así que
      // este techo no depende de cuántas imágenes se elijan a la vez.
      bodySizeLimit: "8mb",
    },
  },
};

module.exports = nextConfig;

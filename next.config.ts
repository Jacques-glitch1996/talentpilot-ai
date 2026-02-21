import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        // Appliquer à toutes les routes
        source: "/:path*",
        headers: [
          // Empêche le "sniffing" de type MIME
          { key: "X-Content-Type-Options", value: "nosniff" },

          // Empêche l’app d’être intégrée dans un iframe
          { key: "X-Frame-Options", value: "DENY" },

          // Réduit les fuites de référent
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // Permissions modernes (désactive ce qui n’est pas nécessaire)
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "payment=()",
              "usb=()",
              "interest-cohort=()",
            ].join(", "),
          },

          // HSTS: force HTTPS (en prod seulement; Vercel est HTTPS)
          // (Note: safe même en local, mais utile surtout en prod)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;

export default defineNuxtConfig({
  modules: [
    "@nuxtjs/tailwindcss",
    "@nuxt/icon",
    "@nuxtjs/supabase",
    "@pinia/nuxt",
    "pinia-plugin-persistedstate/nuxt",
    "@nuxtjs/device",
    "@nuxtjs/google-fonts",
    [
      "@nuxtjs/google-fonts",
      {
        families: {
          Lato: [100, 300, 400, 700, 900],
          "Cormorant+Garamond": [300, 400, 500, 600, 700],
          "Proza+Libre": [400, 500, 600, 700, 800],
        },
        display: "swap", // 'auto' | 'block' | 'swap' | 'fallback' | 'optional'
        preload: true,
        download: true, // This will download the fonts to your public directory
        base64: false, // Set to true if you want to inline the fonts in your CSS
      },
    ],
  ],
  runtimeConfig: {
    public: {
      supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_KEY,
        redirect: false,
      },
    },
  },
  css: ["~/assets/css/main.css"],
  compatibilityDate: "2025-02-11",
  build: {
    transpile: ["v-calendar"],
  },
});

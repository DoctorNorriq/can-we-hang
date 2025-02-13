export default defineNuxtConfig({
  modules: [
    "@nuxtjs/tailwindcss",
    "@nuxt/icon",
    "@nuxtjs/supabase",
    "@pinia/nuxt",
    "pinia-plugin-persistedstate/nuxt",
    "@nuxtjs/device",
    "@nuxtjs/google-fonts",
  ],
  googleFonts: {
    families: {
      Lato: [300, 400, 700],
      Caveat: [400, 700],
    },
    display: "swap",
    prefetch: true,
    preconnect: true,
    preload: true,
  },
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
  tailwindcss: {
    config: {
      content: [
        "./components/**/*.{js,vue,ts}",
        "./layouts/**/*.vue",
        "./pages/**/*.vue",
        "./plugins/**/*.{js,ts}",
        "./nuxt.config.{js,ts}",
      ],
    },
  },
  compatibilityDate: "2025-02-11",
  build: {
    transpile: ["v-calendar"],
  },
});

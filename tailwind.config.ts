import type { Config } from "tailwindcss";

export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        coffee: {
          espresso: "#3E2723",
          latte: "#D7CCC8",
          cappuccino: "#8D6E63",
          mocha: "#6D4C41",
          crema: "#FFECB3",
          bean: "#4E342E",
          foam: "#EFEBE9",
        },
        accent: {
          teal: "#4DB6AC",
          orange: "#FFB74D",
          burgundy: "#AD1457",
          green: "#2E7D32",
          gold: "#FFC107",
          blue: "#546E7A",
          coral: "#FF8A65",
        },
      },
      fontFamily: {
        sans: ["Lato", "sans-serif"],
        handwritten: ["Caveat", "cursive"],
      },
    },
  },
};

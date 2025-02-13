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
      },
      fontFamily: {
        sans: ["Lato", "sans-serif"],
        handwritten: ["Caveat", "cursive"],
      },
    },
  },
};

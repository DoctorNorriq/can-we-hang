import { defineStore } from "pinia";

export const useUserStore = defineStore("user", {
  state: () => ({
    name: "",
  }),
  actions: {
    setName(name: string) {
      this.name = name;
    },
    clearName() {
      this.name = "";
    },
  },
  persist: true,
});

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#FF8C42", deep: "#E67A32", pale: "#FFF7ED" },
        ink: "#1A1A1A",
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",
      },
      boxShadow: { soft: "0 8px 30px rgba(48, 35, 23, .06)" },
    },
  },
  plugins: [],
};

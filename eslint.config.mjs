import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [".next/**", "out/**", "build/**", "public/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  {
    // eslint-config-next 16 bundles react-hooks v6, which newly enables
    // React-Compiler-era rules that flag pre-existing, working patterns.
    // Keep them off to preserve the prior lint behavior; addressing these
    // (or adopting the React Compiler) is tracked as a separate follow-up.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/error-boundaries": "off",
    },
  },
];

export default eslintConfig;

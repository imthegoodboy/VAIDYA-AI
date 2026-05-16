import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["**/*.d.ts"],
    rules: {
      "no-var": "off",
    },
  },
  {
    ignores: [
      ".next/**",
      "next-env.d.ts",
      "node_modules/**",
      "public/**",
    ],
  },
];

export default config;

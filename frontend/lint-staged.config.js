// lint-staged.config.js
export default {
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix --max-warnings=100', // More tolerant of warnings
    'prettier --write',
  ],
  '*.{json,css,scss,md}': ['prettier --write'],
};

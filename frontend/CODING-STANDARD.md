# Coding Standards and Guidelines

## Naming Conventions

- **React Components**: Use PascalCase (e.g., `UserProfile.jsx`)
- **Utility files**: Use camelCase (e.g., `formatDate.js`)
- **Constants**: Use UPPER_SNAKE_CASE
- **Variables & Functions**: Use camelCase
- **CSS classes**: Use kebab-case

## File Structure

```
src/
├── components/       # Reusable UI components
│   └── Button/       # Component folder
│       ├── index.js  # Main export
│       ├── Button.jsx # Component implementation
│       └── Button.test.js # Tests
├── pages/            # Page components
├── context/          # React contexts
├── hooks/            # Custom hooks
├── utils/            # Utility functions
├── services/         # API services
└── assets/           # Static assets
```

## Code Review Checklist

- [ ] Code follows naming conventions
- [ ] No ESLint/StyleLint warnings
- [ ] Tests are included
- [ ] Documentation is updated
- [ ] No commented-out code
- [ ] No console.log statements
- [ ] Component props are documented

### ✅ **Backend Coding Standards and Guidelines**

---

### **Naming Conventions:**

* **Controllers:** camelCase and end with `Controller.js`

  * e.g., `userController.js`, `authController.js`

* **Models:** camelCase

  * e.g., `userSchema.js`, `orderSchema.js`

* **Routes:** camelCase

  * e.g., `userRoutes.js`, `authRoutes.js`

* **Services:** camelCase

  * e.g., `authService.js`, `emailService.js`

* **Utilities:** camelCase

  * e.g., `jwtHelper.js`, `dateHelper.js`

* **Environment Variables:** `UPPER_SNAKE_CASE`

---

### **File Structure:**

```
backend/
├── config/           # Environment variables, DB connections
│   └── db.js
├── controllers/      # Request handlers
│   └── userController.js
│   └── authController.js
├── middleware/       # Middleware functions
│   └── authMiddleware.js
│   └── errorHandler.js
├── models/           # Database schemas
│   └── User.js
│   └── Order.js
├── routes/           # API routes
│   └── user-routes.js
│   └── auth-routes.js
├── services/         # Business logic
│   └── authService.js
│   └── emailService.js
├── utils/            # Utility functions
│   └── jwtHelper.js
│   └── dateHelper.js
├── validations/      # Request validation
│   └── userValidation.js
├── tests/            # Unit and integration tests
│   └── auth.test.js
│   └── user.test.js
├── server.js         # Entry point
├── .env              # Environment variables
├── .eslintrc.js      # ESLint configuration
├── .prettierrc.js    # Prettier configuration
├── .husky/           # Husky hooks
└── package.json      # NPM scripts and dependencies
```

---

### ✅ **Code Review Checklist:**

* [ ] Follows naming conventions
* [ ] No ESLint/Prettier warnings
* [ ] Error handling is properly implemented
* [ ] Controllers are lean and modular
* [ ] Services handle business logic
* [ ] Database queries are parameterized
* [ ] Sensitive data is not hardcoded
* [ ] No `console.log()` statements in production code
* [ ] Environment variables are correctly used
* [ ] Tests cover core business logic
* [ ] Consistent response structure (`success`, `data`, `message`)
* [ ] All routes are properly validated
* [ ] API documentation is up-to-date

---

### ✅ **Best Practices:**

* **Security:**

  * Sanitize inputs to prevent SQL injection and XSS.
  * Use HTTPS for secure data transfer.
  * Implement JWT for authentication.

* **Error Handling:**

  * Use a global error handler (`errorHandler.js`).
  * Standardize error responses with status codes and messages.

* **Environment Management:**

  * Store secrets in `.env` file.
  * Use `dotenv` to access environment variables.

* **Code Quality:**

  * Use ESLint for linting.
  * Use Prettier for formatting.
  * Run tests before committing.

* **Logging:**

  * Use `winston` or `pino` for structured logging.
  * Avoid using `console.log()` in production.


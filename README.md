[![banner](https://raw.githubusercontent.com/nevermined-io/assets/main/images/logo/banner_logo.png)](https://nevermined.io)

# Finance Agent

This project is a conversational financial agent developed as a sample to test the Nevermined payments platform. It allows users to interact and ask questions about stocks, market trends, and financial news, integrating APIs like AlphaVantage and demonstrating payment capabilities.

## Main Features
- Analyze stock performance (e.g., AAPL last 6 months)
- List top performing stocks
- Recommend low-risk stocks in specific sectors
- Fetch latest news about companies
- **Integrates and tests the Nevermined payments platform**

## Project Structure
```
src/
  api/           # External API integrations (AlphaVantage, news, etc.)
  controllers/   # Business logic and orchestration
  llm/           # LangChain logic and prompts
  middleware/    # Express middlewares (authentication, etc.)
  models/        # TypeScript types and interfaces
  routes/        # Express routes
  utils/         # Utilities and payment logic
  index.ts       # Express server entry point
tests/           # Unit, integration, and end-to-end tests
```

## Installation & Usage
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up your `.env` file with the required API keys (see `.env.example`).
3. Start the server in development mode:
   ```bash
   npm run dev
   ```

## Tests
The project includes unit, integration, and end-to-end tests to ensure quality and correct operation, especially for the integration with the Nevermined payments platform.

- Run all tests:
  ```bash
  npm test
  ```
- Tests are located in the `tests/` folder and include:
  - Unit tests for controllers and utilities
  - Integration tests for payments and external APIs
  - End-to-end tests for the complete agent

## License
MIT 
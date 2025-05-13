import { execSync } from "child_process";
import chalk from "chalk";
import figlet from "figlet";

console.clear();


try {
  console.log(chalk.green.bold(figlet.textSync("Running eslint", { font: "Slant" })));
  console.log(chalk.green.bold("📦 Linting Backend..."));
  execSync("npm --prefix backend run lint", { stdio: "inherit" });
  console.log(chalk.green.bold("📦 Linting Backend is completed"));

  console.log(chalk.green.bold("\n 👨‍💻 Linting Frontend..."));
  execSync("npm --prefix frontend run lint", { stdio: "inherit" });
  console.log(chalk.green.bold("👨‍💻 Linting Frontend is completed"));

  console.log(chalk.yellow.bold(figlet.textSync("Running prettier", { font: "Slant" })));
  console.log(chalk.yellow.bold("\n✨ Formatting Backend..."));
  execSync("npm --prefix backend run format", { stdio: "inherit" });
  console.log(chalk.yellow.bold("✨ Formatting Backend is completed"));

  console.log(chalk.yellow.bold("\n✨ Formatting Frontend..."));
  execSync("npm --prefix frontend run format", { stdio: "inherit" });
  console.log(chalk.yellow.bold("✨ Formatting Frontend is completed"));

  console.log(chalk.green.bold("\n✅ Lint & Format Complete!\n"));
} catch (error) {
  console.log(chalk.red.bold("\n❌ Lint/Format failed.\n, Check the error :", error.message));
  console.log(chalk.red.bold("🚩Please fix the issues, errors, warnings and try again.\n"));
  process.exit(1);
}
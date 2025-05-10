import { execSync } from "child_process";
import chalk from "chalk";

console.clear();
console.log(chalk.blue.bold("\n🚀 Running Lint & Format Checks...\n"));

try {
  console.log(chalk.green("📦 Linting Backend..."));
  execSync("npm --prefix backend run lint", { stdio: "inherit" });

  console.log(chalk.green("\n📦 Linting Frontend..."));
  execSync("npm --prefix frontend run lint", { stdio: "inherit" });

  console.log(chalk.yellow("\n✨ Formatting Backend..."));
  execSync("npm --prefix backend run format", { stdio: "inherit" });

  console.log(chalk.yellow("\n✨ Formatting Frontend..."));
  execSync("npm --prefix frontend run format", { stdio: "inherit" });

  console.log(chalk.green.bold("\n✅ Lint & Format Complete!\n"));
} catch (error) {
  console.log(chalk.red.bold("\n❌ Lint/Format failed.\n"));
  process.exit(1);
}

import { defineSandbox } from "eve/sandbox";
import { vercel } from "eve/sandbox/vercel";

export default defineSandbox({
  backend: vercel(),
  async bootstrap({ use }) {
    const sandbox = await use();
    // Seed files land after bootstrap, so the install names the template's dependency.
    const install = await sandbox.run({ command: "npm install --save-dev vite@8" });
    if (install.exitCode !== 0) throw new Error(`Installing vite failed: ${install.stderr}`);
  },
});

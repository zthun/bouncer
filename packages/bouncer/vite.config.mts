import {
  extensionLibrary,
  extensionTestSerially,
  projectNode,
} from "@zthun/janitor-vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [projectNode(), extensionLibrary(), extensionTestSerially()],
});

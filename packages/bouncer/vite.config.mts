import { extensionLibrary, projectNode } from "@zthun/janitor-vite";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [projectNode(), extensionLibrary()] });

import { createApp } from "vue";
import "./assets/main.css";

async function boot() {
  let hasPreviewBackend = false;
  try {
    const res = await fetch("/api/document");
    hasPreviewBackend = res.ok;
  } catch {
    hasPreviewBackend = false;
  }

  const component = hasPreviewBackend
    ? (await import("./App.vue")).default
    : (await import("./components/AppShell.vue")).default;

  createApp(component).mount("#app");
}

boot();

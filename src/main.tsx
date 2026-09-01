
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
import "./lib/leafletIconFix";
import { installFormAccessibilityEnhancements } from "./lib/formAccessibility";

  installFormAccessibilityEnhancements();

  createRoot(document.getElementById("root")!).render(<App />);
  
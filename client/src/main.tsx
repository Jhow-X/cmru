import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Import Remix icon for the Netflix-style interface
import "remixicon/fonts/remixicon.css";

createRoot(document.getElementById("root")!).render(<App />);

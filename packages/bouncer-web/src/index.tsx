import { ZRouter } from "@zthun/fashion-boutique";
import React from "react";
import { createRoot } from "react-dom/client";
import { ZBouncerApp } from "./app/app.js";

const container = createRoot(document.getElementById("zthunworks-bouncer")!);

container.render(
  <React.StrictMode>
    <ZRouter>
      <ZBouncerApp />
    </ZRouter>
  </React.StrictMode>,
);

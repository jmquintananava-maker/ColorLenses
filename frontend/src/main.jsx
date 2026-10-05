import React from "react";

import ReactDOM from "react-dom/client";

import {
  BrowserRouter
} from "react-router-dom";

import App from "./App";

import "./styles/global.css";
import "./styles/redesign.css";
import "./styles/editorial.css";
import "./styles/experience.css";

ReactDOM.createRoot(

  document.getElementById("root")

).render(

  <BrowserRouter>

    <App />

  </BrowserRouter>

);
// ColorLenses Contemporary 3.0: capa visual compartida.
import "./styles/contemporary.css";
import "./styles/branding.css";

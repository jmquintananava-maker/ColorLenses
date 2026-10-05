import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.js";


ReactDOM.createRoot(document.getElementById("root")).render(_jsx(BrowserRouter, { children: _jsx(App, {}) }));

import { render } from "@solidjs/web";
import { RouterProvider } from "@tanstack/solid-router";
import { getRouter } from "./router";
import "./styles/app.css";

const root = document.getElementById("app");
if (!root) throw new Error("Missing application root");
const router = getRouter();
render(() => <RouterProvider router={router} />, root);

import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import Landing from "./pages/Landing";
import Game from "./pages/Game";
import Results from "./pages/Results";
import Leaderboard from "./pages/Leaderboard";
import NameSubmissionWrapper from "./pages/NameSubmissionWrapper";
import "./index.css";
const Board = React.lazy(() => import("./features/board"));

// main.tsx – before ReactDOM.createRoot(...)
(() => {
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isSafari) document.documentElement.classList.add("safari");
})();


const router = createBrowserRouter([
  {
    element: <RootLayout />, // <- wraps all pages with AnimatePresence + PageTransition
    children: [
      { path: "/", element: <Landing /> },
      { path: "/game", element: <Game /> },
      { path: "/name-submission", element: <NameSubmissionWrapper /> },
      { path: "/results", element: <Results /> },
      { path: "/leaderboard", element: <Leaderboard /> },
      { path: "/board", element: <React.Suspense fallback={null}><Board/></React.Suspense> }
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

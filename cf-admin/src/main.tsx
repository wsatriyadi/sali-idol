import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import "./index.css";
import AdminShell from "./components/AdminShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Peserta from "./pages/Peserta";
import Voting from "./pages/Voting";
import Undian from "./pages/Undian";
import Pemenang from "./pages/Pemenang";
import Pengaturan from "./pages/Pengaturan";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/admin",
    element: <AdminShell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "peserta", element: <Peserta /> },
      { path: "voting", element: <Voting /> },
      { path: "undian", element: <Undian /> },
      { path: "pemenang", element: <Pemenang /> },
      { path: "pengaturan", element: <Pengaturan /> },
    ],
  },
  { path: "*", element: <Navigate to="/admin" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

import { useMemo } from "react";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { createRoutes } from "@/router/routes";
import "./App.css";

export default function App() {
  // Use HashRouter for Electron compatibility
  const router = useMemo(() => {
    return createHashRouter(createRoutes());
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}



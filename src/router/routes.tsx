import { RouteObject } from "react-router-dom";
import Index from "@/pages/Index";
import QuotationsIndex from "@/pages/quotations/Index";
import NewQuotation from "@/pages/quotations/New";
import EditQuotation from "@/pages/quotations/Edit";
import ViewQuotation from "@/pages/quotations/View";
import ReportsIndex from "@/pages/reports/Index";
import SettingsIndex from "@/pages/settings/Index";
import NotFound from "@/pages/NotFound";

export const createRoutes = (): RouteObject[] => [
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/quotations",
    element: <QuotationsIndex />,
  },
  {
    path: "/quotations/new",
    element: <NewQuotation />,
  },
  {
    path: "/quotations/:id/edit",
    element: <EditQuotation />,
  },
  {
    path: "/quotations/:id",
    element: <ViewQuotation />,
  },
  {
    path: "/reports",
    element: <ReportsIndex />,
  },
  {
    path: "/settings",
    element: <SettingsIndex />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];



import { ModeToggle } from "./ModeToggle";
import { Link, useLocation } from "react-router-dom";
import { FileText, Settings, Home, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const navLinks = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/quotations", icon: FileText, label: "Quotations" },
    { to: "/reports", icon: BarChart3, label: "Reports" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-layout">
      <nav className="top-nav">
        <div className="nav-container px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-4">
              {settings?.logo_url ? (
                <img 
                  src={settings.logo_url} 
                  alt="Company Logo" 
                  className="h-8 w-auto"
                />
              ) : (
                <h1 className="text-xl font-semibold gradient-text">
                  Quotation Desktop
                </h1>
              )}
            </div>
            <div className="hidden sm:flex nav-menu">
              {navLinks.map((link) => (
                <Link 
                  key={link.to} 
                  to={link.to} 
                  className={cn(
                    "nav-link flex items-center",
                    isActive(link.to) && "text-primary font-medium"
                  )}
                >
                  <link.icon className="h-4 w-4 mr-2" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <ModeToggle />
          </div>
        </div>
        <div className="sm:hidden overflow-x-auto flex nav-menu px-4 border-t border-border/50 py-2">
          {navLinks.map((link) => (
            <Link 
              key={link.to} 
              to={link.to} 
              className={cn(
                "nav-link whitespace-nowrap flex items-center",
                isActive(link.to) && "text-primary font-medium"
              )}
            >
              <link.icon className="h-4 w-4 mr-2" />
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="app-main">
        <div className="app-container">
          {children}
        </div>
      </main>
    </div>
  );
}



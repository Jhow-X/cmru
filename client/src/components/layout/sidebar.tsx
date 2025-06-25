import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type SidebarProps = {
  activeItem?: string;
};

export default function Sidebar({ activeItem = "home" }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Only show sidebar for admin users
  if (!user || user.role !== "admin") return null;
  
  const menuItems = [
    { id: "home", label: "Início", icon: "ri-home-line", path: "/" },
    { id: "admin", label: "Dashboard", icon: "ri-dashboard-line", path: "/admin" },
    { id: "users", label: "Usuários", icon: "ri-user-line", path: "/admin?tab=users" },
    { id: "gpts", label: "GPTs", icon: "ri-robot-line", path: "/admin?tab=gpts" },
    { id: "reports", label: "Relatórios", icon: "ri-line-chart-line", path: "/admin?tab=reports" },
    { id: "settings", label: "Configurações", icon: "ri-settings-4-line", path: "/admin?tab=settings" },
  ];
  
  return (
    <aside className="hidden md:block w-64 bg-secondary-dark p-4 min-h-screen">
      <div className="flex items-center mb-8">
        <i className="ri-scales-3-line text-2xl text-accent mr-2"></i>
        <h2 className="text-xl font-bold">GPT Câmara Admin</h2>
      </div>
      
      <nav>
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <Link
                href={item.path}
                className={cn(
                  "flex items-center p-2 rounded transition cursor-pointer",
                  (activeItem === item.id || location === item.path)
                    ? "bg-primary text-accent"
                    : "hover:bg-primary hover:text-accent"
                )}
              >
                <i className={`${item.icon} mr-3`}></i>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="mt-auto pt-6 border-t border-neutral-800 mt-8">
        <div className="flex items-center p-2">
          <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center mr-3">
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="w-8 h-8 rounded-full object-cover" 
              />
            ) : (
              <span className="text-sm font-semibold">
                {user?.name.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="font-medium truncate">{user?.name}</p>
            <p className="text-xs text-neutral-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

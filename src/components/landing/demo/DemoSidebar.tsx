import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Target, 
  Calendar,
  Share2
} from "lucide-react";
import logo from "@/assets/senseys-logo-new.png";

interface DemoSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: Users, label: "Clientes", id: "clients" },
  { icon: CheckSquare, label: "Tarefas", id: "tasks" },
  { icon: Target, label: "CRM", id: "crm" },
  { icon: Share2, label: "Social Media", id: "social" },
  { icon: Calendar, label: "Agenda", id: "agenda" },
];

export function DemoSidebar({ activeTab, onTabChange }: DemoSidebarProps) {
  return (
    <div className="w-16 bg-[#1c102f] flex flex-col items-center py-4 gap-1 shrink-0">
      {/* Logo */}
      <div className="mb-4">
        <img src={logo} alt="Senseys" className="h-8 w-8 object-contain" />
      </div>

      {/* Menu Items */}
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={`p-3 rounded-lg transition-all duration-200 group relative ${
            activeTab === item.id
              ? "bg-white/20 text-white"
              : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
        >
          <item.icon className="h-5 w-5" />
          
          {/* Tooltip */}
          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}

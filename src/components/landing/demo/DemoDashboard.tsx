import { DemoDashboardView } from "./DemoDashboardView";
import { DemoClientsView } from "./DemoClientsView";
import { DemoTasksView } from "./DemoTasksView";
import { DemoCRMView } from "./DemoCRMView";
import { DemoSocialView } from "./DemoSocialView";
import { DemoAgendaView } from "./DemoAgendaView";

interface DemoDashboardProps {
  activeTab: string;
}

export function DemoDashboard({ activeTab }: DemoDashboardProps) {
  switch (activeTab) {
    case "dashboard":
      return <DemoDashboardView />;
    case "clients":
      return <DemoClientsView />;
    case "tasks":
      return <DemoTasksView />;
    case "crm":
      return <DemoCRMView />;
    case "social":
      return <DemoSocialView />;
    case "agenda":
      return <DemoAgendaView />;
    default:
      return <DemoDashboardView />;
  }
}

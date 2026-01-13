import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollText, Settings, Wrench, Shield } from 'lucide-react';
import { SystemLogs } from './system/SystemLogs';
import { SystemConfig } from './system/SystemConfig';
import { SystemMaintenance } from './system/SystemMaintenance';
import { SystemSecurity } from './system/SystemSecurity';

export function MasterSystem() {
  return (
    <Tabs defaultValue="logs" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="logs" className="flex items-center space-x-2">
          <ScrollText className="h-4 w-4" />
          <span className="hidden sm:inline">Logs</span>
        </TabsTrigger>
        <TabsTrigger value="config" className="flex items-center space-x-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Configurações</span>
        </TabsTrigger>
        <TabsTrigger value="maintenance" className="flex items-center space-x-2">
          <Wrench className="h-4 w-4" />
          <span className="hidden sm:inline">Manutenção</span>
        </TabsTrigger>
        <TabsTrigger value="security" className="flex items-center space-x-2">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Segurança</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="logs">
        <SystemLogs />
      </TabsContent>

      <TabsContent value="config">
        <SystemConfig />
      </TabsContent>

      <TabsContent value="maintenance">
        <SystemMaintenance />
      </TabsContent>

      <TabsContent value="security">
        <SystemSecurity />
      </TabsContent>
    </Tabs>
  );
}

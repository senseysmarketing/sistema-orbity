import { Snowflake, Thermometer, Flame } from "lucide-react";

export type LeadTemperature = 'cold' | 'warm' | 'hot';

export const LEAD_TEMPERATURES = {
  cold: { 
    label: 'Frio', 
    color: 'bg-blue-500', 
    textColor: 'text-blue-600',
    bgLight: 'bg-blue-100 dark:bg-blue-900/30',
    icon: Snowflake,
    emoji: '❄️'
  },
  warm: { 
    label: 'Morno', 
    color: 'bg-orange-500', 
    textColor: 'text-orange-600',
    bgLight: 'bg-orange-100 dark:bg-orange-900/30',
    icon: Thermometer,
    emoji: '🌡️'
  },
  hot: { 
    label: 'Quente', 
    color: 'bg-red-500', 
    textColor: 'text-red-600',
    bgLight: 'bg-red-100 dark:bg-red-900/30',
    icon: Flame,
    emoji: '🔥'
  },
} as const;

// Mapping status to automatic temperature
export const STATUS_TO_TEMPERATURE: Record<string, LeadTemperature> = {
  'leads': 'cold',
  'qualified': 'warm',
  'scheduled': 'warm',
  'meeting': 'hot',
  'proposal': 'hot',
  'won': 'hot',
  'lost': 'cold',
};

export function getTemperatureLabel(temperature: string): string {
  return LEAD_TEMPERATURES[temperature as LeadTemperature]?.label || temperature;
}

export function getTemperatureColor(temperature: string): string {
  return LEAD_TEMPERATURES[temperature as LeadTemperature]?.color || 'bg-gray-500';
}

export function getTemperatureIcon(temperature: string) {
  return LEAD_TEMPERATURES[temperature as LeadTemperature]?.icon || Thermometer;
}

export function getTemperatureForStatus(status: string): LeadTemperature {
  return STATUS_TO_TEMPERATURE[status] || 'cold';
}

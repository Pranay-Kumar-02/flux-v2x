/**
 * FluxV2X Authoritative Multi-Theme ECharts Design System
 * Supports:
 * 1. Obsidian Black (Deep black/charcoal with cyan-teal & sky-blue precision)
 * 2. Gold / Bronze (Warm bronze, soft champagne, muted sage)
 * 3. Light Minimal (Crisp slate, cobalt blue, accessible high-contrast)
 * 4. Graphite (Understated dark grey with platinum silver accents)
 */

import { ThemeId } from '../context/ThemeContext';

export interface ChartThemeTokens {
  backgroundColor: string;
  axisLine: string;
  splitLine: string;
  axisLabel: string;
  nameText: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  legendText: string;
  accent: string;
  secondary: string;
  palette: string[];
}

export const CHART_THEMES: Record<ThemeId, ChartThemeTokens> = {
  obsidian: {
    backgroundColor: 'transparent',
    axisLine: '#223142',
    splitLine: '#131D28',
    axisLabel: '#94A3B8',
    nameText: '#94A3B8',
    tooltipBg: '#070A0E',
    tooltipBorder: 'rgba(45, 212, 191, 0.25)',
    tooltipText: '#F1F5F9',
    legendText: '#94A3B8',
    accent: '#2DD4BF',
    secondary: '#38BDF8',
    palette: ['#2DD4BF', '#38BDF8', '#34D399', '#60A5FA', '#F59E0B', '#EF4444'],
  },
  gold: {
    backgroundColor: 'transparent',
    axisLine: '#262420',
    splitLine: '#161513',
    axisLabel: '#807A70',
    nameText: '#807A70',
    tooltipBg: '#0C0B0A',
    tooltipBorder: 'rgba(255, 255, 255, 0.08)',
    tooltipText: '#F2EFEB',
    legendText: '#B8B2A8',
    accent: '#B0906C',
    secondary: '#C8B291',
    palette: ['#B0906C', '#8A9983', '#C8B291', '#7E8F96', '#C4924A', '#B85951'],
  },
  light: {
    backgroundColor: 'transparent',
    axisLine: '#CBD5E1',
    splitLine: '#E2E8F0',
    axisLabel: '#475569',
    nameText: '#334155',
    tooltipBg: '#FFFFFF',
    tooltipBorder: '#CBD5E1',
    tooltipText: '#0F172A',
    legendText: '#475569',
    accent: '#2563EB',
    secondary: '#0284C7',
    palette: ['#2563EB', '#16A34A', '#0284C7', '#D97706', '#DC2626', '#475569'],
  },
  graphite: {
    backgroundColor: 'transparent',
    axisLine: '#33333C',
    splitLine: '#1C1C20',
    axisLabel: '#A1A1AA',
    nameText: '#A1A1AA',
    tooltipBg: '#161618',
    tooltipBorder: 'rgba(255, 255, 255, 0.08)',
    tooltipText: '#EDEDF0',
    legendText: '#A1A1AA',
    accent: '#D4D4D8',
    secondary: '#E4E4E7',
    palette: ['#D4D4D8', '#34D399', '#94A3B8', '#FBBF24', '#F87171', '#71717A'],
  },
};

export const getChartTokens = (theme: ThemeId): ChartThemeTokens => {
  return CHART_THEMES[theme] || CHART_THEMES.obsidian;
};

export const fluxChartTheme = {
  backgroundColor: 'transparent',
  textStyle: {
    color: '#94A3B8',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
  title: {
    textStyle: {
      color: '#F1F5F9',
      fontSize: 13,
      fontWeight: 500,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    },
    subtextStyle: {
      color: '#64748B',
      fontSize: 11,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    },
  },
  color: ['#2DD4BF', '#38BDF8', '#34D399', '#60A5FA', '#F59E0B', '#EF4444'],
};

/**
 * FluxV2X Authoritative ECharts Design Theme
 *
 * Implements the refined, dark-first engineering instrument palette:
 * Obsidian, Charcoal, Graphite, Warm Bronze, Soft Champagne, and Muted Sage.
 */

export const fluxChartTheme = {
  backgroundColor: 'transparent',
  textStyle: {
    color: '#B8B2A8',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
  title: {
    textStyle: {
      color: '#F2EFEB',
      fontSize: 13,
      fontWeight: 500,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    },
    subtextStyle: {
      color: '#807A70',
      fontSize: 11,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    },
  },
  color: [
    '#B0906C', // Warm bronze
    '#8A9983', // Muted sage
    '#C8B291', // Soft champagne
    '#7E8F96', // Slate
    '#C4924A', // Accessible warm amber
    '#B85951', // Restrained red
  ],
  grid: {
    top: 32,
    bottom: 28,
    left: 36,
    right: 18,
    borderColor: '#262420',
    show: false,
  },
  categoryAxis: {
    axisLine: {
      lineStyle: {
        color: '#262420',
      },
    },
    axisTick: {
      lineStyle: {
        color: '#262420',
      },
    },
    axisLabel: {
      color: '#807A70',
      fontSize: 11,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: '#161513',
      },
    },
  },
  valueAxis: {
    axisLine: {
      lineStyle: {
        color: '#262420',
      },
    },
    axisTick: {
      lineStyle: {
        color: '#262420',
      },
    },
    axisLabel: {
      color: '#807A70',
      fontSize: 11,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: '#161513',
      },
    },
  },
  tooltip: {
    backgroundColor: '#0C0B0A',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    textStyle: {
      color: '#F2EFEB',
      fontSize: 11,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    },
    padding: [8, 12],
    extraCssText: 'box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6); border-radius: 6px;',
  },
  legend: {
    textStyle: {
      color: '#B8B2A8',
      fontSize: 11,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    },
    itemWidth: 10,
    itemHeight: 6,
    borderRadius: 2,
  },
};

/**
 * FluxV2X Authoritative ECharts Design Theme
 *
 * Implements the dark-first engineering instrument palette:
 * Obsidian, Charcoal, Graphite, Bronze, Champagne, Sage, and muted semantic series.
 */

export const fluxChartTheme = {
  backgroundColor: 'transparent',
  textStyle: {
    color: '#B6B0A6',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
  title: {
    textStyle: {
      color: '#F0EDE7',
      fontSize: 12,
      fontWeight: 500,
    },
    subtextStyle: {
      color: '#898277',
      fontSize: 11,
    },
  },
  color: [
    '#AD8D69', // Muted bronze
    '#8B9B83', // Muted sage
    '#C4AE8D', // Soft champagne
    '#7E8F96', // Slate
    '#C4924A', // Muted amber (warning)
    '#B85951', // Restrained red (anomaly)
  ],
  grid: {
    top: 35,
    bottom: 30,
    left: 40,
    right: 20,
    borderColor: '#292723',
    show: false,
  },
  categoryAxis: {
    axisLine: {
      lineStyle: {
        color: '#292723',
      },
    },
    axisTick: {
      lineStyle: {
        color: '#292723',
      },
    },
    axisLabel: {
      color: '#898277',
      fontSize: 10,
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: '#171715',
      },
    },
  },
  valueAxis: {
    axisLine: {
      lineStyle: {
        color: '#292723',
      },
    },
    axisTick: {
      lineStyle: {
        color: '#292723',
      },
    },
    axisLabel: {
      color: '#898277',
      fontSize: 10,
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: '#171715',
      },
    },
  },
  tooltip: {
    backgroundColor: '#0C0C0C',
    borderColor: '#292723',
    borderWidth: 1,
    textStyle: {
      color: '#F0EDE7',
      fontSize: 11,
      fontFamily: 'JetBrains Mono, monospace',
    },
    padding: [6, 10],
    extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5); border-radius: 4px;',
  },
  legend: {
    textStyle: {
      color: '#B6B0A6',
      fontSize: 11,
    },
    itemWidth: 12,
    itemHeight: 8,
  },
};

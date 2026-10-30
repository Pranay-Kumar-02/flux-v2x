import React, { useState, useEffect } from 'react';
import { Sidebar, NavView } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewView } from './views/OverviewView';
import { DatasetLibraryView } from './views/DatasetLibraryView';
import { SchemaLabView } from './views/SchemaLabView';
import { ContextExplorerView } from './views/ContextExplorerView';
import { ModelLabView } from './views/ModelLabView';
import { AcafdmView } from './views/AcafdmView';
import { BenchmarkCenterView } from './views/BenchmarkCenterView';
import { MitigationSimulatorView } from './views/MitigationSimulatorView';
import { ExperimentInspectorView } from './views/ExperimentInspectorView';
import { AuditView } from './views/AuditView';
import { CoSimulationStudioView } from './views/CoSimulationStudioView';
import { api, Dataset } from './api/client';
import { ThemeProvider } from './context/ThemeContext';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<NavView>('overview');
  const [activeDataset, setActiveDataset] = useState<Dataset | null>(null);

  useEffect(() => {
    async function initDataset() {
      try {
        const list = await api.listDatasets();
        if (list.length > 0) {
          setActiveDataset(list[0]);
        }
      } catch (err) {
        console.error('Failed to initialize active dataset', err);
      }
    }
    initDataset();
  }, []);

  const viewTitles: Record<NavView, { title: string; subtitle: string }> = {
    overview: {
      title: 'Research Command Center',
      subtitle: 'System Health, Live Inventory & Experiment Metrics',
    },
    cosim: {
      title: 'Co-Simulation Studio',
      subtitle: 'Synchronized SUMO Mobility, NS-3 WAVE 802.11p Wireless & ACAFDM Flooding Mitigation',
    },
    datasets: {
      title: 'Dataset Library & Ingestion',
      subtitle: 'Structured Data Ingestion, Column Profiling & Leakage Safeguards',
    },
    schema: {
      title: 'Schema & Feature Lab',
      subtitle: 'VCN Canonical Normalizer, Mapping Suggestion & Immutable Pipelines',
    },
    context: {
      title: 'Network Context Explorer',
      subtitle: 'Spatiotemporal Clusters, Mobility Dynamics & Congestion Baselines',
    },
    models: {
      title: 'Model Laboratory',
      subtitle: '10 Classifier Families, Leakage-Safe Splits, Curves & Confusion Matrices',
    },
    acafdm: {
      title: 'ACAFDM Engine',
      subtitle: 'Adaptive Rolling Baselines, Poison-Resistant Gate & Persistence Policies',
    },
    benchmarks: {
      title: 'Benchmark Center',
      subtitle: 'Empirical Comparisons & Paired Two-Tailed McNemar Tests',
    },
    simulator: {
      title: 'Mitigation Simulator',
      subtitle: 'Offline Traffic Replay, Selective Rate Limiting & Impact Quantification',
    },
    inspector: {
      title: 'Experiment & Artifact Inspector',
      subtitle: 'Complete Audit Trail, Checksums & Reproducibility Manifests',
    },
    audit: {
      title: 'Audit & Operational Diagnostics',
      subtitle: 'Process Health, Parquet Storage Metrics & Security Checklists',
    },
  };

  const currentMeta = viewTitles[currentView];

  return (
    <div className="flex h-screen bg-flux-bg text-flux-text overflow-hidden font-sans transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
          activeDataset={activeDataset}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {currentView === 'overview' && <OverviewView onNavigate={setCurrentView} />}
          {currentView === 'cosim' && <CoSimulationStudioView />}
          {currentView === 'datasets' && (
            <DatasetLibraryView onSelectDataset={setActiveDataset} />
          )}
          {currentView === 'schema' && <SchemaLabView activeDataset={activeDataset} />}
          {currentView === 'context' && (
            <ContextExplorerView activeDataset={activeDataset} />
          )}
          {currentView === 'models' && <ModelLabView activeDataset={activeDataset} />}
          {currentView === 'acafdm' && <AcafdmView activeDataset={activeDataset} />}
          {currentView === 'benchmarks' && <BenchmarkCenterView />}
          {currentView === 'simulator' && (
            <MitigationSimulatorView activeDataset={activeDataset} />
          )}
          {currentView === 'inspector' && <ExperimentInspectorView />}
          {currentView === 'audit' && <AuditView />}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;

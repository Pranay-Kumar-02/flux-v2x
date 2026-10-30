import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import ReactECharts from 'echarts-for-react';
import {
  Play,
  Square,
  Pause,
  RotateCcw,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Wifi,
  Activity,
  Layers,
  Zap,
  Sliders,
  AlertTriangle,
  Info,
  Maximize2,
  Eye,
  CheckCircle2,
  TrendingUp,
  Clock,
  Compass
} from 'lucide-react';
import {
  api,
  CoSimScenario,
  CoSimTopology,
  CoSimStatus,
  CoSimVehicle,
  CoSimStartPayload
} from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { getChartTokens, SVG_RENDERER_OPTS, CHART_FONT_FAMILY } from '../utils/chartTheme';

export const CoSimulationStudioView: React.FC = () => {
  const { theme } = useTheme();
  const ct = getChartTokens(theme);

  // Scenarios & Topology
  const [scenarios, setScenarios] = useState<CoSimScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('scenario_a');
  const [topology, setTopology] = useState<CoSimTopology | null>(null);

  // Simulation Status & Telemetry
  const [status, setStatus] = useState<CoSimStatus | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [engineVersions, setEngineVersions] = useState({ sumo: '1.28.0', ns3: '3.41' });

  // Control Parameters
  const [duration, setDuration] = useState<number>(120);
  const [demandPeriod, setDemandPeriod] = useState<number>(1.8);
  const [attackEnabled, setAttackEnabled] = useState<boolean>(true);
  const [attackIntensity, setAttackIntensity] = useState<number>(100);
  const [attackStartTime, setAttackStartTime] = useState<number>(15);
  const [targetRsu, setTargetRsu] = useState<string>('RSU_J0');
  const [persistenceK, setPersistenceK] = useState<number>(3);
  const [zThreshold, setZThreshold] = useState<number>(2.5);
  const [rateLimitRatio, setRateLimitRatio] = useState<number>(0.70);

  // Visualization Mode
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [cameraPreset, setCameraPreset] = useState<'perspective' | 'topdown'>('perspective');

  // DOM Refs for Renderers
  const mountRef = useRef<HTMLDivElement>(null);
  const canvas2dRef = useRef<HTMLCanvasElement>(null);

  // Three.js Scene References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const vehiclesGroupRef = useRef<THREE.Group | null>(null);
  const rsusGroupRef = useRef<THREE.Group | null>(null);
  const pulsesGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // WebSocket
  const wsRef = useRef<WebSocket | null>(null);

  // 1. Initial Load of Scenarios and Topology
  useEffect(() => {
    async function loadScenarios() {
      try {
        const data = await api.listCoSimScenarios();
        setScenarios(data.scenarios);
        if (data.sumo_version && data.ns3_version) {
          setEngineVersions({ sumo: data.sumo_version, ns3: data.ns3_version });
        }
        if (data.scenarios.length > 0) {
          loadTopology(data.scenarios[0].id);
        }
      } catch (err) {
        console.error('Failed to load co-simulation scenarios:', err);
      }
    }
    loadScenarios();
  }, []);

  async function loadTopology(scenarioId: string) {
    try {
      const topo = await api.getCoSimTopology(scenarioId);
      setTopology(topo);
      setSelectedScenarioId(scenarioId);
      if (topo.rsus && topo.rsus.length > 0) {
        setTargetRsu(topo.rsus[0].id);
      }
    } catch (err) {
      console.error('Failed to load topology:', err);
    }
  }

  // 2. Poll Status or Connect WebSocket
  useEffect(() => {
    let pollTimer: any = null;

    async function checkStatus() {
      try {
        const s = await api.getCoSimStatus();
        setStatus(s);
        setIsRunning(s.status === 'RUNNING' || s.status === 'STARTING');
        setIsPaused(s.status === 'PAUSED');
      } catch (err) {
        // Silently retry
      }
    }

    checkStatus();
    pollTimer = setInterval(checkStatus, 1000);

    // WebSocket connection for live telemetry
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/v1/cosim/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const liveData: CoSimStatus = JSON.parse(event.data);
          setStatus(liveData);
          setIsRunning(liveData.status === 'RUNNING' || liveData.status === 'STARTING');
          setIsPaused(liveData.status === 'PAUSED');
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      clearInterval(pollTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // 3. Three.js Scene Setup & Geometry Construction
  useEffect(() => {
    if (viewMode !== '3d' || !mountRef.current || !topology) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 500;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const isDark = theme !== 'light';
    scene.background = new THREE.Color(isDark ? 0x090d16 : 0xf8fafc);

    // Camera
    const bbox = topology.bbox;
    const centerX = (bbox.min_x + bbox.max_x) / 2;
    const centerY = (bbox.min_y + bbox.max_y) / 2;
    const maxDim = Math.max(bbox.max_x - bbox.min_x, bbox.max_y - bbox.min_y, 400);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    if (cameraPreset === 'topdown') {
      camera.position.set(centerX, maxDim * 1.4, centerY);
      camera.lookAt(centerX, 0, centerY);
    } else {
      camera.position.set(centerX, maxDim * 0.9, centerY + maxDim * 0.8);
      camera.lookAt(centerX, 0, centerY);
    }
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(centerX + 200, 400, centerY + 200);
    scene.add(dirLight);

    // Ground Plane
    const groundGeo = new THREE.PlaneGeometry(maxDim * 2.5, maxDim * 2.5);
    const groundMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x0f172a : 0xe2e8f0,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(centerX, -0.5, centerY);
    scene.add(ground);

    // Road Grid Lines
    const roadMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x1e293b : 0xcfd8dc,
      roughness: 0.5,
    });
    const lineMat = new THREE.LineBasicMaterial({
      color: isDark ? 0x38bdf8 : 0x0284c7,
      linewidth: 2,
    });

    topology.edges.forEach((edge) => {
      if (edge.shape.length < 2) return;
      const pts = edge.shape.map((p) => new THREE.Vector3(p[0], 0.1, p[1]));
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geom, lineMat);
      scene.add(line);

      // Road segment ribbon
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const segDist = p1.distanceTo(p2);
        const segGeo = new THREE.PlaneGeometry(8 * edge.lanes, segDist);
        const segMesh = new THREE.Mesh(segGeo, roadMat);
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        segMesh.position.set(mid.x, 0.05, mid.z);
        segMesh.rotation.x = -Math.PI / 2;
        const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z);
        segMesh.rotation.z = -angle;
        scene.add(segMesh);
      }
    });

    // RSUs
    const rsusGroup = new THREE.Group();
    scene.add(rsusGroup);
    rsusGroupRef.current = rsusGroup;

    topology.rsus.forEach((rsu) => {
      // Tower Pole
      const poleGeo = new THREE.CylinderGeometry(1.5, 2.0, 20, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(rsu.x, 10, rsu.y);
      rsusGroup.add(pole);

      // Antenna Dome
      const domeGeo = new THREE.SphereGeometry(3.5, 16, 16);
      const domeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6 });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.set(rsu.x, 22, rsu.y);
      rsusGroup.add(dome);

      // Coverage Ring
      const ringGeo = new THREE.RingGeometry(rsu.range - 1.5, rsu.range, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x0ea5e9,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(rsu.x, 0.2, rsu.y);
      rsusGroup.add(ring);
    });

    // Vehicles Container Group
    const vehiclesGroup = new THREE.Group();
    scene.add(vehiclesGroup);
    vehiclesGroupRef.current = vehiclesGroup;

    // Dynamic Pulses Group
    const pulsesGroup = new THREE.Group();
    scene.add(pulsesGroup);
    pulsesGroupRef.current = pulsesGroup;

    // Render Animation Loop
    let pulseScale = 1.0;
    const animate = () => {
      pulseScale = 1.0 + Math.sin(Date.now() * 0.005) * 0.15;
      if (rsusGroupRef.current) {
        rsusGroupRef.current.children.forEach((child) => {
          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
            child.scale.set(pulseScale, pulseScale, pulseScale);
          }
        });
      }
      renderer.render(scene, camera);
      animFrameIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight || 500;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, [topology, viewMode, cameraPreset, theme]);

  // 4. Update Three.js Vehicle Meshes on Live Status
  useEffect(() => {
    if (viewMode !== '3d' || !vehiclesGroupRef.current || !status) return;
    const group = vehiclesGroupRef.current;

    // Clear old vehicle meshes
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
    }

    // Geometry templates
    const carBodyGeo = new THREE.BoxGeometry(4.2, 1.8, 2.2);
    const carCabinGeo = new THREE.BoxGeometry(2.4, 1.2, 1.8);

    status.vehicles.forEach((v) => {
      const vGroup = new THREE.Group();
      vGroup.position.set(v.x, 1.0, v.y);

      // Color coding based on attack / mitigation status
      let bodyColor = 0x10b981; // Benign normal
      let emissiveColor = 0x059669;

      if (v.is_attacker) {
        bodyColor = 0xef4444; // Malicious attacker (Red)
        emissiveColor = 0xdc2626;
      } else if (v.decision === 'MITIGATE_RATE_LIMIT') {
        bodyColor = 0xa855f7; // Mitigated / Throttled (Purple)
        emissiveColor = 0x7e22ce;
      } else if (v.decision === 'FLAG_SUSPICIOUS') {
        bodyColor = 0xf59e0b; // Suspicious (Amber)
        emissiveColor = 0xd97706;
      }

      const bodyMat = new THREE.MeshStandardMaterial({
        color: bodyColor,
        emissive: emissiveColor,
        emissiveIntensity: v.is_attacker ? 0.7 : 0.2,
        roughness: 0.3,
      });

      const bodyMesh = new THREE.Mesh(carBodyGeo, bodyMat);
      vGroup.add(bodyMesh);

      const cabinMesh = new THREE.Mesh(carCabinGeo, bodyMat);
      cabinMesh.position.set(-0.4, 1.2, 0);
      vGroup.add(cabinMesh);

      // Heading rotation
      const rad = THREE.MathUtils.degToRad(-v.angle + 90);
      vGroup.rotation.y = rad;

      group.add(vGroup);
    });
  }, [status, viewMode]);

  // 5. 2D Fallback Canvas Drawing
  useEffect(() => {
    if (viewMode !== '2d' || !canvas2dRef.current || !topology) return;
    const canvas = canvas2dRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const bbox = topology.bbox;
    const scaleX = (width - 60) / Math.max(1, bbox.max_x - bbox.min_x);
    const scaleY = (height - 60) / Math.max(1, bbox.max_y - bbox.min_y);
    const scale = Math.min(scaleX, scaleY);

    const toScreen = (x: number, y: number) => ({
      x: 30 + (x - bbox.min_x) * scale,
      y: height - 30 - (y - bbox.min_y) * scale,
    });

    // Draw Roads
    ctx.strokeStyle = theme !== 'light' ? '#334155' : '#cbd5e1';
    ctx.lineWidth = 5;
    topology.edges.forEach((edge) => {
      if (edge.shape.length < 2) return;
      ctx.beginPath();
      const p0 = toScreen(edge.shape[0][0], edge.shape[0][1]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < edge.shape.length; i++) {
        const pt = toScreen(edge.shape[i][0], edge.shape[i][1]);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    });

    // Draw RSUs
    topology.rsus.forEach((rsu) => {
      const p = toScreen(rsu.x, rsu.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, rsu.range * scale, 0, 2 * Math.PI);
      ctx.fillStyle = theme !== 'light' ? 'rgba(14, 165, 233, 0.08)' : 'rgba(14, 165, 233, 0.12)';
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#0284c7';
      ctx.fill();
    });

    // Draw Vehicles
    if (status && status.vehicles) {
      status.vehicles.forEach((v) => {
        const p = toScreen(v.x, v.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5, 0, 2 * Math.PI);

        if (v.is_attacker) {
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#f87171';
        } else if (v.decision === 'MITIGATE_RATE_LIMIT') {
          ctx.fillStyle = '#a855f7';
          ctx.strokeStyle = '#c084fc';
        } else {
          ctx.fillStyle = '#10b981';
          ctx.strokeStyle = '#34d399';
        }

        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }
  }, [topology, status, viewMode, theme]);

  // Simulation Handlers
  const handleStartSimulation = async () => {
    try {
      const payload: CoSimStartPayload = {
        scenario_id: selectedScenarioId,
        duration,
        demand_period: demandPeriod,
        random_seed: 42,
        attack_enabled: attackEnabled,
        target_rsu: targetRsu,
        attack_intensity: attackIntensity,
        attack_start_time: attackStartTime,
        persistence_k: persistenceK,
        z_threshold: zThreshold,
        rate_limit_ratio: rateLimitRatio,
      };
      await api.startCoSim(payload);
      setIsRunning(true);
      setIsPaused(false);
    } catch (err: any) {
      alert(`Simulation start error: ${err.message}`);
    }
  };

  const handlePauseResume = async () => {
    if (isPaused) {
      await api.resumeCoSim();
      setIsPaused(false);
    } else {
      await api.pauseCoSim();
      setIsPaused(true);
    }
  };

  const handleStopSimulation = async () => {
    await api.stopCoSim();
    setIsRunning(false);
    setIsPaused(false);
  };

  const applyPreset = (presetKey: string) => {
    if (presetKey === 'rush_hour') {
      setSelectedScenarioId('scenario_c');
      setDemandPeriod(0.8);
      setDuration(120);
      setAttackEnabled(false);
      loadTopology('scenario_c');
    } else if (presetKey === 'hwy_flooding') {
      setSelectedScenarioId('scenario_d');
      setDemandPeriod(1.2);
      setAttackEnabled(true);
      setAttackIntensity(120);
      setAttackStartTime(10);
      setRateLimitRatio(0.80);
      loadTopology('scenario_d');
    } else if (presetKey === 'mitigation_demo') {
      setSelectedScenarioId('scenario_a');
      setDemandPeriod(1.8);
      setAttackEnabled(true);
      setAttackIntensity(90);
      setAttackStartTime(12);
      setPersistenceK(3);
      setZThreshold(2.5);
      setRateLimitRatio(0.75);
      loadTopology('scenario_a');
    }
  };

  // ECharts Configurations
  const throughputChartOptions = {
    ...SVG_RENDERER_OPTS,
    grid: { left: 45, right: 20, top: 25, bottom: 25 },
    tooltip: { trigger: 'axis', textStyle: { fontFamily: CHART_FONT_FAMILY, fontSize: 11 } },
    legend: { data: ['Throughput (Mbps)', 'PDR (%)'], textStyle: { color: ct.legendText, fontSize: 10 } },
    xAxis: {
      type: 'category',
      data: (status?.telemetry_history || []).map((h) => `${h.time}s`),
      axisLabel: { color: ct.axisLabel, fontSize: 9 },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Mbps',
        nameTextStyle: { color: ct.axisLabel, fontSize: 9 },
        axisLabel: { color: ct.axisLabel, fontSize: 9 },
        splitLine: { lineStyle: { color: ct.splitLine } },
      },
      {
        type: 'value',
        name: 'PDR %',
        min: 0,
        max: 100,
        nameTextStyle: { color: ct.axisLabel, fontSize: 9 },
        axisLabel: { color: ct.axisLabel, fontSize: 9 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'Throughput (Mbps)',
        type: 'line',
        data: (status?.telemetry_history || []).map((h) => h.throughput_mbps),
        color: '#38bdf8',
        smooth: true,
      },
      {
        name: 'PDR (%)',
        type: 'line',
        yAxisIndex: 1,
        data: (status?.telemetry_history || []).map((h) => h.pdr),
        color: '#10b981',
        smooth: true,
      },
    ],
  };

  const trafficBreakdownChartOptions = {
    ...SVG_RENDERER_OPTS,
    grid: { left: 45, right: 20, top: 25, bottom: 25 },
    tooltip: { trigger: 'axis', textStyle: { fontFamily: CHART_FONT_FAMILY, fontSize: 11 } },
    legend: { data: ['Rx Received', 'Dropped Packets'], textStyle: { color: ct.legendText, fontSize: 10 } },
    xAxis: {
      type: 'category',
      data: (status?.telemetry_history || []).map((h) => `${h.time}s`),
      axisLabel: { color: ct.axisLabel, fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: ct.axisLabel, fontSize: 9 },
      splitLine: { lineStyle: { color: ct.splitLine } },
    },
    series: [
      {
        name: 'Rx Received',
        type: 'bar',
        stack: 'packets',
        data: (status?.telemetry_history || []).map((h) => h.rx),
        color: '#0ea5e9',
      },
      {
        name: 'Dropped Packets',
        type: 'bar',
        stack: 'packets',
        data: (status?.telemetry_history || []).map((h) => h.dropped),
        color: '#ef4444',
      },
    ],
  };

  return (
    <div className="space-y-6 select-none font-sans pb-12">
      {/* Flagship Header Banner */}
      <div className="bg-gradient-to-r from-flux-surface via-flux-subsurface to-flux-surface border border-flux-border rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-flux-accent/10 text-flux-accent">
                <Radio size={20} />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-flux-text">
                Co-Simulation Studio
              </h1>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
                SUMO + NS-3 + ACAFDM
              </span>
            </div>
            <p className="text-xs text-flux-secondary mt-1">
              Synchronized 802.11p WAVE vehicular communication, multi-lane mobility, and real-time poisoning-resistant flooding defense.
            </p>
          </div>

          {/* Engine Status Indicators */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-flux-subsurface border border-flux-border text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-flux-muted">SUMO:</span>
              <span className="font-mono font-medium text-flux-text">v{engineVersions.sumo} (TraCI)</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-flux-subsurface border border-flux-border text-[11px]">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-flux-muted">NS-3:</span>
              <span className="font-mono font-medium text-flux-text">v{engineVersions.ns3} (802.11p)</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-flux-subsurface border border-flux-border text-[11px]">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-flux-muted">ACAFDM:</span>
              <span className="font-mono font-medium text-flux-text">Dual-Gate Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Simulation Viewport & Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Columns: 3D/2D Viewport */}
        <div className="lg:col-span-3 bg-flux-surface border border-flux-border rounded-xl p-4 flex flex-col shadow-sm">
          {/* Viewport Top Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-flux-border/40">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-flux-muted">
                Road Network & Wireless Viewport
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-flux-subsurface text-flux-accent">
                {topology?.scenario_name || 'Loading Topology...'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Camera Presets */}
              {viewMode === '3d' && (
                <div className="flex items-center bg-flux-subsurface rounded-lg p-0.5 border border-flux-border text-xs">
                  <button
                    onClick={() => setCameraPreset('perspective')}
                    className={`px-2 py-1 rounded ${cameraPreset === 'perspective' ? 'bg-flux-elevated text-flux-accent font-medium' : 'text-flux-muted'}`}
                  >
                    Isometric 3D
                  </button>
                  <button
                    onClick={() => setCameraPreset('topdown')}
                    className={`px-2 py-1 rounded ${cameraPreset === 'topdown' ? 'bg-flux-elevated text-flux-accent font-medium' : 'text-flux-muted'}`}
                  >
                    Top-Down 2D
                  </button>
                </div>
              )}

              {/* View Mode Toggle */}
              <div className="flex items-center bg-flux-subsurface rounded-lg p-0.5 border border-flux-border text-xs">
                <button
                  onClick={() => setViewMode('3d')}
                  className={`px-2.5 py-1 rounded ${viewMode === '3d' ? 'bg-flux-accent text-white font-medium' : 'text-flux-muted'}`}
                >
                  Three.js 3D
                </button>
                <button
                  onClick={() => setViewMode('2d')}
                  className={`px-2.5 py-1 rounded ${viewMode === '2d' ? 'bg-flux-accent text-white font-medium' : 'text-flux-muted'}`}
                >
                  Canvas 2D
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Screen Container */}
          <div className="relative flex-1 min-h-[480px] w-full rounded-lg overflow-hidden bg-flux-bg mt-3 border border-flux-border/40">
            {viewMode === '3d' ? (
              <div ref={mountRef} className="w-full h-full min-h-[480px]" />
            ) : (
              <canvas ref={canvas2dRef} width={800} height={480} className="w-full h-full" />
            )}

            {/* In-Viewport Live Telemetry Overlay */}
            <div className="absolute top-3 left-3 bg-flux-surface/85 backdrop-blur-md border border-flux-border rounded-lg p-2.5 text-xs space-y-1 shadow-md">
              <div className="flex items-center gap-2 font-mono">
                <Clock size={13} className="text-flux-accent" />
                <span className="text-flux-muted">Sim Clock:</span>
                <span className="font-semibold text-flux-text text-sm">
                  {status ? `T+${status.sim_clock.toFixed(1)}s` : 'T+00.0s'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-flux-secondary">
                <span>Active Nodes: <strong className="text-flux-text">{status?.active_vehicle_count ?? 0}</strong></span>
                <span>•</span>
                <span>RSUs: <strong className="text-flux-text">{status?.active_rsu_count ?? 0}</strong></span>
              </div>
            </div>

            {/* In-Viewport Legend Overlay */}
            <div className="absolute bottom-3 right-3 bg-flux-surface/85 backdrop-blur-md border border-flux-border rounded-lg p-2 text-[10px] space-y-1 shadow-md">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-flux-secondary">Benign V2X Node</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-flux-secondary">Attacker Flooding Node</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-flux-secondary">ACAFDM Mitigated (Throttled)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                <span className="text-flux-secondary">Roadside Unit (RSU)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Simulation Control Console */}
        <div className="bg-flux-surface border border-flux-border rounded-xl p-4 flex flex-col space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-flux-border/40">
            <span className="text-xs font-semibold uppercase tracking-wider text-flux-muted">
              Control Console
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-flux-subsurface text-flux-accent">
              Live TraCI + NS-3
            </span>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-flux-secondary">Quick Research Presets</label>
            <div className="grid grid-cols-1 gap-1">
              <button
                onClick={() => applyPreset('mitigation_demo')}
                className="text-left px-2.5 py-1.5 rounded-md text-xs bg-flux-subsurface hover:bg-flux-elevated border border-flux-border/60 transition-all text-flux-text flex items-center justify-between"
              >
                <span>ACAFDM Defense Demo</span>
                <ShieldCheck size={13} className="text-purple-400" />
              </button>
              <button
                onClick={() => applyPreset('hwy_flooding')}
                className="text-left px-2.5 py-1.5 rounded-md text-xs bg-flux-subsurface hover:bg-flux-elevated border border-flux-border/60 transition-all text-flux-text flex items-center justify-between"
              >
                <span>Highway Flooding Attack</span>
                <AlertTriangle size={13} className="text-red-400" />
              </button>
              <button
                onClick={() => applyPreset('rush_hour')}
                className="text-left px-2.5 py-1.5 rounded-md text-xs bg-flux-subsurface hover:bg-flux-elevated border border-flux-border/60 transition-all text-flux-text flex items-center justify-between"
              >
                <span>Metropolitan Rush-Hour</span>
                <TrendingUp size={13} className="text-amber-400" />
              </button>
            </div>
          </div>

          {/* Scenario Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-flux-secondary">Scenario</label>
            <select
              value={selectedScenarioId}
              onChange={(e) => loadTopology(e.target.value)}
              disabled={isRunning}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-flux-subsurface border border-flux-border text-flux-text focus:outline-none focus:ring-1 focus:ring-flux-accent"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sliders */}
          <div className="space-y-3 pt-1">
            <div>
              <div className="flex justify-between text-[11px]">
                <span className="text-flux-secondary">Duration</span>
                <span className="font-mono text-flux-text">{duration}s</span>
              </div>
              <input
                type="range"
                min={30}
                max={300}
                step={10}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                disabled={isRunning}
                className="w-full h-1.5 bg-flux-subsurface rounded-lg appearance-none cursor-pointer accent-flux-accent"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px]">
                <span className="text-flux-secondary">Vehicle Inflow (sec/veh)</span>
                <span className="font-mono text-flux-text">{demandPeriod}s</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={4.0}
                step={0.2}
                value={demandPeriod}
                onChange={(e) => setDemandPeriod(Number(e.target.value))}
                disabled={isRunning}
                className="w-full h-1.5 bg-flux-subsurface rounded-lg appearance-none cursor-pointer accent-flux-accent"
              />
            </div>
          </div>

          {/* Adversarial Injection Panel */}
          <div className="p-3 rounded-lg bg-flux-subsurface/60 border border-flux-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-flux-text flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-red-400" />
                Flooding Injection
              </span>
              <input
                type="checkbox"
                checked={attackEnabled}
                onChange={(e) => setAttackEnabled(e.target.checked)}
                disabled={isRunning}
                className="w-4 h-4 accent-red-500 rounded cursor-pointer"
              />
            </div>

            {attackEnabled && (
              <div className="space-y-2 pt-1 text-xs">
                <div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-flux-secondary">Intensity</span>
                    <span className="font-mono text-red-400">{attackIntensity} pkts/s</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={200}
                    step={10}
                    value={attackIntensity}
                    onChange={(e) => setAttackIntensity(Number(e.target.value))}
                    disabled={isRunning}
                    className="w-full h-1.5 bg-flux-subsurface rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-flux-secondary">Attack Onset</span>
                    <span className="font-mono text-flux-text">{attackStartTime}s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={5}
                    value={attackStartTime}
                    onChange={(e) => setAttackStartTime(Number(e.target.value))}
                    disabled={isRunning}
                    className="w-full h-1.5 bg-flux-subsurface rounded-lg appearance-none cursor-pointer accent-flux-accent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            {!isRunning ? (
              <button
                onClick={handleStartSimulation}
                className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-flux-accent to-emerald-500 text-white font-medium text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                <Play size={14} /> Start Co-Simulation
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handlePauseResume}
                  className="flex-1 py-2 px-3 rounded-lg bg-flux-subsurface hover:bg-flux-elevated border border-flux-border text-flux-text font-medium text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  {isPaused ? <Play size={13} /> : <Pause size={13} />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={handleStopSimulation}
                  className="flex-1 py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-medium text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Square size={13} /> Stop
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-Time Telemetry KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-flux-surface border border-flux-border rounded-xl p-3 shadow-sm">
          <div className="text-[10px] font-medium uppercase tracking-wider text-flux-muted">PDR (Delivery Ratio)</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {status ? `${status.network_metrics.pdr.toFixed(1)}%` : '100.0%'}
          </div>
          <div className="text-[9px] text-flux-muted mt-0.5">802.11p Successful Rx</div>
        </div>

        <div className="bg-flux-surface border border-flux-border rounded-xl p-3 shadow-sm">
          <div className="text-[10px] font-medium uppercase tracking-wider text-flux-muted">Throughput</div>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1">
            {status ? `${status.network_metrics.throughput_mbps.toFixed(2)}` : '0.00'} <span className="text-xs font-normal">Mbps</span>
          </div>
          <div className="text-[9px] text-flux-muted mt-0.5">WAVE Channel Load</div>
        </div>

        <div className="bg-flux-surface border border-flux-border rounded-xl p-3 shadow-sm">
          <div className="text-[10px] font-medium uppercase tracking-wider text-flux-muted">End-to-End Latency</div>
          <div className="text-xl font-bold font-mono text-flux-text mt-1">
            {status ? `${status.network_metrics.delay_ms.toFixed(1)}` : '2.5'} <span className="text-xs font-normal">ms</span>
          </div>
          <div className="text-[9px] text-flux-muted mt-0.5">Packet Propagation Delay</div>
        </div>

        <div className="bg-flux-surface border border-flux-border rounded-xl p-3 shadow-sm">
          <div className="text-[10px] font-medium uppercase tracking-wider text-flux-muted">Total Tx Packets</div>
          <div className="text-xl font-bold font-mono text-flux-text mt-1">
            {status ? status.network_metrics.total_tx.toLocaleString() : '0'}
          </div>
          <div className="text-[9px] text-flux-muted mt-0.5">Simulated WAVE Packets</div>
        </div>

        <div className="bg-flux-surface border border-flux-border rounded-xl p-3 shadow-sm">
          <div className="text-[10px] font-medium uppercase tracking-wider text-flux-muted">Malicious Suppressed</div>
          <div className="text-xl font-bold font-mono text-purple-400 mt-1">
            {status ? status.network_metrics.malicious_dropped.toLocaleString() : '0'}
          </div>
          <div className="text-[9px] text-flux-muted mt-0.5">ACAFDM Dropped Packets</div>
        </div>

        <div className="bg-flux-surface border border-flux-border rounded-xl p-3 shadow-sm">
          <div className="text-[10px] font-medium uppercase tracking-wider text-flux-muted">Defense Efficiency</div>
          <div className="text-xl font-bold font-mono text-flux-accent mt-1">
            {status ? `${status.network_metrics.mitigation_efficiency.toFixed(1)}%` : '100%'}
          </div>
          <div className="text-[9px] text-flux-muted mt-0.5">Benign Safety Preserved</div>
        </div>
      </div>

      {/* Real-Time ECharts Telemetry Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-flux-surface border border-flux-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-flux-border/40">
            <span className="text-xs font-semibold text-flux-text flex items-center gap-1.5">
              <Activity size={14} className="text-sky-400" />
              Network Throughput & Packet Delivery Ratio
            </span>
            <span className="text-[10px] font-mono text-flux-muted">Real-Time NS-3</span>
          </div>
          <div className="h-48 mt-2">
            <ReactECharts option={throughputChartOptions} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        <div className="bg-flux-surface border border-flux-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-flux-border/40">
            <span className="text-xs font-semibold text-flux-text flex items-center gap-1.5">
              <Zap size={14} className="text-flux-accent" />
              Packet Distribution & Mitigation Losses
            </span>
            <span className="text-[10px] font-mono text-flux-muted">WAVE Stack</span>
          </div>
          <div className="h-48 mt-2">
            <ReactECharts option={trafficBreakdownChartOptions} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Live ACAFDM Decision & Mitigation Event Stream */}
      <div className="bg-flux-surface border border-flux-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-flux-border/40">
          <div className="flex items-center gap-2">
            <ShieldAlert size={15} className="text-flux-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider text-flux-text">
              Live ACAFDM Detection & NS-3 Response Stream
            </span>
          </div>
          <span className="text-[10px] font-mono text-flux-muted">
            Chronological Flow Trace ({status?.recent_events?.length ?? 0} events)
          </span>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-flux-border/60 text-[11px] text-flux-muted">
                <th className="py-2 px-3">Time</th>
                <th className="py-2 px-3">Node ID</th>
                <th className="py-2 px-3">Protocol</th>
                <th className="py-2 px-3">Target RSU</th>
                <th className="py-2 px-3">Pkt Rate</th>
                <th className="py-2 px-3">Z-Score</th>
                <th className="py-2 px-3">Decision</th>
                <th className="py-2 px-3">NS-3 Enforcement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-flux-border/30 font-mono text-[11px]">
              {status && status.recent_events && status.recent_events.length > 0 ? (
                status.recent_events.slice(0, 10).map((ev, i) => (
                  <tr key={i} className="hover:bg-flux-subsurface/40 transition-colors">
                    <td className="py-1.5 px-3 text-flux-muted">{ev.timestamp.toFixed(1)}s</td>
                    <td className="py-1.5 px-3 font-semibold text-flux-text flex items-center gap-1.5">
                      {ev.is_attacker && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                      {ev.node_id}
                    </td>
                    <td className="py-1.5 px-3 text-flux-secondary font-sans text-[10px]">{ev.protocol}</td>
                    <td className="py-1.5 px-3 text-flux-secondary">{ev.target_rsu}</td>
                    <td className="py-1.5 px-3 text-flux-text">{ev.packet_rate.toFixed(1)}/s</td>
                    <td className="py-1.5 px-3 text-flux-secondary">{ev.z_score.toFixed(2)}</td>
                    <td className="py-1.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold ${
                          ev.decision === 'MITIGATE_RATE_LIMIT'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                            : ev.decision === 'FLAG_SUSPICIOUS'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {ev.decision}
                      </span>
                    </td>
                    <td className="py-1.5 px-3">
                      {ev.mitigation_enforced ? (
                        <span className="text-purple-400 font-sans text-[10px] flex items-center gap-1">
                          <CheckCircle2 size={11} /> Throttled in NS-3
                        </span>
                      ) : (
                        <span className="text-flux-muted font-sans text-[10px]">Passed</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-flux-muted font-sans text-xs">
                    Start co-simulation above to inspect real-time NS-3 packet flows and ACAFDM mitigation decisions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

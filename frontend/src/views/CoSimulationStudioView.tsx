import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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
  Minimize2,
  Eye,
  CheckCircle2,
  TrendingUp,
  Clock,
  Compass,
  Search,
  Crosshair,
  Volume2,
  Truck,
  Car,
  Navigation,
  ChevronDown,
  ChevronUp,
  Server,
  Filter,
  BarChart3,
  FastForward,
  PlayCircle
} from 'lucide-react';
import {
  api,
  CoSimScenario,
  CoSimTopology,
  CoSimStatus,
  CoSimVehicle,
  CoSimWirelessEvent,
  CoSimStartPayload
} from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { getChartTokens, SVG_RENDERER_OPTS, CHART_FONT_FAMILY } from '../utils/chartTheme';

// Vehicle dynamics & interpolation state map
interface InterpolatedVehicleState {
  id: string;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  currentAngle: number;
  targetAngle: number;
  speed: number;
  speedKmh: number;
  accel: number;
  roadId: string;
  laneId: string;
  vtype: string;
  length: number;
  width: number;
  brakeLight: boolean;
  turnSignal: string;
  isAttacker: boolean;
  targetRsu: string;
  rsuDistance: number;
  packetRate: number;
  rateLimitRatio: number;
  zScore: number;
  decision: string;
  streak: number;
  lastUpdate: number;
}

// 3D Visual Packet in Flight
interface PacketParticle {
  id: string;
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  progress: number;
  speed: number;
  type: 'NORMAL_BEACON' | 'ATTACK_FLOOD' | 'MITIGATED_THROTTLE';
  mesh: THREE.Mesh;
}

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
  const [attackDuration, setAttackDuration] = useState<number>(60);
  const [targetRsu, setTargetRsu] = useState<string>('RSU_J0');
  const [persistenceK, setPersistenceK] = useState<number>(3);
  const [zThreshold, setZThreshold] = useState<number>(2.5);
  const [rateLimitRatio, setRateLimitRatio] = useState<number>(0.70);

  // Interactive Inspection & Selection
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedRsuId, setSelectedRsuId] = useState<string | null>(null);
  const [searchVehicleQuery, setSearchVehicleQuery] = useState<string>('');
  const [cameraMode, setCameraMode] = useState<'orbit' | 'topdown' | 'isometric' | 'follow'>('orbit');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'controls' | 'telemetry' | 'events'>('controls');
  const [showNetworkRays, setShowNetworkRays] = useState<boolean>(true);
  const [showBuildings, setShowBuildings] = useState<boolean>(true);

  // Timeline & Replay
  const [timelineScrubTime, setTimelineScrubTime] = useState<number | null>(null);
  const [recordedFrames, setRecordedFrames] = useState<any[]>([]);

  // DOM Refs
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Scene Group References
  const environmentGroupRef = useRef<THREE.Group | null>(null);
  const roadsGroupRef = useRef<THREE.Group | null>(null);
  const buildingsGroupRef = useRef<THREE.Group | null>(null);
  const rsusGroupRef = useRef<THREE.Group | null>(null);
  const vehiclesGroupRef = useRef<THREE.Group | null>(null);
  const packetsGroupRef = useRef<THREE.Group | null>(null);
  const selectionIndicatorRef = useRef<THREE.Mesh | null>(null);

  // State interpolation map
  const vehicleStatesRef = useRef<Map<string, InterpolatedVehicleState>>(new Map());
  const activePacketsRef = useRef<PacketParticle[]>([]);
  const lastTickTimeRef = useRef<number>(performance.now());
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
      const top = await api.getCoSimTopology(scenarioId);
      setTopology(top);
      setSelectedScenarioId(scenarioId);
      if (top.rsus && top.rsus.length > 0) {
        setTargetRsu(top.rsus[0].id);
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

        // Update interpolation targets
        if (s.vehicles) {
          updateVehicleInterpolationTargets(s.vehicles);
        }

        // Spawn wireless packet pulses for current step
        if (s.wireless_events && showNetworkRays) {
          spawnWirelessPacketPulses(s.wireless_events);
        }
      } catch (err) {
        // Silently retry
      }
    }

    checkStatus();
    pollTimer = setInterval(checkStatus, 700);

    // WebSocket connection for live low-latency telemetry
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

          if (liveData.vehicles) {
            updateVehicleInterpolationTargets(liveData.vehicles);
          }
          if (liveData.wireless_events && showNetworkRays) {
            spawnWirelessPacketPulses(liveData.wireless_events);
          }
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      clearInterval(pollTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [showNetworkRays]);

  // Update vehicle target states for smooth 60fps interpolation
  const updateVehicleInterpolationTargets = (newVehicles: CoSimVehicle[]) => {
    const now = performance.now();
    const map = vehicleStatesRef.current;
    const activeIds = new Set<string>();

    newVehicles.forEach((v) => {
      activeIds.add(v.id);
      const existing = map.get(v.id);
      if (existing) {
        // Continuous position & angle tracking
        existing.currentX = existing.targetX;
        existing.currentY = existing.targetY;
        existing.currentAngle = existing.targetAngle;
        existing.targetX = v.x;
        existing.targetY = v.y;
        existing.targetAngle = v.angle;
        existing.speed = v.speed;
        existing.speedKmh = v.speed_kmh;
        existing.accel = v.accel ?? 0.0;
        existing.roadId = v.road_id;
        existing.laneId = v.lane_id;
        existing.vtype = v.vtype || 'sedan';
        existing.length = v.length || 4.5;
        existing.width = v.width || 1.9;
        existing.brakeLight = v.brake_light ?? false;
        existing.turnSignal = v.turn_signal || 'none';
        existing.isAttacker = v.is_attacker;
        existing.targetRsu = v.target_rsu || 'RSU_J0';
        existing.rsuDistance = v.rsu_distance || 0.0;
        existing.packetRate = v.packet_rate;
        existing.rateLimitRatio = v.rate_limit_ratio;
        existing.zScore = v.z_score;
        existing.decision = v.decision;
        existing.streak = v.streak;
        existing.lastUpdate = now;
      } else {
        // New vehicle spawned
        map.set(v.id, {
          id: v.id,
          currentX: v.x,
          currentY: v.y,
          targetX: v.x,
          targetY: v.y,
          currentAngle: v.angle,
          targetAngle: v.angle,
          speed: v.speed,
          speedKmh: v.speed_kmh,
          accel: v.accel ?? 0.0,
          roadId: v.road_id,
          laneId: v.lane_id,
          vtype: v.vtype || 'sedan',
          length: v.length || 4.5,
          width: v.width || 1.9,
          brakeLight: v.brake_light ?? false,
          turnSignal: v.turn_signal || 'none',
          isAttacker: v.is_attacker,
          targetRsu: v.target_rsu || 'RSU_J0',
          rsuDistance: v.rsu_distance || 0.0,
          packetRate: v.packet_rate,
          rateLimitRatio: v.rate_limit_ratio,
          zScore: v.z_score,
          decision: v.decision,
          streak: v.streak,
          lastUpdate: now,
        });
      }
    });

    // Remove departed vehicles
    for (const id of map.keys()) {
      if (!activeIds.has(id)) {
        map.delete(id);
      }
    }
  };

  // Spawn directional 3D wireless packet pulses
  const spawnWirelessPacketPulses = (events: CoSimWirelessEvent[]) => {
    if (!packetsGroupRef.current) return;
    const group = packetsGroupRef.current;

    // Cap active packet particles for performance
    if (activePacketsRef.current.length > 35) {
      const excess = activePacketsRef.current.splice(0, activePacketsRef.current.length - 25);
      excess.forEach((p) => group.remove(p.mesh));
    }

    events.slice(0, 15).forEach((ev) => {
      let color = 0x10b981; // Benign normal beacon (Emerald)
      let size = 0.9;
      if (ev.type === 'ATTACK_FLOOD') {
        color = 0xef4444; // Malicious flood (Crimson)
        size = 1.4;
      } else if (ev.type === 'MITIGATED_THROTTLE') {
        color = 0xa855f7; // Throttled mitigation (Violet)
        size = 1.1;
      }

      const pGeo = new THREE.SphereGeometry(size, 8, 8);
      const pMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(ev.from_x, 1.8, ev.from_y);
      group.add(pMesh);

      activePacketsRef.current.push({
        id: ev.id,
        fromX: ev.from_x,
        fromZ: ev.from_y,
        toX: ev.to_x,
        toZ: ev.to_y,
        progress: 0.0,
        speed: 2.2 + Math.random() * 0.8,
        type: ev.type,
        mesh: pMesh,
      });
    });
  };

  // 3. Three.js Scene Initialization & World Building
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 3.1 Scene & Camera Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const isDark = theme !== 'light';
    scene.background = new THREE.Color(isDark ? 0x090d16 : 0xf1f5f9);
    scene.fog = new THREE.FogExp2(isDark ? 0x090d16 : 0xe2e8f0, 0.0018);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    cameraRef.current = camera;
    camera.position.set(240, 320, 480);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3.2 OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Do not go below ground
    controls.minDistance = 20;
    controls.maxDistance = 1400;
    controls.target.set(240, 0, 240);
    controlsRef.current = controls;

    // 3.3 Realistic Automotive & Architectural Lighting
    const ambientLight = new THREE.AmbientLight(isDark ? 0x64748b : 0x94a3b8, isDark ? 1.2 : 1.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, isDark ? 1.8 : 2.2);
    sunLight.position.set(300, 500, 200);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 1200;
    const d = 500;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(isDark ? 0x38bdf8 : 0xbae6fd, isDark ? 0x1e293b : 0x64748b, 0.6);
    scene.add(hemiLight);

    // 3.4 Groups for Scene Organization
    const envGroup = new THREE.Group();
    const roadsGroup = new THREE.Group();
    const bldgsGroup = new THREE.Group();
    const rsusGroup = new THREE.Group();
    const vehGroup = new THREE.Group();
    const pktsGroup = new THREE.Group();

    environmentGroupRef.current = envGroup;
    roadsGroupRef.current = roadsGroup;
    buildingsGroupRef.current = bldgsGroup;
    rsusGroupRef.current = rsusGroup;
    vehiclesGroupRef.current = vehGroup;
    packetsGroupRef.current = pktsGroup;

    scene.add(envGroup);
    scene.add(roadsGroup);
    scene.add(bldgsGroup);
    scene.add(rsusGroup);
    scene.add(vehGroup);
    scene.add(pktsGroup);

    // 3.5 Ground Terrain Base
    const groundGeo = new THREE.PlaneGeometry(2400, 2400);
    const groundMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x0f172a : 0xe2e8f0,
      roughness: 0.9,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    envGroup.add(ground);

    // Subtle ground reference grid
    const gridHelper = new THREE.GridHelper(1200, 60, isDark ? 0x1e293b : 0xcbd5e1, isDark ? 0x172033 : 0xe2e8f0);
    gridHelper.position.y = 0.0;
    envGroup.add(gridHelper);

    // 3.6 Raycaster for 3D Vehicle & RSU Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // Check vehicle intersections
      if (vehiclesGroupRef.current) {
        const hits = raycaster.intersectObjects(vehiclesGroupRef.current.children, true);
        if (hits.length > 0) {
          let topObj: THREE.Object3D | null = hits[0].object;
          while (topObj && topObj.parent !== vehiclesGroupRef.current) {
            topObj = topObj.parent;
          }
          if (topObj && (topObj as any).userData?.vehicleId) {
            const vid = (topObj as any).userData.vehicleId;
            setSelectedVehicleId(vid);
            setSelectedRsuId(null);
            return;
          }
        }
      }

      // Check RSU intersections
      if (rsusGroupRef.current) {
        const hits = raycaster.intersectObjects(rsusGroupRef.current.children, true);
        if (hits.length > 0) {
          let topObj: THREE.Object3D | null = hits[0].object;
          while (topObj && topObj.parent !== rsusGroupRef.current) {
            topObj = topObj.parent;
          }
          if (topObj && (topObj as any).userData?.rsuId) {
            const rid = (topObj as any).userData.rsuId;
            setSelectedRsuId(rid);
            setSelectedVehicleId(null);
            return;
          }
        }
      }

      // Clicked on empty ground
      setSelectedVehicleId(null);
      setSelectedRsuId(null);
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);

    // 3.7 Handle Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
    };
  }, [theme]);

  // 4. Construct Real SUMO Road Geometry, Asphalt Markings, Buildings & RSUs
  useEffect(() => {
    if (!topology || !roadsGroupRef.current || !buildingsGroupRef.current || !rsusGroupRef.current) return;
    const isDark = theme !== 'light';

    // 4.1 Build Real Road Surfaces & Lane Markings
    const roadsGroup = roadsGroupRef.current;
    while (roadsGroup.children.length > 0) {
      roadsGroup.remove(roadsGroup.children[0]);
    }

    const asphaltMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x18202d : 0x334155,
      roughness: 0.88,
      metalness: 0.08,
    });

    const laneMarkingWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const laneMarkingYellowMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const curbConcreteMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x2b384e : 0x94a3b8,
      roughness: 0.95,
    });

    // Render lanes or edges as accurate road ribbons
    const edgesToRender = topology.edges || [];
    edgesToRender.forEach((edge) => {
      const shape = edge.shape;
      if (shape.length < 2) return;

      const numLanes = edge.lanes || 2;
      const roadWidth = numLanes * 3.3;

      for (let i = 0; i < shape.length - 1; i++) {
        const p1 = new THREE.Vector2(shape[i][0], shape[i][1]);
        const p2 = new THREE.Vector2(shape[i + 1][0], shape[i + 1][1]);
        const dir = new THREE.Vector2().subVectors(p2, p1).normalize();
        const normal = new THREE.Vector2(-dir.y, dir.x);
        const length = p1.distanceTo(p2);
        const angle = Math.atan2(dir.y, dir.x);
        const mid = new THREE.Vector2().addVectors(p1, p2).multiplyScalar(0.5);

        // Asphalt Bed Mesh
        const roadGeo = new THREE.PlaneGeometry(length, roadWidth);
        const roadMesh = new THREE.Mesh(roadGeo, asphaltMat);
        roadMesh.rotation.x = -Math.PI / 2;
        roadMesh.rotation.z = -angle;
        roadMesh.position.set(mid.x, 0.02, mid.y);
        roadMesh.receiveShadow = true;
        roadsGroup.add(roadMesh);

        // Outer Curbs / Sidewalk Edges
        const curbWidth = 0.45;
        const leftCurbPos = mid.clone().add(normal.clone().multiplyScalar(roadWidth / 2 + curbWidth / 2));
        const rightCurbPos = mid.clone().sub(normal.clone().multiplyScalar(roadWidth / 2 + curbWidth / 2));

        const curbGeo = new THREE.BoxGeometry(length, 0.25, curbWidth);
        const leftCurb = new THREE.Mesh(curbGeo, curbConcreteMat);
        leftCurb.position.set(leftCurbPos.x, 0.12, leftCurbPos.y);
        leftCurb.rotation.y = -angle;
        roadsGroup.add(leftCurb);

        const rightCurb = new THREE.Mesh(curbGeo, curbConcreteMat);
        rightCurb.position.set(rightCurbPos.x, 0.12, rightCurbPos.y);
        rightCurb.rotation.y = -angle;
        roadsGroup.add(rightCurb);

        // Lane Divider Markings (Dashed White / Yellow)
        for (let l = 1; l < numLanes; l++) {
          const laneOffset = -roadWidth / 2 + l * 3.3;
          const markCenter = mid.clone().add(normal.clone().multiplyScalar(laneOffset));
          const markGeo = new THREE.PlaneGeometry(length * 0.7, 0.18);
          const markMesh = new THREE.Mesh(markGeo, l === 1 ? laneMarkingYellowMat : laneMarkingWhiteMat);
          markMesh.rotation.x = -Math.PI / 2;
          markMesh.rotation.z = -angle;
          markMesh.position.set(markCenter.x, 0.035, markCenter.y);
          roadsGroup.add(markMesh);
        }
      }
    });

    // Render Junction Polygonal Surfaces & Crosswalks
    const junctions = topology.junctions || [];
    junctions.forEach((j) => {
      if (j.shape && j.shape.length >= 3) {
        const shape = new THREE.Shape();
        shape.moveTo(j.shape[0][0], j.shape[0][1]);
        for (let i = 1; i < j.shape.length; i++) {
          shape.lineTo(j.shape[i][0], j.shape[i][1]);
        }
        shape.closePath();

        const jGeo = new THREE.ShapeGeometry(shape);
        const jMesh = new THREE.Mesh(jGeo, asphaltMat);
        jMesh.rotation.x = -Math.PI / 2;
        jMesh.position.y = 0.025;
        jMesh.receiveShadow = true;
        roadsGroup.add(jMesh);
      } else {
        // Fallback round junction cap
        const jGeo = new THREE.CylinderGeometry(8.5, 8.5, 0.04, 24);
        const jMesh = new THREE.Mesh(jGeo, asphaltMat);
        jMesh.position.set(j.x, 0.025, j.y);
        jMesh.receiveShadow = true;
        roadsGroup.add(jMesh);
      }
    });

    // 4.2 Build Real 3D Urban Blocks & Architectural Buildings
    const bldgsGroup = buildingsGroupRef.current;
    while (bldgsGroup.children.length > 0) {
      bldgsGroup.remove(bldgsGroup.children[0]);
    }

    if (showBuildings && topology.buildings && topology.buildings.length > 0) {
      topology.buildings.forEach((b) => {
        const bGroup = new THREE.Group();
        bGroup.position.set(b.x, 0, b.y);

        // Concrete Sidewalk Base
        const baseGeo = new THREE.BoxGeometry(b.width + 4.0, 0.35, b.depth + 4.0);
        const baseMat = new THREE.MeshStandardMaterial({
          color: isDark ? 0x1f2937 : 0xe2e8f0,
          roughness: 0.9,
        });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.y = 0.17;
        baseMesh.receiveShadow = true;
        bGroup.add(baseMesh);

        // Main Architectural Structure
        const bldgGeo = new THREE.BoxGeometry(b.width, b.height, b.depth);
        const bldgMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(b.color || (isDark ? 0x1e293b : 0x64748b)),
          roughness: 0.45,
          metalness: 0.25,
        });
        const bldgMesh = new THREE.Mesh(bldgGeo, bldgMat);
        bldgMesh.position.y = b.height / 2 + 0.35;
        bldgMesh.castShadow = true;
        bldgMesh.receiveShadow = true;
        bGroup.add(bldgMesh);

        // Rooftop Mechanical Penthouse / HVAC Pods
        const roofPodGeo = new THREE.BoxGeometry(b.width * 0.4, 3.2, b.depth * 0.4);
        const roofPodMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x0f172a : 0x475569, roughness: 0.8 });
        const roofPod = new THREE.Mesh(roofPodGeo, roofPodMat);
        roofPod.position.y = b.height + 1.95;
        bGroup.add(roofPod);

        bldgsGroup.add(bGroup);
      });
    }

    // 4.3 Build Recognizable 3D RSU Communication Infrastructure Towers
    const rsusGroup = rsusGroupRef.current;
    while (rsusGroup.children.length > 0) {
      rsusGroup.remove(rsusGroup.children[0]);
    }

    const rsus = topology.rsus || [];
    rsus.forEach((rsu) => {
      const rsuGroup = new THREE.Group();
      rsuGroup.position.set(rsu.x, 0, rsu.y);
      (rsuGroup as any).userData = { rsuId: rsu.id };

      // Base Equipment Cabinet
      const cabinetGeo = new THREE.BoxGeometry(2.4, 2.2, 2.0);
      const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.3 });
      const cabinet = new THREE.Mesh(cabinetGeo, cabinetMat);
      cabinet.position.y = 1.1;
      cabinet.castShadow = true;
      rsuGroup.add(cabinet);

      // Steel Mast Lattice Column
      const mastGeo = new THREE.CylinderGeometry(0.35, 0.55, 12.0, 8);
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.2 });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.y = 7.0;
      mast.castShadow = true;
      rsuGroup.add(mast);

      // Gantry Crossarm
      const armGeo = new THREE.BoxGeometry(4.2, 0.25, 0.35);
      const arm = new THREE.Mesh(armGeo, mastMat);
      arm.position.y = 11.5;
      rsuGroup.add(arm);

      // Sector DSRC Antenna Array
      const antGeo = new THREE.BoxGeometry(0.35, 1.4, 0.4);
      const antMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1 });
      const ant1 = new THREE.Mesh(antGeo, antMat);
      ant1.position.set(-1.8, 11.5, 0);
      const ant2 = new THREE.Mesh(antGeo, antMat);
      ant2.position.set(1.8, 11.5, 0);
      rsuGroup.add(ant1);
      rsuGroup.add(ant2);

      // Microwave Dish
      const dishGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.25, 16);
      const dishMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
      const dish = new THREE.Mesh(dishGeo, dishMat);
      dish.rotation.x = Math.PI / 2;
      dish.position.set(0, 10.2, 0.6);
      rsuGroup.add(dish);

      // Dynamic Status LED Beacon atop the mast
      const ledGeo = new THREE.SphereGeometry(0.4, 12, 12);
      const isTarget = rsu.id === targetRsu && attackEnabled;
      const ledMat = new THREE.MeshStandardMaterial({
        color: isTarget ? 0xef4444 : 0x10b981,
        emissive: isTarget ? 0xdc2626 : 0x059669,
        emissiveIntensity: 2.2,
      });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.y = 13.2;
      rsuGroup.add(led);

      // Subtle Engineering Fresnel Range Ring on ground
      const rangeRadius = rsu.range || 160.0;
      const ringGeo = new THREE.RingGeometry(rangeRadius - 0.8, rangeRadius, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isTarget ? 0xef4444 : 0x38bdf8,
        transparent: true,
        opacity: 0.20,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;
      rsuGroup.add(ring);

      rsusGroup.add(rsuGroup);
    });

    // Center Camera over Network Bounding Box
    if (topology.bbox && controlsRef.current) {
      const centerX = (topology.bbox.min_x + topology.bbox.max_x) / 2;
      const centerY = (topology.bbox.min_y + topology.bbox.max_y) / 2;
      controlsRef.current.target.set(centerX, 0, centerY);
    }
  }, [topology, showBuildings, theme, targetRsu, attackEnabled]);

  // 5. High-Fidelity Vehicle Geometries & Procedural 3D Models
  const vehicleGeometries = useMemo(() => {
    return {
      sedanBody: new THREE.BoxGeometry(4.3, 1.1, 1.85),
      sedanCabin: new THREE.BoxGeometry(2.4, 0.9, 1.55),
      suvBody: new THREE.BoxGeometry(4.8, 1.4, 2.0),
      suvCabin: new THREE.BoxGeometry(3.0, 1.0, 1.7),
      vanBody: new THREE.BoxGeometry(5.6, 2.1, 2.1),
      truckCab: new THREE.BoxGeometry(2.6, 2.8, 2.4),
      truckTrailer: new THREE.BoxGeometry(7.2, 2.7, 2.4),
      busBody: new THREE.BoxGeometry(11.2, 2.8, 2.55),
      wheel: new THREE.CylinderGeometry(0.38, 0.38, 0.28, 12),
      lightHead: new THREE.BoxGeometry(0.12, 0.18, 0.45),
      lightTail: new THREE.BoxGeometry(0.12, 0.18, 0.45),
    };
  }, []);

  // 6. 60 FPS Render Loop: Position Interpolation, Dynamic Lights, Camera Tracking
  useEffect(() => {
    let lastFrameTime = performance.now();

    const animate = (currentTime: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const deltaSec = (currentTime - lastFrameTime) / 1000.0;
      lastFrameTime = currentTime;

      // Update OrbitControls
      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Interpolate and Render Vehicles
      if (vehiclesGroupRef.current) {
        const group = vehiclesGroupRef.current;
        const vMap = vehicleStatesRef.current;

        // Clear previous vehicle objects
        while (group.children.length > 0) {
          group.remove(group.children[0]);
        }

        const lerpFactor = Math.min(1.0, deltaSec * 6.0 * playbackSpeed);

        vMap.forEach((v) => {
          // Linear / Hermite position interpolation
          v.currentX += (v.targetX - v.currentX) * lerpFactor;
          v.currentY += (v.targetY - v.currentY) * lerpFactor;

          // Shortest angular arc interpolation
          let angleDiff = (v.targetAngle - v.currentAngle + 540) % 360 - 180;
          v.currentAngle += angleDiff * lerpFactor;

          const vGroup = new THREE.Group();
          vGroup.position.set(v.currentX, 0, v.currentY);
          // Three.js vertical axis rotation aligned with SUMO heading
          const yawRad = (90 - v.currentAngle) * (Math.PI / 180);
          vGroup.rotation.y = yawRad;
          (vGroup as any).userData = { vehicleId: v.id };

          // Color selection based on ground truth and ACAFDM detection
          let carColor = 0x2563eb; // Default Royal Blue
          let emissiveColor = 0x000000;
          let emissiveIntensity = 0.0;

          if (v.isAttacker) {
            carColor = 0xef4444; // Malicious Attacker: Crimson Red
            emissiveColor = 0xdc2626;
            emissiveIntensity = 0.8;
          } else if (v.decision === 'MITIGATE_RATE_LIMIT') {
            carColor = 0xa855f7; // Throttled: Violet
            emissiveColor = 0x7e22ce;
            emissiveIntensity = 0.5;
          } else if (v.decision === 'FLAG_SUSPICIOUS') {
            carColor = 0xf59e0b; // Suspicious: Amber
            emissiveColor = 0xd97706;
            emissiveIntensity = 0.4;
          } else {
            // Realistic automotive palette
            const palette = [0x1e3a8a, 0x334155, 0xd97706, 0x0f766e, 0x475569, 0xb91c1c];
            const pIdx = Math.abs(v.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % palette.length;
            carColor = palette[pIdx];
          }

          const carMat = new THREE.MeshStandardMaterial({
            color: carColor,
            roughness: 0.35,
            metalness: 0.4,
            emissive: emissiveColor,
            emissiveIntensity,
          });

          const glassMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.1,
            metalness: 0.8,
            transparent: true,
            opacity: 0.75,
          });

          const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });

          // Assemble Vehicle Body Class
          if (v.vtype === 'bus') {
            const busMesh = new THREE.Mesh(vehicleGeometries.busBody, carMat);
            busMesh.position.y = 1.6;
            busMesh.castShadow = true;
            vGroup.add(busMesh);
          } else if (v.vtype === 'truck') {
            const cab = new THREE.Mesh(vehicleGeometries.truckCab, carMat);
            cab.position.set(2.4, 1.6, 0);
            cab.castShadow = true;
            vGroup.add(cab);

            const trailerMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
            const trailer = new THREE.Mesh(vehicleGeometries.truckTrailer, trailerMat);
            trailer.position.set(-2.8, 1.8, 0);
            trailer.castShadow = true;
            vGroup.add(trailer);
          } else if (v.vtype === 'suv') {
            const body = new THREE.Mesh(vehicleGeometries.suvBody, carMat);
            body.position.y = 0.85;
            body.castShadow = true;
            vGroup.add(body);

            const cabin = new THREE.Mesh(vehicleGeometries.suvCabin, glassMat);
            cabin.position.set(-0.2, 1.8, 0);
            vGroup.add(cabin);
          } else {
            // Sedan / Coupe
            const body = new THREE.Mesh(vehicleGeometries.sedanBody, carMat);
            body.position.y = 0.7;
            body.castShadow = true;
            vGroup.add(body);

            const cabin = new THREE.Mesh(vehicleGeometries.sedanCabin, glassMat);
            cabin.position.set(-0.3, 1.5, 0);
            vGroup.add(cabin);
          }

          // Active Dynamic Headlights (Xenon White)
          const hlMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
          const hl1 = new THREE.Mesh(vehicleGeometries.lightHead, hlMat);
          hl1.position.set(v.length / 2 - 0.1, 0.7, 0.6);
          const hl2 = new THREE.Mesh(vehicleGeometries.lightHead, hlMat);
          hl2.position.set(v.length / 2 - 0.1, 0.7, -0.6);
          vGroup.add(hl1);
          vGroup.add(hl2);

          // Active Dynamic Taillights & Brake Light Glow
          const tlMat = new THREE.MeshBasicMaterial({
            color: v.brakeLight ? 0xff0000 : 0x991b1b,
          });
          const tl1 = new THREE.Mesh(vehicleGeometries.lightTail, tlMat);
          tl1.position.set(-v.length / 2 + 0.1, 0.7, 0.6);
          const tl2 = new THREE.Mesh(vehicleGeometries.lightTail, tlMat);
          tl2.position.set(-v.length / 2 + 0.1, 0.7, -0.6);
          vGroup.add(tl1);
          vGroup.add(tl2);

          // Highlight Ring for Selection
          if (v.id === selectedVehicleId) {
            const selGeo = new THREE.RingGeometry(v.length * 0.65, v.length * 0.75, 32);
            const selMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
            const selRing = new THREE.Mesh(selGeo, selMat);
            selRing.rotation.x = -Math.PI / 2;
            selRing.position.y = 0.08;
            vGroup.add(selRing);

            // Overhead HUD Target Reticle
            const reticleGeo = new THREE.ConeGeometry(0.7, 1.4, 4);
            const reticleMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
            const reticle = new THREE.Mesh(reticleGeo, reticleMat);
            reticle.rotation.x = Math.PI;
            reticle.position.y = 3.6 + Math.sin(currentTime * 0.005) * 0.3;
            vGroup.add(reticle);
          }

          group.add(vGroup);
        });

        // Camera Follow Mode
        if (cameraMode === 'follow' && selectedVehicleId && cameraRef.current && controlsRef.current) {
          const selV = vMap.get(selectedVehicleId);
          if (selV) {
            const camTarget = new THREE.Vector3(selV.currentX, 0, selV.currentY);
            controlsRef.current.target.lerp(camTarget, 0.08);

            // Position chase cam behind vehicle based on heading
            const yawRad = (90 - selV.currentAngle) * (Math.PI / 180);
            const chaseOffset = new THREE.Vector3(-Math.cos(yawRad) * 45, 24, Math.sin(yawRad) * 45);
            const desiredCamPos = camTarget.clone().add(chaseOffset);
            cameraRef.current.position.lerp(desiredCamPos, 0.05);
          }
        }
      }

      // Update Active 3D Wireless Packet Particles
      if (packetsGroupRef.current && activePacketsRef.current.length > 0) {
        const packets = activePacketsRef.current;
        for (let i = packets.length - 1; i >= 0; i--) {
          const p = packets[i];
          p.progress += deltaSec * p.speed * playbackSpeed;
          if (p.progress >= 1.0) {
            packetsGroupRef.current.remove(p.mesh);
            packets.splice(i, 1);
          } else {
            p.mesh.position.x = p.fromX + (p.toX - p.fromX) * p.progress;
            p.mesh.position.z = p.fromZ + (p.toZ - p.fromZ) * p.progress;
            // Arc parabolic trajectory up to RSU mast height
            p.mesh.position.y = 1.8 + (12.0 - 1.8) * p.progress + Math.sin(p.progress * Math.PI) * 4.0;
          }
        }
      }

      // Render Scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [playbackSpeed, cameraMode, selectedVehicleId, vehicleGeometries]);

  // Camera Presets
  const applyCameraPreset = (mode: 'orbit' | 'topdown' | 'isometric') => {
    setCameraMode(mode);
    if (!cameraRef.current || !controlsRef.current || !topology) return;
    const centerX = topology.bbox ? (topology.bbox.min_x + topology.bbox.max_x) / 2 : 240;
    const centerY = topology.bbox ? (topology.bbox.min_y + topology.bbox.max_y) / 2 : 240;

    if (mode === 'topdown') {
      cameraRef.current.position.set(centerX, 620, centerY + 1);
      controlsRef.current.target.set(centerX, 0, centerY);
    } else if (mode === 'isometric') {
      cameraRef.current.position.set(centerX + 380, 420, centerY + 380);
      controlsRef.current.target.set(centerX, 0, centerY);
    } else {
      cameraRef.current.position.set(centerX + 180, 240, centerY + 320);
      controlsRef.current.target.set(centerX, 0, centerY);
    }
  };

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
        attack_duration: attackDuration,
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
      setAttackDuration(60);
      setRateLimitRatio(0.80);
      loadTopology('scenario_d');
    } else if (presetKey === 'mitigation_demo') {
      setSelectedScenarioId('scenario_a');
      setDemandPeriod(1.8);
      setAttackEnabled(true);
      setAttackIntensity(95);
      setAttackStartTime(15);
      setAttackDuration(60);
      setPersistenceK(3);
      setZThreshold(2.5);
      setRateLimitRatio(0.70);
      loadTopology('scenario_a');
    }
  };

  // Inspect selected vehicle
  const selectedVehicleData = useMemo(() => {
    if (!selectedVehicleId) return null;
    return vehicleStatesRef.current.get(selectedVehicleId) || null;
  }, [selectedVehicleId, status]);

  // Inspect selected RSU
  const selectedRsuData = useMemo(() => {
    if (!selectedRsuId || !topology?.rsus) return null;
    return topology.rsus.find((r) => r.id === selectedRsuId) || null;
  }, [selectedRsuId, topology]);

  // ECharts Configurations
  const throughputChartOptions = {
    ...SVG_RENDERER_OPTS,
    grid: { left: 40, right: 15, top: 22, bottom: 22 },
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
        smooth: true,
        data: (status?.telemetry_history || []).map((h) => h.throughput_mbps),
        itemStyle: { color: '#38bdf8' },
        areaStyle: {
          color: new (THREE as any).Color ? '#38bdf822' : undefined,
        },
      },
      {
        name: 'PDR (%)',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: (status?.telemetry_history || []).map((h) => h.pdr),
        itemStyle: { color: '#10b981' },
      },
    ],
  };

  const delayChartOptions = {
    ...SVG_RENDERER_OPTS,
    grid: { left: 40, right: 15, top: 22, bottom: 22 },
    tooltip: { trigger: 'axis', textStyle: { fontFamily: CHART_FONT_FAMILY, fontSize: 11 } },
    legend: { data: ['Delay (ms)', 'Jitter (ms)'], textStyle: { color: ct.legendText, fontSize: 10 } },
    xAxis: {
      type: 'category',
      data: (status?.telemetry_history || []).map((h) => `${h.time}s`),
      axisLabel: { color: ct.axisLabel, fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      name: 'ms',
      nameTextStyle: { color: ct.axisLabel, fontSize: 9 },
      axisLabel: { color: ct.axisLabel, fontSize: 9 },
      splitLine: { lineStyle: { color: ct.splitLine } },
    },
    series: [
      {
        name: 'Delay (ms)',
        type: 'line',
        smooth: true,
        data: (status?.telemetry_history || []).map((h) => h.delay_ms),
        itemStyle: { color: '#f59e0b' },
      },
      {
        name: 'Jitter (ms)',
        type: 'line',
        smooth: true,
        data: (status?.telemetry_history || []).map((h) => h.jitter_ms),
        itemStyle: { color: '#8b5cf6' },
      },
    ],
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-slate-950 text-slate-100 ${
        isFullscreen ? 'fixed inset-0 z-50 p-3' : 'space-y-3'
      }`}
    >
      {/* 1. Header Ribbon & Enterprise Controls */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl backdrop-blur-md shadow-xl shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/20">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-white">Co-Simulation Studio</h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/60 rounded-md">
                Automotive Digital Twin
              </span>
              <span className="px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-300 rounded-md">
                SUMO {engineVersions.sumo} + NS-3 {engineVersions.ns3}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Synchronized 802.11p WAVE mobility, physical Nakagami fading & ACAFDM closed-loop mitigation
            </p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center space-x-2">
          {/* Simulation Playback Controls */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 space-x-1">
            {!isRunning ? (
              <button
                onClick={handleStartSimulation}
                className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md shadow-md shadow-emerald-900/30 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Co-Simulation</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handlePauseResume}
                  className={`flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                    isPaused ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
                <button
                  onClick={handleStopSimulation}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-md transition-all"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              </>
            )}
          </div>

          {/* Speed Selector */}
          <div className="flex items-center bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60 space-x-1 text-xs">
            <FastForward className="w-3.5 h-3.5 text-slate-400" />
            {[0.5, 1.0, 2.0, 5.0].map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-1.5 py-0.5 rounded font-mono ${
                  playbackSpeed === s ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700/60 transition-all"
            title="Toggle Fullscreen Simulation"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Main Studio Workspace: 3D Digital Twin Viewport & Floating HUDs */}
      <div className="relative flex-1 min-h-[500px] w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
        {/* 3D WebGL Canvas Mount */}
        <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Floating Top-Left Status & Timeline Ribbon */}
        <div className="absolute top-3 left-3 flex flex-col space-y-2 pointer-events-none">
          {/* Live Telemetry Badge */}
          <div className="flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 shadow-lg pointer-events-auto">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status?.status === 'RUNNING'
                  ? 'bg-emerald-400 animate-ping'
                  : status?.status === 'PAUSED'
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              {status?.status || 'IDLE'}
            </span>
            <span className="text-slate-500">|</span>
            <div className="flex items-center space-x-1 font-mono text-xs text-cyan-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{status?.sim_clock ? `${status.sim_clock.toFixed(1)}s` : '0.0s'}</span>
              <span className="text-slate-500">/ {duration}s</span>
            </div>
            <span className="text-slate-500">|</span>
            <div className="flex items-center space-x-1 text-xs text-slate-300">
              <Car className="w-3.5 h-3.5 text-blue-400" />
              <span>{status?.active_vehicle_count || 0} active</span>
            </div>
          </div>

          {/* Synchronized Research Experiment Milestones Timeline */}
          <div className="flex items-center space-x-1 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 shadow-lg text-[10px] text-slate-300 pointer-events-auto">
            <span className="text-slate-400 font-medium">Timeline:</span>
            <span className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">0s Init</span>
            <span className="text-slate-600">→</span>
            <span
              className={`px-1.5 py-0.5 rounded font-medium ${
                status && status.sim_clock >= attackStartTime && status.sim_clock <= attackStartTime + attackDuration
                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {attackStartTime}s Flooding Attack
            </span>
            <span className="text-slate-600">→</span>
            <span
              className={`px-1.5 py-0.5 rounded font-medium ${
                status && status.sim_clock >= attackStartTime + 2
                  ? 'bg-purple-950 text-purple-400 border border-purple-800'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {attackStartTime + 2}s ACAFDM Throttling
            </span>
            <span className="text-slate-600">→</span>
            <span className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">{duration}s Benchmark End</span>
          </div>
        </div>

        {/* Floating Top-Right Viewport & Camera Controls */}
        <div className="absolute top-3 right-3 flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-lg">
          <button
            onClick={() => applyCameraPreset('orbit')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
              cameraMode === 'orbit' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3D Orbit
          </button>
          <button
            onClick={() => applyCameraPreset('isometric')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
              cameraMode === 'isometric' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Isometric
          </button>
          <button
            onClick={() => applyCameraPreset('topdown')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
              cameraMode === 'topdown' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2D Tactical
          </button>
          {selectedVehicleId && (
            <button
              onClick={() => setCameraMode(cameraMode === 'follow' ? 'orbit' : 'follow')}
              className={`flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                cameraMode === 'follow'
                  ? 'bg-amber-600 text-white font-semibold animate-pulse'
                  : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Follow Car #{selectedVehicleId}</span>
            </button>
          )}

          <div className="h-4 w-[1px] bg-slate-700 mx-1" />

          {/* Toggle Layers */}
          <button
            onClick={() => setShowNetworkRays(!showNetworkRays)}
            className={`p-1.5 rounded-lg transition-all ${
              showNetworkRays ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle 3D V2X Packet Rays"
          >
            <Wifi className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowBuildings(!showBuildings)}
            className={`p-1.5 rounded-lg transition-all ${
              showBuildings ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Urban 3D Buildings"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating Vehicle Inspector Card (Active when vehicle selected) */}
        {selectedVehicleData && (
          <div className="absolute bottom-3 left-3 w-80 bg-slate-900/95 backdrop-blur-md rounded-xl border border-cyan-500/40 p-3.5 shadow-2xl space-y-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Car className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white">Vehicle #{selectedVehicleData.id}</span>
                <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold bg-slate-800 text-slate-300 rounded">
                  {selectedVehicleData.vtype}
                </span>
              </div>
              <button
                onClick={() => setSelectedVehicleId(null)}
                className="text-slate-500 hover:text-slate-300 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Mobility Metrics */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[10px]">Speed</div>
                <div className="font-mono font-bold text-slate-100">
                  {selectedVehicleData.speedKmh.toFixed(1)} km/h
                  <span className="text-[9px] text-slate-500 font-normal"> ({selectedVehicleData.speed.toFixed(1)} m/s)</span>
                </div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[10px]">Acceleration</div>
                <div className="font-mono font-bold text-slate-100">
                  {selectedVehicleData.accel.toFixed(2)} m/s²
                </div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[10px]">Road / Lane</div>
                <div className="font-mono font-medium text-slate-200 truncate">
                  {selectedVehicleData.laneId || selectedVehicleData.roadId}
                </div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[10px]">Target RSU</div>
                <div className="font-mono font-medium text-cyan-400">
                  {selectedVehicleData.targetRsu} ({selectedVehicleData.rsuDistance.toFixed(0)}m)
                </div>
              </div>
            </div>

            {/* Security Classification */}
            <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">ACAFDM Decision:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedVehicleData.decision === 'MITIGATE_RATE_LIMIT'
                      ? 'bg-purple-950 text-purple-400 border border-purple-800'
                      : selectedVehicleData.decision === 'FLAG_SUSPICIOUS'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  {selectedVehicleData.decision}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Packet Rate:</span>
                <span className="font-mono font-bold text-white">{selectedVehicleData.packetRate.toFixed(1)} pkts/s</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Statistical Z-Score:</span>
                <span className="font-mono font-bold text-cyan-400">{selectedVehicleData.zScore.toFixed(2)} σ</span>
              </div>
              {selectedVehicleData.rateLimitRatio > 0 && (
                <div className="flex items-center justify-between text-[10px] text-purple-400 font-semibold">
                  <span>Enforced Rate-Limit Throttle:</span>
                  <span>{(selectedVehicleData.rateLimitRatio * 100).toFixed(0)}% drop</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => setCameraMode(cameraMode === 'follow' ? 'orbit' : 'follow')}
                className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-center font-semibold text-xs transition-all shadow-md shadow-cyan-950"
              >
                {cameraMode === 'follow' ? 'Release Camera' : 'Lock & Chase Cam'}
              </button>
            </div>
          </div>
        )}

        {/* Floating RSU Inspector Card (Active when RSU clicked) */}
        {selectedRsuData && (
          <div className="absolute bottom-3 left-3 w-80 bg-slate-900/95 backdrop-blur-md rounded-xl border border-blue-500/40 p-3.5 shadow-2xl space-y-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Server className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-white">{selectedRsuData.name}</span>
              </div>
              <button
                onClick={() => setSelectedRsuId(null)}
                className="text-slate-500 hover:text-slate-300 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">RSU ID</div>
                <div className="font-mono font-bold text-slate-200">{selectedRsuData.id}</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Coverage Radius</div>
                <div className="font-mono font-bold text-cyan-400">{selectedRsuData.range}m DSRC</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Position</div>
                <div className="font-mono text-slate-300">
                  X:{selectedRsuData.x.toFixed(0)}, Y:{selectedRsuData.y.toFixed(0)}
                </div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Functional Type</div>
                <div className="font-mono text-emerald-400 capitalize">{selectedRsuData.type}</div>
              </div>
            </div>

            <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-[10px] space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>Wireless Standard:</span>
                <span className="font-mono text-slate-200">IEEE 802.11p (5.9 GHz WAVE)</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Propagation Model:</span>
                <span className="font-mono text-slate-200">Nakagami-m Fast Fading</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Security Engine:</span>
                <span className="font-mono text-cyan-400">ACAFDM Distributed Agent</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Real-Time Telemetry KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 shrink-0">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Nodes</span>
            <Car className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white mt-1">
            {status?.active_vehicle_count || 0}
          </div>
          <div className="text-[10px] text-slate-500">TraCI live vehicles</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Packet Delivery</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
            {status?.network_metrics?.pdr ? `${status.network_metrics.pdr.toFixed(1)}%` : '100%'}
          </div>
          <div className="text-[10px] text-slate-500">IEEE 802.11p PDR</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Throughput</span>
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
            {status?.network_metrics?.throughput_mbps ? `${status.network_metrics.throughput_mbps.toFixed(2)}` : '0.00'}{' '}
            <span className="text-xs font-normal text-slate-400">Mbps</span>
          </div>
          <div className="text-[10px] text-slate-500">Air interface load</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Radio Latency</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-amber-400 mt-1">
            {status?.network_metrics?.delay_ms ? `${status.network_metrics.delay_ms.toFixed(2)}` : '2.50'}{' '}
            <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[10px] text-slate-500">MAC delay + jitter</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Packets Tx / Rx</span>
            <Wifi className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base font-bold font-mono text-white mt-1 truncate">
            {status?.network_metrics?.total_tx?.toLocaleString() || 0} /{' '}
            <span className="text-emerald-400">{status?.network_metrics?.total_rx?.toLocaleString() || 0}</span>
          </div>
          <div className="text-[10px] text-slate-500">Cumulative NS-3 count</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Mitigated Packets</span>
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-bold font-mono text-purple-400 mt-1">
            {status?.network_metrics?.malicious_dropped?.toLocaleString() || 0}
          </div>
          <div className="text-[10px] text-slate-500">Throttled attack load</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Mitigation Eff.</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg font-bold font-mono text-rose-400 mt-1">
            {status?.network_metrics?.mitigation_efficiency ? `${status.network_metrics.mitigation_efficiency.toFixed(1)}%` : '100%'}
          </div>
          <div className="text-[10px] text-slate-500">ACAFDM defense</div>
        </div>
      </div>

      {/* 4. Bottom Control Room & Live Analytics Drawers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 shrink-0">
        {/* Left: Simulation Setup & Scenario Drawer (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">Simulation Setup</span>
            </div>
            {/* Quick Scenario Presets */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => applyPreset('mitigation_demo')}
                className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-400 font-medium rounded"
              >
                Urban Demo
              </button>
              <button
                onClick={() => applyPreset('hwy_flooding')}
                className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-rose-400 font-medium rounded"
              >
                Highway Attack
              </button>
            </div>
          </div>

          {/* Scenario Select */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Target Scenario</label>
            <select
              value={selectedScenarioId}
              onChange={(e) => {
                setSelectedScenarioId(e.target.value);
                loadTopology(e.target.value);
              }}
              disabled={isRunning}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 disabled:opacity-60"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type})
                </option>
              ))}
            </select>
          </div>

          {/* Sliders: Duration & Demand */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Duration</span>
                <span className="font-mono text-cyan-400">{duration}s</span>
              </div>
              <input
                type="range"
                min="30"
                max="300"
                step="30"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                disabled={isRunning}
                className="w-full accent-cyan-500"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Emission Period</span>
                <span className="font-mono text-cyan-400">{demandPeriod}s</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.2"
                value={demandPeriod}
                onChange={(e) => setDemandPeriod(Number(e.target.value))}
                disabled={isRunning}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>

          {/* Flooding Attack Config */}
          <div className="p-2.5 bg-slate-950/70 border border-rose-900/40 rounded-lg space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-400 flex items-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Malicious Flooding Injection</span>
              </span>
              <input
                type="checkbox"
                checked={attackEnabled}
                onChange={(e) => setAttackEnabled(e.target.checked)}
                disabled={isRunning}
                className="accent-rose-500 rounded"
              />
            </div>
            {attackEnabled && (
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-400">Attack Rate:</span>
                  <div className="font-mono font-bold text-rose-400">{attackIntensity} pkts/s</div>
                </div>
                <div>
                  <span className="text-slate-400">Attack Onset:</span>
                  <div className="font-mono font-bold text-amber-400">t = {attackStartTime}s</div>
                </div>
              </div>
            )}
          </div>

          {/* ACAFDM Defense Parameters */}
          <div className="p-2.5 bg-slate-950/70 border border-purple-900/40 rounded-lg space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-400 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ACAFDM Dual-Gate Policy</span>
              </span>
              <span className="text-[10px] font-mono text-purple-300">k={persistenceK}, z={zThreshold}σ</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div>
                <span>Rate-Limit Throttle:</span>
                <div className="font-mono font-bold text-purple-400">{(rateLimitRatio * 100).toFixed(0)}%</div>
              </div>
              <div>
                <span>Poison Gate:</span>
                <div className="font-mono font-bold text-emerald-400">Active (EWMA)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Live Research Telemetry Charts (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow-xl">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">Live NS-3 Wave Telemetry</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">1.0s resolution</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Throughput & PDR Recovery
              </div>
              <div className="h-32">
                <ReactECharts option={throughputChartOptions} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Wireless Latency & Jitter
              </div>
              <div className="h-32">
                <ReactECharts option={delayChartOptions} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live ACAFDM Decision Stream (3 Cols) */}
        <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">ACAFDM Event Stream</span>
            </div>
            <span className="text-[10px] text-slate-500">Live</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[160px] pr-1">
            {(!status?.recent_events || status.recent_events.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 text-xs py-8">
                <Clock className="w-6 h-6 mb-1 text-slate-700" />
                <span>Awaiting live observations...</span>
              </div>
            ) : (
              status.recent_events.map((ev, i) => (
                <div
                  key={i}
                  className={`p-1.5 rounded-lg border text-[10px] ${
                    ev.decision === 'MITIGATE_RATE_LIMIT'
                      ? 'bg-purple-950/40 border-purple-800/80 text-purple-300'
                      : ev.decision === 'FLAG_SUSPICIOUS'
                      ? 'bg-amber-950/40 border-amber-800/80 text-amber-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-white">Node #{ev.node_id}</span>
                    <span className="font-semibold text-[9px] uppercase">{ev.decision}</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-400 mt-0.5">
                    <span>Rate: {ev.packet_rate} pkts/s</span>
                    <span className="font-mono">z={ev.z_score.toFixed(2)}σ</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

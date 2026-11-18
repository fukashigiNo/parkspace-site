import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { memo, useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { ParkingLot, ParkingSpot } from "@/domain/parking/ParkingLot";
import type { SpotDisplay } from "@/presentation/components/booking/spot-display";
import { SPOT_D, SPOT_W, lotBounds } from "./geometry";

/** Цвета сцены, согласованные с токенами интерфейса */
const C = {
  available: "#3f9e6b",
  unavailable: "#b8615a",
  closed: "#9aa1ab",
  selected: "#e3a33a",
  asphalt: "#4a5260",
  aisle: "#585f6d",
  curb: "#d5d9de",
  grass: "#9cb98a",
  ground: "#e7e9ec",
  line: "#f4f5f7",
  sidewalk: "#c9cdd3",
};

const CAR_COLORS = ["#c8ccd2", "#3b6aa8", "#a14a3f", "#1f2937", "#e6e2d6", "#5d7a5a", "#8a8f98", "#b58b3d", "#f1f2f4", "#6b3f7a"];

export function carColorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return CAR_COLORS[Math.abs(h) % CAR_COLORS.length]!;
}

export interface ParkAnim {
  spotId: string;
  plate: string;
  n: number;
}

export interface SceneProps {
  lot: ParkingLot;
  spots: ParkingSpot[];
  display: Record<string, SpotDisplay>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Места, занятые прямо сейчас: id → госномер */
  occupiedNow: Record<string, string>;
  parkAnim: ParkAnim | null;
  onAnimDone?: (() => void) | undefined;
  night: boolean;
  follow: boolean;
  view: { mode: "reset" | "top"; n: number };
  onReady?: (() => void) | undefined;
  onHoverSpot?: ((id: string | null) => void) | undefined;
}

/* ---------- текстуры ---------- */

const texCache = new Map<string, THREE.CanvasTexture>();
function cachedTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  let t = texCache.get(key);
  if (t) return t;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

const labelTexture = (code: string) =>
  cachedTexture(`label-${code}`, 256, 128, (g) => {
    g.fillStyle = "rgba(255,255,255,0.95)";
    g.beginPath();
    g.roundRect(6, 8, 244, 112, 24);
    g.fill();
    g.fillStyle = "#1f2937";
    g.font = "800 84px Manrope, system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(code, 128, 66);
  });

function iconTexture(kind: "ev" | "accessible" | "family") {
  return cachedTexture(`icon-${kind}`, 128, 128, (g) => {
    g.fillStyle = kind === "ev" ? "#2563eb" : kind === "family" ? "#db2777" : "#1d4ed8";
    g.beginPath();
    g.arc(64, 64, 58, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    if (kind === "family") {
      // взрослый и ребёнок
      g.beginPath();
      g.arc(48, 38, 11, 0, Math.PI * 2);
      g.arc(84, 58, 8, 0, Math.PI * 2);
      g.fill();
      g.fillRect(39, 52, 18, 42);
      g.fillRect(78, 69, 13, 26);
      return;
    }
    g.font = "bold 64px system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(kind === "ev" ? "⚡" : "♿", 64, 70);
  });
}

const tagTexture = (plate: string) =>
  cachedTexture(`tag-${plate}`, 256, 64, (g) => {
    g.fillStyle = "#f59e0b";
    g.beginPath();
    g.roundRect(2, 2, 252, 60, 18);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = "800 36px Manrope, system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(plate.slice(0, 12), 128, 34);
  });

const plateTexture = (plate: string) =>
  cachedTexture(`plate-${plate}`, 256, 60, (g) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 256, 60);
    g.strokeStyle = "#111827";
    g.lineWidth = 4;
    g.strokeRect(2, 2, 252, 56);
    g.fillStyle = "#1d4ed8";
    g.fillRect(4, 4, 30, 52);
    g.fillStyle = "#facc15";
    g.font = "bold 14px system-ui";
    g.textAlign = "center";
    g.fillText("KZ", 19, 46);
    g.fillStyle = "#111827";
    g.font = "800 36px Manrope, system-ui, sans-serif";
    g.textBaseline = "middle";
    g.fillText(plate.slice(0, 12), 145, 32);
  });

function facadeTexture(color: string, floors: number) {
  return cachedTexture(`facade-${color}-${floors}`, 512, 256, (g) => {
    g.fillStyle = color;
    g.fillRect(0, 0, 512, 256);
    const band = 256 / floors;
    for (let f = 0; f < floors; f++) {
      const y = f * band + band * 0.22;
      const grad = g.createLinearGradient(0, y, 0, y + band * 0.56);
      grad.addColorStop(0, "#6f93b8");
      grad.addColorStop(1, "#2f4f73");
      g.fillStyle = grad;
      g.fillRect(8, y, 496, band * 0.56);
      g.fillStyle = "rgba(255,255,255,0.35)";
      for (let x = 8; x < 504; x += 32) g.fillRect(x, y, 2, band * 0.56);
    }
  });
}

function signTexture(text: string, bg: string, fg: string) {
  return cachedTexture(`sign-${text}-${bg}`, 1024, 192, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, 1024, 192);
    g.fillStyle = fg;
    let size = 132;
    g.font = `900 ${size}px Manrope, system-ui, sans-serif`;
    while (g.measureText(text).width > 960 && size > 40) {
      size -= 6;
      g.font = `900 ${size}px Manrope, system-ui, sans-serif`;
    }
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 512, 102);
  });
}

/* ---------- общие геометрии и материалы ---------- */

const spotGeo = new THREE.BoxGeometry(SPOT_W - 0.25, 0.06, SPOT_D - 0.3);
const labelGeo = new THREE.PlaneGeometry(2.3, 1.15);
const iconGeo = new THREE.CircleGeometry(0.45, 24);
const outlineGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(SPOT_W - 0.1, 0.1, SPOT_D - 0.15));

const mats = {
  available: new THREE.MeshStandardMaterial({ color: C.available, roughness: 0.8 }),
  unavailable: new THREE.MeshStandardMaterial({ color: C.unavailable, roughness: 0.8 }),
  closed: new THREE.MeshStandardMaterial({ color: C.closed, roughness: 0.9 }),
  selected: new THREE.MeshStandardMaterial({ color: C.selected, roughness: 0.6, emissive: C.selected, emissiveIntensity: 0.25 }),
};
const dimMats = {
  available: new THREE.MeshStandardMaterial({ color: C.available, transparent: true, opacity: 0.3 }),
  unavailable: new THREE.MeshStandardMaterial({ color: C.unavailable, transparent: true, opacity: 0.3 }),
  closed: new THREE.MeshStandardMaterial({ color: C.closed, transparent: true, opacity: 0.3 }),
  selected: mats.selected,
};
const outlineMat = new THREE.LineBasicMaterial({ color: "#ffffff" });
const hoverOutlineMat = new THREE.LineBasicMaterial({ color: "#1e3a8a" });

const carGeo = {
  body: new THREE.BoxGeometry(1.82, 0.55, 4.2),
  hood: new THREE.BoxGeometry(1.7, 0.12, 1.2),
  cabin: new THREE.BoxGeometry(1.58, 0.52, 2.05),
  roof: new THREE.BoxGeometry(1.5, 0.07, 1.75),
  wheel: new THREE.CylinderGeometry(0.33, 0.33, 0.24, 14).rotateZ(Math.PI / 2),
  hub: new THREE.CylinderGeometry(0.16, 0.16, 0.25, 8).rotateZ(Math.PI / 2),
  light: new THREE.BoxGeometry(0.42, 0.14, 0.06),
  plate: new THREE.PlaneGeometry(0.62, 0.15),
  mirror: new THREE.BoxGeometry(0.18, 0.1, 0.12),
};
const glassMat = new THREE.MeshStandardMaterial({ color: "#1e2a38", roughness: 0.1, metalness: 0.6 });
const tyreMat = new THREE.MeshStandardMaterial({ color: "#1b1e22", roughness: 0.9 });
const hubMat = new THREE.MeshStandardMaterial({ color: "#b8bec7", metalness: 0.7, roughness: 0.3 });
const headMat = new THREE.MeshStandardMaterial({ color: "#fffbe8", emissive: "#fff3c4", emissiveIntensity: 0.4 });
const headNightMat = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#fff6d8", emissiveIntensity: 3 });
const tailMat = new THREE.MeshStandardMaterial({ color: "#a3161a", emissive: "#d61f1f", emissiveIntensity: 0.4 });
const tailBrakeMat = new THREE.MeshStandardMaterial({ color: "#ff2b2b", emissive: "#ff2020", emissiveIntensity: 2.5 });
const paintCache = new Map<string, THREE.MeshStandardMaterial>();
const paint = (color: string) => {
  let m = paintCache.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.35 });
    paintCache.set(color, m);
  }
  return m;
};

/* ---------- автомобиль (нос по +z) ---------- */

interface CarProps {
  color: string;
  plate?: string | undefined;
  night?: boolean;
  braking?: boolean;
  wheelsRef?: MutableRefObject<THREE.Group[]>;
  shadows?: boolean;
}

function CarModel({ color, plate, night, braking, wheelsRef, shadows = true }: CarProps) {
  const body = paint(color);
  return (
    <group>
      <mesh geometry={carGeo.body} material={body} position={[0, 0.58, 0]} castShadow={shadows} />
      <mesh geometry={carGeo.hood} material={body} position={[0, 0.9, 1.35]} castShadow={shadows} />
      <mesh geometry={carGeo.cabin} material={glassMat} position={[0, 1.11, -0.3]} castShadow={shadows} />
      <mesh geometry={carGeo.roof} material={body} position={[0, 1.4, -0.35]} />
      {[-0.86, 0.86].map((x) => (
        <mesh key={x} geometry={carGeo.mirror} material={body} position={[x * 1.08, 1.0, 0.75]} />
      ))}
      {[-0.6, 0.6].map((x) => (
        <mesh key={`h${x}`} geometry={carGeo.light} material={night ? headNightMat : headMat} position={[x, 0.68, 2.1]} />
      ))}
      {[-0.6, 0.6].map((x) => (
        <mesh key={`t${x}`} geometry={carGeo.light} material={braking ? tailBrakeMat : tailMat} position={[x, 0.7, -2.1]} />
      ))}
      {plate && (
        <mesh geometry={carGeo.plate} position={[0, 0.5, -2.111]} rotation={[0, Math.PI, 0]}>
          <meshBasicMaterial map={plateTexture(plate)} />
        </mesh>
      )}
      {[-0.86, 0.86].flatMap((wx) =>
        [-1.32, 1.32].map((wz, i) => (
          <group
            key={`${wx}${wz}`}
            position={[wx, 0.33, wz]}
            ref={(g) => {
              if (g && wheelsRef) wheelsRef.current[(wx < 0 ? 0 : 2) + i] = g;
            }}
          >
            <mesh geometry={carGeo.wheel} material={tyreMat} />
            <mesh geometry={carGeo.hub} material={hubMat} />
          </group>
        )),
      )}
    </group>
  );
}

const ParkedCar = memo(function ParkedCar({ spot, plate, night }: { spot: ParkingSpot; plate: string; night: boolean }) {
  const [x, z] = spot.position;
  // нос в сторону задней стенки места
  return (
    <group position={[x, 0.09, z - spot.facing * 0.15]} rotation={[0, spot.facing === 1 ? Math.PI : 0, 0]}>
      <CarModel color={carColorFor(plate + spot.id)} night={false} shadows={!night} />
    </group>
  );
});

/* ---------- место ---------- */

const Spot = memo(function Spot({
  spot,
  d,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  spot: ParkingSpot;
  d: SpotDisplay;
  selected: boolean;
  hovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const key = selected ? "selected" : d.status;
  const mat = d.dimmed && !selected ? dimMats[key] : mats[key];
  const [x, z] = spot.position;
  const labelZ = z + spot.facing * (SPOT_D / 2 - 0.9);
  return (
    <group>
      <mesh
        geometry={spotGeo}
        material={mat}
        position={[x, 0.08, z]}
        receiveShadow
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(spot.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(spot.id);
        }}
        onPointerOut={() => onHover(null)}
      />
      {(selected || hovered) && (
        <lineSegments geometry={outlineGeo} material={selected ? outlineMat : hoverOutlineMat} position={[x, 0.1, z]} scale={selected ? [1.04, 1, 1.03] : 1} />
      )}
      <mesh geometry={labelGeo} position={[x, 0.13, labelZ]} rotation={[-Math.PI / 2, 0, spot.facing === -1 ? Math.PI : 0]}>
        <meshBasicMaterial map={labelTexture(spot.code)} transparent opacity={d.dimmed && !selected ? 0.45 : 1} />
      </mesh>
      {spot.type !== "standard" && (
        <mesh geometry={iconGeo} position={[x, 0.13, z - spot.facing * 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <meshBasicMaterial map={iconTexture(spot.type)} transparent />
        </mesh>
      )}
      {spot.type === "ev" && <Charger position={[x + SPOT_W / 2 - 0.45, 0, z - spot.facing * (SPOT_D / 2 - 0.25)]} />}
    </group>
  );
});

function Charger({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.35, 1.4, 0.25]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0, 1.15, 0.13]}>
        <boxGeometry args={[0.24, 0.24, 0.02]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

/* ---------- окружение ---------- */

function Lamp({ position, night }: { position: [number, number, number]; night: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 2.5, 0]} castShadow={!night}>
        <cylinderGeometry args={[0.08, 0.12, 5, 8]} />
        <meshStandardMaterial color="#5b6573" />
      </mesh>
      <mesh position={[0, 5.05, 0]}>
        <boxGeometry args={[0.7, 0.18, 0.35]} />
        <meshStandardMaterial color="#fff6dc" emissive="#ffe7a8" emissiveIntensity={night ? 3 : 0.4} />
      </mesh>
    </group>
  );
}

function Arrow({ position, rot }: { position: [number, number, number]; rot: number }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.3, -1.2);
    s.lineTo(0.3, -1.2);
    s.lineTo(0.3, 0.2);
    s.lineTo(0.8, 0.2);
    s.lineTo(0, 1.2);
    s.lineTo(-0.8, 0.2);
    s.lineTo(-0.3, 0.2);
    s.closePath();
    return s;
  }, []);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, rot]}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial color={C.line} />
    </mesh>
  );
}

function SignPost({ position, text, color }: { position: [number, number, number]; text: string; color: string }) {
  const tex = useMemo(() => signTexture(text, color, "#ffffff"), [text, color]);
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 2.4, 6]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
      <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI / 6, 0]}>
        <planeGeometry args={[2.6, 0.5]} />
        <meshBasicMaterial map={tex} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Tree({ position, s = 1 }: { position: [number, number, number]; s?: number }) {
  return (
    <group position={position} scale={s}>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 1.6, 6]} />
        <meshStandardMaterial color="#7c5a3c" />
      </mesh>
      <mesh position={[0, 2.2, 0]} castShadow>
        <icosahedronGeometry args={[1.3, 0]} />
        <meshStandardMaterial color="#5f8d58" flatShading />
      </mesh>
    </group>
  );
}

/** Шлагбаум: стрела поворачивается вокруг оси z у будки */
function Gate({ position, armRef, side }: { position: [number, number, number]; armRef?: RefObject<THREE.Group | null>; side: 1 | -1 }) {
  return (
    <group position={position}>
      <mesh position={[side * -2.6, 0.6, 0]} castShadow>
        <boxGeometry args={[0.6, 1.2, 0.6]} />
        <meshStandardMaterial color="#e3a33a" />
      </mesh>
      <group ref={armRef ?? null} position={[side * -2.6, 1.1, 0]}>
        <mesh position={[side * 2.4, 0, 0]} castShadow>
          <boxGeometry args={[4.6, 0.14, 0.14]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        {[0.9, 2.3, 3.7].map((xx) => (
          <mesh key={xx} position={[side * xx, 0, 0]}>
            <boxGeometry args={[0.45, 0.16, 0.16]} />
            <meshStandardMaterial color="#c2413a" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Building({ lot, night }: { lot: ParkingLot; night: boolean }) {
  const b = lot.building!;
  const { outerMinZ } = lotBounds(lot);
  const [w, d, h] = b.size;
  const z = outerMinZ - 7 - d / 2;
  const facade = facadeTexture(b.color, b.floors);
  const sign = signTexture(b.sign, b.signColor, b.signText);
  return (
    <group position={[0, 0, z]}>
      {/* площадь перед входом */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, d / 2 + 3.5]} receiveShadow>
        <planeGeometry args={[w + 6, 7]} />
        <meshStandardMaterial color={C.sidewalk} />
      </mesh>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial attach="material-0" color={b.color} />
        <meshStandardMaterial attach="material-1" color={b.color} />
        <meshStandardMaterial attach="material-2" color="#9aa3ae" />
        <meshStandardMaterial attach="material-3" color={b.color} />
        <meshStandardMaterial attach="material-4" map={facade} emissive="#ffffff" emissiveMap={facade} emissiveIntensity={night ? 0.55 : 0} />
        <meshStandardMaterial attach="material-5" color={b.color} />
      </mesh>
      {/* парапет */}
      <mesh position={[0, h + 0.3, 0]}>
        <boxGeometry args={[w + 0.4, 0.6, d + 0.4]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      {/* вывеска */}
      <mesh position={[0, h + 2.2, d / 2 - 1]} castShadow>
        <boxGeometry args={[Math.min(w * 0.6, b.sign.length * 2.2 + 4), 3.4, 0.5]} />
        <meshStandardMaterial attach="material-0" color={b.signColor} />
        <meshStandardMaterial attach="material-1" color={b.signColor} />
        <meshStandardMaterial attach="material-2" color={b.signColor} />
        <meshStandardMaterial attach="material-3" color={b.signColor} />
        <meshStandardMaterial attach="material-4" map={sign} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={night ? 1.1 : 0.35} />
        <meshStandardMaterial attach="material-5" color={b.signColor} />
      </mesh>
      {/* входная группа */}
      <group position={[0, 0, d / 2]}>
        <mesh position={[0, 2.4, 0.9]} castShadow>
          <boxGeometry args={[10, 4.8, 1.8]} />
          <meshStandardMaterial color="#8fb3d9" roughness={0.1} metalness={0.5} transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 5.0, 2.6]} castShadow>
          <boxGeometry args={[13, 0.3, 5]} />
          <meshStandardMaterial color={b.signColor} />
        </mesh>
        {[-6, 6].map((x) => (
          <mesh key={x} position={[x, 2.5, 4.8]}>
            <cylinderGeometry args={[0.15, 0.15, 5, 8]} />
            <meshStandardMaterial color="#e5e7eb" />
          </mesh>
        ))}
      </group>
      {/* флагштоки */}
      {[-w / 2 + 3, -w / 2 + 5, w / 2 - 5, w / 2 - 3].map((x) => (
        <group key={x} position={[x, 0, d / 2 + 5.5]}>
          <mesh position={[0, 3.5, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 7, 6]} />
            <meshStandardMaterial color="#d1d5db" />
          </mesh>
          <mesh position={[0.5, 6.4, 0]}>
            <planeGeometry args={[1, 0.65]} />
            <meshStandardMaterial color={x < 0 ? "#00afca" : b.signColor} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Environment3D({ lot, night, gateArm }: { lot: ParkingLot; night: boolean; gateArm: RefObject<THREE.Group | null> }) {
  const { bx, minZ, maxZ, laneX, outerX, outerMinZ, outerMaxZ } = lotBounds(lot);
  const W = outerX * 2;
  const D = outerMaxZ - outerMinZ;
  const cz = (outerMaxZ + outerMinZ) / 2;
  const aisles = [...new Set(lot.rows.map((r) => r.aisleZ))];
  const streetZ = outerMaxZ + 7;
  const lampZs = useMemo(() => {
    const out: number[] = [];
    for (let z = minZ + 2; z <= maxZ - 1; z += 12) out.push(z);
    return out;
  }, [minZ, maxZ]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, cz - 10]} receiveShadow>
        <planeGeometry args={[W + 140, D + 120]} />
        <meshStandardMaterial color={night ? "#2b3038" : C.ground} />
      </mesh>
      {/* асфальт площадки */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, cz]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color={C.asphalt} roughness={0.95} />
      </mesh>
      {/* проезды */}
      {aisles.map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, z]} receiveShadow>
          <planeGeometry args={[laneX * 2, 5.4]} />
          <meshStandardMaterial color={C.aisle} roughness={0.95} />
        </mesh>
      ))}
      {/* боковые полосы */}
      {[-laneX, laneX].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.011, cz]} receiveShadow>
          <planeGeometry args={[5, D]} />
          <meshStandardMaterial color={C.aisle} roughness={0.95} />
        </mesh>
      ))}
      {/* стрелки: въезд слева вверх, по проездам вправо, выезд справа вниз */}
      {aisles.flatMap((z) => [-bx / 2, bx / 2].map((x) => <Arrow key={`a${z}${x}`} position={[x, 0.03, z]} rot={-Math.PI / 2} />))}
      <Arrow position={[-laneX, 0.03, outerMaxZ - 4]} rot={0} />
      <Arrow position={[laneX, 0.03, outerMaxZ - 4]} rot={Math.PI} />
      {/* бордюры */}
      {[outerMinZ, outerMaxZ].map((z) => (
        <mesh key={z} position={[0, 0.12, z]} castShadow>
          <boxGeometry args={[W, 0.25, 0.4]} />
          <meshStandardMaterial color={C.curb} />
        </mesh>
      ))}
      {[-outerX, outerX].map((x) => (
        <mesh key={x} position={[x, 0.12, cz]} castShadow>
          <boxGeometry args={[0.4, 0.25, D]} />
          <meshStandardMaterial color={C.curb} />
        </mesh>
      ))}
      {/* газон и деревья вдоль улицы */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, outerMaxZ + 1.5]}>
        <planeGeometry args={[W + 140, 3]} />
        <meshStandardMaterial color={night ? "#4c5d45" : C.grass} />
      </mesh>
      {Array.from({ length: Math.floor((W - 12) / 9) }, (_, i) => -W / 2 + 8 + i * 9).map((x) => (
        <Tree key={x} position={[x, 0, outerMaxZ + 1.5]} s={0.9} />
      ))}
      {[-outerX - 4, outerX + 4].flatMap((x) =>
        Array.from({ length: Math.floor(D / 10) }, (_, i) => outerMinZ + 4 + i * 10).map((z) => <Tree key={`${x}${z}`} position={[x, 0, z]} />),
      )}
      {/* въезд и выезд — разрывы бордюра */}
      {[-laneX, laneX].map((x) => (
        <mesh key={`g${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.013, outerMaxZ + 1.5]}>
          <planeGeometry args={[5, 4]} />
          <meshStandardMaterial color={C.aisle} />
        </mesh>
      ))}
      <Gate position={[-laneX, 0, outerMaxZ - 1.2]} armRef={gateArm} side={1} />
      <Gate position={[laneX, 0, outerMaxZ - 1.2]} side={-1} />
      <SignPost position={[-laneX - 4, 0, outerMaxZ + 2.5]} text="ВЪЕЗД" color="#2563eb" />
      <SignPost position={[laneX + 4, 0, outerMaxZ + 2.5]} text="ВЫЕЗД" color="#334155" />
      {/* улица */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, streetZ]} receiveShadow>
        <planeGeometry args={[W + 140, 9]} />
        <meshStandardMaterial color="#5f6672" />
      </mesh>
      {Array.from({ length: 24 }, (_, i) => -W / 2 - 60 + i * ((W + 120) / 24)).map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, streetZ]}>
          <planeGeometry args={[2.2, 0.18]} />
          <meshBasicMaterial color="#e5e7eb" />
        </mesh>
      ))}
      <group position={[-W / 2 - 14, 0, streetZ - 2]} rotation={[0, Math.PI / 2, 0]}>
        <CarModel color="#c8ccd2" night={night} />
      </group>
      <group position={[W / 2 + 10, 0, streetZ + 2]} rotation={[0, -Math.PI / 2, 0]}>
        <CarModel color="#a14a3f" night={night} />
      </group>
      {/* пешеходный переход к зданию */}
      {lot.building &&
        Array.from({ length: 7 }, (_, i) => -4.2 + i * 1.4).map((x) => (
          <mesh key={`zb${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, outerMinZ - 3.5]}>
            <planeGeometry args={[0.8, 5]} />
            <meshBasicMaterial color="#f8fafc" />
          </mesh>
        ))}
      {lot.building && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, outerMinZ - 3.5]}>
          <planeGeometry args={[W + 40, 7]} />
          <meshStandardMaterial color="#5f6672" />
        </mesh>
      )}
      {/* фонари */}
      {[-outerX + 0.8, outerX - 0.8].flatMap((x) => lampZs.map((z) => <Lamp key={`${x}${z}`} position={[x, 0, z]} night={night} />))}
      {night &&
        [-outerX + 0.8, outerX - 0.8].flatMap((x) =>
          lampZs.map((z) => <pointLight key={`pl${x}${z}`} position={[x * 0.85, 4.6, z]} intensity={28} distance={18} decay={1.6} color="#ffd9a0" />),
        )}
      {lot.building && <Building lot={lot} night={night} />}
    </group>
  );
}

/* ---------- анимация парковки ---------- */

function buildPath(lot: ParkingLot, spot: ParkingSpot): THREE.CurvePath<THREE.Vector3> {
  const { laneX, outerMaxZ } = lotBounds(lot);
  const row = lot.rows.find((r) => r.zone === spot.zone)!;
  const a = row.aisleZ;
  const f = spot.facing;
  const [x, z] = spot.position;
  const streetZ = outerMaxZ + 7;
  const L = -laneX;
  const v = (px: number, pz: number) => new THREE.Vector3(px, 0.09, pz);
  // Отрезки прямых и плавных поворотов, чтобы машина не «срезала» углы
  const path = new THREE.CurvePath<THREE.Vector3>();
  const line = (p: THREE.Vector3, q: THREE.Vector3) => path.add(new THREE.LineCurve3(p, q));
  const turn = (p: THREE.Vector3, c: THREE.Vector3, q: THREE.Vector3) => path.add(new THREE.QuadraticBezierCurve3(p, c, q));

  const s0 = v(L - 26, streetZ + 2);
  const s1 = v(L - 4, streetZ + 2);
  line(s0, s1);
  const s2 = v(L, streetZ - 2);
  turn(s1, v(L, streetZ + 2), s2);
  const s3 = v(L, a + 3.5);
  line(s2, s3);
  const s4 = v(L + 3.5, a);
  turn(s3, v(L, a), s4);
  // подъезд с выносом в противоположную от места сторону
  const swing = a + f * 1.4;
  const s5 = v(x - 4.2, a);
  line(s4, s5);
  const s6 = v(x - 2.0, swing);
  turn(s5, v(x - 3.2, swing), s6);
  const front = z + f * (SPOT_D / 2);
  const s7 = v(x, front + f * 0.3);
  turn(s6, v(x - 0.2, swing), s7);
  line(s7, v(x, z - f * 0.15));
  return path;
}

function ParkingCarAnimation({
  lot,
  spot,
  plate,
  night,
  follow,
  gateArm,
  controls,
  onDone,
}: {
  lot: ParkingLot;
  spot: ParkingSpot;
  plate: string;
  night: boolean;
  follow: boolean;
  gateArm: RefObject<THREE.Group | null>;
  controls: RefObject<OrbitControlsImpl | null>;
  onDone?: (() => void) | undefined;
}) {
  const group = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Group[]>([]);
  const marker = useRef<THREE.Mesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);
  const path = useMemo(() => buildPath(lot, spot), [lot, spot]);
  const length = useMemo(() => path.getLength(), [path]);
  // стабильная ссылка: иначе при каждом ререндере R3F вернёт машину на старт
  const startPos = useMemo(() => path.getPointAt(0), [path]);
  const gateDist = useMemo(() => {
    // длина пути от старта до шлагбаума: прямая по улице + поворот + участок до стрелы
    const curves = path.curves;
    const lens = curves.slice(0, 2).reduce((acc, c) => acc + c.getLength(), 0);
    return lens + 6.2;
  }, [path]);
  const state = useRef({ t: 0, dist: 0, done: false, braking: false, finished: 0 });
  const [braking, setBraking] = useState(false);
  const [done, setDone] = useState(false);
  const duration = Math.max(6, length / 9);
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), tan: new THREE.Vector3() }), []);

  useEffect(() => {
    invalidate();
  }, [invalidate]);

  useFrame((_, dtRaw) => {
    const st = state.current;
    const dt = Math.min(dtRaw, 0.05);
    if (!group.current) return;
    if (!st.done) {
      st.t = Math.min(1, st.t + dt / duration);
      // плавный разгон и долгое торможение в конце
      const e = st.t < 0.15 ? 0.15 * Math.pow(st.t / 0.15, 2) * 0.5 : st.t > 0.8 ? 1 - Math.pow((1 - st.t) / 0.2, 2) * 0.125 : 0.075 + ((st.t - 0.15) / 0.65) * 0.8;
      const u = THREE.MathUtils.clamp(e, 0, 1);
      const prev = st.dist;
      st.dist = u * length;
      path.getPointAt(u, tmp.p);
      path.getTangentAt(Math.min(u, 0.999), tmp.tan);
      group.current.position.copy(tmp.p);
      const yaw = Math.atan2(tmp.tan.x, tmp.tan.z);
      group.current.rotation.y = yaw;
      const spin = (st.dist - prev) / 0.33;
      for (const w of wheels.current) if (w) w.rotation.x += spin;
      const shouldBrake = st.t > 0.8;
      if (shouldBrake !== st.braking) {
        st.braking = shouldBrake;
        setBraking(shouldBrake);
      }
      // шлагбаум
      if (gateArm.current) {
        const d = Math.abs(st.dist - gateDist);
        const open = THREE.MathUtils.clamp(1 - (d - 4) / 6, 0, 1);
        gateArm.current.rotation.z = open * (Math.PI / 2.2);
      }
      // камера следует за машиной, сохраняя ракурс
      if (follow && controls.current && st.t > 0.02) {
        const target = controls.current.target;
        const goal = tmp.p.clone().lerp(new THREE.Vector3(spot.position[0], 0, spot.position[1]), 0.35);
        goal.y = 0;
        const move = goal.sub(target).multiplyScalar(Math.min(1, dt * 2.2));
        target.add(move);
        camera.position.add(move);
        controls.current.update();
      }
      if (st.t >= 1) {
        st.done = true;
        st.braking = false;
        setBraking(false);
        setDone(true);
        if (gateArm.current) gateArm.current.rotation.z = 0;
        onDone?.();
      }
      invalidate();
    } else if (marker.current && st.finished < 2.4) {
      // пульсирующее кольцо после парковки
      st.finished += dt;
      const k = (st.finished % 1.2) / 1.2;
      marker.current.scale.setScalar(1 + k * 1.6);
      (marker.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.8;
      invalidate();
    } else if (marker.current) {
      marker.current.visible = false;
    }
  });

  return (
    <>
      <group ref={group} position={startPos}>
        <CarModel color="#f59e0b" plate={plate} night={night} braking={braking} wheelsRef={wheels} />
        <sprite position={[0, 2.6, 0]} scale={[3.2, 0.8, 1]} renderOrder={10}>
          <spriteMaterial map={tagTexture(plate)} depthTest={false} transparent />
        </sprite>
      </group>
      <mesh ref={marker} position={[spot.position[0], 0.14, spot.position[1]]} rotation={[-Math.PI / 2, 0, 0]} visible={done}>
        <ringGeometry args={[1.6, 1.9, 40]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} />
      </mesh>
    </>
  );
}

/* ---------- камера ---------- */

function useLotFrame(lot: ParkingLot) {
  return useMemo(() => {
    const b = lotBounds(lot);
    const depth = b.outerMaxZ - b.outerMinZ + (lot.building ? lot.building.size[1] + 8 : 0);
    const k = Math.max(b.outerX / 23, depth / 44) * 1.12;
    const centerZ = lot.building ? -2 : 0;
    return {
      k,
      center: new THREE.Vector3(0, 0, centerZ),
      iso: new THREE.Vector3(21 * k, 29 * k, 34 * k + centerZ),
      top: new THREE.Vector3(0, 54 * k, centerZ + 0.01),
      clampX: b.outerX,
      clampZ: [b.outerMinZ - (lot.building ? lot.building.size[1] : 0), b.outerMaxZ + 6] as const,
    };
  }, [lot]);
}

function CameraRig({ view, controls, frame }: { view: SceneProps["view"]; controls: RefObject<OrbitControlsImpl | null>; frame: ReturnType<typeof useLotFrame> }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const first = useRef(true);
  useEffect(() => {
    const pos = view.mode === "top" ? frame.top : frame.iso;
    if (first.current) {
      first.current = false;
      camera.position.copy(pos);
      controls.current?.target.copy(frame.center);
      controls.current?.update();
      invalidate();
      return;
    }
    goal.current = { pos: pos.clone(), target: frame.center.clone() };
    invalidate();
  }, [view, camera, controls, invalidate, frame]);
  useFrame((_, dt) => {
    const g = goal.current;
    const c = controls.current;
    if (!g || !c) return;
    const a = Math.min(1, dt * 4);
    camera.position.lerp(g.pos, a);
    c.target.lerp(g.target, a);
    c.update();
    if (camera.position.distanceTo(g.pos) < 0.05) goal.current = null;
    invalidate();
  });
  return null;
}

function ClampTarget({ controls, frame }: { controls: RefObject<OrbitControlsImpl | null>; frame: ReturnType<typeof useLotFrame> }) {
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const onChange = () => {
      const t = c.target;
      t.x = THREE.MathUtils.clamp(t.x, -frame.clampX, frame.clampX);
      t.z = THREE.MathUtils.clamp(t.z, frame.clampZ[0], frame.clampZ[1]);
      t.y = 0;
    };
    c.addEventListener("change", onChange);
    return () => c.removeEventListener("change", onChange);
  }, [controls, frame]);
  return null;
}

function ReadySignal({ onReady }: { onReady?: (() => void) | undefined }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => onReady?.());
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

function Scene(props: SceneProps & { controls: RefObject<OrbitControlsImpl | null> }) {
  const { lot, spots, display, selectedId, onSelect, occupiedNow, parkAnim, onAnimDone, night, follow, view, onReady, onHoverSpot, controls } = props;
  const invalidate = useThree((s) => s.invalidate);
  const gateArm = useRef<THREE.Group>(null);
  const frame = useLotFrame(lot);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const onHover = useMemo(
    () => (id: string | null) => {
      setHoverId(id);
      onHoverSpot?.(id);
      document.body.style.cursor = id ? "pointer" : "";
      invalidate();
    },
    [invalidate, onHoverSpot],
  );
  useEffect(() => () => void (document.body.style.cursor = ""), []);
  useEffect(() => invalidate(), [night, display, selectedId, occupiedNow, invalidate]);

  const animSpot = parkAnim ? spots.find((s) => s.id === parkAnim.spotId) ?? null : null;
  const s = frame.k;

  return (
    <>
      <color attach="background" args={[night ? "#141a24" : "#eef1f4"]} />
      <fog attach="fog" args={[night ? "#141a24" : "#eef1f4", 90 * s, 220 * s]} />
      <hemisphereLight args={[night ? "#6b7fa8" : "#ffffff", night ? "#1a1f29" : "#c9ced6", night ? 0.75 : 0.9]} />
      <directionalLight
        position={night ? [-20 * s, 40 * s, -10 * s] : [18 * s, 30 * s, 14 * s]}
        intensity={night ? 0.7 : 1.6}
        color={night ? "#9fb3d9" : "#ffffff"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40 * s}
        shadow-camera-right={40 * s}
        shadow-camera-top={40 * s}
        shadow-camera-bottom={-40 * s}
        shadow-camera-far={140 * s}
      />
      <Environment3D lot={lot} night={night} gateArm={gateArm} />
      {spots.map((sp) => (
        <Spot key={sp.id} spot={sp} d={display[sp.id]!} selected={sp.id === selectedId} hovered={sp.id === hoverId} onSelect={onSelect} onHover={onHover} />
      ))}
      {spots.map((sp) =>
        occupiedNow[sp.id] && sp.id !== animSpot?.id ? <ParkedCar key={`car-${sp.id}`} spot={sp} plate={occupiedNow[sp.id]!} night={night} /> : null,
      )}
      {animSpot && parkAnim && (
        <ParkingCarAnimation
          key={parkAnim.n}
          lot={lot}
          spot={animSpot}
          plate={parkAnim.plate}
          night={night}
          follow={follow}
          gateArm={gateArm}
          controls={controls}
          onDone={onAnimDone}
        />
      )}
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping={false}
        minDistance={10}
        maxDistance={95 * s}
        maxPolarAngle={Math.PI / 2.3}
        minPolarAngle={0}
        screenSpacePanning={false}
      />
      <CameraRig view={view} controls={controls} frame={frame} />
      <ClampTarget controls={controls} frame={frame} />
      <ReadySignal onReady={onReady} />
    </>
  );
}

export default function ParkingScene(props: SceneProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const [mobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches);
  return (
    <Canvas
      key={props.lot.id}
      frameloop="demand"
      shadows
      dpr={[1, mobile ? 1.5 : 2]}
      camera={{ position: [20, 27, 29], fov: 40, near: 0.5, far: 600 }}
      onPointerMissed={() => (document.body.style.cursor = "")}
      gl={{ antialias: true }}
    >
      <Scene {...props} controls={controls} />
    </Canvas>
  );
}

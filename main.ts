// The World Today - Wednesday 25 November 2026: 35 stories, numbered map.
// Draws a one-page newspaper front page in code only (Node 22 stdlib) and
// writes it to /output/entry.png. Deterministic: same bytes every run.
// No network, no clock, no randomness.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const W = 1024;
const H = 1024;
const OUT = process.env.MAKEFUN_OUTPUT_DIR
  ? path.join(process.env.MAKEFUN_OUTPUT_DIR, "entry.png")
  : "/output/entry.png";

// ---- 5x7 bitmap font (glyphs as 7 rows of 5 bits) ----
const FONT = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
};

// ---- canvas ----
const buf = Buffer.alloc(W * H * 3);
function px(x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
}
function rect(x, y, w, h, c) {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) px(i, j, c[0], c[1], c[2]);
}
function hline(x0, x1, y, c) {
  for (let i = x0; i <= x1; i++) px(i, y, c[0], c[1], c[2]);
}
function vline(x, y0, y1, c) {
  for (let j = y0; j <= y1; j++) px(x, j, c[0], c[1], c[2]);
}
function disc(cx, cy, r, c) {
  for (let j = cy - r; j <= cy + r; j++)
    for (let i = cx - r; i <= cx + r; i++)
      if ((i - cx) * (i - cx) + (j - cy) * (j - cy) <= r * r) px(i, j, c[0], c[1], c[2]);
}
function ring(cx, cy, r, c) {
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180;
    px(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c[0], c[1], c[2]);
  }
}
// polygon fill by scanline
function poly(points, c) {
  let minY = 1e9, maxY = -1e9;
  for (const [, y] of points) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
    const xs = [];
    for (let k = 0; k < points.length; k++) {
      const [x0, y0] = points[k];
      const [x1, y1] = points[(k + 1) % points.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) px(x, y, c[0], c[1], c[2]);
  }
}

function textWidth(s, scale) { return s.length * 6 * scale - scale; }
function drawText(s, x, y, scale, c) {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch] || FONT["?"];
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++)
        if (g[r][col] === "1")
          for (let dy = 0; dy < scale; dy++)
            for (let dx = 0; dx < scale; dx++)
              px(cx + col * scale + dx, y + r * scale + dy, c[0], c[1], c[2]);
    cx += 6 * scale;
  }
}
function wrap(s, maxChars) {
  const words = s.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (!cur) { cur = w; continue; }
    if (cur.length + 1 + w.length <= maxChars) cur += " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawWrapped(s, x, y, maxChars, maxLines, lineH, scale, c) {
  const lines = wrap(s, maxChars);
  if (lines.length > maxLines)
    throw new Error("TEXT OVERFLOW (" + lines.length + " > " + maxLines + "): " + s);
  lines.forEach((ln, i) => drawText(ln, x, y + i * lineH, scale, c));
  return lines.length;
}

// ---- PNG encoder (zlib deflate, CRC32) ----
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG() {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    buf.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- world map (equirectangular, lon/lat polygons) ----
const MAP = { x0: 0, x1: 1024, y0: 60, y1: 236, latTop: 84, latBot: -58 };
function mx(lon) { return Math.round(MAP.x0 + ((lon + 180) / 360) * (MAP.x1 - MAP.x0)); }
function my(lat) { return Math.round(MAP.y0 + ((MAP.latTop - lat) / (MAP.latTop - MAP.latBot)) * (MAP.y1 - MAP.y0)); }
function ll(poly) { return poly.map(([lo, la]) => [mx(lo), my(la)]); }

const CONTINENTS = [
  // North America
  [[-168, 66], [-140, 70], [-125, 72], [-110, 73], [-95, 80], [-85, 80], [-80, 73], [-75, 62], [-65, 60], [-55, 52], [-60, 46], [-70, 42], [-75, 35], [-80, 32], [-81, 26], [-84, 30], [-90, 21], [-97, 26], [-105, 20], [-110, 23], [-117, 33], [-125, 40], [-124, 48], [-135, 58], [-150, 60], [-165, 60], [-168, 66]],
  // Greenland
  [[-58, 64], [-45, 60], [-40, 65], [-30, 68], [-22, 70], [-25, 76], [-40, 76], [-55, 76], [-60, 74], [-58, 64]],
  // South America
  [[-80, 9], [-77, 4], [-80, -3], [-81, -6], [-77, -12], [-72, -18], [-70, -23], [-70, -30], [-72, -37], [-73, -44], [-70, -52], [-68, -55], [-65, -55], [-62, -41], [-58, -34], [-52, -32], [-48, -28], [-41, -23], [-35, -9], [-35, -6], [-40, -3], [-44, -2], [-50, 0], [-53, 5], [-60, 8], [-70, 11], [-75, 10], [-80, 9]],
  // Africa
  [[-17, 15], [-17, 21], [-15, 27], [-10, 31], [-5, 35], [0, 36], [10, 37], [11, 34], [20, 32], [30, 31], [32, 31], [34, 28], [35, 24], [37, 20], [39, 15], [43, 12], [48, 11], [51, 12], [48, 5], [42, 0], [40, -5], [40, -10], [36, -18], [33, -26], [28, -33], [20, -35], [17, -32], [15, -27], [12, -18], [13, -12], [12, -6], [9, 4], [4, 6], [-8, 5], [-13, 8], [-17, 12], [-17, 15]],
  // Eurasia
  [[-10, 36], [-9, 38], [-9, 43], [-2, 44], [-1, 46], [-4, 48], [-2, 50], [0, 51], [3, 53], [5, 53], [8, 55], [8, 57], [10, 59], [5, 60], [5, 62], [10, 64], [12, 66], [18, 69], [25, 71], [30, 70], [35, 68], [40, 68], [45, 68], [50, 69], [55, 69], [60, 69], [65, 68], [70, 72], [75, 73], [80, 73], [85, 74], [90, 75], [95, 76], [100, 77], [105, 77], [110, 74], [115, 73], [120, 73], [125, 72], [130, 71], [135, 72], [140, 72], [145, 72], [150, 70], [155, 69], [160, 69], [165, 66], [170, 66], [178, 65], [178, 64], [170, 62], [162, 60], [158, 55], [155, 59], [150, 59], [145, 55], [142, 50], [140, 45], [138, 40], [135, 35], [130, 33], [127, 35], [122, 38], [120, 32], [118, 25], [115, 22], [110, 20], [108, 18], [105, 10], [103, 8], [100, 8], [98, 10], [95, 15], [92, 21], [90, 22], [88, 22], [86, 20], [84, 18], [80, 15], [77, 8], [75, 12], [72, 20], [68, 22], [65, 25], [62, 25], [58, 26], [55, 26], [52, 28], [50, 29], [48, 30], [50, 26], [54, 24], [56, 26], [57, 27], [59, 22], [58, 20], [55, 17], [52, 15], [48, 14], [44, 13], [42, 15], [40, 15], [39, 20], [38, 22], [36, 27], [35, 29], [34, 31], [33, 31], [30, 36], [27, 37], [26, 38], [23, 36], [22, 37], [20, 40], [19, 42], [16, 44], [14, 45], [12, 44], [10, 44], [8, 44], [6, 43], [3, 43], [0, 40], [-2, 37], [-6, 36], [-9, 37], [-10, 36]],
  // United Kingdom
  [[-5, 50], [-3, 53], [-5, 56], [-3, 58], [-1, 57], [0, 53], [-1, 51], [-3, 50], [-5, 50]],
  // Japan
  [[130, 31], [132, 33], [134, 34], [136, 35], [138, 35], [140, 36], [141, 38], [141, 41], [142, 43], [144, 44], [142, 42], [140, 39], [139, 37], [137, 36], [135, 34], [133, 34], [131, 32], [130, 31]],
  // Indonesia (Sumatra / Java / Borneo hint)
  [[95, 5], [98, 8], [100, 6], [102, 2], [104, 1], [106, -2], [108, -4], [110, -6], [112, -7], [114, -8], [116, -8], [118, -9], [120, -10], [119, -8], [116, -6], [114, -4], [112, -2], [110, 0], [108, 2], [106, 4], [104, 6], [102, 7], [100, 8], [98, 7], [95, 5]],
  // Australia
  [[114, -22], [114, -30], [115, -35], [118, -35], [124, -33], [129, -32], [132, -32], [135, -35], [138, -35], [140, -38], [145, -38], [150, -37], [153, -32], [153, -27], [150, -22], [146, -19], [142, -15], [142, -11], [140, -17], [136, -15], [135, -12], [132, -11], [130, -13], [126, -14], [122, -17], [118, -20], [114, -22]],
  // New Zealand
  [[167, -45], [170, -43], [173, -41], [175, -38], [177, -38], [174, -36], [172, -35], [174, -41], [168, -46], [167, -45]],
];

// Numbered dots: [lon, lat, label, label dx, label dy, radius].
// Offsets chosen so no two labels overlap. Riyadh/Aden and Gaza/Zaporizhzhia
// sit close together, so those four dots use smaller radii (7/7 and 9/10).
const DOTS = [
  { n: 1, lon: -122.3, lat: 47.6, label: "WASH. STATE", dx: 15, dy: -4, r: 11 },
  { n: 2, lon: -74.0, lat: 40.7, label: "NEW YORK", dx: 15, dy: -4, r: 11 },
  { n: 3, lon: 46.7, lat: 24.7, label: "RIYADH", dx: 15, dy: -4, r: 7 },
  { n: 4, lon: 24.0, lat: 59.8, label: "GULF OF FINLAND", dx: 15, dy: -16, r: 11 },
  { n: 5, lon: 35.2, lat: 47.8, label: "ZAPORIZHZHIA", dx: 15, dy: 16, r: 10 },
  { n: 6, lon: 45.0, lat: 12.8, label: "ADEN", dx: 15, dy: -4, r: 7 },
  { n: 7, lon: 29.8, lat: 1.7, label: "ITURI", dx: 15, dy: -4, r: 11 },
  { n: 8, lon: 2.35, lat: 48.9, label: "PARIS", dx: -60, dy: 14, r: 11 },
  { n: 9, lon: 116.4, lat: 39.9, label: "BEIJING", dx: 15, dy: -4, r: 11 },
  { n: 10, lon: 98.5, lat: 39.8, label: "JIUQUAN", dx: -60, dy: 14, r: 11 },
  { n: 11, lon: 34.5, lat: 31.5, label: "GAZA", dx: -10, dy: 16, r: 9 },
  { n: 12, lon: -75.5, lat: 10.4, label: "CARTAGENA", dx: 15, dy: -4, r: 11 },
];

const INK = [16, 24, 40];       // near-black navy
const PAPER = [250, 246, 236];  // warm paper
const RED = [178, 34, 34];
const OCEAN = [18, 58, 88];
const LAND = [232, 221, 192];
const GREY = [90, 90, 88];
const WHITE = [255, 255, 255];

function drawMap() {
  rect(0, MAP.y0, W, MAP.y1 - MAP.y0, OCEAN);
  for (const c of CONTINENTS) poly(ll(c), LAND);
  const title = "WHERE IT HAPPENED - 12 STORIES MAPPED";
  rect(12, 218, textWidth(title, 1) + 8, 13, INK);
  drawText(title, 16, 220, 1, WHITE);
  for (const d of DOTS) {
    const x = mx(d.lon), y = my(d.lat);
    disc(x, y, d.r, RED);
    ring(x, y, d.r, WHITE);
    const ns = String(d.n);
    if (ns.length === 1) drawText(ns, x - 5, y - 7, 2, WHITE);
    else drawText(ns, x - 6, y - 4, 1, WHITE);
    // label on a dark chip so it reads over ocean and land alike
    const lx = x + d.dx, ly = y + d.dy;
    const lw = textWidth(d.label, 1) + 8;
    rect(lx - 4, ly - 2, lw, 11, INK);
    drawText(d.label, lx, ly, 1, WHITE);
  }
}

// ---- content: 35 real stories of Wednesday 25 November 2026 ----
// Featured: headline (max 2 lines) + summary (max 3 lines). Sources: Reuters,
// AP, AFP, BBC, Al Jazeera, NYT, WaPo - all reported 25 Nov 2026 in some
// time zone (events of Tue 24 Nov US are Wed 25 Nov in Asia-Pacific).
const FEATURED = [
  { h: "US BIRD FLU KILLS ONE IN WASHINGTON",
    s: "THREE CONFIRMED CASES IN WASHINGTON STATE, ONE DEAD, WHO SAYS." },
  { h: "HUAWEI CONVICTED IN US TRIAL",
    s: "JURY FINDS IT GUILTY ON 10 OF 12 COUNTS, INCLUDING TRADE SECRET THEFT." },
  { h: "HOUTHIS STRIKE RIYADH TOWER",
    s: "DRONE HITS THE CAPITAL'S TALLEST TOWER, WOUNDING 11. COALITION STRIKES HODEIDAH." },
  { h: "ZELENSKIY CONFIRMS GULF SHIP HIT",
    s: "KYIV SAYS IT HIT A RUSSIAN CARGO SHIP IN THE GULF OF FINLAND." },
  { h: "RUSSIAN STRIKE KILLS 2 IN ZAPORIZHZHIA",
    s: "NIGHT ATTACK WOUNDS 48, INCLUDING FOUR CHILDREN, IN SOUTHERN UKRAINE." },
  { h: "HOUTHIS CLOSE IN ON ADEN",
    s: "REBELS PUSH TO 60 KM FROM YEMEN'S CAPITAL AS 320,000 FLEE THE FIGHTING." },
  { h: "WHO FLEES CONGO EBOLA HOSPITAL",
    s: "STAFF EVACUATED AFTER SHELTERING THREE DAYS FROM FIGHTING IN ITURI." },
  { h: "SARKOZY AND BRUNI TO FACE TRIAL",
    s: "FRENCH EX-PRESIDENT AND WIFE ORDERED TO TRIAL IN CORRUPTION CASE." },
  { h: "EU LAWMAKERS VISIT CHINA",
    s: "FIRST EU PARLIAMENT TRIP IN EIGHT YEARS AS BEIJING SEEKS STEADIER TIES." },
  { h: "CHINA LAUNCHES SHENZHOU-24",
    s: "FIRST PAKISTANI ASTRONAUT FLIES TO CHINA'S SPACE STATION WITH 90 TESTS." },
  { h: "ISRAEL KILLS HAMAS SECURITY CHIEF",
    s: "AIRSTRIKE IN GAZA CITY KILLS NAEEM ABU NAHEL, HAMAS SOURCES SAY." },
  { h: "COLOMBIA: HOSTAGES IN CARTAGENA",
    s: "GUNMEN SEIZE 25 IN A SUPERMARKET AFTER A FAILED ARMORED CAR HEIST." },
];

// Also on Wednesday: one line each, numbered 13-35.
const ALSO = [
  "13 GIULIANI GETS MEDAL OF FREEDOM",
  "14 TRUMP READIES NEW TARIFFS",
  "15 SENATE PROBES VANCE OIL DEAL TIES",
  "16 CIA, ODNI HIT BY CYBER BREACH",
  "17 FORT HOOD KILLER SEEKS STAY",
  "18 RADAR FAULT DELAYS O'HARE FLIGHTS",
  "19 ABREGO GARCIA TO LEAVE US",
  "20 US TO HOST COPA AMERICA 2028",
  "21 ARMY TO BLAST TOXIC IOWA EXPLOSIVES",
  "22 VENEZUELA DEBT: $237.5BN",
  "23 DELL RAISES OUTLOOK ON AI BOOM",
  "24 NATO VOWS SPACE DEFENCE",
  "25 POPE 'SAW THE DEVIL' - DIARY",
  "26 SENEGAL BACK AS AFCON CHAMPIONS",
  "27 NIGERIAN KING, 92, SUSPENDED",
  "28 SYRIA LANDMINE VICTIMS SOAR",
  "29 AT LEAST 70 DEAD IN HAITI",
  "30 INDONESIA FOREST LOSS UP 66%",
  "31 SURINAME EX-LEADER DIES AT 67",
  "32 RUSSIAN GOVERNOR DETAINED",
  "33 DR CONGO PLANE MISSING",
  "34 EU ALARMED BY ISRAEL DEATH LAW",
  "35 US ENVOY UNSURE ON ISRAEL AID END",
];

const MARKETS = "DOW 50,019 +0.9% - S+P 7,201 -0.5% - NASDAQ 23,734 -1.5% - GOLD $3,553 - WTI $81.63";
const SOURCES = "SOURCES: REUTERS - AP - AFP - BBC - AL JAZEERA - NYT - WAPO - REPORTED 25 NOV 2026 IN ANY TIME ZONE";

// ---- layout ----
function draw() {
  rect(0, 0, W, H, PAPER);
  // header
  drawText("THE WORLD TODAY", 16, 6, 5, INK);
  const d = "25 NOV 2026";
  drawText(d, W - 16 - textWidth(d, 3), 12, 3, RED);
  drawText("WEDNESDAY 25 NOVEMBER 2026 - 35 STORIES FROM AROUND THE WORLD", 16, 42, 2, GREY);
  hline(0, W - 1, 59, INK);
  // map
  drawMap();
  hline(0, W - 1, 236, INK);
  // featured grid: 3 cols x 4 rows, cells 341x135 from y=237
  const CW = 341, CH = 135, GY = 237;
  FEATURED.forEach((f, i) => {
    const cx = (i % 3) * CW, cy = GY + Math.floor(i / 3) * CH;
    rect(cx + 6, cy + 6, 28, 28, RED);
    const ns = String(i + 1);
    if (ns.length === 1) drawText(ns, cx + 15, cy + 13, 2, WHITE);
    else drawText(ns, cx + 13, cy + 16, 1, WHITE);
    drawWrapped(f.h, cx + 42, cy + 8, 24, 2, 16, 2, INK);
    drawWrapped(f.s, cx + 6, cy + 44, 27, 3, 16, 2, [52, 52, 50]);
    if (i % 3 < 2) vline(cx + CW - 1, cy + 4, cy + CH - 5, [200, 192, 172]);
    if (i < 9) hline(cx + 4, cx + CW - 5, cy + CH - 1, [200, 192, 172]);
  });
  // also-on-wednesday list
  const LY = 777;
  hline(0, W - 1, 776, INK);
  drawText("ALSO ON WEDNESDAY - 23 MORE STORIES", 16, 784, 2, INK);
  ALSO.forEach((item, i) => {
    const col = i < 12 ? 0 : 1;
    const row = i < 12 ? i : i - 12;
    const x = col === 0 ? 16 : 528;
    const y = 806 + row * 15;
    if (item.length > 41) throw new Error("ALSO ITEM TOO LONG: " + item);
    drawText(item, x, y, 2, INK);
  });
  // footer
  hline(0, W - 1, 986, INK);
  drawText(MARKETS, Math.floor((W - textWidth(MARKETS, 2)) / 2), 992, 2, INK);
  drawText(SOURCES, 16, 1010, 1, GREY);
}

draw();
const png = encodePNG();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, png);
console.log("wrote " + OUT + " " + png.length + " bytes " + W + "x" + H);

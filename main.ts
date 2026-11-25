// The World Today - Wednesday 25 November 2026: 35 stories, numbered map.
// A program that paints a one-page newspaper front page using only the
// Node 22 standard library and saves it as /output/entry.png.
// Deterministic: repeated runs produce byte-identical output. It uses no
// network, no clock and no randomness.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const WIDTH = 1024;
const HEIGHT = 1024;
const OUT_PATH = process.env.MAKEFUN_OUTPUT_DIR
  ? path.join(process.env.MAKEFUN_OUTPUT_DIR, "entry.png")
  : "/output/entry.png";

// ---- 5x7 bitmap font ----
// Every glyph is one 35-character string: its 7 rows of 5 bits joined.
const GLYPHS = {
  A: "01110100011000111111100011000110001",
  B: "11110100011000111110100011000111110",
  C: "01110100011000010000100001000101110",
  D: "11110100011000110001100011000111110",
  E: "11111100001000011110100001000011111",
  F: "11111100001000011110100001000010000",
  G: "01110100011000010111100011000101111",
  H: "10001100011000111111100011000110001",
  I: "01110001000010000100001000010001110",
  J: "00111000100001000010000101001001100",
  K: "10001100101010011000101001001010001",
  L: "10000100001000010000100001000011111",
  M: "10001110111010110101100011000110001",
  N: "10001110011010110011100011000110001",
  O: "01110100011000110001100011000101110",
  P: "11110100011000111110100001000010000",
  Q: "01110100011000110001101011001001101",
  R: "11110100011000111110101001001010001",
  S: "01111100001000001110000010000111110",
  T: "11111001000010000100001000010000100",
  U: "10001100011000110001100011000101110",
  V: "10001100011000110001100010101000100",
  W: "10001100011000110101101011010101010",
  X: "10001100010101000100010101000110001",
  Y: "10001100010101000100001000010000100",
  Z: "11111000010001000100010001000011111",
  "0": "01110100011001110101110011000101110",
  "1": "00100011000010000100001000010001110",
  "2": "01110100010000100110010001000011111",
  "3": "11111000100010000010000011000101110",
  "4": "00010001100101010010111110001000010",
  "5": "11111100001111000001000011000101110",
  "6": "00110010001000011110100011000101110",
  "7": "11111000010001000100010000100001000",
  "8": "01110100011000101110100011000101110",
  "9": "01110100011000101111000010001001100",
  " ": "00000000000000000000000000000000000",
  ".": "00000000000000000000000000110001100",
  ",": "00000000000000000000011000010001000",
  ":": "00000011000110000000011000110000000",
  ";": "00000011000110000000011000010001000",
  "'": "00100001000100000000000000000000000",
  "-": "00000000000000001110000000000000000",
  "(": "00010001000100001000010000010000010",
  ")": "01000001000001000010000100010001000",
  "/": "00001000100001000100010000100010000",
  "%": "11001110100001000100010000101110011",
  $: "00100011111010001110001011111000100",
  "+": "00000001000010011111001000010000000",
  "&": "01100100101010001000101011001001101",
  "!": "00100001000010000100001000000000100",
  "?": "01110100010000100110001000000000100",
  '"': "01010010100000000000000000000000000",
  "=": "00000000001111100000111110000000000",
  "[": "01110010000100001000010000100001110",
  "]": "01110000100001000010000100001001110",
};

// ---- pixel canvas ----
const canvas = Buffer.alloc(WIDTH * HEIGHT * 3);
function setPixel(x, y, colour) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const at = (y * WIDTH + x) * 3;
  canvas[at] = colour[0];
  canvas[at + 1] = colour[1];
  canvas[at + 2] = colour[2];
}
function fillRect(x, y, w, h, colour) {
  for (let row = y; row < y + h; row++)
    for (let col = x; col < x + w; col++) setPixel(col, row, colour);
}
function hRule(x0, x1, y, colour) {
  for (let x = x0; x <= x1; x++) setPixel(x, y, colour);
}
function vRule(x, y0, y1, colour) {
  for (let y = y0; y <= y1; y++) setPixel(x, y, colour);
}
function fillDisc(cx, cy, r, colour) {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) setPixel(x, y, colour);
}
function drawRing(cx, cy, r, colour) {
  for (let deg = 0; deg < 360; deg += 2) {
    const t = (deg * Math.PI) / 180;
    setPixel(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), colour);
  }
}
// Scanline polygon fill.
function fillPoly(points, colour) {
  let top = 1e9, bottom = -1e9;
  for (const [, y] of points) {
    if (y < top) top = y;
    if (y > bottom) bottom = y;
  }
  for (let y = Math.ceil(top); y <= Math.floor(bottom); y++) {
    const crossings = [];
    for (let k = 0; k < points.length; k++) {
      const [x0, y0] = points[k];
      const [x1, y1] = points[(k + 1) % points.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y))
        crossings.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
    }
    crossings.sort((a, b) => a - b);
    for (let k = 0; k + 1 < crossings.length; k += 2)
      for (let x = Math.ceil(crossings[k]); x <= Math.floor(crossings[k + 1]); x++)
        setPixel(x, y, colour);
  }
}

function measure(text, scale) {
  return text.length * 6 * scale - scale;
}
function drawString(text, x, y, scale, colour) {
  let pen = x;
  for (const ch of text.toUpperCase()) {
    const glyph = GLYPHS[ch] || GLYPHS["?"];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row * 5 + col] !== "1") continue;
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++)
            setPixel(pen + col * scale + dx, y + row * scale + dy, colour);
      }
    }
    pen += 6 * scale;
  }
}
function splitLines(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    if (!current) { current = word; continue; }
    if (current.length + 1 + word.length <= maxChars) current += " " + word;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
}
function drawParagraph(text, x, y, maxChars, maxLines, lineHeight, scale, colour) {
  const lines = splitLines(text, maxChars);
  if (lines.length > maxLines)
    throw new Error("TEXT OVERFLOW (" + lines.length + " > " + maxLines + "): " + text);
  lines.forEach((line, i) => drawString(line, x, y + i * lineHeight, scale, colour));
  return lines.length;
}

// ---- PNG writer (zlib deflate, CRC32) ----
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();
function crcOf(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(kind, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(kind, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crcOf(Buffer.concat([Buffer.from(kind, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePng() {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(WIDTH, 0);
  header.writeUInt32BE(HEIGHT, 4);
  header[8] = 8;
  header[9] = 2;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  const raw = Buffer.alloc(HEIGHT * (1 + WIDTH * 3));
  for (let y = 0; y < HEIGHT; y++) {
    raw[y * (1 + WIDTH * 3)] = 0;
    canvas.copy(raw, y * (1 + WIDTH * 3) + 1, y * WIDTH * 3, (y + 1) * WIDTH * 3);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- world map (equirectangular, lon/lat polygons) ----
const MAP = { x0: 0, x1: 1024, y0: 60, y1: 236, latTop: 84, latBot: -58 };
function lonToX(lon) { return Math.round(MAP.x0 + ((lon + 180) / 360) * (MAP.x1 - MAP.x0)); }
function latToY(lat) { return Math.round(MAP.y0 + ((MAP.latTop - lat) / (MAP.latTop - MAP.latBot)) * (MAP.y1 - MAP.y0)); }
function project(poly) { return poly.map(([lo, la]) => [lonToX(lo), latToY(la)]); }

const CONTINENTS = [
  [[-168,66],[-140,70],[-125,72],[-110,73],[-95,80],[-85,80],[-80,73],[-75,62],[-65,60],[-55,52],[-60,46],[-70,42],[-75,35],[-80,32],[-81,26],[-84,30],[-90,21],[-97,26],[-105,20],[-110,23],[-117,33],[-125,40],[-124,48],[-135,58],[-150,60],[-165,60],[-168,66]],
  [[-58,64],[-45,60],[-40,65],[-30,68],[-22,70],[-25,76],[-40,76],[-55,76],[-60,74],[-58,64]],
  [[-80,9],[-77,4],[-80,-3],[-81,-6],[-77,-12],[-72,-18],[-70,-23],[-70,-30],[-72,-37],[-73,-44],[-70,-52],[-68,-55],[-65,-55],[-62,-41],[-58,-34],[-52,-32],[-48,-28],[-41,-23],[-35,-9],[-35,-6],[-40,-3],[-44,-2],[-50,0],[-53,5],[-60,8],[-70,11],[-75,10],[-80,9]],
  [[-17,15],[-17,21],[-15,27],[-10,31],[-5,35],[0,36],[10,37],[11,34],[20,32],[30,31],[32,31],[34,28],[35,24],[37,20],[39,15],[43,12],[48,11],[51,12],[48,5],[42,0],[40,-5],[40,-10],[36,-18],[33,-26],[28,-33],[20,-35],[17,-32],[15,-27],[12,-18],[13,-12],[12,-6],[9,4],[4,6],[-8,5],[-13,8],[-17,12],[-17,15]],
  [[-10,36],[-9,38],[-9,43],[-2,44],[-1,46],[-4,48],[-2,50],[0,51],[3,53],[5,53],[8,55],[8,57],[10,59],[5,60],[5,62],[10,64],[12,66],[18,69],[25,71],[30,70],[35,68],[40,68],[45,68],[50,69],[55,69],[60,69],[65,68],[70,72],[75,73],[80,73],[85,74],[90,75],[95,76],[100,77],[105,77],[110,74],[115,73],[120,73],[125,72],[130,71],[135,72],[140,72],[145,72],[150,70],[155,69],[160,69],[165,66],[170,66],[178,65],[178,64],[170,62],[162,60],[158,55],[155,59],[150,59],[145,55],[142,50],[140,45],[138,40],[135,35],[130,33],[127,35],[122,38],[120,32],[118,25],[115,22],[110,20],[108,18],[105,10],[103,8],[100,8],[98,10],[95,15],[92,21],[90,22],[88,22],[86,20],[84,18],[80,15],[77,8],[75,12],[72,20],[68,22],[65,25],[62,25],[58,26],[55,26],[52,28],[50,29],[48,30],[50,26],[54,24],[56,26],[57,27],[59,22],[58,20],[55,17],[52,15],[48,14],[44,13],[42,15],[40,15],[39,20],[38,22],[36,27],[35,29],[34,31],[33,31],[30,36],[27,37],[26,38],[23,36],[22,37],[20,40],[19,42],[16,44],[14,45],[12,44],[10,44],[8,44],[6,43],[3,43],[0,40],[-2,37],[-6,36],[-9,37],[-10,36]],
  [[-5,50],[-3,53],[-5,56],[-3,58],[-1,57],[0,53],[-1,51],[-3,50],[-5,50]],
  [[130,31],[132,33],[134,34],[136,35],[138,35],[140,36],[141,38],[141,41],[142,43],[144,44],[142,42],[140,39],[139,37],[137,36],[135,34],[133,34],[131,32],[130,31]],
  [[95,5],[98,8],[100,6],[102,2],[104,1],[106,-2],[108,-4],[110,-6],[112,-7],[114,-8],[116,-8],[118,-9],[120,-10],[119,-8],[116,-6],[114,-4],[112,-2],[110,0],[108,2],[106,4],[104,6],[102,7],[100,8],[98,7],[95,5]],
  [[114,-22],[114,-30],[115,-35],[118,-35],[124,-33],[129,-32],[132,-32],[135,-35],[138,-35],[140,-38],[145,-38],[150,-37],[153,-32],[153,-27],[150,-22],[146,-19],[142,-15],[142,-11],[140,-17],[136,-15],[135,-12],[132,-11],[130,-13],[126,-14],[122,-17],[118,-20],[114,-22]],
  [[167,-45],[170,-43],[173,-41],[175,-38],[177,-38],[174,-36],[172,-35],[174,-41],[168,-46],[167,-45]],
];

// Numbered dots: [lon, lat, label, label dx, label dy, radius].
// Offsets chosen so no two labels overlap. Riyadh/Aden and Gaza/Zaporizhzhia
// sit close together, so those four dots use smaller radii (7/7 and 9/10).
// The CIA breach (Langley) and the Huawei trial (New York) are too close on
// this map to both be dots, so the breach is story 16 in the list below.
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

const INK = [16, 24, 40];
const PAPER = [250, 246, 236];
const RED = [178, 34, 34];
const OCEAN = [18, 58, 88];
const LAND = [232, 221, 192];
const GREY = [90, 90, 88];
const WHITE = [255, 255, 255];
const BODY = [52, 52, 50];
const RULE = [200, 192, 172];

function paintMap() {
  fillRect(0, MAP.y0, WIDTH, MAP.y1 - MAP.y0, OCEAN);
  for (const shape of CONTINENTS) fillPoly(project(shape), LAND);
  const caption = "WHERE IT HAPPENED - 12 STORIES MAPPED";
  fillRect(12, 218, measure(caption, 1) + 8, 13, INK);
  drawString(caption, 16, 220, 1, WHITE);
  for (const dot of DOTS) {
    const x = lonToX(dot.lon), y = latToY(dot.lat);
    fillDisc(x, y, dot.r, RED);
    drawRing(x, y, dot.r, WHITE);
    const num = String(dot.n);
    if (num.length === 1) drawString(num, x - 5, y - 7, 2, WHITE);
    else drawString(num, x - 6, y - 4, 1, WHITE);
    const labelX = x + dot.dx, labelY = y + dot.dy;
    const labelW = measure(dot.label, 1) + 8;
    fillRect(labelX - 4, labelY - 2, labelW, 11, INK);
    drawString(dot.label, labelX, labelY, 1, WHITE);
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

// ---- page layout ----
function paintPage() {
  fillRect(0, 0, WIDTH, HEIGHT, PAPER);
  drawString("THE WORLD TODAY", 16, 6, 5, INK);
  const dateText = "25 NOV 2026";
  drawString(dateText, WIDTH - 16 - measure(dateText, 3), 12, 3, RED);
  drawString("WEDNESDAY 25 NOVEMBER 2026 - 35 STORIES FROM AROUND THE WORLD", 16, 42, 2, GREY);
  hRule(0, WIDTH - 1, 59, INK);
  paintMap();
  hRule(0, WIDTH - 1, 236, INK);
  // Featured grid: 3 columns x 4 rows, cells 341x135 starting at y=237.
  const cellW = 341, cellH = 135, gridTop = 237;
  for (let i = 0; i < FEATURED.length; i++) {
    const item = FEATURED[i];
    const cellX = (i % 3) * cellW;
    const cellY = gridTop + Math.floor(i / 3) * cellH;
    fillRect(cellX + 6, cellY + 6, 28, 28, RED);
    const num = String(i + 1);
    if (num.length === 1) drawString(num, cellX + 15, cellY + 13, 2, WHITE);
    else drawString(num, cellX + 13, cellY + 16, 1, WHITE);
    drawParagraph(item.h, cellX + 42, cellY + 8, 24, 2, 16, 2, INK);
    drawParagraph(item.s, cellX + 6, cellY + 44, 27, 3, 16, 2, BODY);
    if (i % 3 < 2) vRule(cellX + cellW - 1, cellY + 4, cellY + cellH - 5, RULE);
    if (i < 9) hRule(cellX + 4, cellX + cellW - 5, cellY + cellH - 1, RULE);
  }
  // Also-on-Wednesday list, two columns.
  hRule(0, WIDTH - 1, 776, INK);
  drawString("ALSO ON WEDNESDAY - 23 MORE STORIES", 16, 784, 2, INK);
  for (let i = 0; i < ALSO.length; i++) {
    const entry = ALSO[i];
    const left = i < 12;
    const x = left ? 16 : 528;
    const y = 806 + (left ? i : i - 12) * 15;
    if (entry.length > 41) throw new Error("ALSO ITEM TOO LONG: " + entry);
    drawString(entry, x, y, 2, INK);
  }
  // Footer: markets strip, then sources.
  hRule(0, WIDTH - 1, 986, INK);
  drawString(MARKETS, Math.floor((WIDTH - measure(MARKETS, 2)) / 2), 992, 2, INK);
  drawString(SOURCES, 16, 1010, 1, GREY);
}

paintPage();
const png = encodePng();
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, png);
console.log("wrote " + OUT_PATH + " " + png.length + " bytes " + WIDTH + "x" + HEIGHT);

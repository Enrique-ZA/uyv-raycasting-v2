const EPS = 1e-6;
const nearClippingPlane = 0.25;
const farClippingPlane = 16;
const farClippingPlaneMax = 28;
const FOV = Math.PI * 0.5;
const screenWidth3D = 700;
const playerStepLen = 0.15;
const playerSpeed = 1.1;
const playerTurnSpeed = 0.4;
const wallImgSrc = "./images/cartoon.avif";
let wallImgData;
let wallImg;
function snap(x, dx) {
  if (dx > 0) {
    return Math.ceil(x + Math.sign(dx) * EPS);
  }
  if (dx < 0) {
    return Math.floor(x + Math.sign(dx) * EPS);
  }
  return x;
}
function hittingCell(p1, p2) {
  const d = p2.sub(p1);
  const x3 = Math.floor(p2.x + Math.sign(d.x) * EPS);
  const y3 = Math.floor(p2.y + Math.sign(d.y) * EPS);
  return new uyvVector2D(x3, y3);
}
class uyvColor {
    constructor(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
}
function castRay(scene, p1, p2) {
  let start = p1;
  while (start.distanceToSqrt(p1) < farClippingPlane * farClippingPlane) {
    const c = hittingCell(p1, p2);
    if (insideScene(scene, c) && scene[c.y][c.x] !== null) {
      break;
    }
    const p3 = rayStep(p1, p2);
    p1 = p2;
    p2 = p3;
  }
  return p2;
}
function rayStep(p1, p2) {
  let p4 = p2;
  const d = p2.sub(p1);
  if (d.x !== 0) {
    const k = d.y / d.x;
    const c = p1.y - k * p1.x;
    {
      const x3 = snap(p2.x, d.x);
      const y3 = x3 * k + c;
      const p3 = new uyvVector2D(x3, y3);
      p4 = p3;
    }
    {
      if (k !== 0) {
        const y3 = snap(p2.y, d.y);
        const x3 = (y3 - c) / k;
        const p3 = new uyvVector2D(x3, y3);
        if (p2.distanceToSqrt(p3) < p2.distanceToSqrt(p4)) {
          p4 = p3;
        }
      }
    }
  } else {
    const y3 = snap(p2.y, d.y);
    const x3 = p2.x;
    const p3 = new uyvVector2D(x3, y3);
    p4 = p3;
  }
  return p4;
}
function canvasSize(cCtxMap) {
  return new uyvVector2D(uyvGetWidth(cCtxMap), uyvGetHeight(cCtxMap));
}
function sceneSize(scene) {
  const y = scene.length;
  let x = -uyvInfinityMin;
  for (let row of scene) {
    x = Math.max(x, row.length);
  }
  return new uyvVector2D(x, y);
}
function insideScene(scene, p) {
  const size = sceneSize(scene);
  return 0 <= p.x && p.x < size.x && 0 <= p.y && p.y < size.y;
}
function boundPlayerToScene(player, scene) {
  const gridSize = sceneSize(scene);
  if (player.pos.x <= 0) {
    player.pos.x = 0;
  }
  if (player.pos.x >= gridSize.x) {
    player.pos.x = gridSize.x;
  }
  if (player.pos.y <= 0) {
    player.pos.y = 0;
  }
  if (player.pos.y >= gridSize.y) {
    player.pos.y = gridSize.y;
  }
}
function draw3D(cCtxMap, player, scene) {
  const stripWidth = Math.ceil(cCtxMap.canvas.width / screenWidth3D);
  const [r1, r2] = player.fovRange();
  for (let x = 0; x < screenWidth3D; ++x) {
    const pLerp = r1.lerp(r2, x / screenWidth3D);
    const p = castRay(scene, player.pos, pLerp);
    const c = hittingCell(player.pos, p);
    if (insideScene(scene, c)) {
      const q = scene[c.y][c.x];
      if (q !== null) {
        const v = p.sub(player.pos);
        const d = uyvVector2D.fromAngle(player.dir);
        const stripHeight = cCtxMap.canvas.height / v.dot(d);
        uyvNoStroke();
        if (q instanceof HTMLImageElement) {
          const t = p.sub(c);
          let u = 0;
          if ((Math.abs(t.x) < EPS || Math.abs(t.x - 1) < EPS) && t.y > 0) {
            u = t.y;
          } else {
            u = t.x;
          }
          cCtxMap.drawImage(
            wallImg,
            u * q.width,
            0,
            1,
            q.height,
            x * stripWidth,
            (cCtxMap.canvas.height - stripHeight) * 0.5,
            stripWidth,
            stripHeight,
          );
        } else if (q instanceof uyvColor) {
          let t = 1 - p.sub(player.pos).length() / farClippingPlane;
          t = 1 / v.dot(d);
          t *= 2;
          uyvFill(cCtxMap, q.r * t, q.g * t, q.b * t, q.a);
          cCtxMap.fillRect(
            x * stripWidth,
            (cCtxMap.canvas.height - stripHeight) * 0.5,
            stripWidth,
            stripHeight,
          );
        }
      }
    }
  }
}
function drawMinimap(cCtxMap, player, scene, mapPos, mapSize) {
  const gridSize = sceneSize(scene);
  const lineWidth = 0.03;
  uyvTranslate(cCtxMap, ...mapPos.array());
  uyvFill(cCtxMap, 0, 0, 0, 125);
  cCtxMap.fillRect(0, 0, mapSize.x, mapSize.y);
  uyvScale(cCtxMap, ...mapSize.div(gridSize).array());
  for (let y = 0; y < gridSize.y; ++y) {
    for (let x = 0; x < gridSize.x; ++x) {
      const q = scene[y][x];
      if (q !== null) {
        if (q instanceof uyvColor) {
          uyvNoStroke();
          uyvFill(cCtxMap, 255, 0, 0);
          cCtxMap.fillRect(x, y, 1, 1);
        } else if (q instanceof HTMLImageElement) {
          uyvNoStroke();
          cCtxMap.fillStyle = "cyan";
          cCtxMap.fillRect(x, y, 1, 1);
        }
      }
    }
  }
  uyvFill(cCtxMap, 255, 0, 255);
  uyvNoStroke();
  uyvCircle(cCtxMap, ...player.pos.array(), 0.2);
  const [p1, p2] = player.fovRange();
  uyvStroke(cCtxMap, 255, 0, 255);
  uyvStrokeWeight(cCtxMap, lineWidth);
  uyvLine(cCtxMap, ...p1.array(), ...p2.array());
  uyvLine(cCtxMap, ...player.pos.array(), ...p1.array());
  uyvLine(cCtxMap, ...player.pos.array(), ...p2.array());
}
class Player {
  constructor(
     pos,
     dir,
  ) {
        this.pos = pos;
        this.dir = dir;
  }
    fovRange() {
    const l = Math.tan(FOV * 0.5) * nearClippingPlane;
    const p = this.pos.add(
      uyvVector2D.fromAngle(this.dir).scale(nearClippingPlane),
    );
    const p1 = p.sub(p.sub(this.pos).rotate90().normalize().scale(l));
    const p2 = p.add(p.sub(this.pos).rotate90().normalize().scale(l));
    return [p1, p2];
  }
}
let uyvKey = null;
function uyvKeyDown() { }
function redrawScreen(
  canvasCtxMap,
  player,
  scene,
  minimapPosition,
  minimapSize,
) {
  uyvBackground(canvasCtxMap, 255, 255, 0);
  uyvPush(canvasCtxMap);
  draw3D(canvasCtxMap, player, scene);
  uyvPop(canvasCtxMap);
  uyvPush(canvasCtxMap);
  drawMinimap(canvasCtxMap, player, scene, minimapPosition, minimapSize);
  uyvPop(canvasCtxMap);
}
function uyvLoadImageAndData(url) {
  const image = new Image();
  image.src = url;
  return new Promise((resolve, reject) => {
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      if (ctx === null) {
        throw new Error("The browser does not support this game engine.");
      }
      ctx.drawImage(image, 0, 0);
      const imgData = ctx.getImageData(0, 0, image.width, image.height);
      resolve({ image: image, data: imgData });
    };
    image.onerror = reject;
  });
}
async function uyvStart() {
  const sW = 1200;
  const sH = uyvType.NormalizeUint16s((sW * 9) / 16);
  const canvasObjMap = uyvCreateScreen(sW, sH);
  const canvasCtxMap = canvasObjMap.canvas;
  const screenPort = canvasObjMap.screen;
  if (canvasCtxMap === null) {
    throw new Error("canvasCtxMap cannot be null");
  }
  const wallData = await uyvLoadImageAndData(wallImgSrc);
  wallImg = wallData.image;
  wallImgData = wallData.data;
  const b = wallImg;
  const q = new uyvColor(0, 0, 255, 255);
  const v = null;
    const scene = [
    [b, b, b, b, b, b, b, b, b, b, b, b, b, b, b, b, b, b, b, b],
    [b, v, v, v, v, v, v, v, v, b, b, v, v, v, v, v, v, v, v, b],
    [b, v, v, v, v, v, v, v, v, b, b, v, v, v, v, v, v, v, v, b],
    [b, v, v, b, b, b, b, v, v, b, b, v, v, b, b, b, b, v, v, b],
    [b, v, v, b, b, b, b, v, v, b, b, v, v, b, b, b, b, v, v, b],
    [b, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, b],
    [b, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, b],
    [b, b, b, v, v, b, b, b, b, v, v, b, b, b, b, v, v, b, b, b],
    [b, b, b, v, v, b, b, b, b, v, v, b, b, b, b, v, v, b, b, b],
    [b, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, b],
    [b, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, b],
    [b, v, v, b, b, b, b, v, v, b, b, v, v, b, b, b, b, v, v, b],
    [b, v, v, b, b, b, b, v, v, b, b, v, v, b, b, b, b, v, v, b],
    [b, v, v, v, v, v, v, v, v, b, b, v, v, v, v, v, v, v, v, b],
    [b, v, v, v, v, v, v, v, v, b, b, v, v, v, v, v, v, v, v, b],
    [b, b, b, v, v, b, b, b, b, b, b, b, b, b, b, v, v, b, b, b],
    [b, b, b, v, v, b, b, b, b, b, b, b, b, b, b, v, v, b, b, b],
    [b, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, b],
    [b, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, v, b],
    [b, b, b, b, b, b, b, b, b, b, b, b, b, b, b, b, b, b, b, b],
  ];
    const player = new Player(
    sceneSize(scene).mult(new uyvVector2D(0.5, 0.5)),
    Math.PI * 1.25,
  );
  let moveF = false;
  let moveB = false;
  let turnL = false;
  let turnR = false;
  const baseRows = 7;
  const baseCellSize = 0.02;
  let cScalar = 1;
  const k = baseRows * baseCellSize * cScalar;
  const currentRows = scene[0].length;
  const newCellSize = (k / currentRows) * 1.5;
  const minimapPosition = uyvVector2D
    .zero()
    .add(canvasSize(canvasCtxMap).scale(0.05));
  const cellSize = uyvGetWidth(canvasCtxMap) * newCellSize;
  const minimapSize = sceneSize(scene).scale(cellSize);
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "w":
        moveF = true;
        break;
      case "s":
        moveB = true;
        break;
      case "d":
        turnR = true;
        break;
      case "a":
        turnL = true;
        break;
    }
  });
  window.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "w":
        moveF = false;
        break;
      case "s":
        moveB = false;
        break;
      case "d":
        turnR = false;
        break;
      case "a":
        turnL = false;
        break;
    }
  });
  let prevTimestamp = 0;
    const frame = (timestamp) => {
    const deltaTime = (timestamp - prevTimestamp) / 1000;
    let playerVel = uyvVector2D.zero();
    if (moveF) {
      playerVel = playerVel.add(
        uyvVector2D.fromAngle(player.dir).scale(playerSpeed),
      );
    }
    if (moveB) {
      playerVel = playerVel.sub(
        uyvVector2D.fromAngle(player.dir).scale(playerSpeed),
      );
    }
    if (turnR) {
      player.dir += Math.PI * playerTurnSpeed * deltaTime;
    }
    if (turnL) {
      player.dir -= Math.PI * playerTurnSpeed * deltaTime;
    }
    player.pos = player.pos.add(playerVel.scale(deltaTime));
    redrawScreen(canvasCtxMap, player, scene, minimapPosition, minimapSize);
    prevTimestamp = timestamp;
    window.requestAnimationFrame(frame);
  };
  window.requestAnimationFrame((timestamp) => {
    prevTimestamp = timestamp;
    window.requestAnimationFrame(frame);
  });
  console.log("WORKNG");
}

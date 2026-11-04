const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d', { alpha: false });
const end = document.querySelector('.end');
const film = document.querySelector('.film');
const stage = document.querySelector('.frame');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = x => Math.min(1, Math.max(0, x));
const range = (t, a, b) => clamp((t - a) / (b - a));
const ease = (t, a, b) => {
  const x = range(t, a, b);
  return x * x * (3 - 2 * x);
};
const mix = (a, b, t) => a + (b - a) * t;
function random(seed) {
  const n = Math.sin(seed * 27.419 + 46.123) * 13758.5453;
  return n - Math.floor(n);
}

const stars = Array.from({ length: 420 }, (_, i) => ({
  x: random(i * 5), y: random(i * 5 + 1),
  radius: .24 + random(i * 5 + 2) ** 3 * 1.15,
  threshold: random(i * 5 + 3), light: .18 + random(i * 5 + 4) * .75
}));
const splinters = Array.from({ length: 77 }, (_, i) => ({
  angle: random(i * 7 + 300) * Math.PI * 2,
  speed: .17 + random(i * 7 + 301) ** 2 * 1.8,
  size: .7 + random(i * 7 + 302) ** 3 * 14,
  spin: (random(i * 7 + 303) - .5) * 17,
  light: .13 + random(i * 7 + 304) * .77
}));
const tree = new Image();
const room = new Image();
const compactTree = new Image();
const largeTree = new Image();
const largeRoom = new Image();
const treeAspect = 16/9;
const plateAspect = 1.5;
function loadPlates(treeWidth, plateWidth) {
  if (!compactTree.src && treeWidth <= 1920) compactTree.src = 'assets/mokka-compact.jpg';
  if (!tree.src && treeWidth > 1920) tree.src = 'assets/mokka-tree.jpg';
  if (!largeTree.src && treeWidth > 3840) largeTree.src = 'assets/mokka-large.jpg';
  if (!room.src && plateWidth <= 1600) room.src = 'assets/monitor-compact.jpg';
  if (!largeRoom.src && plateWidth > 1600) largeRoom.src = 'assets/monitor-large.jpg';
}
function landscape() {
  return [largeTree,tree,compactTree].find(loaded);
}
const loaded = image => image.complete && image.naturalWidth > 0;

// The screen opening in the photographic plate, in source-image fractions.
const glass = { left: 286/1536, top: 202/1024, right: 1251/1536, bottom: 710/1024 };
let w = 0, h = 0, frame = 0, position = 0, previousTime = 0;

function rect(x,y,width,height,color) {
  context.fillStyle = color;
  context.fillRect(x,y,width,height);
}

function bloom(x, y, radius, color, opacity) {
  if (radius < .1 || opacity <= 0) return;
  context.save();
  context.globalAlpha *= opacity;
  const g = context.createRadialGradient(x,y,0,x,y,radius);
  g.addColorStop(0,color);
  g.addColorStop(.07,color);
  g.addColorStop(.60,'transparent');
  g.addColorStop(1,'transparent');
  rect(x-radius,y-radius,radius*2,radius*2,g);
  context.restore();
}

function line(points, color, visible = 1) {
  const lengths = points.slice(1).map(([x,y],i) => Math.hypot(x-points[i][0],y-points[i][1]));
  let remaining = lengths.reduce((sum,length) => sum + length,0) * visible;
  context.beginPath();
  context.moveTo(...points[0]);
  lengths.forEach((length,i) => {
    if (remaining <= 0 || length === 0) return;
    const t = Math.min(1,remaining/length);
    context.lineTo(mix(points[i][0],points[i+1][0],t),mix(points[i][1],points[i+1][1],t));
    remaining -= length;
  });
  context.strokeStyle = color;
  context.stroke();
}

const leaves = Array.from({ length: 48 }, (_, i) => ({
  x: .428 + random(i*8+610)*.18,
  y: .265 + random(i*8+611)*.225,
  release: .012 + random(i*8+612)*.13,
  size: .0025 + random(i*8+613)**2*.008,
  depth: .45 + random(i*8+614)*.75,
  drift: random(i*8+615)-.27,
  phase: random(i*8+616)*Math.PI*2,
  color: ['#a9a9bf','#77798d','#cec6d1','#514d64'][i%4]
}));

function opening(t) {
  const image = landscape();
  if (!image) return;
  const gaze = ease(t,.016,.30);
  const darkness = ease(t,.024,.357);
  const width = Math.max(w,h*treeAspect)*(1+gaze*.11);
  const height = width/treeAspect;
  const imageX = (w-width)/2;
  const imageY = (h-height)/2 + h*.048*gaze;
  // Composite the plate once. Subpixel overlaps between individually alpha-blended
  // scanlines caused the horizontal bands in the former renderer.
  context.drawImage(image,imageX,imageY,width,height);
  rect(0,0,w,h,`rgba(0,0,0,${darkness})`);
  const drawnWidth = width;
  const drawnHeight = height;
  if (darkness > 0 && darkness < 1) {
    rect(0,0,w,h,`rgba(16,12,31,${Math.sin(darkness*Math.PI)*.16})`);
  }

  for (const leaf of leaves) {
    const age = range(t,leaf.release,leaf.release+.23);
    if (age === 0 || age === 1) continue;
    const flutter = age*13 + leaf.phase;
    const x = imageX + drawnWidth*leaf.x + w*(age*leaf.drift*.28 + Math.sin(flutter)*age*.03);
    const y = imageY + drawnHeight*leaf.y + h*(gaze*.075+age**1.6*.76*leaf.depth);
    const size = Math.max(1.25,Math.min(w,h)*leaf.size*leaf.depth);
    context.save();
    context.globalAlpha = (1-darkness)*ease(age,0,.10)*(1-ease(age,.80,1))*.85;
    context.translate(x,y);
    context.rotate(flutter*.62);
    context.scale(.2+.8*Math.abs(Math.cos(flutter)),1);
    context.fillStyle = leaf.color;
    context.beginPath();
    context.moveTo(0,-size);
    context.bezierCurveTo(size,-size*.6,size*.65,size*.8,0,size);
    context.bezierCurveTo(-size*.8,size*.3,-size*.63,-size*.55,0,-size);
    context.fill();
    context.restore();
  }
}
function viewport(t) {
  if (t <= .694) return { x: 0, y: 0, width: w, height: h };
  const pull = ease(t,.694,.791);
  const plateRatio = plateAspect;
  const innerWidth = glass.right-glass.left;
  const innerHeight = glass.bottom-glass.top;
  const fit = Math.min(w/(plateRatio*.92),h);
  const fitWidth = fit * plateRatio;
  const finalX = (w-fitWidth)/2;
  const finalY = (h-fit)/2;
  const startHeight = Math.max(w/(plateRatio*innerWidth),h/innerHeight) * 1.01;
  const plateHeight = startHeight * (fit/startHeight) ** pull;
  const plateWidth = plateHeight * plateRatio;
  const centerX = mix(w/2,finalX+(glass.left+glass.right)*fitWidth/2,pull);
  const centerY = mix(h/2,finalY+(glass.top+glass.bottom)*fit/2,pull);
  const plateX = centerX - (glass.left+glass.right)*plateWidth/2;
  const plateY = centerY - (glass.top+glass.bottom)*plateHeight/2;
  const plate = loaded(largeRoom) ? largeRoom : room;
  if (loaded(plate)) context.drawImage(plate,plateX,plateY,plateWidth,plateHeight);
  // Expand the star field to the viewport before the first bezel pixel enters.
  const blend = ease(t,.694,.714);
  const width = mix(w,plateWidth*innerWidth,blend);
  const height = mix(h,plateHeight*innerHeight,blend);
  return { x: centerX-width/2, y: centerY-height/2, width, height };
}

function starfield(box,t,time) {
  const {x,y,width,height} = box;
  context.save();
  context.beginPath();
  context.rect(x,y,width,height);
  context.clip();
  const opacity = 1-ease(t,.884,.905);
  const reach = ease(t,.590,.690);
  if (reach > 0) {
    for (const s of stars) {
      const light = ease(reach,s.threshold*.76,s.threshold*.76+.23)*s.light*opacity;
      if (light < .015) continue;
      const ratio = Math.min(width/w,height/h);
      const px = x + width*s.x;
      const py = y + height*s.y;
      const r = Math.max(.25,s.radius * ratio);
      context.fillStyle = `rgba(255,255,255,${light})`;
      context.beginPath();
      context.arc(px,py,r,0,Math.PI*2);
      context.fill();
    }
  }
  const intensity = ease(t,.361,.425)*opacity;
  const twinkle = .91 + .06*Math.sin(time*.0027) + .03*Math.sin(time*.0062);
  const px=x+width/2, py=y+height/2;
  const radius=mix(.65,2.1,ease(t,.37,.63));
  const halo = ease(t,.37,.49)*(1-ease(t,.56,.70));
  bloom(px,py,Math.min(w,h)*.11,'#e2c1a2',intensity*halo*.14);
  bloom(px,py,radius*12,'#fff7e9',intensity*.37);
  context.fillStyle = `rgba(255,255,255,${intensity*twinkle})`;
  context.beginPath();
  context.arc(px,py,radius,0,Math.PI*2);
  context.fill();
  context.restore();
}

function telemetry(x,y,t) {
  const trace = ease(t,.795,.846);
  const text = ease(t,.838,.856);
  const opacity = 1-ease(t,.868,.883);
  if (trace <= 0 || opacity <= 0) return;
  const size = Math.min(110, w*.27);
  const elbow = Math.min(65,w*.15);
  const diagonal = Math.min(43,w*.10);
  const left = x+elbow+diagonal;
  const top = y-diagonal-14;
  context.save();
  context.globalAlpha = opacity;
  const blue = '#80baff';
  line([[x+6,y],[x+elbow,y],[left,y-diagonal]],blue,trace);
  context.globalAlpha *= text;
  rect(left,top,size,28,'#05080e');
  context.strokeStyle = blue;
  context.strokeRect(left+.5,top+.5,size-1,27);
  context.fillStyle = '#d8e9ff';
  context.font = '11px Consolas, monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('PØLÆRIS',left+size/2,top+14,size-10);
  context.restore();
}

function breach(box,x,y,t) {
  const crack = ease(t,.877,.899);
  const advance = range(t,.889,.953);
  if (crack <= 0 || advance >= 1) return;
  const flight = advance ** 2.8;
  const fade = 1 - ease(advance,.55,.95);
  const span = Math.max(w,h);
  context.save();
  context.beginPath();
  context.rect(box.x,box.y,box.width,box.height);
  context.clip();
  context.lineWidth = .64;
  for (let i=0;i<15;i++) {
    const angle = i*Math.PI*2/15 + random(i+81)*.27;
    const reach = box.width*(.10+random(i+4)*.39);
    const points = [[x,y]];
    for (let k=1;k<=6;k++) {
      const bend = angle + (random(i*9+k+900)-.5)*.18;
      points.push([x+Math.cos(bend)*reach*k/6,y+Math.sin(bend)*reach*k/6]);
    }
    line(points,`rgba(223,226,230,${fade*(.2+random(i+32)*.53)})`,crack);
    const [sx,sy] = points[2+i%3];
    line([[sx,sy],[sx+Math.cos(angle+.8)*reach*.28,sy+Math.sin(angle+.8)*reach*.28]],`rgba(255,255,255,${fade*.45})`,ease(crack,.4,1));
  }
  context.restore();
  for (const shard of splinters) {
    const distance = span * shard.speed * (advance*.09 + flight);
    const sx = x + Math.cos(shard.angle)*distance;
    const sy = y + Math.sin(shard.angle)*distance*.8;
    const r = shard.size * (.2 + flight*2.9);
    context.save();
    context.translate(sx,sy);
    context.rotate(shard.angle+advance*shard.spin);
    context.beginPath();
    context.moveTo(-r,0);
    context.lineTo(r*.45,-r*.30);
    context.lineTo(r,r*.36);
    context.closePath();
    context.fillStyle = `rgba(222,227,231,${shard.light*fade*crack*.29})`;
    context.fill();
    context.strokeStyle = `rgba(248,248,247,${shard.light*fade*crack*.8})`;
    context.lineWidth = .6;
    context.stroke();
    context.restore();
  }
  const radius = 3 + flight*span*1.8;
  bloom(x,y,radius*2.4,'#fff',.7*crack);
  bloom(x,y,radius*.72,'#fff',crack);
  const ray = Math.min(w*.47,radius*.85);
  context.globalAlpha = fade*.78*crack;
  line([[x-ray,y],[x+ray,y]],'#fff');
  line([[x,y-ray*.36],[x,y+ray*.36]],'#fff');
  context.globalAlpha = 1;
}

const motes = Array.from({length: 290}, (_,i) => ({
  angle: random(i*4+3020)*Math.PI*2,
  radius: .09+random(i*4+3021)**.65*1.1,
  depth: .5+random(i*4+3022)*2.7,
  light: .23+random(i*4+3023)*.73
}));

function passage(p) {
  const step = range(p,.754,.978);
  const light = 1-ease(step,.035,.25);
  const dissolve = 1-ease(step,.68,.99);
  const settle = ease(step,.34,.93);
  const focal = Math.min(w,h);
  const cx = w/2 + Math.sin(step*Math.PI)*w*.045*(1-settle);
  const cy = h/2 - Math.sin(step*Math.PI)*h*.027;
  const twist = step*1.47;
  const sweep = ease(step,.03,.58);
  const density = ease(step,.04,.30)*dissolve;

  // Fly through a cloud of fragments, then let their projected paths organize
  // into an optical compass around the same point as the final team mark.
  for (const mote of motes) {
    const z = mote.depth - sweep*1.48;
    if (z < .16) continue;
    const angle = mote.angle + twist/mote.depth;
    const r = focal*mote.radius/z;
    const x = cx + Math.cos(angle)*r;
    const y = cy + Math.sin(angle)*r;
    const trail = r*(.018+sweep*.15)*(1-settle);
    if (x < -trail || x > w+trail || y < -trail || y > h+trail) continue;
    const alpha = mote.light*density*ease(z,.16,.53);
    context.strokeStyle = `rgba(255,255,255,${alpha})`;
    context.lineWidth = Math.min(2,.38/z+.28);
    context.beginPath();
    context.moveTo(x-Math.cos(angle)*trail,y-Math.sin(angle)*trail);
    context.lineTo(x+.6,y+.3);
    context.stroke();
  }

  const reticle = ease(step,.23,.62)*(1-ease(step,.82,1));
  if (reticle > 0) {
    const r = focal*mix(.38,.127,settle);
    context.save();
    context.translate(w/2,h/2);
    context.rotate(-.55*(1-settle));
    context.lineWidth = .7;
    for (let i=0;i<4;i++) {
      const a = i*Math.PI/2;
      context.strokeStyle = `rgba(255,255,255,${reticle*.58})`;
      context.beginPath();
      context.arc(0,0,r,a+.11,a+mix(.11,1.45,reticle));
      context.stroke();
      context.strokeStyle = `rgba(255,255,255,${reticle*.29})`;
      context.beginPath();
      context.arc(0,0,r*1.18,a+.3,a+.3+reticle*.54);
      context.stroke();
    }
    for (let i=0;i<48;i++) {
      const a = i*Math.PI/24;
      const inner = r*(i%6 === 0 ? .89 : .96);
      line([[Math.cos(a)*inner,Math.sin(a)*inner],[Math.cos(a)*r,Math.sin(a)*r]],`rgba(255,255,255,${reticle*(i%6===0?.64:.28)})`);
    }
    context.restore();
  }
  bloom(cx,cy,focal*mix(.44,.09,settle),'#fff',density*.24);
  rect(0,0,w,h,`rgba(255,255,255,${light})`);
}

function draw(time) {
  frame = 0;
  const bounds = film.getBoundingClientRect();
  if (bounds.bottom <= 0) return;
  const duration = bounds.height - stage.clientHeight;
  const target = clamp(-bounds.top / Math.max(1,duration));
  // Keep scroll position authoritative while smoothing wheel/trackpad increments.
  const elapsed = previousTime ? Math.min(64,time-previousTime) : 64;
  previousTime = time;
  const delta = target-position;
  position = reduce.matches || Math.abs(delta) < .0003 || Math.abs(delta) > .22
    ? target : mix(position,target,1-Math.exp(-elapsed/42));
  const p = position;
  const t = reduce.matches ? p < .23 ? 0 : p < .47 ? .47 : .858 : p/.754*.953;
  context.lineWidth = 1;
  rect(0,0,w,h,'#000');
  if (!reduce.matches && p >= .754) {
    passage(p);
  } else if (t < .357) {
    opening(t);
  } else if (t >= .361) {
    const box = viewport(t);
    starfield(box,t,time);
    const x=box.x+box.width/2, y=box.y+box.height/2;
    telemetry(x,y,t);
    if (!reduce.matches) {
      breach(box,x,y,t);
      const flash = ease(p,.714,.751);
      rect(0,0,w,h,`rgba(255,255,255,${flash})`);
    }
  }

  const resolve = reduce.matches ? Number(p >= .75) : ease(p,.902,.986);
  if (reduce.matches && resolve) rect(0,0,w,h,'#000');
  end.style.opacity = resolve;
  end.style.transform = reduce.matches ? '' : `scale(${mix(.91,1,resolve)})`;
  if (!reduce.matches && (position !== target || (t >= .361 && t < .590))) schedule();
}
function schedule() {
  if (!frame) frame = requestAnimationFrame(draw);
}

function resize() {
  w = stage.clientWidth;
  h = stage.clientHeight;
  const ratio = Math.min(3, devicePixelRatio || 1, Math.sqrt(12000000 / Math.max(1,w*h)));
  loadPlates(Math.max(w,h*treeAspect)*ratio,w*ratio);
  canvas.width = Math.round(w*ratio);
  canvas.height = Math.round(h*ratio);
  context.setTransform(ratio,0,0,ratio,0,0);
  schedule();
}

if (context) {
  const start = () => {
    if (!document.documentElement.classList.contains('ready')) {
      document.documentElement.classList.add('ready');
      resize();
    }
    schedule();
  };
  for (const image of [compactTree,tree,largeTree]) image.addEventListener('load',start);
  for (const image of [room,largeRoom]) image.addEventListener('load',schedule);
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',resize);
  reduce.addEventListener('change',resize);
  new ResizeObserver(resize).observe(stage);
}

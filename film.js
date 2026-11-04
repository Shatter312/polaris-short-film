const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d', { alpha: false });
const end = document.querySelector('.end');
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
tree.src = 'assets/mokka-tree.jpg';
room.src = 'assets/monitor.png';
const loaded = image => image.complete && image.naturalWidth > 0;

// The screen opening in the photographic plate, in source-image fractions.
const glass = { left: 286/1536, top: 202/1024, right: 1251/1536, bottom: 710/1024 };
let w = 0, h = 0, frame = 0;

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
  g.addColorStop(.16,color);
  g.addColorStop(.45,'transparent');
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

function opening(t) {
  if (!loaded(tree)) return;
  const tilt = ease(t,.022,.246);
  const exposure = 1 - ease(t,.093,.232);
  const scale = Math.max(w/tree.width,h/tree.height) * (1 + tilt*.12);
  context.save();
  context.globalAlpha = exposure;
  context.filter = 'grayscale(1) contrast(1.13)';
  const top = (h-tree.height*scale)/2+h*.76*tilt;
  context.drawImage(tree,(w-tree.width*scale)/2,top,tree.width*scale,tree.height*scale);
  context.restore();
  if (tilt > 0) {
    const depth = h*.24;
    const veil = context.createLinearGradient(0,top,0,top+depth);
    veil.addColorStop(0,"#000");
    veil.addColorStop(1,"transparent");
    rect(0,top,w,depth,veil);
  }
}

function viewport(t) {
  if (t <= .694) return { x: 0, y: 0, width: w, height: h };
  const pull = ease(t,.694,.791);
  const plateRatio = loaded(room) ? room.width / room.height : 1.5;
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
  if (loaded(room)) context.drawImage(room,plateX,plateY,plateWidth,plateHeight);
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
  const intensity = ease(t,.347,.381)*opacity;
  const twinkle = .91 + .06*Math.sin(time*.0027) + .03*Math.sin(time*.0062);
  const px=x+width/2, py=y+height/2;
  const radius=mix(.62,1.38,ease(t,.378,.678));
  bloom(px,py,radius*8,'#fff',intensity*.31);
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
  const light = ease(advance,.57,.87) * (1-ease(t,.942,.953));
  rect(0,0,w,h,`rgba(255,255,255,${light})`);
  const ray = Math.min(w*.47,radius*.85);
  context.globalAlpha = fade*.78*crack;
  line([[x-ray,y],[x+ray,y]],'#f6f1e2');
  line([[x,y-ray*.36],[x,y+ray*.36]],'#fff');
  context.globalAlpha = 1;
}

function draw(time) {
  frame = 0;
  const duration = document.documentElement.scrollHeight - innerHeight;
  const p = clamp(scrollY / Math.max(1,duration));
  const t = reduce.matches ? p < .2 ? 0 : p < .4 ? .47 : p < .6 ? .68 : p < .8 ? .858 : 1 : p;
  rect(0,0,w,h,'#000');
  if (t < .246) opening(t);
  if (t >= .347 && t < .953) {
    const box = viewport(t);
    starfield(box,t,time);
    const x=box.x+box.width/2, y=box.y+box.height/2;
    telemetry(x,y,t);
    breach(box,x,y,t);
    const dark = ease(t,.923,.953);
    rect(0,0,w,h,`rgba(0,0,0,${dark})`);
  }
  const resolve = ease(t,.952,.989);
  end.style.opacity = resolve;
  if (resolve > 0) {
    const margin = Math.min(w*.38,260);
    const gap = Math.min(w*.18,122);
    const y = h*.5;
    context.globalAlpha = resolve*.65;
    line([[w/2-gap,y],[w/2-margin,y]],'#9b824d',resolve);
    line([[w/2+gap,y],[w/2+margin,y]],'#9b824d',resolve);
    context.globalAlpha = 1;
  }
  if (!reduce.matches && t >= .347 && t < .590) schedule();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(draw);
}

function resize() {
  w = innerWidth;
  h = innerHeight;
  const ratio = Math.min(2,devicePixelRatio || 1);
  canvas.width = Math.round(w*ratio);
  canvas.height = Math.round(h*ratio);
  context.setTransform(ratio,0,0,ratio,0,0);
  schedule();
}

if (context) {
  document.documentElement.classList.add('ready');
  tree.addEventListener('load',schedule);
  room.addEventListener('load',schedule);
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',resize);
  reduce.addEventListener('change',schedule);
  resize();
}




var cspx = function(n) {
  return 88 - 8 * (n - 2);
};

var ars = function(n) {
  return parseFloat((1.2 - (n >= 5 ? (n - 5) * .15 : (n - 5) * .12)).toFixed(4));
};

var ods = function(n) {
  return [.0795 - .006 * n, .1395 - .008 * n, .1995 - .01 * n];
};

var e = function(img){ // check if image is empty
  return img.width == 0 && img.height == 0;
};

var concatImages = function(arr, overlap) {
  if(!overlap) overlap = 0;
  var canvas = document.createElement('canvas');
  var maxh = arr[0].height,
    w = arr[0].width;
  for (var i = 1; i < arr.length; i++) {
    if (arr[i].height > maxh) maxh = arr[i].height;
    w += arr[i].width - overlap;
  }
  canvas.width = w;
  canvas.height = maxh;
  var x = 0;
  var ctx = canvas.getContext('2d');
  for (i = 0; i < arr.length; i++) {
    ctx.drawImage(arr[i], x, (maxh - arr[i].height) / 2);
    x += arr[i].width - overlap;
  }
  return canvas;
};

var tint = function(img, col) {
  var canvas = document.createElement('canvas');
  canvas.height = img.height;
  canvas.width = img.width;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  var w = img.width,
    h = img.height;
  var imgdata = ctx.getImageData(0, 0, w, h);
  var rgba = imgdata.data;
  //console.log(imgdata.data);
  for (var px = 0, ct = w * h * 4; px < ct; px += 4) {
    rgba[px] *= col[0] / 255;
    rgba[px + 1] *= col[1] / 255;
    rgba[px + 2] *= col[2] / 255;
  }
  ctx.putImageData(imgdata, 0, 0);
  return canvas;
};

var colorToArray = function(s) {
  var color = s.split(',');
  var temp = [];
  for (var i = 0; i < color.length; i++) {
    temp.push(parseFloat(color[i]));
  }
  return temp;
};

var pow = Math.pow;

Array.prototype.equals = function(other) {
  if (this.length !== other.length) return false;
  for (var i = 0; i < this.length; i++) {
    if (this[i] != other[i]) return false;
  }
  return true;
};

var toRGB = function(arr) { // from an array of numbers in range 0-255 to rgb or rgba color string
  var [r, g, b, a] = arr;
  return a === undefined ? 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')' : 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ',' + a + ')';
};

var dist = function(a, b) {
  return pow(pow(a[0] - b[0], 2) + pow(a[1] - b[1], 2), .5);
};

var min = function(arr) {
  var m = arr[0];
  for (var i = 1; i < arr.length; i++) {
    if (arr[i] < m) m = arr[i];
  }
  return m;
};

var max = function(arr) {
  var m = arr[0];
  for (var i = 1; i < arr.length; i++) {
    if (arr[i] > m) m = arr[i];
  }
  return m;
};

var sum = function(arr) {
  var r = 0;
  for (var i = 0; i < arr.length; i++) r += arr[i];
  return r;
};

var midpoint = function(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
};

var fa = function(n) {
  var r = 1;
  for (var i = 2; i <= n; i++)
    r *= i;
  return r;
};

var bcoef = function(n, k) {
  return fa(n) / fa(k) / fa(n - k);
};

var spline_len = function(p) {
  var l = 0;
  for (var i = 0; i < p.length - 1; i++) {
    l += dist(p[i], p[i + 1]);
  }
  return l;
};

var lenp = function(p) {
  var n = p.length - 1;
  if (n == 1) return dist(p[0], p[1]);
  var [px, py] = p[0];
  var l = 0;
  for (var s = 0; s < 101; s++) {
    var t = s / 100;
    var x = 0;
    for (var i = 0; i < n + 1; i++) {
      x += bcoef(n, i) * pow(1 - t, n - i) * pow(t, i) * p[i][0];
    }
    var y = 0;
    for (i = 0; i < n + 1; i++) {
      y += bcoef(n, i) * pow(1 - t, n - i) * pow(t, i) * p[i][1];
    }
    l += dist([x, y], [px, py]);
    px = x, py = y;
  }
  return l;
};

var bezier2 = function(p, l) {
  if (l === undefined) l = lenp(p);
  var prec = l / 25;
  var n = p.length - 1;

  function b(t) {
    var x = 0;
    for (var i = 0; i < n + 1; i++) {
      x += bcoef(n, i) * pow(1 - t, n - i) * pow(t, i) * p[i][0];
    }
    var y = 0;
    for (i = 0; i < n + 1; i++) {
      y += bcoef(n, i) * pow(1 - t, n - i) * pow(t, i) * p[i][1];
    }
    return [x, y];
  }
  var arr = [],
    l1 = 0;
  var [px, py] = p[0];
  var x, y, dx, dy, m, t;
  for (var i = 0; i < Math.floor(l / prec); i++) {
    t = i * prec / l;
    [x, y] = b(t);
    dx = x - px;
    dy = y - py;
    m = pow(pow(dx, 2) + pow(dy, 2), .5);
    if (m != 0 && l1 + m >= l) return [arr.concat([
      [px + dx / m * (l1 - l), py + dy / m * (l1 - l)]
    ]), l];
    arr.push([x, y]);
    l1 += m;
    px = x, py = y;
  }
  return [arr, l1];
};

var line = function(p, l, step) {
  if (l === undefined) l = -1;
  if (step === undefined) step = 10;
  var dx = p[1][0] - p[0][0],
    dy = p[1][1] - p[0][1];
  var m = pow(pow(dx, 2) + pow(dy, 2), .5) / step;
  if (l == -1) l = m * step;
  dx /= m;
  dy /= m;
  var a = [];
  for (var i = 0; i < Math.round(l / step); i++) {
    a.push([p[0][0] + dx * i, p[0][1] + dy * i]);
  }
  return [a.concat([
    [p[0][0] + dx * l / step, p[0][1] + dy * l / step]
  ]), l];
};

var bezier = function(p, l) {
  if (p.length == 2) return line(p, l)[0];
  var arr = [];
  var prev = 0;
  var part, c;
  for (var i = 1; i < p.length + 1; i++) {
    if (i == p.length) {
      part = p.slice(prev, i);
      c = part.length == 2 ? line(part, l) : bezier2(part, l);
      arr = arr.concat(c[0]);
    }
    else if (i < p.length && p[i].equals(p[i - 1])) {
      part = p.slice(prev, i);
      c = part.length == 2 ? line(part) : bezier2(part);
      c[0].pop();
      arr = arr.concat(c[0]);
      l -= c[1];
      prev = i;
    }
  }
  if (arr.length == 0) arr = bezier2(p)[0];
  return arr;
};

var passthrough = function(p, l, step) {
  if (step === undefined) step = 4;
  var [a, b, c] = p;
  var [x1, y1] = midpoint(p[0], p[1]);
  var [x2, y2] = midpoint(p[1], p[2]);
  if (a[1] == b[1] && b[1] == c[1]) return line(p, l)[0];
  var m, x, y;
  if (a[1] == b[1]) {
    m = -(b[0] - c[0]) / (b[1] - c[1]);
    x = x1;
    y = m * (x - x2) + y2;
  }
  else if (b[1] == c[1]) {
    m = -(b[0] - a[0]) / (b[1] - a[1]);
    x = x2;
    y = m * (x - x1) + y1;
  }
  else {
    var m1 = -(b[0] - a[0]) / (b[1] - a[1]),
      m2 = -(b[0] - c[0]) / (b[1] - c[1]);
    if (m1 == m2) return line(p, l)[0];
    x = (m1 * x1 - m2 * x2 - y1 + y2) / (m1 - m2);
    y = m1 * (x - x1) + y1;
  }

  var r = dist([x, y], a),
    t = l / r,
    t1 = Math.atan2(a[1] - y, a[0] - x),
    dt = step * t / l,
    d = ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 0 ? -1 : 1;
  //if(p[0][0]==296 && p[1][0]==368) console.log(m1,m2,x1,y1,x2,y2);
  p = [];
  for (var i = 0; i < Math.floor(t / dt); i++) {
    var j = i * d;
    p.push([x + r * Math.cos(t1 + dt * j), y + r * Math.sin(t1 + dt * j)]);
  }
  p.push([x + r * Math.cos(t1 + t * d), y + r * Math.sin(t1 + t * d)]);
  return p;
};

var render_curve = function(p, cs, c1, c2) {
  if (cs === undefined) cs = 72 * 2;
  if (c1 === undefined) c1 = [0, 0, 0];
  if (c2 === undefined) c2 = [1, 1, 1];
  var k = 2.5;
  cs *= 22 / 12;
  var x = [],
    y = [];
  for (var i = 0; i < p.length; i++) {
    x.push(p[i][0] * 2);
    y.push(p[i][1] * 2);
  }
  var minx = min(x),
    miny = min(y),
    maxx = max(x),
    maxy = max(y);
  var w = maxx - minx,
    h = maxy - miny;
  // for(var i = 0; i < y.length; i++){
  //   y[i] -= h;
  // }
  var canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w + cs);
  canvas.height = Math.ceil(h + cs);
  var ctx = canvas.getContext('2d');
  var canvas2 = document.createElement('canvas');
  canvas2.width = Math.ceil(w + cs);
  canvas2.height = Math.ceil(h + cs);
  var ctx2 = canvas2.getContext('2d');
  var a = 0;
  ctx.beginPath();
  ctx2.beginPath();
  ctx.lineCap = ctx2.lineCap = 'round';
  ctx.lineJoin = ctx2.lineJoin = 'round';
  ctx.moveTo(x[0] - minx + cs / 2, y[0] - miny + cs / 2);
  ctx2.moveTo(x[0] - minx + cs / 2, y[0] - miny + cs / 2);
  for (i = 1; i < p.length; i++){
    ctx.lineTo(x[i] - minx + cs / 2, y[i] - miny + cs / 2);
    ctx2.lineTo(x[i] - minx + cs / 2, y[i] - miny + cs / 2);
  }
  i=0;
  while (a < cs / k) {
    ctx.lineWidth = ctx2.lineWidth = cs - a * k;
    if (i == 0) {
      ctx2.strokeStyle = toRGB(c2);
      a += cs / 10 / k;
      ctx2.stroke();
    }
    else {
      var c = a / cs * k / 4 * 255;
      ctx.strokeStyle = toRGB([c1[0] + c, c1[1] + c, c1[2] + c]);
      a += k;
      ctx.stroke();
      ctx2.globalCompositeOperation = 'destination-out';
      ctx2.stroke();
      ctx2.globalCompositeOperation = 'source-over';
    }
    i++;
  }
  ctx2.globalAlpha = .75;
  ctx2.drawImage(canvas,0,0);
  return [canvas2, [minx / 2 - cs / 4, miny / 2 - cs / 4]];
};
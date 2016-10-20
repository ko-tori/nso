var viewwidth, viewheight;
var playtransform = [];
var started = false;
var loading = false;
//var skinname = 'Default';
var skinname = 'trololol';
var skin = {};
var skinopts;
var ignoreSkinColors = false;
var status = 'Loading...';
var beatmap;
var vars = {};
var sound;
// var folder = "430104 u's - MOMENT RING", map = "u's - MOMENT RING (Troll) [A New Dream].osu";
// var folder = "150945 Knife Party - Centipede", map = "Knife Party - Centipede (Sugoi-_-Desu) [This isn't a map, just a simple visualisation].osu";
var folder = "39804 xi - FREEDOM DiVE", map = "xi - FREEDOM DiVE (Nakagawa-Kanon) [FOUR DIMENSIONS].osu";

var sens = 1.2;
var cursorsize = 30;
var dcursorsize = 0;
var cursortrail = [];
var traillen = 10;
var cursorpos;
var cursora = 0;
var mousebtnsenabled = true;

var debug = true;
var sliderloadv2 = false;

var keys = Array(256);
var mousebtns = [false, false];

// input

var hit = function(){
  if(started){
    console.log('Tap!', sound ? sound.pos() : 0);
  }
  
};

// drawing stuff

var drawCursor = function() {
  var ctx = document.getElementById('canvas').getContext('2d');
  ctx.globalCompositeOperation = 'source-over';

  ctx.globalAlpha = 1 / traillen;
  var r = skin.cursortrail.width / skin.cursor.width;
  for (var i = 0; i < cursortrail.length; i++) {
    var pos = cursortrail[i];
    if (pos != undefined) {
      ctx.drawImage(skin.cursortrail, pos[0] - r * cursorsize / 2, pos[1] - r * cursorsize / 2, cursorsize * r, cursorsize * r);
    }
    ctx.globalAlpha += 1 / traillen;
    //ctx.save();
  }
  ctx.globalAlpha = 1;
  if (skinopts && parseInt(skinopts['CursorRotate'], 10)) cursora += .015;
  ctx.save();
  r = cursorsize + ((skinopts && parseInt(skinopts['CursorExpand'], 10)) ? dcursorsize : 0);
  var off = (skinopts && !parseInt(skinopts['CursorCentre'], 10)) ? 0 : r/2;
  ctx.translate(cursorpos[0], cursorpos[1]);
  ctx.rotate(cursora);
  ctx.drawImage(skin.cursor, -off, -off, r, r);
  ctx.restore();
};

var updateKeys = function() {
  if (keys[88] || keys[90] || mousebtns[0] || mousebtns[1]) {
    dcursorsize += cursorsize / 24;
    if (dcursorsize > cursorsize / 3) dcursorsize = cursorsize / 3;
  }
  else if (dcursorsize > 0) {
    dcursorsize -= cursorsize / 24;
  }
};

var loadanim = function() {
  var ctx = document.getElementById('canvas').getContext('2d');
  if (!isNaN(parseFloat((loading)))) {
    if (!debug) {
      loading -= .1;
      ctx.globalAlpha = loading;
    }
    else ctx.globalAlpha = 1;
  }
  else {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, viewwidth, viewheight);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.font = "14px sans-serif";
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.fillText(status, 6, 20);
  //ctx.save();
};

var gameLoop = function() {
  var i1 = vars.i1,
    i2 = vars.i2,
    cur = vars.cur,
    pt = sound.pos(),
    tpts = vars.tpts,
    breaks = vars.breaks,
    sd = vars.sliders,
    objs = vars.objs,
    ct = vars.objs.length,
    ar = vars.ar,
    cs = vars.cs,
    od = vars.od;
  var fadetime = .25;
  var ctx = document.getElementById('canvas').getContext('2d');
  ctx.save(); // save 1
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = "rgb(0,0,0)";
  ctx.fillRect(0, 0, viewwidth, viewheight);
  ctx.translate(playtransform[1], playtransform[2]);
  ctx.scale(playtransform[0], playtransform[0]);
  
  if (pt <= 0) pt = -(vars.leadin + new Date().getTime() - vars.startt) / 1000;
  for (var k = i2; k < ct; k++) {
    var td = objs[k].startTime / 1000 - pt;
    //console.log(k,i1,objs[k].startTime/1000,pt,td);
    if (td > ar) {
      //console.log(td)
      break;
    }
  }
  while (objs[vars.i1].startTime/1000 < pt) vars.i1++; // i1 is on the most recently hit object
  status = vars.sliderheld;//i1;
  for (var n = k - 1; n >= i2; n--) { //draw stuff here
    var obj = objs[n];
    var ot = obj.objectName;
    var col = vars.objc[n][0];
    var offset = obj.startTime / 1000;
    var endTime = obj.endTime / 1000;
    var x = obj.position[0] - cs / 2,
      y = obj.position[1] - cs / 2;
    if (endTime === undefined) endTime = offset;
    //if(offset >= pt) console.log(offset,pt);
    if (endTime + fadetime < pt) vars.i2++; // i2 after the last object that faded
    td = offset - pt;
    if (ot != 'spinner') {
      ctx.save(); // save 2
      var r;
      if (ot == 'slider') {
        if (td > 0) ctx.globalAlpha = 2 - 2 * td / ar;
        else ctx.globalAlpha = Math.max(1 - (pt - endTime) / fadetime, 0);
        ctx.drawImage(sd[n][0], sd[n][1][0], sd[n][1][1], sd[n][0].width / 2, sd[n][0].height / 2);
        r = obj.repeatCount;
        
        for(var p = 1; p < r; p++){
          
        }
        if(td <= 0 && obj.duration / 1000 + td > 0){
          vars.sliderprog = true;
          var prog = - td / obj.duration * 1000; // progress percentage (0-1)
          var curp = prog * r; // current progress (equivalent to distance traveled divided by slider length)
          var dir = 1 - 2 * (Math.floor(curp) % 2); // direction the ball is traveling, 1 for normal, -1 for reverse
          var distance = curp % 1 * obj.pixelLength;
          var j = dir == 1 ? 0 : vars.sliderpoints[n].length - 1;
          var jend = dir == 1 ? vars.sliderpoints[n].length - 1 : 0;
          while(j != jend){
            var p1 = vars.sliderpoints[n][j];
            var p2 = vars.sliderpoints[n][j+dir];
            var dpart = dist(p1, p2);
            if(dpart > distance){
              //without extra interpolation stuff
              //ctx.drawImage(skin['sliderb0'], p1[0] - cs / 2, p1[1] - cs / 2, cs, cs);
              var posx = p1[0] + distance / dpart * (p2[0] - p1[0]), posy = p1[1] + distance / dpart * (p2[1] - p1[1]);
              ctx.drawImage(skin['sliderb0'], posx - cs / 2, posy - cs / 2, cs, cs);
              if(vars.sliderheld){
                ctx.save();
                if(vars.sliderheld < cs * 2) vars.sliderheld = Math.min(cs * 2, vars.sliderheld + cs / 8);
                else if(vars.sliderheld > cs * 2){
                  ctx.globalAlpha = 1 - (vars.sliderheld - cs * 2) / cs / 4;
                  vars.sliderheld = Math.min(cs * 4, vars.sliderheld + cs / 4);
                }
                ctx.drawImage(skin['sliderfollowcircle'], posx - vars.sliderheld / 2, posy - vars.sliderheld / 2, vars.sliderheld, vars.sliderheld);
                ctx.restore();
              }
              break;
            }
            else{
              distance -= dpart;
            }
            j += dir;
          }
        }
        else{
          vars.sliderprog = vars.sliderheld = false;
        }
      }
      r = 0;
      if (td > 0) {
        ctx.globalAlpha = 2 - 2 * td / ar;
        var r_as = cs * (2 * td / ar + 1);
        ctx.drawImage(skin['approachcircle' + col], x + cs / 2 - r_as / 2, y + cs / 2 - r_as / 2, r_as, r_as);
      }
      else {
        ctx.globalAlpha = Math.max(1 + td / fadetime, 0);
        r = -cs / 10 * td / fadetime;
      }
      ctx.drawImage(skin['hitcircle' + col], x - r / 2, y - r / 2, cs + r, cs + r);
      var drawOverlay = function() {
        ctx.drawImage(skin.hitcircleoverlay, x - r / 2, y - r / 2, cs + r, cs + r);
      };
      var drawNumber = function() {
        if (td > 0) {
          var num = skin['default-' + vars.objc[n][1]];
          var newh = num.height/skin['hitcircle'].height*cs*3/4;
          var dh = newh / num.height;
          ctx.drawImage(num, x - num.width * dh / 2 + cs / 2, y - newh / 2 + cs / 2, num.width * dh, newh);
        }
      };
      if (parseInt(skinopts.HitCircleOverlayAboveNumber || skinopts.HitCircleOverlayAboveNumer, 10)) {
        drawNumber();
        drawOverlay();
      }
      else {
        drawOverlay();
        drawNumber();
      }
      ctx.restore(); // restore 2
    }
  }


  ctx.restore(); //restore 1
};

var anim = function() {
  if (started) requestAnimationFrame(anim);
  if (debug) {
    if (!isNaN(parseFloat(loading))) {
      gameLoop();
    }
    loadanim();
  }
  else {
    if (loading && loading > 0) loadanim();
    else gameLoop();
  }
  drawCursor();
  updateKeys();
};

// key and mouse events/updates

var wheelupdate = function(e){
  if(sound) sound.volume(Math.min(1,Math.max(0,sound.volume()+(e.wheelDelta || -e.detail)/2400)));
  console.log(sound.volume());
};

var cursorupdate = function(e) {
  cursorpos[0] += sens * (e.movementX || e.mozMovementX || 0);
  cursorpos[1] += sens * (e.movementY || e.mozMovementY || 0);
  if (cursorpos[0] < 0) cursorpos[0] = 0;
  if (cursorpos[0] > viewwidth) cursorpos[0] = viewwidth;
  if (cursorpos[1] < 0) cursorpos[1] = 0;
  if (cursorpos[1] > viewheight) cursorpos[1] = viewheight;
};

var keydown = function(e) {
  var code = e.keyCode;
  if ((code==90 || code==88) && (!keys[code] && !((code==90 && mousebtns[0]) || (code==88 && mousebtns[1])))){
    dcursorsize = cursorsize / 6;
    hit();
  }
  keys[code] = true;
  if (code == 49) sens -= .1;
  if (code == 50) sens += .1;
};

var keyup = function(e) {
  var code = e.keyCode;
  keys[code] = false;
};

var mousedown = function(e) {
  if(mousebtnsenabled){
    var btn = e.button;
    if ((btn==0 && !keys[90]) || (btn==2 && !keys[88])){
      dcursorsize = cursorsize / 6;
      hit();
    }
    mousebtns[btn/2] = true;
  }
};

var mouseup = function(e) {
  if(mousebtnsenabled){
    var btn = e.button;
    mousebtns[btn/2] = false;
  }
};

// rendering and utils for images

var loadSkin = function(callback) {
  status = "Loading Skin... 0%";
  var numloaded = 0;
  var elements = ['sliderb0', 'sliderfollowcircle', 'sliderstartcircle','sliderstartcircleoverlay','sliderendcircle','sliderendcircleoverlay','sliderscorepoint','cursor', 'cursortrail', 'hitcircle', 'hitcircleoverlay', 'approachcircle', 'default-0', 'default-1', 'default-2', 'default-3', 'default-4', 'default-5', 'default-6', 'default-7', 'default-8', 'default-9','fruit-apple'];
  var loaded = function() {
    numloaded++;
    status = "Loading Skin... " + (85 * numloaded / elements.length).toFixed(2) + "%";
    if (numloaded >= elements.length) {
      $.getJSON('/parseskin/' + skinname, function(result) {
        skinopts = result;
        var numloaded2 = 0;
        var loaded2 = function(){
          numloaded2++;
          status = "Loading Skin... " + (85 + numloaded2 / 2).toFixed(2) + "%";
          if(numloaded2 >= 30){
            status = "Loading Skin...100%";
            callback();
          }
        };
        if(skinopts.HitCirclePrefix && !skin[skinopts.HitCirclePrefix+'-0']){
          for(var i = 0; i < 10; i++){
            skin[skinopts.HitCirclePrefix+'-'+i] = new Image();
            skin[skinopts.HitCirclePrefix+'-'+i].src = 'skin/' + skinname + '/' + skinopts.HitCirclePrefix+'-'+i + '.png';
            skin[skinopts.HitCirclePrefix+'-'+i].onload = function() {
              loaded2();
            };
          }
        }
        else numloaded2 += 10;
        if(skinopts.ScorePrefix && !skin[skinopts.ScorePrefix+'-0']){
          for(var i = 0; i < 10; i++){
            skin[skinopts.ScorePrefix+'-'+i] = new Image();
            skin[skinopts.ScorePrefix+'-'+i].src = 'skin/' + skinname + '/' + skinopts.ScorePrefix+'-'+i + '.png';
            skin[skinopts.ScorePrefix+'-'+i].onload = function() {
              loaded2();
            };
          }
        }
        else numloaded2 += 10;
        if(skinopts.ComboPrefix && !skin[skinopts.ComboPrefix+'-0']){
          for(var i = 0; i < 10; i++){
            skin[skinopts.ComboPrefix+'-'+i] = new Image();
            skin[skinopts.ComboPrefix+'-'+i].src = 'skin/' + skinname + '/' + skinopts.ComboPrefix+'-'+i + '.png';
            skin[skinopts.ComboPrefix+'-'+i].onload = function() {
              loaded2();
            };
          }
        }
        else numloaded2 += 10;
      });
    }
  };
  for (var i = 0; i < elements.length; i++) {
    skin[elements[i]] = new Image();
    skin[elements[i]].src = 'skin/' + skinname + '/' + elements[i] + '.png';
    skin[elements[i]].onload = function() {
      loaded();
    };
    skin[elements[i]].onerror = function() {
      loaded();
    };
  }
};

var renderslidersasync = function(si, delay, callback) {
  vars.sliderpoints = {};
  vars.sliders = {};
  var i = 0;
  var rendernext = function() {
    if(!sliderloadv2 && (i%10 || i == si.length - 1)) status = 'Loading Sliders...' + ((i+1) / si.length * 100).toFixed(2) + '%';
    var obj = beatmap.hitObjects[si[i]];
    var border = skinopts.SliderBorder ? colorToArray(skinopts.SliderBorder) : [255, 255, 255];
    var trackcolor = skinopts.SliderTrackOverride ? colorToArray(skinopts.SliderTrackOverride) : vars.cols[vars.objc[si[i]][0]];
    switch (obj.curveType) {
      case 'pass-through':
        vars.sliderpoints[si[i]] = passthrough(obj.points, obj.pixelLength);
        vars.sliders[si[i]] = render_curve(vars.sliderpoints[si[i]], vars.cs, trackcolor, border);
        break;
      case 'bezier':
        vars.sliderpoints[si[i]] = bezier(obj.points, obj.pixelLength);
        vars.sliders[si[i]] = render_curve(vars.sliderpoints[si[i]], vars.cs, trackcolor, border);
        break;
      case 'linear':
        vars.sliderpoints[si[i]] = line(obj.points, obj.pixelLength)[0];
        vars.sliders[si[i]] = render_curve(vars.sliderpoints[si[i]], vars.cs, trackcolor, border);
        break;
    }
    i++;
    if (i < si.length) setTimeout(rendernext, delay);
    else callback();
  };
  setTimeout(rendernext, delay);
};

var rendersliderssync = function(si) {
  vars.sliderpoints = {};
  vars.sliders = {};
  for (var i = 0; i < si.length; i++) {
    var obj = beatmap.hitObjects[si[i]];
    var border = skinopts.SliderBorder ? colorToArray(skinopts.SliderBorder) : [255, 255, 255];
    var trackcolor = skinopts.SliderTrackOverride ? colorToArray(skinopts.SliderTrackOverride) : vars.cols[vars.objc[si[i]][0]];
    switch (obj.curveType) {
      case 'pass-through':
        vars.sliderpoints[si[i]] = passthrough(obj.points, obj.pixelLength);
        vars.sliders[si[i]] = render_curve(vars.sliderpoints[si[i]], vars.cs, trackcolor, border);
        break;
      case 'bezier':
        vars.sliderpoints[si[i]] = bezier(obj.points, obj.pixelLength);
        vars.sliders[si[i]] = render_curve(vars.sliderpoints[si[i]], vars.cs, trackcolor, border);
        break;
      case 'linear':
        vars.sliderpoints[si[i]] = line(obj.points, obj.pixelLength)[0];
        vars.sliders[si[i]] = render_curve(vars.sliderpoints[si[i]], vars.cs, trackcolor, border);
        break;
    }
  }
};

// control stuff

var gameStart = function() {
  var rip = function() {
    status = "Initializing Elements...";
    vars.ar = ar(parseFloat(beatmap['ApproachRate']));
    vars.od = od(parseFloat(beatmap['OverallDifficulty']));
    vars.cs = cs(parseFloat(beatmap['CircleSize']));
    vars.stackl = parseFloat(beatmap['StackLeniency']);
    vars.leadin = parseFloat(beatmap['AudioLeadIn']);
    vars.sliderx = parseFloat(beatmap['SliderMultiplier']);
    vars.tickrate = parseFloat(beatmap['SliderTickRate']);
    vars.breaks = beatmap['breakTimes'];
    vars.tpts = beatmap['timingPoints'];
    vars.tptn = 0;
    vars.sliderprog = false;
    vars.objs = beatmap['hitObjects'];
    var n = 1;
    if (skinname != 'Default' && skinopts.Combo1 && !ignoreSkinColors) {
      vars.cols = [];
      while (skinopts['Combo' + n]) {
        vars.cols.push(colorToArray(skinopts['Combo' + n]));
        n++;
      }
    }
    else if (beatmap['colors'].length == 0){
      console.log('rip');
      vars.cols = [
        [255, 192, 0],
        [0, 202, 0],
        [18, 124, 255],
        [242, 24, 57]
      ];
    }
    else {
      vars.cols = [];
      for (i = 0; i < beatmap['colors'].length; i++) {
        var temp = [];
        for (var j = 0; j < beatmap['colors'][i].length; j++) {
          temp.push(parseFloat(beatmap['colors'][i][j]));
        }
        vars.cols.push(temp);
      }
    }
    vars.objc = [];
    n = 0, j = 1;
    var maxc = 1, tptn = -1;
    for (i = 0; i < vars.objs.length; i++) {
      if (i == 0 || vars.objs[i].newCombo) {
        if (j > maxc) {
          maxc = j;
        }
        n++;
        j = 1;
      }
      vars.objc.push([n % vars.cols.length, j]);
      j++;
      
      if(vars.objs[i].startTime >= vars.tpts[tptn])
      vars.objs[i].tptn = tptn;
    }
    n = 10;
    while (n <= maxc) {
      var digits = [];
      var n2 = n.toString();
      for (j = 0; j < n2.length; j++) {
        digits.push(skin['default-' + n2.charAt(j)]);
      }
      skin['default-' + n] = concatImages(digits, parseInt(skinopts.HitCircleOverlap || 2,10));
      n++;
    }
    var si = [];
    for (var i = 0; i < vars.objs.length; i++) {
      if (vars.objs[i].objectName == 'slider') si.push(i);
    }
    var tintelements = ['hitcircle', 'approachcircle'];
    for (i = 0; i < tintelements.length; i++) {
      for (j = 0; j < vars.cols.length; j++) {
        skin[tintelements[i] + j] = tint(skin[tintelements[i]], vars.cols[j]);
      }
    }
    vars.i1 = 0;
    vars.i2 = 0;
    vars.cur = 0;
    var done = function() {
      setTimeout(function() {
        vars.startt = new Date().getTime();
        setTimeout(function() {
          sound.play();
        }, vars.leadin);
        loading = 1;
      }, 1000);
    };
    if(sliderloadv2){
      setTimeout(function(){renderslidersasync(si, 100, function(){})}, 0);
      done(); 
    }
    else{
      renderslidersasync(si, 0, done);
    }
  };
  status = "Loading Music...";
  sound = new Howl({
    urls: ["Songs/" + folder + "/" + beatmap.AudioFilename],
    //onload: rip
  });
  rip();
};

var init = function() {
  loading = true;
  loadSkin(function() {
    status = "Loading Beatmap...";
    $.getJSON('/parsemap/' + folder + '/' + map, function(result) {
      beatmap = result;
      status = "Loaded.";
      gameStart();
    });
  });
  var elem = document.getElementById("canvas");
  viewwidth = $(window).width();
  viewheight = $(window).height();
  elem.width = viewwidth;
  elem.height = viewheight;
  var multiplier = Math.min(viewheight / (384 + cs(2.5)), viewwidth / (512 + cs(2.5)));
  playtransform = [multiplier, viewwidth / 2 - 256 * multiplier, viewheight / 2 - 192 * multiplier];
  elem.requestPointerLock();
  anim();
  document.addEventListener("mousewheel", wheelupdate, false);
  document.addEventListener('mousemove', cursorupdate, false);
  document.addEventListener('mousedown', mousedown, false);
  document.addEventListener('mouseup', mouseup, false);
  document.addEventListener('keydown', keydown, false);
  document.addEventListener('keyup', keyup, false);
  setInterval(function() {
    if (cursortrail.push([cursorpos[0], cursorpos[1]]) > traillen) {
      cursortrail.shift();
    }
  }, 17);
};

var start = function(e) {
  var elem = document.getElementById("canvas");
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  }
  else if (elem.msRequestFullscreen) {
    elem.msRequestFullscreen();
  }
  else if (elem.mozRequestFullScreen) {
    elem.mozRequestFullScreen();
  }
  else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen();
  }
  if (started) return;
  started = true;
  elem.requestPointerLock = elem.requestPointerLock || elem.mozRequestPointerLock;
  document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

  var lockChangeAlert = function() {
    if (document.pointerLockElement === elem || document.mozPointerLockElement === elem) {}
    else {
      if (sound) sound.stop();
      started = false;
    }
  };

  if ("onpointerlockchange" in document) {
    document.addEventListener('pointerlockchange', lockChangeAlert, false);
  }
  else if ("onmozpointerlockchange" in document) {
    document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
  }

  cursorpos = [e.clientX, e.clientY];
  //console.log(cursorpos);
  setTimeout(init, 100);
}

$(document).ready(function(){
  var elem = document.getElementById("canvas");
  elem.addEventListener("click", start, false);
  elem.width = $(window).width();
  elem.height = $(window).height();
  var temp = new Image();
  temp.src = 'icon.png';
  var t = 0;
  var pre = function() {
    var ctx = elem.getContext('2d');
    ctx.clearRect(0, 0, elem.width, elem.height);
    var d = 10 * Math.sin(t);
    ctx.drawImage(temp, ($(window).width()-$(window).height())/2 + 5 - d, 5 - d, $(window).height() + 2 * d, $(window).height() + 2 * d);
    if (!started) requestAnimationFrame(pre);
    t += .2;
  };
  temp.onload = pre;
});

var slidertest = function() {
  for (var i in vars.sliders) document.body.appendChild(vars.sliders[i][0]);
};
var skintest = function() {
  for (var i in skin) document.body.appendChild(skin[i]);
};
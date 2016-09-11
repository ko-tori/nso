$("#menubar>div").mouseover(function() {
  var a = $(this).offset();
  a.top += 18;
  $(this).find(".dropdown").offset(a);
});

var zipfile, beatmap, diffs, timelinemarks = {};
var audioCtx = new AudioContext(),
  source,
  loopsource = false;
var lastnews, connected = false;
var laststatus = 'Loading...',
  status = 'Loading...',
  loading = true,
  skinname = 'Default',
  skinopts, skin = {},
  ignoreSkinColors = false;
var vars = {
  beatsnapdivisor: 4,
  distancesnap: 1,
  gridlevel: 4,
  gridsnap: true
};

var loadSkin = function(callback) {
  status = "Loading Skin... 0%";
  var numloaded = 0;
  var elements = ['sliderb0', 'sliderfollowcircle', 'sliderstartcircle', 'sliderstartcircleoverlay', 'sliderendcircle', 'sliderendcircleoverlay', 'sliderscorepoint', 'cursor', 'cursortrail', 'hitcircle', 'hitcircleoverlay', 'approachcircle', 'default-0', 'default-1', 'default-2', 'default-3', 'default-4', 'default-5', 'default-6', 'default-7', 'default-8', 'default-9'];
  var loaded = function() {
    numloaded++;
    status = "Loading Skin... " + (85 * numloaded / elements.length).toFixed(2) + "%";
    if (numloaded >= elements.length) {
      $.getJSON('/parseskin/' + skinname, function(result) {
        skinopts = result;
        var numloaded2 = 0;
        var loaded2 = function() {
          numloaded2++;
          status = "Loading Skin... " + (85 + numloaded2 / 2).toFixed(2) + "%";
          if (numloaded2 >= 30) {
            status = "Loading Skin...100%";
            callback();
          }
        };
        if (skinopts.HitCirclePrefix && !skin[skinopts.HitCirclePrefix + '-0']) {
          for (var i = 0; i < 10; i++) {
            skin[skinopts.HitCirclePrefix + '-' + i] = new Image();
            skin[skinopts.HitCirclePrefix + '-' + i].src = 'skin/' + skinname + '/' + skinopts.HitCirclePrefix + '-' + i + '.png';
            skin[skinopts.HitCirclePrefix + '-' + i].onload = function() {
              loaded2();
            };
          }
        }
        else numloaded2 += 10;
        if (skinopts.ScorePrefix && !skin[skinopts.ScorePrefix + '-0']) {
          for (var i = 0; i < 10; i++) {
            skin[skinopts.ScorePrefix + '-' + i] = new Image();
            skin[skinopts.ScorePrefix + '-' + i].src = 'skin/' + skinname + '/' + skinopts.ScorePrefix + '-' + i + '.png';
            skin[skinopts.ScorePrefix + '-' + i].onload = function() {
              loaded2();
            };
          }
        }
        else numloaded2 += 10;
        if (skinopts.ComboPrefix && !skin[skinopts.ComboPrefix + '-0']) {
          for (var i = 0; i < 10; i++) {
            skin[skinopts.ComboPrefix + '-' + i] = new Image();
            skin[skinopts.ComboPrefix + '-' + i].src = 'skin/' + skinname + '/' + skinopts.ComboPrefix + '-' + i + '.png';
            skin[skinopts.ComboPrefix + '-' + i].onload = function() {
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
  var cs = cspx(parseFloat(beatmap['CircleSize']));
  var rendernext = function() {
    var obj = beatmap.hitObjects[si[i]];
    var border = skinopts.SliderBorder ? colorToArray(skinopts.SliderBorder) : [255, 255, 255];
    var trackcolor = skinopts.SliderTrackOverride ? colorToArray(skinopts.SliderTrackOverride) : vars.cols[vars.objc[si[i]][0]];
    switch (obj.curveType) {
      case 'pass-through':
        vars.sliderpoints[si[i]] = passthrough(obj.points, obj.pixelLength);
        vars.sliders[si[i]] = render_curve(vars.sliderpoints[si[i]], cs, trackcolor, border);
        break;
      case 'bezier':
        vars.sliderpoints[si[i]] = bezier(obj.points, obj.pixelLength);
        vars.sliders[si[i]] = render_curve(vars.sliderpoints[si[i]], cs, trackcolor, border);
        break;
      case 'linear':
        vars.sliderpoints[si[i]] = line(obj.points, obj.pixelLength)[0];
        vars.sliders[si[i]] = render_curve(vars.sliderpoints[si[i]], cs, trackcolor, border);
        break;
    }
    i++;
    if (i < si.length) setTimeout(rendernext, delay);
    else callback();
  };
  setTimeout(rendernext, delay);
};

var createTimelineMark = function(time, type) {
  if (source) {
    var mark = document.createElement('div');
    mark.classList.add('timelinemark', type);
    var track = $('#timelinetrack');
    $(mark).css({
      left: track.position().left + track.width() * (time / source.getDuration())
    });
    $('#timeline1c').append(mark);
    if (!timelinemarks[time])
      timelinemarks[time] = {};
    timelinemarks[time][type] = mark;
  }
};

var removeTimelineMark = function(time, type) {
  if (timelinemarks[time] && timelinemarks[time][type]) {
    timelinemarks[time][type].parentNode.removeChild(timelinemarks[time][type]);
  }
};

function createSound(buffer, context, loop) {
  var sourceNode = null,
    startedAt = 0,
    pausedAt = 0,
    playing = false,
    gain;

  var play = function(offset, loop, delay) {
    if (sourceNode) sourceNode.stop();
    sourceNode = context.createBufferSource();
    var prevgainvalue = source.volume() || .5;
    gain = audioCtx.createGain();
    gain.gain.value = prevgainvalue;
    sourceNode.connect(gain);
    gain.connect(context.destination);
    sourceNode.loop = loop || false;
    sourceNode.buffer = buffer;
    if (pausedAt > buffer.duration * .995) offset = 0;
    else offset = offset || pausedAt;
    startedAt = context.currentTime - offset;
    sourceNode.start(delay || 0, offset);
    pausedAt = false;
    playing = true;
  };

  var volume = function(x) {
    if (x) gain.gain.value = x;
    else return gain ? gain.gain.value : undefined;
  };

  var pause = function(position) {
    var elapsed = context.currentTime - startedAt;
    stop();
    pausedAt = position || elapsed;
  };

  var stop = function() {
    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode.stop(0);
      sourceNode = null;
    }
    pausedAt = 0;
    startedAt = 0;
    playing = false;
  };

  var getPlaying = function() {
    return playing;
  };

  var getCurrentTime = function() {
    if (pausedAt !== false) {
      return pausedAt;
    }
    if (startedAt) {
      return (context.currentTime - startedAt);
    }
    return 0;
  };

  var getDuration = function() {
    return buffer.duration;
  };

  var getInfo = function(){
    return [pausedAt, startedAt];
  };

  return {
    getCurrentTime: getCurrentTime,
    getDuration: getDuration,
    getPlaying: getPlaying,
    play: play,
    pause: pause,
    stop: stop,
    gain: gain,
    volume: volume,
    getInfo: getInfo
  };
}

var init = function(callback) {
  var breaks = beatmap['breakTimes'],
    tptn = 0;
  var n = 1;
  if (skinname != 'Default' && skinopts.Combo1 && !ignoreSkinColors) {
    vars.cols = [];
    while (skinopts['Combo' + n]) {
      vars.cols.push(colorToArray(skinopts['Combo' + n]));
      n++;
    }
  }
  else if (beatmap['colors'].length == 0) {
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
  var maxc = 1,
    tptn = -1;
  for (i = 0; i < beatmap['hitObjects'].length; i++) {
    if (i == 0 || beatmap['hitObjects'][i].newCombo) {
      if (j > maxc) {
        maxc = j;
      }
      n++;
      j = 1;
    }
    vars.objc.push([n % vars.cols.length, j]);
    j++;

    if (beatmap['hitObjects'][i].startTime >= beatmap['timingPoints'][tptn])
      beatmap['hitObjects'][i].tptn = tptn;
  }
  n = 10;
  while (n <= maxc) {
    var digits = [];
    var n2 = n.toString();
    for (j = 0; j < n2.length; j++) {
      digits.push(skin['default-' + n2.charAt(j)]);
    }
    skin['default-' + n] = concatImages(digits, parseInt(skinopts.HitCircleOverlap || 2, 10));
    n++;
  }
  var si = [];
  vars.maxsliderdur = 0;
  for (var i = 0; i < beatmap['hitObjects'].length; i++) {
    if (beatmap['hitObjects'][i].objectName == 'slider') {
      if (beatmap['hitObjects'][i].duration / 1000 > vars.maxsliderdur) vars.maxsliderdur = beatmap['hitObjects'][i].duration / 1000;
      si.push(i);
    }
  }
  var tintelements = ['hitcircle', 'approachcircle', 'sliderb0'];
  for (i = 0; i < tintelements.length; i++) {
    for (j = 0; j < vars.cols.length; j++) {
      if(tintelements[i] == 'sliderb0'){
        skin[tintelements[i] + j] = tint(skin[tintelements[i]], '#000000');
      }
      else
        skin[tintelements[i] + j] = tint(skin[tintelements[i]], vars.cols[j]);
    }
  }
  $('#timeline1c .timelinemark').remove();
  timelinemarks = {};
  if (beatmap.Bookmarks) {
    var pts = beatmap.Bookmarks.split(',');
    for (var i in pts) {
      if (pts.hasOwnProperty(i)) {
        createTimelineMark(pts[i] / 1000, 'bookmark');
      }
    }
  }
  if (beatmap.PreviewTime) createTimelineMark(beatmap.PreviewTime / 1000, 'previewtime');
  if (beatmap.timingPoints) {
    pts = beatmap.timingPoints;
    for (i = 0; i < pts.length; i++) {
      if (pts[i].timingChange)
        createTimelineMark(pts[i].offset / 1000, 'uninheritedpoint');
      else
        createTimelineMark(pts[i].offset / 1000, 'inheritedpoint');
    }
  }
  //setTimeout(function(){renderslidersasync(si, 10, function(){console.log('sliders done')})}, 0); //async
  renderslidersasync(si, 0, callback); //async
};

var getIndexAt = function(t) {
  for (var i = 0; i < beatmap['hitObjects'].length; i++) {
    var obj = beatmap['hitObjects'][i];
    if (obj.objectName == 'slider' || obj.objectName == 'spinner') {
      if (t < obj.endTime / 1000) {
        return i;
      }
    }
    else {
      if (t <= obj.startTime / 1000) {
        return i;
      }
    }
  }
  return i - 1;
}; //gets the index of the next or current object at time t

var getTimingPointAt = function(t) {
  for (var i = 0; i < beatmap['timingPoints'].length; i++) {
    var tpt = beatmap['timingPoints'][i];
    if (tpt.offset/1000 > t) return beatmap['timingPoints'][Math.max(i - 1, 0)];
  }
  return beatmap['timingPoints'][Math.max(i - 1, 0)];
}; //returns timing point at t

var coords = function(x, y) {

}; //osupixels to canvas coords

var coords2 = function(x, y) {

}; //viewport to osupixels

var anim = function() {
  window.requestAnimationFrame(anim);
  var t = source !== undefined ? source.getCurrentTime() : 0;
  var pct = t / (source !== undefined ? source.getDuration() : Infinity);
  var rounded = (pct * 100).toFixed(1);
  $('#time').html(new Date(t * 1000).toISOString().substr(14, 9).replace('.', ':'));
  $('#progress').html((rounded > 100 ? 'outro' : rounded) + '%');
  var track = $('#timelinetrack');
  //$('#timelinebar').css({left:track.position().left + track.width()*pct});
  $('#timelinebar').css({
    left: track.position().left + track.width() * pct
  });
  if (pct > .9995) {
    source.pause(source.getDuration() - .0001);
    if (loopsource)
      source.play(0);
  }
  var height = $(window).height() * .75;
  var width = height * 4 / 3;
  function r(n){
    var d = vars.gridsnap ? vars.gridlevel : 1;
    return Math.round(n/d)*d;
  };
  var mx = r((mousex - $('#grid').offset().left) / width * 512),
    my = r((mousey - $('#grid').offset().top) / height * 384);
  $('#mousepos').html('x:'+ mx + ' y:' + my);
  //console.log(mousex,mousey);
  if (vars.sliders && beatmap && beatmap['hitObjects']) {
    var canvas = document.getElementById('gridcanvas');
    var ctx = canvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, $(window).width(), $(window).height());
    
    ctx.translate(($(window).width() - width) / 2, $(window).height() * .16);
    ctx.scale(width / 512, height / 384);

    var ar = ars(parseFloat(beatmap['ApproachRate']));
    var od = ods(parseFloat(beatmap['OverallDifficulty']));
    var cs = cspx(parseFloat(beatmap['CircleSize']));
    var stackl = parseFloat(beatmap['StackLeniency']);
    var sliderx = parseFloat(beatmap['SliderMultiplier']);
    var tickrate = parseFloat(beatmap['SliderTickRate']);
    var objs = beatmap['hitObjects'];
    var sd = vars.sliders;
    var fadetime = .25,
      fadetime2 = .8;
    var renderFrom = getIndexAt(t - fadetime2 - vars.maxsliderdur);
    var renderTo = getIndexAt(t + ar);

    for(var i = renderTo; i >= renderFrom; i--){
      if(!vars.objc[i]) continue;
      var obj = objs[i];
      var ot = obj.objectName;
      var col = vars.objc[i][0];
      var offset = obj.startTime / 1000;
      var endTime = obj.endTime / 1000;
      var x = obj.position[0] - cs / 2,
        y = obj.position[1] - cs / 2;
      var td = offset - t;
      
      if (endTime === undefined) endTime = offset;
      if (td > ar)
        continue;
      else if (ot != 'spinner') {
        ctx.save(); // save 2
        var r;
        if (ot == 'slider' && sd[i]) {
          if (td > 0) ctx.globalAlpha = 2 - 2 * td / ar;
          else ctx.globalAlpha = Math.max(1 - (t - endTime) / fadetime, 0);
          ctx.drawImage(sd[i][0], sd[i][1][0], sd[i][1][1], sd[i][0].width / 2, sd[i][0].height / 2);
          r = obj.repeatCount;
          
          for(var p = 1; p < r; p++){
            
          }
          if(td <= 0 && obj.duration / 1000 + td > -.2){
            var prog = - td / obj.duration * 1000; // progress percentage (0-1)
            var curp = prog * r; // current progress (equivalent to distance traveled divided by slider length)
            var dir = 1 - 2 * (Math.floor(curp) % 2); // direction the ball is traveling, 1 for normal, -1 for reverse
            var distance = curp % 1 * obj.pixelLength;
            var j = dir == 1 ? 0 : vars.sliderpoints[i].length - 1;
            var jend = dir == 1 ? vars.sliderpoints[i].length - 1 : 0;
            while(j != jend){
              var p1 = vars.sliderpoints[i][j];
              var p2 = vars.sliderpoints[i][j+dir];
              var dpart = dist(p1, p2);
              if(dpart > distance){
                //without extra interpolation stuff
                //ctx.drawImage(skin['sliderb0'], p1[0] - cs / 2, p1[1] - cs / 2, cs, cs);
                if(obj.duration / 1000 + td > 0){
                  var posx = p1[0] + distance / dpart * (p2[0] - p1[0]), posy = p1[1] + distance / dpart * (p2[1] - p1[1]);
                  var cs2 = cs * 11 / 12;
                  ctx.save();
                  ctx.translate(posx, posy);
                  ctx.rotate(Math.atan2(p2[1]-p1[1],p2[0]-p1[0]) + (skinopts.SliderBallFlip==0 && dir==-1 ? Math.PI : 0));
                  ctx.drawImage(skin['sliderb0' + col], - cs2 / 2, - cs2 / 2, cs2, cs2);
                  ctx.restore();
                }
                else{
                  var temp = r%2 ? vars.sliderpoints[i].length - 1 : 0;
                  var posx = vars.sliderpoints[i][temp][0], posy = vars.sliderpoints[i][temp][1];
                }
                ctx.save();
                var r_fs = td > -.1 ? cs*(1-td*10) : (td < -obj.duration / 1000 ? 2*cs+(td + obj.duration / 1000) * 5 * .5 * cs : 2*cs);
                ctx.drawImage(skin['sliderfollowcircle'], posx - r_fs / 2, posy - r_fs / 2, r_fs, r_fs);
                ctx.restore();
                break;
              }
              else{
                distance -= dpart;
              }
              j += dir;
            }
          }
        }
        if (td > 0) {
          ctx.globalAlpha = 2 - 2 * td / ar;
          var r_as = cs * (2 * td / ar + 1);
          //console.log(skin['approachcircle' + col],skin['hitcircle' + col]);
          ctx.drawImage(skin['approachcircle' + col], x + cs / 2 - r_as / 2, y + cs / 2 - r_as / 2, r_as, r_as);
          ctx.drawImage(skin['hitcircle' + col], x, y, cs, cs);
        }
        else {
          ctx.globalAlpha = Math.max(1 + td / fadetime2, 0);
          var r_as = cs * Math.min(-td / ar + 1, 13/12);
          ctx.drawImage(skin['approachcircle' + col], x + cs / 2 - r_as / 2, y + cs / 2 - r_as / 2, r_as, r_as);
          ctx.drawImage(skin['hitcircle'], x, y, cs, cs);
        }
        
        var drawOverlay = function() {
          ctx.drawImage(skin.hitcircleoverlay, x, y, cs, cs);
        };
        var drawNumber = function() {
          if (td > 0) {
            var num = skin['default-' + vars.objc[i][1]];
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
    ctx.restore();
  }
};

var aligngrid = function() {
  var height = $(window).height() * .75;
  var width = height * 4 / 3;
  document.getElementById('gridcanvas').setAttribute('width', $(document).width());
  document.getElementById('gridcanvas').setAttribute('height', $(document).height());
  var img = $('#grid');
  img.css('left', ($(window).width() - width) / 2);
  img.css('top', $(window).height() * .16);
  img.css('width', width);
  img.css('height', height);
};

loadSkin(function() {
  window.requestAnimationFrame(anim);
  aligngrid();
  $('#grid').removeClass('gridtemp');
  var socket = io.connect('/');

  socket.on('news', function(data) {
    lastnews = data;
    console.log('%cServer:  ' + data.status, 'color:' + (data.color || '#000'));
  });

  socket.on('diffs', function(data) {
    diffs = data;
  });

  socket.on('disconnect', function() {
    console.log('disconnected');
    connected = false;
  });

  socket.on('connect', function() {
    $('#cover').fadeOut();
    $('#loading').fadeOut();
    loading = false;
    connected = true;
    var delivery = new Delivery(socket);
    delivery.on('delivery.connect', function(delivery) {
      $("#oszupload").click(function() {
        if (source) source.pause();
        $("#cover").fadeIn();
        $("#fileuploadpanel").slideDown();
      });
      $("#cover").click(function() {
        if(!loading){
          $("#cover").fadeOut();
          $("#fileuploadpanel").slideUp();
        }
      });

      function upload(file) {
        var extraParams = {};
        var newzip = JSZip();
        newzip.loadAsync(file).then(function(zip) {
          zipfile = zip;

          delivery.send(file, extraParams);

          function temp(data) {
            if (data.error) {
              console.log('%cServer:  ' + data.error, 'color: #F00');
            }
            else {
              beatmap = data;
              if (beatmap.bgFilename && zip.file(beatmap.bgFilename)) {
                zip.file(beatmap.bgFilename).async('base64').then(function(content) {
                  var $old = $('#backgrounds .bg')
                  var $new = $old.clone();
                  $new.css('background', 'url(data:image/jpeg;base64,' + content + ') no-repeat center center fixed')
                    .css('background-size', 'cover')
                    .css('display', 'none')
                    .appendTo('#backgrounds');
                  $new.fadeIn(1000);
                  $old.fadeOut(1000, function() {
                    $(this).remove();
                  });
                });
              }
              else {
                $('#backgrounds .bg').css('background', '')
                  .css('background-size', '');
                console.log('%cThis map has no background!', 'color: #F00');
              }
              if (beatmap.AudioFilename && zip.file(beatmap.AudioFilename)) {
                zip.file(beatmap.AudioFilename).async('arraybuffer').then(function(content) {
                  audioCtx.decodeAudioData(content).then(function(buffer) {
                    if (source) source.stop();
                    source = createSound(buffer, audioCtx);
                    init(function() {
                      loading = false;
                      $('#loading').fadeOut();
                      $("#cover").fadeOut();
                      source.play();
                    });
                  });
                });
              }
              else {
                console.log('%cThis map has no audio!', 'color: #F00');
                source = undefined;
                loading = false;
                $('#loading').fadeOut();
                $("#cover").fadeOut();
              }
            }
            socket.removeListener('osu', temp);
          }
          loading = true;
          $('#loading').fadeIn();
          socket.on('osu', temp);
        }, function(e) {
          console.log("Error reading zip file.");
        });
        $("#fileuploadpanel").slideUp();
      }
      $("#fileuploadsubmit").click(function(e) {
        e.preventDefault();
        upload($("#fileupload")[0].files[0])
      });
      $("#dragarea").on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
          e.preventDefault();
          e.stopPropagation();
        })
        .on('dragover dragenter', function() {
          $(this).addClass('is-dragover');
        })
        .on('dragleave dragend drop', function() {
          $(this).removeClass('is-dragover');
        })
        .on('drop', function(e) {
          upload(e.originalEvent.dataTransfer.files[0]);
        });
    });
    delivery.on('send.success', function(fileUID) {
      console.log("File was successfully sent");
    });
  });
});

var mousex = 0,
  mousey = 0;

var timelinemove = function(e) {
  if (!source) return
  var track = $('#timelinetrack');
  var w = track.width();
  var pct = Math.max(0, Math.min(mousex - track.position().left, w)) / w;
  var pos = pct * source.getDuration();
  if (pct > .9995) source.pause(source.getDuration() - .01);
  else if (source.getPlaying())
    source.play(pos);
  else
    source.pause(pos);
};

var mousedown = false;
$('#timeline1c').mousedown(function(e) {
  mousedown = true;
  timelinemove(e);
  $(document).mousemove(function(e) {
    if (mousedown)
      timelinemove(e);
    $(document).mouseup(function() {
      mousedown = false;
    });
  });
});

var controlclicked = function(elem) {
  elem.removeClass("scalable");
  setTimeout(function() {
    elem.addClass("scalable")
  }, 40);
};

$('#mp3dl').click(function() {
  if (zipfile && beatmap && beatmap.AudioFilename) {
    zipfile.file(beatmap.AudioFilename).async('base64').then(function(content) {
      fetch('data:audio/mp3;base64,' + content)
        .then(res => res.blob()).then(blob => {
          var link = document.createElement("a");
          link.download = beatmap.AudioFilename;
          link.href = URL.createObjectURL(blob);
          link.click();
        })

    });
  }
  else {
    console.log('wtf ru doing');
  }
});

$('#bgdl').click(function() {
  if (beatmap && beatmap.bgFilename) {
    zipfile.file(beatmap.bgFilename).async('base64').then(function(content) {
      var link = document.createElement("a");
      link.download = beatmap.bgFilename;
      link.href = 'data:image/jpeg;base64,' + content;
      link.click();
    });
  }
  else {
    console.log('wtf ru doing');
  }
});

$('#editorplay').click(function() {
  if (source) {
    if (source.getPlaying()) source.play(0);
    else source.play();
  }
  controlclicked($(this));
});

$('#editorpause').click(function() {
  if (source) {
    if (source.getPlaying()) source.pause();
    else source.play();
  }
  controlclicked($(this));
});

$('#editorstop').click(function() {
  if (source)
    source.stop();
  controlclicked($(this));
});

var keypresshandler = function(e) {
  e.preventDefault();
  var code = e.keyCode;
  if (code == 32 && source) {
    if (source.getPlaying()) source.pause();
    else source.play();
  }
};

document.addEventListener('keypress', keypresshandler, false);

var wheelupdate = function(e) {
  var t = $('#grid');
  if (e.altKey && source && !(mousex >= t.offset().left && mousex <= t.offset().left + t.width() && mousey >= t.offset().top && mousey <= t.offset().top + t.height()))
    source.volume(Math.min(2, Math.max(0, source.volume() + (e.wheelDelta || -e.detail) / 2400)));
  else if (e.ctrlKey) {

  }
  else if (source && beatmap) {
    var tpt = getTimingPointAt(source.getCurrentTime());
    var pos = Math.min(source.getDuration(),
      Math.max(0, source.getCurrentTime() - ((e.wheelDelta || -e.detail) / 120 
      * tpt.beatLength / 1000
      / vars.beatsnapdivisor
      * (source.getPlaying() ? 2 : 1)
      * (e.shiftKey ? tpt.timingSignature : 1))));
    if (pos > .9995 * source.getDuration()) source.pause(source.getDuration() - .1);
    else if (source.getPlaying())
      source.play(pos);
    else
      source.pause(pos);
  }
};

var captureMouseLocation = function(e) {
  mousex = e.pageX;
  mousey = e.pageY;
};

$(window).on('resize', function() {
  aligngrid();
  if (source) {
    var track = $('#timelinetrack');
    for (var time in timelinemarks) {
      if (timelinemarks.hasOwnProperty(time)) {
        for (var point in timelinemarks[time]) {
          if (timelinemarks[time].hasOwnProperty(point)) {
            $(timelinemarks[time][point]).css({
              left: track.position().left + track.width() * (time / source.getDuration())
            });
          }
        }
      }
    }
  }
});

document.addEventListener("mousemove", captureMouseLocation, false);
document.addEventListener("mousewheel", wheelupdate, {
  passive: true
});
document.addEventListener("contextmenu", function(e) {
  e.preventDefault();
  console.log('rightclick! :o');
});
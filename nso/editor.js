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
  skinname = 'Default',
  skinopts, skin = {};
var vars = {};

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
  var rendernext = function() {
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
    pausedAt = 0;
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
    if (pausedAt % buffer.duration) {
      return pausedAt;
    }
    if (startedAt) {
      return (context.currentTime - startedAt) % buffer.duration;
    }
    return 0;
  };

  var getDuration = function() {
    return buffer.duration;
  };

  return {
    getCurrentTime: getCurrentTime,
    getDuration: getDuration,
    getPlaying: getPlaying,
    play: play,
    pause: pause,
    stop: stop,
    gain: gain,
    volume: volume
  };
}

var init = function(callback) {
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

    if (vars.objs[i].startTime >= vars.tpts[tptn])
      vars.objs[i].tptn = tptn;
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
  for (var i = 0; i < vars.objs.length; i++) {
    if (vars.objs[i].objectName == 'slider') si.push(i);
  }
  var tintelements = ['hitcircle', 'approachcircle'];
  for (i = 0; i < tintelements.length; i++) {
    for (j = 0; j < vars.cols.length; j++) {
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
  var ctx = document.getElementById('gridcanvas').getContext('2d');

  //var renderFrom = t - 
};

loadSkin(function() {
  window.requestAnimationFrame(anim);
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
    connected = true;
    var delivery = new Delivery(socket);
    delivery.on('delivery.connect', function(delivery) {
      $("#oszupload").click(function() {
        if (source) source.pause();
        $("#cover").fadeIn();
        $("#fileuploadpanel").slideDown();
      });
      $("#cover").click(function() {
        $("#cover").fadeOut();
        $("#fileuploadpanel").slideUp();
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
              if (beatmap.bgFilename) {
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
              if (beatmap.AudioFilename) {
                zip.file(beatmap.AudioFilename).async('arraybuffer').then(function(content) {
                  audioCtx.decodeAudioData(content).then(function(buffer) {
                    if (source) source.stop();
                    source = createSound(buffer, audioCtx);
                    init(function() {
                      $('#loading').fadeOut();
                      $("#cover").fadeOut();
                      source.play();
                    });
                  });
                });
              }
              else {
                console.log('%cThis map has no audio!', 'color: #F00');
              }
            }
            socket.removeListener('osu', temp);
          }
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
  if (code == 32) {
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
  else if (source) {
    var pos = Math.min(source.getDuration(), Math.max(0, source.getCurrentTime() - (e.wheelDelta || -e.detail) / 100 * (e.shiftKey ? 3 : 1)));
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
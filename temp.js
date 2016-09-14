var audioCtx,source;

var createSound = function(buffer, context, loop) {
  var sourceNode = null,
    startedat = 0, // beginning of audio in terms of the AudioContext when play() was last called
    playing = false, // boolean
    pausedat, // undefined if not paused, otherwise the offset at which it was paused
    gain;

  var play = function(offset, delay) {
    delay = delay || 0;
    if (sourceNode) sourceNode.stop();
    sourceNode = context.createBufferSource();
    var prevgainvalue = source.volume() || .5;
    gain = audioCtx.createGain();
    gain.gain.value = prevgainvalue;
    sourceNode.connect(gain);
    gain.connect(context.destination);
    sourceNode.buffer = buffer;
    if(!offset){
      if(!playing && pausedat !== undefined)
        offset = pausedat;
      else
        offset = 0;
    }
    pausedat = undefined;
    if(offset >= buffer.duration) offset = 0;
    sourceNode.start(delay, offset);
    startedat = context.currentTime - offset + delay;
    playing = true;
  };
  
  var pause = function(offset){
    pausedat = offset;
  };
  
  var stop = function() {
    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode.stop(0);
      sourceNode = null;
    }
    pausedat = 0;
    playing = false;
  };
  
  var getPlaying = function() {
    return playing;
  };
  
  var getCurrentTime = function(){
    if(pausedat !== undefined){
      return pausedat;
    }
    else return context.currentTime - startedat;
  }
  
  var getDuration = function() {
    return buffer.duration;
  };
  
  var volume = function(x) {
    if (x) gain.gain.value = x;
    else return gain ? gain.gain.value : undefined;
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
  };
};
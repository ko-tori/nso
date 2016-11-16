var Editor = Editor || {};

class Player {
	constructor(buffer, context, volume) {
		this.buffer = buffer;
		this.context = context;
		this.sourceNode = null;
		this.startedAt = 0;
		this.pausedAt;
		this.playing = false;
		this.gain;
		this._volume = volume || .5;
	}

	play(offset, delay) {
		delay = delay || 0;
		if (this.sourceNode) this.sourceNode.stop();
		this.sourceNode = this.context.createBufferSource();
		this.gain = this.context.createGain();
		this.gain.gain.value = this.volume;
		this.sourceNode.connect(this.gain);
		this.gain.connect(this.context.destination);
		this.sourceNode.buffer = this.buffer;
		if (!offset) {
			if (!this.playing && typeof this.pausedAt !== "undefined")
				offset = this.pausedAt;
			else
				offset = 0;
		}
		this.pausedAt = undefined;
		if (offset >= this.buffer.duration) offset = 0;
		this.sourceNode.start(delay, offset);
		this.startedAt = this.context.currentTime - offset + delay;
		this.playing = true;
	};

	pause(offset) {
		this.pausedAt = offset !== undefined ? offset : this.t;
		this.stop();
	};

	stop() {
		if (this.sourceNode) {
			this.sourceNode.disconnect();
			this.sourceNode.stop(0);
			this.sourceNode = null;
		}
		this.playing = false;
	};

	get t() {
		if (this.pausedAt !== undefined)
			return this.pausedAt;
		else {
			if (this.playing)
				return this.context.currentTime - this.startedAt;
			return 0;
		}
	}

	get duration() {
		return this.buffer.duration;
	}

	get volume() {
		return this._volume;
	}

	set volume(x) {
		this._volume = x;
		if(this.gain) this.gain.gain.value = x;
	}
}

window.Player = Editor.Player = Player;
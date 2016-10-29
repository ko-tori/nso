var Editor = Editor || {};

class TimingPoint {
	constructor(line) {
		var parts = line.split(",");

		this.offset = parseInt(parts[0]);
		this.velocity = 1;
		this.beatLength = parseInt(parts[1]);
		this.timingSignature = parseInt(parts[2]);
		this.sampleSetId = parseInt(parts[3]);
		this.customSampleIndex = parseInt(parts[4]);
		this.sampleVolume = parseInt(parts[5]);
		this.timingChange = (parts[6] == 1);
		this.kiaiTimeActive = (parts[7] == 1);

		if (!isNaN(this.beatLength) && this.beatLength !== 0) {
			if (this.beatLength > 0) {
				this.bpm = Math.round(60000 / this.beatLength);
			} else {
				this.velocity = Math.abs(100 / this.beatLength);
			}
		}
	}
}

if (typeof module !== "undefined") {
	module.exports = TimingPoint;
} else {
	window.TimingPoint = Editor.TimingPoint = TimingPoint;
}
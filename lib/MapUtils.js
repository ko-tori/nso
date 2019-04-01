var Editor = Editor || {};

class MapUtils {
	static moveObject(obj, dx, dy) {
		if (obj instanceof Slider) {
			for (var j = 1; j < obj.points.length; j++) {
				obj.points[j].x += dx;
				obj.points[j].y += dy;
			}
			if (obj.cache && obj.cache.render) {
				obj.cache.render[1][0] += dx;
				obj.cache.render[1][1] += dy;
			}
			obj.calculate();
		}
		obj.position.x += dx;
		obj.position.y += dy;
	}

	static endTime(obj) {
		if (obj.endTime)
			return obj.endTime;
		else
			return obj.startTime;
	}

	constructor(beatmap) {
		if (beatmap)
			this.beatmap = beatmap;
		else
			this.beatmap = Editor.beatmap;
		this.HitObjectIdsByEnd = [];
		let temp = this.beatmap.HitObjects.concat().sort((a, b) => MapUtils.endTime(a) - MapUtils.endTime(b));
		for (let i = 0; i < temp.length; i++) {
			this.HitObjectIdsByEnd.push({
				endTime: MapUtils.endTime(temp[i]),
				index: i
			});
		}
	}

	timelineRenderRange() {
		let ret = [];
		let startOffset = (Editor.source.t - 3 / Editor.options.timelinezoom - 1) * 1000;
		let start = 0;
		for (var i = this.HitObjectIdsByEnd.length - 2; i > 0; i--) {
			var temp = this.HitObjectIdsByEnd[i];
			if (temp.endTime < startOffset) {
				start = temp.index + 1;
				break;
			}
		}

		let end = Editor.beatmap.getIndexAt((Editor.source.t + 3 / Editor.options.timelinezoom + 1) * 1000);

		return [start, end];
	}
}

if (typeof module !== "undefined") {
	module.exports = MapUtils;
} else {
	Editor.MapUtils = MapUtils;
}

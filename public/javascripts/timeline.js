(function () {

var settings = {
	STY_POINT: {
		fill: '#aaa',
		stroke: '#aaa'
	},
	STY_TIMELINE: {
		fill: '#e3e3e3',
		stroke: '#e3e3e3'
	},
	STY_TEXT_LEFT: {
		'text-anchor': 'start'
	},
	TIMELINE_PADDING: 20
};

var Timeline = (function () {
	function getTimestamp(dateString) {
		var t = dateString.split(/-/g);
		var d = new Date(t[0], t[1], t[2]);
		return d.getTime();
	}

	function toTs(event) {
		return getTimestamp(event.date);
	}

	var Timeline = {
		init: function (canvasId, width, height) {
			var o = $.extend(Raphael(canvasId, width, height), this);
			o.initVars();
			return o;
		},

		initVars: function () {
			this.midX = this.width / 2;
			this.startY = settings.TIMELINE_PADDING;
			this.endY = this.height - settings.TIMELINE_PADDING;
			this.actualHeight = this.height - settings.TIMELINE_PADDING * 2;
		},

		getOffset: function (val, min, max) {
			return this.endY - parseInt((val - min) / (max - min) * this.actualHeight);
		},

		drawTimeline: function () {
			var x = this.midX - 1;
			this.rect(x, 0, 2, this.height).attr(settings.STY_TIMELINE);
		},

		drawTimePoint: function (event, tsFrom, tsTo) {
			var ts = toTs(event);
			var offset = this.getOffset(ts, tsFrom, tsTo);
			this.circle(this.midX, offset, 3).attr(settings.STY_POINT);
			this.text(this.midX+10, offset, event.date).attr(settings.STY_TEXT_LEFT);
		},

		draw: function (events) {
			var that = this;
			this.clear();
			this.drawTimeline();

			var tsFrom, tsTo;
			if (events.length == 0) {
				tsFrom = 0;
				tsTo = 0;
			} else if (events.length == 1) {
				var event = events[0];
				tsFrom = toTs(event) - 1;
				tsTo = toTs(event) + 1;
			} else {
				tsFrom = toTs(_.min(events, toTs));
				tsTo = toTs(_.max(events, toTs));
			}
			alert(tsFrom + ' ' + tsTo);

			$.each(events, function (i, event) {
				that.drawTimePoint(event, tsFrom, tsTo);
			});
		}
	};

	return function (canvasId, width, height) {
		return Timeline.init(canvasId, width, height);
	};

})();

window.Timeline = Timeline;

})();

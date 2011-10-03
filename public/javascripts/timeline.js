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
	STY_TEXT_RIGHT: {
		'text-anchor': 'end'
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
		init: function (canvasId, width, height, align) {
			var o = $.extend(Raphael(canvasId, width, height), this);
			o.initVars({
				align: align
			});
			return o;
		},

		initVars: function (options) {
			$.extend(this, options);

			this.timelineX = this.align === 'left'
					? 10
					: this.width - 10;
			this.startY = settings.TIMELINE_PADDING;
			this.endY = this.height - settings.TIMELINE_PADDING;
			this.actualHeight = this.height - settings.TIMELINE_PADDING * 2;
		},

		getOffset: function (val, min, max) {
			return this.endY - parseInt((val - min) / (max - min) * this.actualHeight);
		},

		drawTimeline: function () {
			var x = this.timelineX - 1;
			this.rect(x, 0, 2, this.height).attr(settings.STY_TIMELINE);
		},

		drawTimePoint: function (event, tsFrom, tsTo) {
			var ts = toTs(event);
			var offset = this.getOffset(ts, tsFrom, tsTo);
			this.circle(this.timelineX, offset, 3).attr(settings.STY_POINT);

			if (this.align === 'left') {
				this.text(this.timelineX+10, offset, event.date).attr(settings.STY_TEXT_LEFT);
			} else {
				this.text(this.timelineX-10, offset, event.date).attr(settings.STY_TEXT_RIGHT);
			}
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

			$.each(events, function (i, event) {
				that.drawTimePoint(event, tsFrom, tsTo);
			});
		}
	};

	return function (canvasId, width, height, align) {
		if (!_.include(['left', 'right'], align)) {
			align = 'left';
		}
		return Timeline.init(canvasId, width, height, align);
	};

})();

window.Timeline = Timeline;

})();

(function () {

var settings = {
	STY_POINT: {
		fill: '#aaa',
		stroke: '#aaa',
		r: 3
	},
	STY_POINT_HOVER: {
		r: 4
	},
	STY_TIMELINE: {
		fill: '#e3e3e3',
		stroke: '#e3e3e3'
	},
	STY_EVENT: {
		fill: '#efefef',
		'stroke-opacity': 0
	},
	STY_EVENT_HOVER: {
		stroke: '#aaa',
		'stroke-opacity': 1
	},
	STY_TEXT_LEFT: {
		'text-anchor': 'start'
	},
	STY_TEXT_RIGHT: {
		'text-anchor': 'end'
	},
	TIMELINE_PADDING: 20,
	EVENT_WIDTH: 150,
	EVENT_MARGIN: 10,
	EVENT_HEIGHT: 30,
	EVENT_MAX_CHARS: 12,
	NUM_LINES_PER_DAY: 3
};

var MILLISECS_PER_DAY = 24 * 60 * 60 * 1000;

var Timeline = (function () {
	var s = settings;

	function getTimestamp(dateString) {
		var t = dateString.split(/-/g);
		var d = new Date(t[0], t[1], t[2]);
		return d.getTime();
	}

	function toTs(event) {
		return getTimestamp(event.date);
	}

	function tsToDay(ts) {
		return parseInt(ts / MILLISECS_PER_DAY);
	}

	function daysToHeight(numDays) {
		return numDays * s.EVENT_HEIGHT * s.NUM_LINES_PER_DAY;
	}

	function summary(text, numChars) {
		if (text.length > numChars) {
			return text.substr(0, numChars) + '...';
		} else {
			return text;
		}
	}

	var popupIssue = (function () {
		var formatPopup = '<div class="popupEvent"><img class="buttonClose" src="images/x.png"><h1>%s</h1><p class="text">%s</p><a href="%s" target="_blank" class="link">링크</a></div>';

		return function (event, offset) {
			$('.popupEvent').remove();

			var html = _.sprintf(formatPopup, summary(event.text, 10), event.text, event.link);
			var popup = $(html);
			$('body').append(popup);
			popup.css('left', offset.left);
			popup.css('top', offset.top - popup.height());
			popup.find('.buttonClose').click(function () {
				popup.remove();
			});
		};
	})();

	var Timeline = {
		init: function (canvasElem, width, align) {
			var o = $.extend(Raphael(canvasElem, width, 0), this);
			$.extend(o, {
				align: align
			});
			return o;
		},

		resetVars: function () {
			this.timelineX = this.align === 'left'
					? 10
					: this.width - 10;
			this.startY = s.TIMELINE_PADDING;
			this.endY = this.height - s.TIMELINE_PADDING;
			this.actualHeight = this.height - s.TIMELINE_PADDING * 2;

			this.timeline = {};
		},


		getCanvasHeight: function (numDays) {
			return daysToHeight(numDays) + 2 * s.TIMELINE_PADDING;
		},

		getOffsetY: function (ts) {
			var numDays = tsToDay(ts - this.tsFrom);
			return this.height - s.TIMELINE_PADDING - daysToHeight(numDays);
		},

		getOffsetX: function (abs, includeWidth) {
			if (this.align === 'left') {
				return abs;
			} else {
				includeWidth = includeWidth || false;
				return (includeWidth ? this.width : 0) - abs;
			}
		},

		getTextStyle: function () {
			if (this.align === 'left') {
				return s.STY_TEXT_LEFT;
			} else {
				return s.STY_TEXT_RIGHT;
			}
		},

		drawTimeline: function () {
			var x = this.timelineX - 1;
			this.rect(x, 0, 2, this.height).attr(s.STY_TIMELINE);
		},

		drawEvent: function (event, offsetX, offsetY) {
			var rect, txt;
			var rectX = (this.align === 'left' ? offsetX : offsetX - s.EVENT_WIDTH);
			var evt = this.set();

			// 이벤트 풍선 표시
			evt.push(
				rect = this.rect(rectX, offsetY-10, s.EVENT_WIDTH, s.EVENT_HEIGHT - s.EVENT_MARGIN, 3).attr(s.STY_EVENT),
				txt = this.text(offsetX + this.getOffsetX(10), offsetY, summary(event.text, s.EVENT_MAX_CHARS)).attr(this.getTextStyle())
			);

			// 마우스 오버/클릭 이벤트
			$([rect.node, txt.node]).css('cursor', 'pointer');
			evt.hover(function () {
				rect.attr(s.STY_EVENT_HOVER);
			}, function () {
				rect.attr(s.STY_EVENT);
			}).click(function () {
				var offset = $(rect.node).offset();
				popupIssue(event, {
					top: offset.top - rect.attr('height'),
					left: offset.left
				});
			});

			return evt;
		},

		drawTimePoint: function (event) {
			var ts = toTs(event);
			var offsetX = this.getOffsetX(85, true);
			var offsetY = this.getOffsetY(ts);

			// 해당 날짜의 첫 이벤트라면, 타임라인에 날짜 표시
			if (typeof this.timeline[ts] == 'undefined') {
				this.circle(this.timelineX, offsetY, 3).attr(s.STY_POINT).hover(function () {
					this.attr(s.STY_POINT_HOVER);
				}, function () {
					this.attr(s.STY_POINT);
				});
				this.text(this.timelineX + this.getOffsetX(10), offsetY, event.date).attr(this.getTextStyle());
				this.timeline[ts] = [];

			// 한 날짜에 이벤트 3개 이상 보여주지 않음
			} else if (this.timeline[ts].length >= 3) {
				return;
			}

			// 타임라인에 이벤트 표시
			offsetY += this.timeline[ts].length * s.EVENT_HEIGHT;
			event = this.drawEvent(event, offsetX, offsetY);
			this.timeline[ts].push(event);
		},

		draw: function (events) {
			var that = this;
			this.clear();
			this.resetVars();

			if (events.length == 0) {
				this.tsFrom = 0;
				this.tsTo = 0;
			} else if (events.length == 1) {
				var event = events[0];
				this.tsFrom = toTs(event) - MILLISECS_PER_DAY;
				this.tsTo = toTs(event);
			} else {
				this.tsFrom = toTs(_.min(events, toTs)) - MILLISECS_PER_DAY;
				this.tsTo = toTs(_.max(events, toTs));
			}
			var numDays = tsToDay(this.tsTo - this.tsFrom);
			this.setSize(this.width, this.getCanvasHeight(numDays));

			this.drawTimeline();

			$.each(events, function (i, event) {
				that.drawTimePoint(event);
			});
		}
	};

	return function (canvasElem, width, align) {
		if (!_.include(['left', 'right'], align)) {
			align = 'left';
		}
		return Timeline.init(canvasElem, width, align);
	};

})();

window.Timeline = Timeline;

})();

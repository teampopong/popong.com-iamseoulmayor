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

	function getMouseX(evt) {
		return evt.clientX
			+ (document.documentElement.scrollLeft || document.body.scrollLeft);
	}

	function getMouseY(evt) {
		return evt.clientY
			+ (document.documentElement.scrollTop || document.body.scrollTop);
	}

	function requestLike(id) {
		$.post('/like', {
			id: id
		}, function (numLiked) {
			$(_.sprintf('.popupEvent%d .like', id)).text(numLiked);
		}).error(function () {
			alert('추천 실패');
		});
	}

	var popupIssue = (function () {
		var formatPopup = '<div id="popupEvent" class="popupEvent%d"><img class="buttonClose" src="images/x.png"><h1>%s</h1><p class="text">%s</p><span class="text-like"><span class="like">%d</span> people liked</span><a href="%s" target="_blank" class="link">링크</a><a href="#" class="buttonLike">Like</a></div>';

		return function (event, offset) {
			$('#popupEvent').remove();

			var html = _.sprintf(formatPopup, event.id, _.truncate(event.text, s.EVENT_MAX_CHARS), event.text, event.numLiked, event.link);
			var popup = $(html);
			$('body').append(popup);

			popup.css('left', offset.left);
			popup.css('top', offset.top - popup.height());
			popup.find('.buttonClose').click(function () {
				popup.remove();
			});
			popup.find('.buttonLike').click(function () {
				requestLike(event.id);
			});
		};
	})();

	var popupRegisterIssue = (function () {
		var formatPopup = '<div id="popupRegisterIssue"><form><input type="hidden" name="topic" value="%s"><span class="topic">%s</span><br><input type="text" name="year" value="%d">년<input type="text" name="month" value="%d">월<input type="text" name="day" value="%d">일<br>내용<br><textarea name="text" rows="3"></textarea><br>링크<br><input type="text" name="link"><br><input type="submit" value="올리기"></form></div>';

		function getFormValue(form, name) {
			return form.children('*[name="'+name+'"]').val();
		}

		function getFormDate(form) {
			return _.sprintf('%04d-%02d-%02d',
					parseInt(getFormValue(form, 'year')),
					parseInt(getFormValue(form, 'month')),
					parseInt(getFormValue(form, 'day')));
		}

		function onSubmit() {
			var form = $('#popupRegisterIssue form');
			var popup = this;

			var data = {
				'topic': getFormValue(form, 'topic'),
				'date': getFormDate(form),
				'text': getFormValue(form, 'text'),
				'link': getFormValue(form, 'link')
			};

			$.post('/event', data, function () {
				location.href = '/index.html';
				popup.remove();
			});

			return false;
		}

		return function (topic, x, y) {
			$('#popupRegisterIssue').remove();

			var today = new Date();
			var html = _.sprintf(formatPopup, topic, topic, today.getFullYear(),
					today.getMonth()+1, today.getDate())
			var popup = $(html);
			$('body').append(popup);

			popup.css('top', y);
			popup.css('left', x);
			popup.children('form').submit(onSubmit);
		};
	})();

	var Timeline = {
		init: function (topic, canvasElem, width, align) {
			var o = $.extend(Raphael(canvasElem, width, 0), this);
			$.extend(o, {
				topic: topic,
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

			this.events = {};
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
			var that = this;
			var x = this.timelineX - 1;
			var timeline = this.rect(x, 0, 2, this.height).attr(s.STY_TIMELINE);
			timeline.hover(function (evt) {
				// TODO: implement
			});
			timeline.click(function (evt) {
				popupRegisterIssue(that.topic, getMouseX(evt), getMouseY(evt));
			});
		},

		drawEvent: function (event, offsetX, offsetY) {
			var rect, txt;
			var rectX = (this.align === 'left' ? offsetX : offsetX - s.EVENT_WIDTH);
			var evt = this.set();

			// 이벤트 풍선 표시
			evt.push(
				rect = this.rect(rectX, offsetY-10, s.EVENT_WIDTH, s.EVENT_HEIGHT - s.EVENT_MARGIN, 3).attr(s.STY_EVENT),
				txt = this.text(offsetX + this.getOffsetX(10), offsetY, _.truncate(event.text, s.EVENT_MAX_CHARS)).attr(this.getTextStyle())
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
			if (typeof this.events[ts] == 'undefined') {
				this.circle(this.timelineX, offsetY, 3).attr(s.STY_POINT).hover(function () {
					this.attr(s.STY_POINT_HOVER);
				}, function () {
					this.attr(s.STY_POINT);
				});
				this.text(this.timelineX + this.getOffsetX(10), offsetY, event.date).attr(this.getTextStyle());
				this.events[ts] = [];

			// 한 날짜에 이벤트 3개 이상 보여주지 않음
			} else if (this.events[ts].length >= 3) {
				return;
			}

			// 타임라인에 이벤트 표시
			offsetY += this.events[ts].length * s.EVENT_HEIGHT;
			event = this.drawEvent(event, offsetX, offsetY);
			this.events[ts].push(event);
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

	return function (topic, canvasElem, width, align) {
		if (!_.include(['left', 'right'], align)) {
			align = 'left';
		}
		return Timeline.init(topic, canvasElem, width, align);
	};

})();

window.Timeline = Timeline;

})();

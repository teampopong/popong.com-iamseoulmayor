(function () {

$(function () {
	var ltimeline = Timeline('나경원', $('.leftcolumn .timeline').get(0),
			341, 'right');
	var rtimeline = Timeline('박원순', $('.rightcolumn .timeline').get(0),
			341, 'left');

	$.get('/event/%EB%82%98%EA%B2%BD%EC%9B%90', function(events) {
		ltimeline.draw(events);
	});
	$.get('/event/%EB%B0%95%EC%9B%90%EC%88%9C', function(events) {
		rtimeline.draw(events);
	});
});

})();

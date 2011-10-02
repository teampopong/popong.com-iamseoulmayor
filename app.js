
/**
 * Module dependencies.
 */

var express = require('express');
var underscore = require('underscore');
var string = require('underscore.string');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Code

var topic = '나경원';
var events = [];
var months = underscore.range(1, 13);
var days = underscore.range(1, 32);

var next_id = 1;
function get_id() { return next_id++; }

function format_date(year, month, day) {
  return string.sprintf('%04d-%02d-%02d', year, month, day);
}

// Routes

app.get('/', function(req, res){
  res.render('index', {
    title: topic, topic: topic, events: JSON.stringify(events),
    months: months, days: days
  });
});

app.post('/event', function(req, res) {
  var year = parseInt(req.body.year);
  var month = parseInt(req.body.month);
  var day = parseInt(req.body.day);
  var id = get_id();
  var date = format_date(year, month, day);
  var event = {
    id: id, topic: topic, date: date,
    text: req.body.text, link: req.body.link
  };
  events.push(event);
  res.redirect('/', 303);
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

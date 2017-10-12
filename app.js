var express = require('express');
var app = express();
var serv = require('http').Server(app)

app.get('/', function(req, res){
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(2001)
console.log('server started');

var SOCKET_LIST = {};

var io = require('socket.io')(serv, {});



///

var messages = []

function socketCount(){
	var d = 0
	for( var i in SOCKET_LIST){
		d++
	}
	return d
}


///


var Entity = function(){
	var self = {
		x: 250,
		y: 250,
		spdX: 0,
		spdY: 0,
		id: ""
	}
	self.update = function(){
		self.updatePosition()
	}
	self.updatePosition = function () {
		self.y += self.spdY;
		if(self.y >= 500 || self.y <= 0) {
			self.y -= self.spdY;
		}
		self.x += self.spdX;
		if(self.x >= 500 || self.x <= 0) {
			self.x -= self.spdX;
		}
	}

	self.getDistance = function (pt) {
		return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2))
	}

	return self
}

var Player = function(id){
	var self = Entity()
	self.id = id;
	self.number = Math.floor(Math.random()*100);
	self.pressingRight = false;
	self.pressingLeft = false;
	self.pressingUp = false;
	self.pressingDown = false;
	self.pressingAttack = false;
	self.mouseAngle = 0;
	self.maxSpd = 10;
	self.color = "#"+((1<<24)*Math.random()|0).toString(16);
	self.health = 100;

	var super_update = self.update

	self.update = function(){
		self.updateSpd();
		super_update();

		if(self.pressingAttack){
			self.shootBoolet(self.mouseAngle)
		}
	}

	self.shootBoolet = function (angle) {
		angle = Math.atan2(self.y - angle.y, self.x - angle.x) * 180 / Math.PI - 180;
		var b = Bullet(self.id, angle)
		b.x = self.x
		b.y = self.y
	}

	self.updateSpd = function(){
		if(self.pressingRight){
			self.spdX = self.maxSpd;
		}
		else if(self.pressingLeft){
			self.spdX = -self.maxSpd;
		}
		else{
			self.spdX = 0
		}
		if(self.pressingUp){
			self.spdY = -self.maxSpd;
		}
		else if(self.pressingDown){
			self.spdY = self.maxSpd;
		}
		else{
			self.spdY = 0
		}
	}

	self.gameOver = function () {
		SOCKET_LIST[id].emit('gameOver', {
			over: true
		})
	}

	Player.list[id] = self
	return self;
}
Player.list = {}

Player.onConnect = function(socket){
	var player = Player(socket.id);
	socket.on('keyPress', function(data){
		if(data.inputId === 'left'){
			player.pressingLeft = data.state
		}
		else if(data.inputId === 'right'){
			player.pressingRight = data.state
		}
		else if(data.inputId === 'down'){
			player.pressingDown = data.state
		}
		else if(data.inputId === 'up'){
			player.pressingUp = data.state
		}
		else if(data.inputId === 'attack'){
			player.pressingAttack = data.state
		}
		else if(data.inputId === 'mouseAngle'){
			player.mouseAngle = data.state
		}
	})
}

Player.onDisconnect = function(socket){
	delete Player.list[socket.id]
}

Player.update = function () {
	var pack = []
	for(var i in Player.list){
		var player = Player.list[i];
		player.update();
		if(player.health <= 0){
			player.gameOver()
			delete Player.list[i]
			delete SOCKET_LIST[i]
		}
		pack.push({
			y: player.y,
			x: player.x,
			number: player.number,
			color: player.color,
			health: player.health
		})
	}
	return pack
}


var Bullet = function(parent, angle){
	var self = Entity()
	self.id = Math.random()

	self.parent = parent;

	self.spdX = Math.cos(angle / 180 * Math.PI) * 10
	self.spdY = Math.sin(angle / 180 * Math.PI) * 10

	self.timer = 0;
	self.toRemove = false;
	var super_update = self.update;
	self.update = function () {
		if(self.timer++ > 100){
			delete Bullet.list[self.id]
		}

		for(var i in Player.list){
			var p = Player.list[i];
			if(self.getDistance(p) < 10 && self.parent !== p.id){
				p.health -= 10;
				delete Bullet.list[self.id]
			}
		}

		super_update()
	}
	Bullet.list[self.id] = self;
	return self;
}

Bullet.list = {}

Bullet.update = function () {

	var pack = []
	for(var i in Bullet.list){
		var bullet = Bullet.list[i];
		bullet.update();
		pack.push({
			y: bullet.y,
			x: bullet.x
		})
	}
	return pack
}


io.on('connection', function(socket){
	socket.id = Math.random()
	SOCKET_LIST[socket.id] = socket;
	
	Player.onConnect(socket)

	SOCKET_LIST[socket.id].emit('pool', {
		pool: messages
	})

	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i]
		socket.emit('serverMsg', {
			msg: socketCount()
		})
	}

	socket.on('disconnect', function(){
		delete SOCKET_LIST[this.id]
		Player.onDisconnect(this)

		for(var i in SOCKET_LIST){
			var socket = SOCKET_LIST[i]
			socket.emit('serverMsg', {
				msg: socketCount()
			})
		}

		var names = []
		for(var i in SOCKET_LIST){
			names.push('<p>'+SOCKET_LIST[i].login+'</p>')
		}
		for(var i in SOCKET_LIST){
			var socket = SOCKET_LIST[i]
			socket.emit('logins', {
				msg: names
			})
		}
	})

	socket.on('login', function(data){
		SOCKET_LIST[this.id].login = data.msg

		Player.list[this.id].number = data.msg

		var names = []

		for(var i in SOCKET_LIST){
			names.push('<p>'+SOCKET_LIST[i].login+'</p>')
		}

		for(var i in SOCKET_LIST){
			var socket = SOCKET_LIST[i]
			socket.emit('logins', {
				msg: names
			})
		}
	})

	socket.on('message', function(data){
		var options = {
			timezone: 'UTC'
		};

		var newDate = new Date().toLocaleString("ru", options)
		messages.push('<div class="msg"><div class="msg__wrapper"><p class="msg__time">'+ newDate +'</p><p class="msg__login">'+ this.login +'</p></div><p class="msg__msg">' + data.msg + '</p></div>')
		for(var i in SOCKET_LIST){
			var socket = SOCKET_LIST[i]
			socket.emit('pool', {
				pool: messages
			})
		}
	})
})

setInterval(function(){
	var pack = {
		player: Player.update(),
		bullet: Bullet.update()
	}

	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i]
		socket.emit('refreshPosition', pack)
	}
}, 1000/25)
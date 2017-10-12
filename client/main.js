var ctx = document.getElementById('app').getContext('2d')
ctx.font = '30px Arial'

var socket = io()

socket.on('serverMsg', function (data) {
	$('.clients-counter__number').text(data.msg)
	console.log(data.msg)
})

socket.on('logins', function (data) {
	$('#users').html(data.msg)
})

socket.on('pool', function (data) {
	$('#messages').html(data.pool)
})

$(document).on('submit', 'form#sendMessage', function (e) {
	e.preventDefault()
	var formMessageVal = $('form#sendMessage input').val()
	if (formMessageVal == '') {
		return false
	}
	socket.emit('message', {
		msg: formMessageVal
	})
	$('form')[1].reset()
})

$(document).on('submit', 'form#login', function (e) {
	e.preventDefault()
	var formSubmitVal = $('form#login input').val()
	if (formSubmitVal == '') {
		return false
	}
	socket.emit('login', {
		msg: formSubmitVal
	})
	$('.modal').addClass('hidden')
})

socket.on('gameOver', function (data) {
	if(data.over){
		location.reload()
	}
})

socket.on('refreshPosition', function (data) {
	ctx.clearRect(0, 0, 500, 500)
	for (var i = 0; i < data.player.length; i++) {
		ctx.beginPath()
		ctx.arc(data.player[i].x, data.player[i].y, 5, 0, 2 * Math.PI)
		ctx.fillStyle = data.player[i].color
		ctx.fill()
		ctx.beginPath()
		ctx.fillText(data.player[i].number, data.player[i].x, data.player[i].y-10)
		ctx.font = '12px Arial'
		ctx.beginPath()
		ctx.fillRect(data.player[i].x-7, data.player[i].y+10, data.player[i].health/7, 2)
		ctx.font = '12px Arial'
	}
	for (var i = 0; i < data.bullet.length; i++) {
		ctx.beginPath()
		ctx.fillStyle = 'red'
		ctx.arc(data.bullet[i].x, data.bullet[i].y, 2, 0, 2 * Math.PI)
		ctx.fill()
	}
})

var $app = $('#app')

document.onmousedown = function(event){
	socket.emit('keyPress', {inputId: 'attack', state: true})
}
document.onmouseup = function(event){
	socket.emit('keyPress', {inputId: 'attack', state: false})
}

document.onmousemove = function (event) {
	var x = 0;
	var y = 0;
	if($(event.target).attr('id') == 'app'){
		x = event.pageX - $app.offset().left;
		y = event.pageY - $app.offset().top;
	}
	var angle = {x,y};
	socket.emit('keyPress', {inputId: 'mouseAngle', state: angle})
}

document.onkeydown = function (event) {
	if (event.keyCode === 68) { //d
		socket.emit('keyPress', {inputId: 'right', state: true})
	}
	else if (event.keyCode === 83) { //s
		socket.emit('keyPress', {inputId: 'down', state: true})
	}
	else if (event.keyCode === 65) { //a
		socket.emit('keyPress', {inputId: 'left', state: true})
	}
	else if (event.keyCode === 87) { //w
		socket.emit('keyPress', {inputId: 'up', state: true})
	}
}
document.onkeyup = function (event) {
	if (event.keyCode === 68) { //d
		socket.emit('keyPress', {inputId: 'right', state: false})
	}
	else if (event.keyCode === 83) { //s
		socket.emit('keyPress', {inputId: 'down', state: false})
	}
	else if (event.keyCode === 65) { //s
		socket.emit('keyPress', {inputId: 'left', state: false})
	}
	else if (event.keyCode === 87) { //w
		socket.emit('keyPress', {inputId: 'up', state: false})
	}
}
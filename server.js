
/**
 * Module dependencies test
/* 참고 사이트 */
// 샘플 :: http://mypocket-technologies.com/2013/08/create-a-collaborative-drawing-application-with-socket-io-node-js-and-canvas/
// 설정 :: http://stackoverflow.com/questions/14353638/how-to-correctly-set-socket-io-ports-getting-socket-io-js-404

var express = require('express')
	, app = express()
	, router = require('./routes/router')
	//, http = require('http')
	, path = require('path')
	, server = require('http').createServer(app)
	, io = require('socket.io').listen(server);
	;

var connectedClients = {}; //used to keep a working list of the connections

	// all environments
	app.set('port', process.env.PORT || 4000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'html');
	app.engine('.html', require('jqtpl').__express);
	app.locals.layout = true;
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));
	
// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', router.index);
app.get('/index.html', router.index);

server.listen(app.get('port'), function(){
  console.log('Express/socket.io server listening on port ' + app.get('port'));
});

//canvas 관련
io.sockets.on('connection', function (socket) {
	
	//added clients
	socket.on("setClientId", function (data) {
	    connectedClients[data.id] = { 
	    	id : data.id, //adds key to a map
	    	senderName : data.senderName
	    };
	    console.log(connectedClients);
	});
	
	//removes clients
	socket.on("deleteSharedById", function (data) {
	    delete connectedClients[data.id]; //removes key from map
	    socket.broadcast.emit("deleteShared",{ id : data.id}); //send to sender
	});
	
	 //erases canvas
	socket.on("eraseRequestById", function (data) {
	    socket.broadcast.emit("eraseShared",{ id : data.id}); 
	});
	
	//returns back a list of clients to the requester
	socket.on("getUserList", function (data) {
	    socket.emit("setUserList", connectedClients); //send to sender
	});
	
	//request to share
	socket.on("requestShare", function (data) {
	    socket.broadcast.emit("createNewClient", {
	        listenerId: data.listenerId,
	        senderId: data.senderId,
	        senderName : data.senderName
	    });
	});
		
	//confirm did share
	socket.on("confirmShare", function (data) {
	    socket.broadcast.emit("setConfirmShare", {
	        isSharing: data.isSharing,
	        senderId: data.senderId,
	        listenerId: data.listenerId,
	        senderName : data.senderName
	    });
	});
	
	//drawing data
	socket.on('drawRequest', function (data) {
	    socket.broadcast.emit('draw', {
	            x: data.x,
	            y: data.y,
	            type: data.type,
	            isTouchDevice : data.isTouchDevice,
	            color: data.color,
	            stroke: data.stroke,
	            isLineDrawing: data.isLineDrawing,
	            isErase: data.isErase,
	            id: data.id
	        });
	});
	    

});


var socketRoom = {};

// socket.io 셋팅
io.configure(function(){
    io.set('transports', ['xhr-polling']);
    io.set('polling duration', 10);
    io.set('log level', 2);
});

io.sockets.on('connection', function(socket){
    // 접속완료를 알림.
    socket.emit('connected');
    
    // chat요청을 할 시
    socket.on('requestRandomChat', function(data){
        // 빈방이 있는지 확인
        console.log('requestRandomChat');
        var rooms = io.sockets.manager.rooms;
        for (var key in rooms){
            if (key == ''){
                continue;
            }
            // 혼자있으면 입장
            if (rooms[key].length == 1){
                var roomKey = key.replace('/', '');
                socket.join(roomKey);
                io.sockets.in(roomKey).emit('completeMatch', {});
                socketRoom[socket.id] = roomKey;
                return;
            }
        }
        // 빈방이 없으면 혼자 방만들고 기다림.
        socket.join(socket.id);
        socketRoom[socket.id] = socket.id;
    });
    
    // 요청 취소 시
    socket.on('cancelRequest', function(data){
        socket.leave(socketRoom[socket.id]);
    });
    
    // client -> server Message전송 시
    socket.on('sendMessage', function(data){
        console.log('sendMessage!');
        io.sockets.in(socketRoom[socket.id]).emit('receiveMessage', data);
    });
    
    // disconnect
    socket.on('disconnect', function(data){
        var key = socketRoom[socket.id];
        socket.leave(key);
        io.sockets.in(key).emit('disconnect');
        var clients = io.sockets.clients(key);
        for (var i = 0; i < clients.length; i++){
            clients[i].leave(key);
        }
    });
});












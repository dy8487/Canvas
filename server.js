
/**
 * Module dependencies test
/* 참고 사이트 */
// 샘플 :: http://mypocket-technologies.com/2013/08/create-a-collaborative-drawing-application-with-socket-io-node-js-and-canvas/
// 설정 :: http://stackoverflow.com/questions/14353638/how-to-correctly-set-socket-io-ports-getting-socket-io-js-404

var express = require('express')
	, app = express();
	//, router = require('./routes/router')
var http = require('http')
	, path = require('path')
	, server = require('http').createServer(app)
	, io = require('socket.io').listen(server);
	;

var connectedClients = {}; //used to keep a working list of the connections
var pseudoArray = ['admin'];

	// all environments
	app.set('port', process.env.PORT || 4000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'html');
	app.engine('.html', require('jqtpl').__express);
	//app.locals.layout = true;
	app.set('view options', { layout: false });
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

app.get('/', function(req, res){
  res.render('index.html');
});

server.listen(app.get('port'), function(){
  console.log('Express/socket.io server listening on port ' + app.get('port'));
});

var users = 0; //count the users

//canvas 관련
io.sockets.on('connection', function (socket) {
	
		users += 1; // Add 1 to the count
	    reloadUsers(); // Send the count to all the users
    
    	socket.on('message', function (data) { // Broadcast the message to all
                if(pseudoSet(socket))
                {
                        var transmit = {date : new Date().toISOString(), pseudo : returnPseudo(socket), message : data};
                        socket.broadcast.emit('message', transmit);
                        console.log("user "+ transmit['pseudo'] +" said \""+data+"\"");
                }
        });
        socket.on('setPseudo', function (data) { // Assign a name to the user
                if (pseudoArray.indexOf(data) == -1) // Test if the name is already taken
                {
                        socket.set('pseudo', data, function(){
                                pseudoArray.push(data);
                                socket.emit('pseudoStatus', 'ok');
                                console.log("user " + data + " connected");
                        });
                }
                else
                {
                        socket.emit('pseudoStatus', 'error'); // Send the error
                }
        });
        socket.on('disconnect', function () { // Disconnection of the client
                users -= 1;
                reloadUsers();
                if (pseudoSet(socket))
                {
                        var pseudo;
                        socket.get('pseudo', function(err, name) {
                                pseudo = name;
                        });
                        var index = pseudoArray.indexOf(pseudo);
                        pseudo.slice(index - 1, 1);
                }
        });

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


function reloadUsers() { // Send the count of the users to all
        io.sockets.emit('nbUsers', {"nb": users});
}

function pseudoSet(socket) { // Test if the user has a name
        var test;
        socket.get('pseudo', function(err, name) {
                if (name == null ) test = false;
                else test = true;
        });
        return test;
}

function returnPseudo(socket) { // Return the name of the user
        var pseudo;
        socket.get('pseudo', function(err, name) {
                if (name == null ) pseudo = false;
                else pseudo = name;
        });
        return pseudo;
}

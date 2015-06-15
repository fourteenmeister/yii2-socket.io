process.chdir(__dirname);
var domain = require('domain').create();
var util = require('util');
var winston = require('winston');
var EventEmitter = require('events').EventEmitter;
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            timestamp: true,
            handleExceptions: true,
            level: 'info'
        }),
        new (winston.transports.File)({
            filename: 'debug.log',
            level: 'debug',
            colorize: true
        })
    ],
    exitOnError: false
    /*exceptionHandlers: [
        new winston.transports.File({
            filename: 'error.log'
        })
    ]*/
});

var errorLogger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            timestamp: true,
            handleExceptions: true,
            level: 'error'
        }),
        new (winston.transports.File)({
            filename: 'error.log',
            level: 'error',
            colorize: true
        })
    ],
    exitOnError: false
});

domain.on('error', function (error) {
    errorLogger.error(error.message, error.stack);
});

var handleSocket = function (fn) {
    return function (socket, next) {
        try {
            fn(socket, function (err) {
                if (err) {
                    throw err;
                }
            });
            next();
        } catch (e) {
            domain.emit('error', e);
        }
    };
};

domain.run(function () {
    var url = require('url');
    var sessionStore = require('sessionstore').createSessionStore();
    var express = require('express');
    var app = express();
    var session = require('express-session');
    var server = require('http').Server(app);
    var io = require('socket.io')(server);
    var KernelManager = require('kernel-manager');
    var cookieParser = require('cookie-parser');
    var config = require('config').Customer;
    var fs = require('fs');
    var cookie = require('cookie');
    var users = {};
    var visitors = 0;
    var _ = require('underscore');

    sessionStore.on('connect', function() {
        //console.log('hello from event');
    });
    sessionStore.on('disconnect', function(sessionID) {
        //delete this.sessions[sessionID];
        logger.info('delete unauthorized session: %s', this);
    });

    // accept all connections from local server
    if (config.checkClientOrigin) {
        logger.debug('Set origin: ' + config.origin);
        io.set("origins", config.origin);
    }

    fs.unlink('debug.log', function (err) {
        if (err) {

        }
        logger.debug('delete log file');
    });

    server.listen(3001);

    logger.info('Listening ' + config.host + ':' + config.port);

    io.of('/client').use(KernelManager({
        store: sessionStore,
        key: 'PHPSESSID',
        secret: 'secret',
        parser: cookieParser()
    })).on('connection', function (socket) {
        socket.on('getEvents', function(data) {
            console.log(socket.id, sessionStore);
        });
        socket.on('getConnected', function(data) {
            console.log(io.sockets.connected);
        });
        socket.on('getEventsManager', function() {
            console.log(socket.eventManager.eventsStore);
        });
        socket.on('getRooms', function() {
            console.log(io.of('/client').adapter.rooms);
        });
        socket.on('sendRoom', function(room, message) {
            io.of('/client').to(room).emit('message', message);
        });
    });

    io.use(KernelManager({
        store: sessionStore,
        key: 'PHPSESSID',
        secret: 'secret',
        parser: cookieParser()
    })).on('connection', function (socket) {

    });

});
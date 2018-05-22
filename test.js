require('coffeescript/register');
global.tp = require('testpass');
tp.findTests(__dirname + '/spec', '.coffee');

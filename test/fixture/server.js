const fs = require('fs');
const http = require('http');

const TOKEN = fs.readFileSync(__dirname + '/token.txt', 'utf8');
http.createServer((req, res, next) => {
  res.end(TOKEN);
}).listen(process.env.PORT || 3000);
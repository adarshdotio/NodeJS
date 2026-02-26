const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send('<h1>Success! Express in Termux!</h1>');
});

// Start HTTP Server for Redirection
http.createServer(app).listen(3000, () => {
    console.log('HTTP Server running on port 5000');
});

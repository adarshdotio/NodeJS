const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');

const app = express();

// Middleware to redirect HTTP to HTTPS
app.use((req, res, next) => {
    if (!req.secure) {
        return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
});

app.get('/', (req, res) => {
  res.send('<h1>Success! Secure Express in Termux!</h1>');
});

// SSL Options
const options = {
    key: fs.readFileSync('./localhost-key.pem'),
    cert: fs.readFileSync('./localhost.pem')
};

// Start HTTPS Server
https.createServer(options, app).listen(3000, () => {
    console.log('HTTPS Server running on port 3000');
});

// Start HTTP Server for Redirection
http.createServer(app).listen(5000, () => {
    console.log('HTTP Redirect Server running on port 5000');
});

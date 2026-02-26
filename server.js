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
    res.status(200).json({
      message: 'You are now browsing securely!',
      method: 'GET'
    });
});

// SSL Options
const options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
};

// Start HTTPS Server
https.createServer(options, app).listen(3000, () => {
    console.log('HTTPS Server running on port 3000');
});

// Start HTTP Server for Redirection
http.createServer(app).listen(5000, () => {
    console.log('HTTP Redirect Server running on port 5000');
});

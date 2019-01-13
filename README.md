# BlitzStream
A web application which can be used for live streaming videos. Also supports real time chatting along the with live video so that viewers can interact among themselves.

## Prerequisites
- The application requires a RTMP server for recieving the live stream from the user.Check this [link](https://obsproject.com/forum/resources/how-to-set-up-your-own-private-rtmp-server-using-nginx.50/) to setup an Nginx RTMP server.
- The user should have a sofware capable of sending RTMP live stream. Recommended software would be [the OBS software](https://obsproject.com/download).
- Install nodej and mongodb for the server.

## Installation
1. Navigate to the project folder. Run "npm install" to install all the dependencies for node.
2. Now to configure the server. Start your mongodb server. Make a database by blitzstream, and make a user with read and write capabilities on the database.
3. In the app.js file, enter the URL of your mongodb database and for the nginx RTMP server wherever it is mentioned. 
4. Set the port number of your server. See to it that it is different from port number of RTMP server which is default to 1935.
5. Run your nginx server.
6. Run your node server by entering the command "node app".

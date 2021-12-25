import express from 'express';
//import { createClient } from 'redis';

const app = express();


import { createServer } from 'http';
import path from "path";
import { Server } from 'socket.io';
import User from './schema';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser'
import {OAuth2Client} from'google-auth-library';
import nodemailer from 'nodemailer';

import mongoose from 'mongoose';
const uri = "mongodb+srv://Fawzy:fawzy@cluster0.83grs.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {console.log("Connected to MongoDB")})
    .catch(err => {console.log(err)});


const server = createServer(app);
const io = new Server(server);
const __dirname = path.resolve();
let prevMessages = [];

const CLIENT_ID = "1051843467112-r0qk7f7tnhljpnih78tv478lp9oqs5fq.apps.googleusercontent.com";

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.get('/', (req, res) => {
       if (req.cookies['username'])     //replace with tokens later
           res.sendFile(path.join(__dirname, 'chat.html'));
      else
        res.sendFile(__dirname + '/index.html');
});

app.get('/login', (req, res) => {
      if (req.cookies['username'])
          res.redirect('/');
      else
        res.sendFile(__dirname + '/login.html');
});

app.post('/signupGoogle', async(req, res) => {
  const client = new OAuth2Client(CLIENT_ID);
  const token = req.body['idtoken'];
  async function verify() {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
        // Or, if multiple clients access the backend:
        //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    });
    const payload = ticket.getPayload();
    const userid = payload['sub'];
    const username = payload.name;
    const password = payload.sub;
    let user = await User.findOne({ username: username });
    if (user) {
      const success = await bcrypt.compare(password, user.password);
      if (!success) {
        res.status(400).send('Something went wrong');
      }
      else{
        //res.cookie('session-token', token);
        res.cookie('username', username);    //replace with tokens later
        res.redirect('/');
      }
    }
    else{
      const confirmationMessage = "You have successfully signed up";
      var mailTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "fawzyashraf201@gmail.com",
          pass: "35024833502483"
        }
      });
    
      let mailDetails = {
        from: 'fawzyashraf201@gmail.com',
        to: payload.email,
        subject: 'Test mail',
        text: confirmationMessage
      };
    
    
      mailTransporter.sendMail(mailDetails, async (err, data)=> {
          if(err) {
              console.log(err);
          } else{
              console.log('Email sent successfully');
              const encryptedPassword = await bcrypt.hash(password, 10);
              user = User({ username: username, password: encryptedPassword });
              await user.save();

              //res.cookie('session-token', token);
              res.cookie('username', username);   //replace with tokens later
              res.redirect('/');
            }
      });
   }
  }
  verify().catch(console.error);
  
})

app.post('/login', async(req, res) => {
  const { username, password } = req.body;
  let user = await User.findOne({ username: username });
  if (!user) {
    res.status(400).send('Username doesn\'t exist');
  }
  else{
    const success = await bcrypt.compare(password, user.password);
    if (!success) {
      res.status(400).send('Password is incorrect');
    }
    else{
      res.cookie('username', username);    //replace with tokens later
      res.redirect('/');
    }
  }
})

app.get('/signup', (req, res) => {
  if (req.cookies['username'])
    res.redirect('/');
  else
    res.sendFile(__dirname + '/signup.html');

});

app.post('/signup', async(req, res) => {
  const { username, password } = req.body;
  let user = await User.findOne({ username: username });
  if (user) {
    res.status(400).send('User already exists');
  }
  else{
    const encryptedPassword = await bcrypt.hash(password, 10);
    user = User({ username: username, password: encryptedPassword });
    await user.save();

    res.cookie('username', username);   //replace with tokens later
    res.redirect('/');
  }
  
})

app.post('/prev', async(req, res) => {
  let user = await User.findOne({ username: req.cookies['username'] });
  const messages = user.comments
  res.write("<html><ul>")
  messages.forEach(message => res.write(`<li>${message}</li>`))
  res.write("</ul></html>")
  res.end()
})

app.get('/logout', (req, res)=>{
  //res.clearCookie('session-token');
  res.clearCookie('username');
  res.redirect('/')
})




io.on('connection', socket=>{
    // (async () => {
    //     const client = createClient();
      
    //     client.on('error', (err) => console.log('Redis Client Error', err));
      
    //     await client.connect();
    //     prevMessages = await client.lRange('messages', 0, -1)
    //     socket.emit('getPrev', prevMessages);
    //   })();
      
    socket.on('chat message', async(msg, username)=>{
        const message = username + ": " + msg;
        // (async () => {
        //     const client = createClient();
          
        //     client.on('error', (err) => console.log('Redis Client Error', err));
        //     await client.connect();
        //     await client.rPush('messages', message)
        //   })(); 
        io.emit('chat message', message);
        try{
          const user = await User.findOne({ username: username });
          await user.comments.push(msg);
          await user.save();
        }
        catch(e){
          console.log(e);
        }
    })

})



server.listen(4000, () => { 
     console.log('listening on *:4000');
});


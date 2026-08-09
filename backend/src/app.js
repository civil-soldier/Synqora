import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import { initializeSocket } from './controllers/socketManager.js';

const app = express();
const server = createServer(app);
const io = initializeSocket(server);

app.set("port" , (process.env.PORT || 8000));
app.use(cors());
app.use(express.json({limit: '40kb'}));
app.use(express.urlencoded({ limit: '40kb', extended: true }));

const start = async() => {
    const connectionDB = await mongoose.connect("mongodb+srv://krajeevranjan290_db_user:yk6201@cluster3.thrin02.mongodb.net/synqora?retryWrites=true&w=majority");
    console.log(`MONGO DB CONNECTED: ${connectionDB.connection.host}`);
    server.listen(app.get("port") , () => {
        console.log("Server is running on port");
    });
}

start();


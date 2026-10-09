import httpStatus from "http-status";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import User from "../models/user.model.js";
import { Meeting } from "../models/meetings.model.js";

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Username and password are required",
        });
    }

    try {
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({
                message: "User not found",
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "Invalid password",
            });
        }

        const token = crypto.randomBytes(20).toString("hex");

        user.token = token;
        await user.save();

        return res.status(httpStatus.OK).json({
            token,
            name: user.name,
            username: user.username,
        });

    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Something went wrong: ${e.message}`,
        });
    }
};

const register = async (req, res) => {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Name, username and password are required",
        });
    }

    try {
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(httpStatus.CONFLICT).json({
                message: "User already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            username,
            password: hashedPassword,
        });

        await newUser.save();

        return res.status(httpStatus.CREATED).json({
            message: "User registered successfully",
        });

    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Something went wrong: ${e.message}`,
        });
    }
};

const getUserHistory = async (req, res) => {
    const {token} = req.query;

    try{
        const user = await User.findOne({token: token});
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "Invalid or expired token",
            });
        }

        const meetings = await Meeting.find({user_id: user.username});
        return res.status(httpStatus.OK).json(meetings);
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Something went wrong: ${e.message}`,
        });
    }
    }

    const addToHistory = async (req, res) => {
    const { token, meeting_code } = req.body;
    try{
        const user = await User.findOne({token: token});
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "Invalid or expired token",
            });
        }

        if (!meeting_code) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: "Meeting code is required",
            });
        }

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code,
        });

        await newMeeting.save();
        res.status(httpStatus.CREATED).json({
            message: "Meeting added to history",
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Something went wrong: ${e.message}`,
        });
    }
};

export { login, register, getUserHistory, addToHistory };
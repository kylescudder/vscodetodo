require("dotenv-safe").config();
import 'reflect-metadata'
import express from 'express';
import { createConnection } from 'typeorm'
import { __prod__ } from './constants';
import { Strategy as GitHubStrategy } from "passport-github"
import passport from 'passport';
import { User } from './entities/User';
import jwt from "jsonwebtoken";
import cors from 'cors';
import { ToDo } from './entities/todo';
import { isAuth } from './isAuth';

const main = async () => {
    await createConnection({
        type: "postgres",
        database: "vscodetodo",
        username: "postgres",
        password: "beetle",
        entities: [__dirname + '/entities/*.*'],
        logging: !__prod__,
        synchronize: false,
    });

    const app = express();
    passport.serializeUser(function(user: any, done) {
        done(null, user.accessToken);
    });
    app.use(cors({origin: '*'}));
    app.use(passport.initialize());
    app.use(express.json());

    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "http://localhost:3002/auth/github/callback"
      },
      async (_, __, profile, cb) => {
        let user = await User.findOne({where: {githubId: profile.id}});
        if (user) {
            user.name = profile.displayName
            await user.save();
        } else {
            user = await User.create({name: profile.displayName, githubId: profile.id}).save()
        }
        cb(null, {
            accessToken: jwt.sign(
                {userId: user.id }, 
                process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: "1y",
            }),
        });
      }
    ));

    app.get('/auth/github',
    passport.authenticate('github', { session: false }));

    app.get(
        '/auth/github/callback', 
        passport.authenticate('github', { session: false }),
        (req: any, res) => {
            res.redirect(`http://localhost:54321/auth/${req.user.accessToken}`)
        }
    );

    app.get('/todo', isAuth, async (req, res) => {
        const todos = await ToDo.find({
            where: { creatorId: req.userId },
            order: {
                completed: 'ASC',
                id: 'ASC'
            }
        });
        res.send({ todos });
    });

    app.post('/todo', isAuth, async (req, res) => {
        if (req.body.text.length < 500) {
            const todo = await ToDo.create({
                text: req.body.text, 
                creatorId: req.userId,
            }).save();
            res.send({ todo });
        }
    });

    app.put('/todo', isAuth, async (req, res) => {
        console.log(req.body.id);
        const todo = await ToDo.findOne(req.body.id);
        if (!todo) {
            res.send({ todo: null });
            return
        }
        if (todo.creatorId !== req.userId) {
            throw new Error("You are not authorised to do this");
        }
        todo.completed = !todo.completed;
        await todo.save()


        const todos = await ToDo.find({
            where: { creatorId: req.userId },
            order: {
                completed: 'ASC',
                id: 'ASC'
            }
        });
        res.send({ todos });
    });

    app.get('/me', async (req, res) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.send({ user: null})
            return;
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            res.send({ user: null})
            return;
        }
        let userId = "";
        try {
            const payload: any = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            userId = payload.userId;
        } catch (err) {
            res.send({ user: null})
            return;
        }
        if (!userId) {
            res.send({ user: null})
            return;
        }
        const user = await User.findOne(userId);
        res.send({ user })
    })
    app.get('/', (_req, res) => {
        res.send("Hello");
    })
    app.listen(3002, () => {
        console.log("listening on localhost:3002");
    });
};
main();
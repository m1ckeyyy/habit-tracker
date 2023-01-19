const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcrypt");
// const flash = require('connect-flash');
const { response } = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 8080;
const cors = require("cors");
const config = require("./config");
const uri = config.mongoURI;
app.use(cors());
app.use(require("connect-flash")());
app.use(cookieParser());
app.use(express.json());
app.use(
	session({
		secret: "my-sgfrdesgfr6grdterdgrtegerggre432ecret", // a secret key to sign the session ID cookie
		cookie: { maxAge: Infinity },
		resave: false, // don't save the session if it wasn't modified
		saveUninitialized: true, // don't create a session until something is stored
	})
);
mongoose.set("strictQuery", false); //supress warning
mongoose
	.connect(uri)
	.then(() => console.log("Successfully connected to MongoDB"))
	.catch((error) => console.error(error));

const User = require("./User");

app.post("/", (request, response) => {
	const userCookie = request.cookies.user;
	console.log(userCookie);
	response.status(200).send({ message: `${userCookie}` });
});

app.post("/register", (request, response) => {
	const { username, password } = request.body;
	const newUser = new User({ username, password });

	console.log("server.js,/register,newUser: ", newUser);
	const validationError = newUser.validateSync({ username, password });
	if (validationError) {
		const { message } = validationError.errors.password;
		console.log(message);
		return response.status(400).send({ error: message });
	}
	newUser.save((error) => {
		if (error) {
			response.status(500).send("Error saving user to database");
		} else {
			console.log("user yes");
			//   request.flash("success", "You are now registered and can log in");
			response.status(200).json({ redirect: "/login" });
		}
	});
});

app.post("/login", (request, response) => {
	console.log(
		"logging in: ",
		request.body.username,
		request.body.password,
		"..."
	);
	try {
		let { username, password } = request.body;

		User.findOne({ username }).then((user) => {
			if (!user) {
				return response.status(404).send({
					access: false,
					message: `user ${username} not found, authorization failed`,
				});
			}

			bcrypt.compare(password, user.password).then((isMatching) => {
				if (isMatching) {
					password = user.password;
					request.session.authenticated = true;
					request.session.user = {
						username,
						password,
					};
					//add a flash message, to append a success login message in the navigation bar
					console.log(request.session.user);
					response.cookie("user ", username, {
						maxAge: 900000,
						// httpOnly: true,
					});
					response.status(200).send({
						message: `${request.session.user}`,
					});
				} else {
					response
						.status(401)
						.send({ access: false, message: "Incorrect password" });
				}
			});
		});
	} catch (err) {
		response.status(500).send({ access: false, message: "An error occured" });
		console.log(err);
	}
});

app.get("/logout", (request, response) => {
	request.session.destroy(function (err) {
		if (err) {
			console.log("logout error", err);
		} else {
			response.clearCookie("connect.sid");
			response.redirect("/login");
		}
	});
});

app.listen(port, () => {
	console.log("Running on http://localhost:8080/");
});
function authenticate(req, res, next) {
	if (req.session.authenticated) {
		console.log("AUTHENTICATed");
		next();
	} else {
		console.log("NOT AUTHenticated");
		res.redirect("/login");
	}
}
function notAuthenticated(req, res, next) {
	if (!req.session.authenticated) {
		next();
	} else {
		res.redirect("/");
	}
}

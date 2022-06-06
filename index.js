const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;

// Use Middleware:
app.use(cors());
app.use(express.json());

// Verify JWT:
function verifyJWT(req, res, next) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
                return res.status(401).send({ message: "Unauthorized Access!" });
        }
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
                if (err) {
                        return res.status(403).send({ message: "Forbidden Access!" });
                }
                req.decoded = decoded;
                next();
        })
}

// MongoDB Connection:
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@ph-5.b3v7f.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
        try {
                await client.connect();
                const itemCollections = client.db("Chaldal-Warehouse").collection("items");
                console.log("Database Connecter");

                // Using JWT:
                app.post('/get-token', async (req, res) => {
                        const user = req?.body;
                        const accessToken = jwt.sign(user, process.env.TOKEN_SECRET, {
                                expiresIn: '1d'
                        });
                        res.send(accessToken);
                })

                // Load All Items:
                app.get("/items", async (req, res) => {
                        const query = {};
                        const cursor = itemCollections.find(query);
                        const items = await cursor.toArray();
                        res.send(items);
                })
                // Load Items for Single User Items and Verify JWT:
                app.get("/my-items", verifyJWT, async (req, res) => {
                        const decodedEmail = req?.decoded?.email;
                        const email = req.query.email;
                        if (email === decodedEmail) {
                                const query = { email: email };
                                const cursor = itemCollections.find(query);
                                const items = await cursor.toArray();
                                res.send(items);
                        }
                        else {
                                return res.status(403).send({ message: "Forbidden Access!" });
                        }
                })

                //Load Item by single Id:
                app.get('/item/:id', async (req, res) => {
                        const id = req.params.id;
                        const query = { _id: ObjectId(id) };
                        const item = await itemCollections.findOne(query);
                        res.send(item);
                })

                // Add New Item to Database:
                app.post('/items', async (req, res) => {
                        const newItem = req.body;
                        const insertNewItem = await itemCollections.insertOne(newItem);
                        res.send(insertNewItem);
                })

                // Deliver/Update Quantity:
                app.put('/item/:id', async (req, res) => {
                        const id = req.params.id;
                        const updatedQuantity = req.body;
                        const filterItem = { _id: ObjectId(id) };
                        const options = { upsert: true };
                        const updateDoc = {
                                $set: {
                                        quantity: updatedQuantity.quantity,
                                        // sold: updatedQuantity.sold
                                }
                        }
                        const result = await itemCollections.updateOne(filterItem, updateDoc, options);
                        res.send(result);
                })

                // Delete Item:
                app.delete('/items/:id', async (req, res) => {
                        const id = req.params.id;
                        const query = { _id: ObjectId(id) };
                        const deleteItem = await itemCollections.deleteOne(query);
                        res.send(deleteItem);
                })

        }
        finally {

        }
}
run().catch(console.dir);

// Root Api:
app.get('/', (req, res) => {
        res.send("Hello from Chaldal Warehouse");
})

app.listen(port, () => {
        console.log("Listening from chaldal Warehouse");
})
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const PORT = process.env.PORT || 5000;

// middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// verifyToken
const verifyToken = (req, res, next) => {
  // const token = req.headers.authorization.split(' ')[1];
  const token = req.cookies?.tomato_access_token;
  if(!token){
    console.log('Not token')
    return res.status(401).send({ message: 'Unauthorized access.' })
  }
  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    if(err){
      console.log('Get err')
      return res.status(401).send({ message: 'Unauthorized access.' });
    }
    req.decoded = decoded;
    next();
  })
}

// verifyAdmin
const verifyAdmin = async(req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await usersCollection.findOne(query);
  let admin = user?.role === "Admin";
  if(!admin){
    return res.status(403).send({ message: 'Forbidden access' });
  }
  next();
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a1a1zbo.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    const categoriesCollection = client.db('Tomato').collection('categories');
    const dishesCollection = client.db('Tomato').collection('dishes');
    const cartCollection = client.db('Tomato').collection('cart');
    const usersCollection = client.db('Tomato').collection('users');

    // jwt related api
    app.post('/jwt', (req, res) => {
      const userInfo = req.body;
      const secret = process.env.TOKEN_SECRET;
      const token = jwt.sign(userInfo, secret, { expiresIn: '1h' });
      res.cookie('tomato_access_token', token, {
        httpOnly: true,
        secure: false
      });
      res.send({ success: true });
    })


    // categories
    app.get('/categories', async(req, res) => {
      const result = await categoriesCollection.find().toArray();
      res.send(result);
    })


    // dishes
    app.get('/dishes/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await dishesCollection.findOne(query);
      res.send(result);
    })

    app.get('/dishes', async(req, res) => {
      const result = await dishesCollection.find().toArray();
      res.send(result);
    })

    app.put('/dishes/:id', async(req, res) => {
      const id = req.params.id;
      const dish = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          name: dish.name,
          price: dish.price,
          category: dish.category,
          description: dish.description,
          ratings: dish.ratings,
          image: dish.image
        }
      };
      const result = await dishesCollection.updateOne(query, updatedDoc, options);
      res.send(result);
    })

    app.post('/dishes', async(req, res) => {
      const dish = req.body;
      // console.log('Dish: ', dish);
      const result = await dishesCollection.insertOne(dish);
      res.send(result);
    })

    app.delete('/dishes/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await dishesCollection.deleteOne(query);
      res.send(result);
    })


    // cart
    app.get('/carts', async(req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/carts', async(req, res) => {
      const dish = req.body;
      const query = { dishId: dish.dishId };
      const isExist = await cartCollection.findOne(query);
      if(isExist){
        return res.status(401).send({ message: 'Dish item already added.' });
      }
      const result = await cartCollection.insertOne(dish);
      res.send(result);
    })

    app.delete('/carts/:id', async(req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })


    // user related api
    app.get('/users', async(req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.post('/users', async(req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const isExist = await usersCollection.findOne(query);
      if(isExist){
        return res.status(401).send({ message: 'User already exist with this email' });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    

    // logOut related api
    // app.post('/logout', (req, res) => {
    //   res.clearCookie('tomato_access_token');
    //   res.status(200).send({ message: 'Logged out successfully' });
    // });

    
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Tomato server is running...');
})

app.listen(PORT, () => {
    console.log(`Tomato server is running with the port: ${PORT}`);
})
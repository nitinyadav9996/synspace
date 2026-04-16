
import dotenv from 'dotenv';
import connectDB from './db/index.js';
import a from './app.js';
dotenv.config({path:'./.env'});

// ensure required secrets are defined
if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  console.error('ERROR: ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be set in .env');
  process.exit(1);
}

const PORT = process.env.PORT ;

a.get('/',(req,res)=>{  
  res.json("hello")
})

a.get('/api/jokes',(req,res)=>{
  const jokes = [
    {
      id: 1,
      joke: 'Why did the chicken cross the road? To get to the other side.'
    },
    {
      id: 2,
      joke: 'What do you call a fish with no eyes? A fsh.'
    }];
    res.send(jokes);  
 } )  

connectDB()
  .then(() => {
    const port = Number(PORT) || 4000;
    a.listen(port, () => {
      console.log(`http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });

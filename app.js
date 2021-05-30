require('dotenv').config()
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const app = express();
let PORT = process.env.PORT || 5000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/stats', (req, response, error) => {
  const url = req.query.url;
  axios(url)
  .then((res) => {
    const $ = cheerio.load(res.data);
    const scripts = $('script')
    scripts.each((index, script) => {
      const $this = $(script);
      const $data_dump = $this.html().split('shotData')[1];
      const data = {};
      if(typeof $data_dump === "string") {
        if($data_dump) {
          data.response = 'success'
          data.likes = $data_dump.split('likesCount":')[1].split(',')[0];
          data.views = $data_dump.split('viewsCount":')[1].split(',')[0];
          response.json(data)
        } else {
          data.response = 'failed'
          response.json(data)
        }
      } 
    })
  })
  .catch((error) => console.log(error))
})

app.use('/get-token', (request, response, error) => {
  console.log(request.query.code)
  if(request.query.code) {
    axios.post('https://dribbble.com/oauth/token',  {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code: request.query.code,
      redirect_uri: 'http://localhost:3000'
    }).then((res) => {
      response.redirect(`/fetch-data?access_token=${res.data.access_token}`);
    }).catch((error) => console.log(error))
  } else {
    response.send('welp')
  }
})


app.get('/fetch-data', (request, response, error) => {
  const access_token_n = request.query.access_token;
  let all_data = [];
  let likes;

  const fetch_user_details = async () => {
    return await axios('https://api.dribbble.com/v2/user/', {
      params: {
        access_token: access_token_n,
      }
    }).then((res) => res.data)
    .catch((err) => console.log('err'))
  }

  const fetch_the_data = async () => {
    return await axios('https://api.dribbble.com/v2/user/shots', {
      params: {
        access_token: access_token_n,
        per_page: 2000
      }
    }).then((res) => res.data)
    .catch((err) => console.log('err'))
  }

  const fetch_likes_views = async(urls) => {
    let data = []
    let promises = []
    urls.forEach((item) => {
      promises.push(
        axios(`https://dribbbler-player-card.herokuapp.com/?url=${item.html_url}`).then((res) => {
          data.push(res.data)
        }).catch((err) => console.log(err))
      )
    })
    let all_data = await Promise.all(promises).then(() => data).catch((err) => console.log(err))
    return all_data
  }

  const run_data_scripts = async () => {
    let return_data = {}
    let urls = await fetch_the_data();
    let likes_views = await fetch_likes_views(urls)
    let user = await fetch_user_details();
    return_data.post_info = likes_views
    return_data.account_info = user;
    response.json(return_data)
  }
  run_data_scripts();
})

app.listen(PORT, () => console.log(`logging...`))
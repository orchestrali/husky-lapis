
const axios = require('axios');

//query needs to have two fields: query and fields
module.exports = function findPost(query, cb) {
  let url = 'https://vivacious-port.glitch.me/find/method';
  
  axios.post(url, query)
  .then(response => {
    if (response.data) {
      cb(response.data);
    } else {
      cb('no match');
    }
  })
  .catch(function (error) {
    // handle error
    console.log(error);
    cb();
  });
  //console.log(url);
  
  
}
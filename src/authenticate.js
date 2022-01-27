const Youtube = require('./youtube');

const url = Youtube.getOAuthUrl();
console.log('Visit this page to retrive the code');
console.log(url);

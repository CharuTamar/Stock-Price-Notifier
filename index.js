const express = require('express');
const puppeteer = require('puppeteer');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
require('dotenv').config();
const ehbs = require('nodemailer-express-handlebars');
const mongoose = require('mongoose');
const users = require('./models/schema')
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

app.set('views', path.join(__dirname, '/views'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.json());

app.set('view engine', 'hbs');
app.use(express.static('public'));


// DB connection

mongoose.connect(process.env.MONGO_URI)
.then(()=> {
    console.log('DB connected');
})
.catch(() => {
    console.log(err);
})

cron.schedule('30 10,14 * * *', async() => {
    console.log('Cron is working');
    scrapeChannel('https://groww.in/markets/top-losers?index=GIDXNIFTY100');
})

app.get('/', (req, res) => {
    res.render('index');
})


app.post('/', (req, res) => {
    let userName = req.body.name;
    let userEmail = req.body.email;
    console.log(userName, userEmail);
    let user = new users({
        name: userName,
        email: userEmail
    })
    user.save()
        .then(() => {
            res.redirect('./subscribe.html')
        })
        .catch((err) => {
            console.log('Error:', err);
        })
})


scrapeChannel = async(url) => {
    let browser = await puppeteer.launch();
    let page = await browser.newPage();
    await page.goto(url);

    let [el] = await page.$x('//*[@id="root"]/div[2]/div[2]/div/div/div[1]/div/div/table/tbody/tr[1]/td[1]');
    let text = await el.getProperty('textContent');
    let stName = await text.jsonValue();

    let [el2] = await page.$x('//*[@id="root"]/div[2]/div[2]/div/div/div[1]/div/div/table/tbody/tr[1]/td[3]');
    let priceSrc = await el2.getProperty('textContent');
    let priceVal = await priceSrc.jsonValue();

    let [el3] = await page.$x('//*[@id="root"]/div[2]/div[2]/div/div/div[1]/div/div/table/tbody/tr[1]/td[4]');
    let lowSrc = await el3.getProperty('textContent');
    let lowVal = await lowSrc.jsonValue();

    let [el4] = await page.$x('//*[@id="root"]/div[2]/div[2]/div/div/div[1]/div/div/table/tbody/tr[1]/td[5]');
    let highSrc = await el4.getProperty('textContent');
    let highVal = await highSrc.jsonValue();

    let [el5] = await page.$x('//*[@id="root"]/div[2]/div[2]/div/div/div[1]/div/div/table/tbody/tr[1]/td[3]/div');
    let downBy = await el5.getProperty('textContent');
    let downVal = await downBy.jsonValue();

    let percentage = downVal.match(/\((.*?)%\)/)[1];
    console.log(percentage);


    // getting all users
    const mailList = [];
    users.find()
        .then((docs) => {
            docs.forEach((user) => {
                mailList.push(user.email);
                return mailList;
            })
        })
        .catch((err) => {
        console.log(err);
        })


    if(percentage < 10) {
        function sendmail() {
            let mailTransporter = nodemailer.createTransport({
                service: 'gmail',
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.GID,
                    pass: process.env.GPW
                },
                tls: {
                    rejectUnauthorized: false
                }
            })

            const handelbarOptions = {
                viewEngine: {
                    extName: '.handlebars',
                    partialsDir: path.resolve('./views'),
                    defaultLayout: false
                },
                viewPath: path.resolve('./views'),
                extName: '.handlebars'
            }

            mailTransporter.use('compile', ehbs(handelbarOptions))

            let mailDetails = {
                from: process.env.GID,
                to: process.env.GTD,
                bcc: mailList,  
                subject: `Your stock is down by ${percentage}%`,
                template: 'email',
                context: {
                    userName: 'Charu',
                    stockName: stName,
                    pct: percentage,
                    pval: priceVal,
                    hval: highVal,
                    lval: lowVal
                }
            }

            mailTransporter.sendMail(mailDetails, (err, data) => {
                if(err) {
                    console.log('Error occurred',err);
                }
                else {
                    console.log('Email sent successfully');
                }
            })
        }
        sendmail();
    }


    let stockApi = {
        stockName: stName,
        currentPrice: priceVal,
        lowPrice: lowVal,
        highPrice: highVal,
        downBy: downVal
    }

    // console.log(stockApi);
    browser.close();


}

scrapeChannel('https://groww.in/markets/top-losers?index=GIDXNIFTY100');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
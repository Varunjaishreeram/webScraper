const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

const selectors = {
    allReviews: '#cm-cr-dp-review-list div.review',
    authorName: 'div[data-hook="genome-widget"] span.a-profile-name',
    reviewTitle: '[data-hook=review-title]>span:not([class])',
    reviewDate: 'span[data-hook=review-date]',
};

app.get('/search/:keyword', async (req, res) => {
    const keyword = req.params.keyword;

    if (!keyword) {
        return res.status(400).json({ error: 'Keyword is required' });
    }

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        page.on("console", (consoleObj) => console.log(consoleObj.text()));
        await page.goto(`https://www.amazon.com/s?k=${keyword}`);

        const products = await page.evaluate(async () => {
            let items = [];
            const productElements = document.querySelectorAll('div[data-component-type="s-search-result"]');
            console.log(productElements);
            for (let i = 0; i < 4; i++) {
                const item = productElements[i];
                const name = item.querySelector('h2 span').textContent.trim();
                const description = item.querySelector('.a-section .a-size-base').textContent.trim();
                const rating = item.querySelector('.a-icon-star-small .a-icon-alt').textContent.trim();
                const numReviews = item.querySelector('.a-row.a-size-small .a-size-base').textContent.trim();
                const price = item.querySelector('.a-price span').textContent.trim();
                const productUrl = item.querySelector('a.a-link-normal').href;

                // Fetch reviews directly within the browser context
                let reviews = [];

                items.push({ name, description, rating, numReviews, price, productUrl });
            }
            return items;
        });

        await browser.close();

        res.json(products);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



app.get('/fetch-reviews', async (req, res) => {
    const selectors = {
        allReviews: '#cm-cr-dp-review-list div.review',
        authorName: 'div[data-hook="genome-widget"] span.a-profile-name',
        reviewTitle: '[data-hook=review-title]>span:not([class])',
        reviewDate: 'span[data-hook=review-date]',
    };
    const productUrl = req.query.url;
    

    if (!productUrl) {
        return res.status(400).json({ error: 'Product URL is required' });
    }

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        page.on("console", (consoleObj) => console.log(consoleObj.text()));
        console.log(productUrl)
        await page.goto(productUrl);
        await page.waitForSelector(selectors.allReviews);
        const reviewElements = await page.$$(selectors.allReviews);
        
        const numReviewsToProcess = Math.min(10, reviewElements.length);
        let reviews = [];
        for (let i = 0; i < numReviewsToProcess; i++) {
            const reviewElement = reviewElements[i];
            const author = await reviewElement.$eval(selectors.authorName, (element) => element.textContent);
            const title = await reviewElement.$eval(selectors.reviewTitle, (element) => element.textContent);
            const rawReviewDate = await reviewElement.$eval(selectors.reviewDate, (element) => element.textContent);
        
            const datePattern = /(\w+\s\d{1,2},\s\d{4})/;
            const match = rawReviewDate.match(datePattern);
            const reviewDate = match ? match[0].replace(',', '') : "Date not found";
        
            const reviewData = {
                author,
                title,
                reviewDate,
            };
        
            reviews.push(reviewData);
        }
        
        await browser.close();
        console.log(reviews)
        res.send(reviews);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
